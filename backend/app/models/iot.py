from datetime import datetime

from sqlalchemy import Float, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import DeviceStatus, DeviceType, SensorMetric
from app.models.types import TZDateTime, enum_column


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    type: Mapped[DeviceType] = mapped_column(enum_column(DeviceType), nullable=False)
    status: Mapped[DeviceStatus] = mapped_column(
        enum_column(DeviceStatus), default=DeviceStatus.offline
    )


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), nullable=False)
    metric: Mapped[SensorMetric] = mapped_column(enum_column(SensorMetric), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    ts: Mapped[datetime] = mapped_column(TZDateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_sensor_device_ts", "device_id", "ts"),
        # Retention prunes by age alone, which cannot use the composite index
        # above because that one leads with device_id.
        Index("ix_sensor_ts", "ts"),
    )
