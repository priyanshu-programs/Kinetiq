"""WebSocket connection manager + in-process simulator broadcast loop.

The loop runs only while someone is connected: it starts on the first
connection and exits when the last one goes away, so an idle deployment does
nothing at all and the database can scale to zero.

Device rows are cached per connection, so the 4-in-5 ticks that do not persist
touch no database at all — against a managed database each of those would
otherwise be a network round trip inside the event loop.
"""

from __future__ import annotations

import asyncio
from typing import NamedTuple

from loguru import logger
from sqlalchemy import select

from app.db import SessionLocal
from app.iot.retention import maybe_prune
from app.iot.simulator import next_reading, suggest
from app.models.enums import DeviceType, SensorMetric
from app.models.iot import Device, SensorReading
from app.timeutil import utc_now

_TICK_SECONDS = 2.0
_PERSIST_EVERY = 5  # persist a SensorReading every Nth tick (bound DB growth)
_PRUNE_EVERY = 450  # ~15 min of connected time; maybe_prune is hourly-guarded


class _CachedDevice(NamedTuple):
    """A user's device, cached for the lifetime of their connection."""

    id: int
    name: str
    type: DeviceType


class ConnectionManager:
    def __init__(self) -> None:
        self._active: dict[int, set] = {}
        self._tick: dict[int, int] = {}
        self._last_value: dict[int, dict[int, float]] = {}  # user -> device -> value
        self._devices: dict[int, list[_CachedDevice]] = {}
        self._loop_task: asyncio.Task | None = None

    # -- connection lifecycle -------------------------------------------------

    async def connect(self, user_id: int, ws) -> None:
        await ws.accept()
        self._active.setdefault(user_id, set()).add(ws)
        self._tick.setdefault(user_id, 0)
        self._last_value.setdefault(user_id, {})
        if user_id not in self._devices:
            self._devices[user_id] = await asyncio.to_thread(self._load_devices, user_id)
        # Retention advances on simulator activation.
        await asyncio.to_thread(self._prune)
        self._ensure_loop()

    def disconnect(self, user_id: int, ws) -> None:
        conns = self._active.get(user_id)
        if conns:
            conns.discard(ws)
        if not conns:
            self._active.pop(user_id, None)
            self._tick.pop(user_id, None)
            self._last_value.pop(user_id, None)
            self._devices.pop(user_id, None)

    @property
    def connected_user_ids(self) -> list[int]:
        return list(self._active.keys())

    def _ensure_loop(self) -> None:
        if self._loop_task is None or self._loop_task.done():
            self._loop_task = asyncio.create_task(self.run_loop())

    # -- database work (sync; always called via asyncio.to_thread) ------------

    def _load_devices(self, user_id: int) -> list[_CachedDevice]:
        db = SessionLocal()
        try:
            return [
                _CachedDevice((d.id, d.name, d.type))
                for d in db.scalars(select(Device).where(Device.user_id == user_id)).all()
            ]
        finally:
            db.close()

    def _prune(self) -> int:
        db = SessionLocal()
        try:
            return maybe_prune(db)
        finally:
            db.close()

    def _persist(self, samples: list[tuple[int, SensorMetric, float]]) -> None:
        db = SessionLocal()
        try:
            for device_id, metric, value in samples:
                db.add(SensorReading(device_id=device_id, metric=metric, value=value))
            db.commit()
        finally:
            db.close()

    # -- streaming ------------------------------------------------------------

    async def _send(self, user_id: int, payload: dict) -> None:
        for ws in list(self._active.get(user_id, set())):
            try:
                await ws.send_json(payload)
            except Exception:  # noqa: BLE001 — drop dead sockets silently
                self.disconnect(user_id, ws)

    def _build_readings(self, user_id: int) -> tuple[list[dict], list[tuple]]:
        """Generate one reading per cached device. No database access."""
        readings: list[dict] = []
        samples: list[tuple[int, SensorMetric, float]] = []
        last = self._last_value.setdefault(user_id, {})
        now = utc_now().isoformat()
        for device in self._devices.get(user_id, []):
            metric, value = next_reading(device.type, last.get(device.id))
            last[device.id] = value
            samples.append((device.id, metric, value))
            readings.append(
                {
                    "device_id": device.id,
                    "name": device.name,
                    "type": device.type.value,
                    "metric": metric.value,
                    "value": value,
                    "ts": now,
                    "suggestion": suggest(value)
                    if metric == SensorMetric.heart_rate
                    else None,
                }
            )
        return readings, samples

    async def run_loop(self) -> None:
        logger.info("IoT simulator loop started.")
        try:
            while self._active:
                for user_id in self.connected_user_ids:
                    tick = self._tick.get(user_id, 0) + 1
                    self._tick[user_id] = tick

                    readings, samples = self._build_readings(user_id)
                    if not readings:
                        continue
                    if tick % _PERSIST_EVERY == 0:
                        await asyncio.to_thread(self._persist, samples)
                    if tick % _PRUNE_EVERY == 0:
                        await asyncio.to_thread(self._prune)
                    await self._send(user_id, {"type": "readings", "readings": readings})
                await asyncio.sleep(_TICK_SECONDS)
        except asyncio.CancelledError:
            logger.info("IoT simulator loop cancelled.")
            raise
        finally:
            logger.info("IoT simulator loop stopped.")


manager = ConnectionManager()


async def stop_simulator() -> None:
    """Cancel the loop on app shutdown, if one is running."""
    task = manager._loop_task
    if task is not None and not task.done():
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    manager._loop_task = None
