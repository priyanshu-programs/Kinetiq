"""WebSocket manager: auth rejection, state cleanup, and sampled persistence.

The simulator loop had no test coverage before; these drive it directly with a
long tick interval so exactly one tick runs per test.
"""

import asyncio

import pytest
from starlette.websockets import WebSocketDisconnect

from app.auth.security import create_access_token
from app.iot import ws
from app.iot import router as iot_router
from app.models.enums import DeviceType
from app.models.iot import Device, SensorReading


class _FakeWS:
    def __init__(self):
        self.sent = []

    async def send_json(self, payload):
        self.sent.append(payload)


def _device(db, user):
    d = Device(user_id=user.id, name="Band", type=DeviceType.smartband)
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


def _manager_with(user_id, device, *, tick):
    manager = ws.ConnectionManager()
    sock = _FakeWS()
    manager._active[user_id] = {sock}
    manager._devices[user_id] = [
        ws._CachedDevice(id=device.id, name=device.name, type=device.type)
    ]
    manager._tick[user_id] = tick
    return manager, sock


def _run_one_tick(manager):
    """Run the loop long enough for exactly one tick, then cancel."""

    async def drive():
        task = asyncio.create_task(manager.run_loop())
        await asyncio.sleep(0.05)
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    asyncio.run(drive())


def test_ws_rejects_a_missing_token(client):
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect("/ws/iot"):
            pass
    assert exc.value.code == 4401


def test_ws_rejects_a_token_for_a_deleted_user(client, db, session_factory, monkeypatch):
    monkeypatch.setattr(iot_router, "SessionLocal", session_factory)
    # Valid signature, but no such user — must not create device rows.
    token = create_access_token(9999)
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"/ws/iot?token={token}"):
            pass
    assert exc.value.code == 4401
    assert db.query(Device).count() == 0


def test_build_readings_touches_no_database(db, user):
    device = _device(db, user)
    manager, _ = _manager_with(user.id, device, tick=0)

    readings, samples = manager._build_readings(user.id)

    assert len(readings) == 1
    assert readings[0]["device_id"] == device.id
    assert readings[0]["metric"] == "heart_rate"
    assert len(samples) == 1
    # Nothing was written: only persisting ticks reach the database.
    assert db.query(SensorReading).count() == 0


def test_disconnect_clears_all_per_user_state(db, user):
    device = _device(db, user)
    manager, sock = _manager_with(user.id, device, tick=3)
    manager._last_value[user.id] = {device.id: 120.0}

    manager.disconnect(user.id, sock)

    assert manager.connected_user_ids == []
    assert user.id not in manager._tick
    assert user.id not in manager._last_value
    assert user.id not in manager._devices


def test_non_sampling_tick_writes_nothing(db, user, session_factory, monkeypatch):
    monkeypatch.setattr(ws, "_TICK_SECONDS", 5.0)
    monkeypatch.setattr(ws, "SessionLocal", session_factory)
    device = _device(db, user)
    manager, sock = _manager_with(user.id, device, tick=0)  # next tick is 1

    _run_one_tick(manager)

    assert db.query(SensorReading).count() == 0
    assert sock.sent and sock.sent[0]["type"] == "readings"


def test_every_fifth_tick_persists(db, user, session_factory, monkeypatch):
    monkeypatch.setattr(ws, "_TICK_SECONDS", 5.0)
    monkeypatch.setattr(ws, "SessionLocal", session_factory)
    device = _device(db, user)
    manager, _ = _manager_with(user.id, device, tick=4)  # next tick is 5

    _run_one_tick(manager)

    rows = db.query(SensorReading).all()
    assert len(rows) == 1
    assert rows[0].device_id == device.id


def test_loop_exits_when_nobody_is_connected(db, user, monkeypatch):
    monkeypatch.setattr(ws, "_TICK_SECONDS", 0.01)
    manager = ws.ConnectionManager()

    async def drive():
        # No connections at all: the loop must finish on its own rather than
        # spin forever, so an idle deployment does no work.
        await asyncio.wait_for(manager.run_loop(), timeout=1.0)

    asyncio.run(drive())
    assert manager.connected_user_ids == []
