from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import DeviceStatus, DeviceType, SensorMetric


class DeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    type: DeviceType
    status: DeviceStatus


class SensorReadingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    device_id: int
    metric: SensorMetric
    value: float
    ts: datetime
