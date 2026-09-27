"""Pure sensor-data simulation: per-device random walk + HR-zone suggestions.

In-process (no MQTT broker). The ``paho-mqtt`` + Mosquitto path is a documented
Phase 8 upgrade; this keeps the demo zero-ops.
"""

from __future__ import annotations

import random

from app.models.enums import DeviceType, SensorMetric

# Each device type emits one characteristic metric.
METRIC_BY_TYPE: dict[DeviceType, SensorMetric] = {
    DeviceType.treadmill: SensorMetric.speed,
    DeviceType.bike: SensorMetric.resistance,
    DeviceType.smartband: SensorMetric.heart_rate,
}

_RANGE: dict[SensorMetric, tuple[float, float]] = {
    SensorMetric.speed: (4.0, 14.0),
    SensorMetric.resistance: (1.0, 20.0),
    SensorMetric.heart_rate: (60.0, 180.0),
}

_STEP: dict[SensorMetric, float] = {
    SensorMetric.speed: 0.8,
    SensorMetric.resistance: 1.0,
    SensorMetric.heart_rate: 6.0,
}


def next_reading(
    device_type: DeviceType, prev_value: float | None = None
) -> tuple[SensorMetric, float]:
    """Return (metric, value) for the device, drifting gently from ``prev_value``."""
    metric = METRIC_BY_TYPE[device_type]
    lo, hi = _RANGE[metric]
    if prev_value is None:
        value = random.uniform(lo + (hi - lo) * 0.3, lo + (hi - lo) * 0.6)
    else:
        value = prev_value + random.uniform(-_STEP[metric], _STEP[metric])
    value = max(lo, min(hi, value))
    return metric, round(value, 1)


def suggest(heart_rate: float) -> str:
    """Coaching suggestion from a heart-rate zone."""
    if heart_rate < 100:
        return "Warm-up zone — you can push the pace a little."
    if heart_rate < 140:
        return "Fat-burn zone — keep it steady."
    if heart_rate < 170:
        return "Cardio zone — strong work; maintain or ease off if needed."
    return "Heart rate high — slow down and recover."
