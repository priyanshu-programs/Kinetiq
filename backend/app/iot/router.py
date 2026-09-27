from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import get_current_user
from app.config import settings
from app.db import SessionLocal, get_db
from app.iot.retention import maybe_prune
from app.iot.ws import manager
from app.models.enums import DeviceStatus, DeviceType
from app.models.iot import Device
from app.models.user import User
from app.schemas.iot import DeviceOut

router = APIRouter(tags=["iot"])

_DEFAULT_DEVICES = [
    ("Treadmill T-100", DeviceType.treadmill),
    ("Spin Bike B-200", DeviceType.bike),
    ("Smart Band S-1", DeviceType.smartband),
]


def _ensure_devices(db: Session, user_id: int) -> list[Device]:
    devices = db.scalars(select(Device).where(Device.user_id == user_id)).all()
    if not devices:
        for name, dtype in _DEFAULT_DEVICES:
            db.add(
                Device(
                    user_id=user_id,
                    name=name,
                    type=dtype,
                    status=DeviceStatus.online,
                )
            )
        db.commit()
        devices = db.scalars(select(Device).where(Device.user_id == user_id)).all()
    return devices


@router.get("/iot/devices", response_model=list[DeviceOut])
def list_devices(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    devices = _ensure_devices(db, user.id)
    # Also prune here (hourly-guarded), so retention advances even if nobody
    # ever opens a socket.
    maybe_prune(db)
    return devices


@router.websocket("/ws/iot")
async def iot_stream(websocket: WebSocket, token: str = ""):
    """Live sensor stream. Auth via ``?token=`` query param (WS can't set headers)."""
    user_id = _user_id_from_token(token)
    if user_id is None:
        await websocket.close(code=4401)  # unauthorized
        return

    # Make sure the user still exists and has devices to stream. A valid but
    # stale token would otherwise create device rows for a deleted user.
    db = SessionLocal()
    try:
        if db.get(User, user_id) is None:
            await websocket.close(code=4401)
            return
        _ensure_devices(db, user_id)
    finally:
        db.close()

    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()  # keep-alive; client may ping
    except WebSocketDisconnect:
        pass
    finally:
        # Always deregister: a leaked socket would keep the simulator loop
        # running — and writing rows — for a client that is already gone.
        manager.disconnect(user_id, websocket)


def _user_id_from_token(token: str) -> int | None:
    if not token:
        return None
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        sub = payload.get("sub")
        return int(sub) if sub is not None else None
    except (JWTError, ValueError):
        return None
