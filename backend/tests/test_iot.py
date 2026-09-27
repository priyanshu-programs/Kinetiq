"""IoT module: simulator ranges/suggestions + device bootstrap endpoint."""

from app.iot.simulator import METRIC_BY_TYPE, next_reading, suggest, _RANGE
from app.models.enums import DeviceType


def test_next_reading_within_range():
    for dtype in DeviceType:
        metric, value = next_reading(dtype)
        lo, hi = _RANGE[metric]
        assert lo <= value <= hi
        assert metric == METRIC_BY_TYPE[dtype]


def test_random_walk_stays_bounded():
    value = None
    for _ in range(200):
        _, value = next_reading(DeviceType.smartband, value)
    lo, hi = _RANGE[METRIC_BY_TYPE[DeviceType.smartband]]
    assert lo <= value <= hi


def test_suggest_zone_mapping():
    assert "Warm-up" in suggest(80)
    assert "Fat-burn" in suggest(120)
    assert "Cardio" in suggest(150)
    assert "high" in suggest(180).lower()


def test_devices_bootstrap_is_idempotent(client, auth_headers):
    r = client.get("/iot/devices", headers=auth_headers)
    assert r.status_code == 200
    devices = r.json()
    assert len(devices) == 3
    types = {d["type"] for d in devices}
    assert types == {"treadmill", "bike", "smartband"}

    # Second call must not create duplicates.
    r2 = client.get("/iot/devices", headers=auth_headers)
    assert len(r2.json()) == 3
