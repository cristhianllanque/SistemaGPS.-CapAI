from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db import models
from app.websockets.manager import manager


def set_vehicle_device(db: Session, vehicle: models.Vehiculo, device_id: int | None) -> set[int]:
    """Change the GPS link in the caller's transaction. Lock the vehicle before calling for existing rows."""
    device_ids = {id_ for id_ in (vehicle.dispositivo_id, device_id) if id_ is not None}
    if not device_ids:
        return set()

    devices = {
        device.id: device
        for device in db.query(models.Dispositivo)
        .filter(models.Dispositivo.id.in_(device_ids))
        .order_by(models.Dispositivo.id)
        .populate_existing()
        .with_for_update()
        .all()
    }
    target = devices.get(device_id)
    previous = devices.get(vehicle.dispositivo_id)
    if device_id is not None:
        if not target:
            raise HTTPException(404, "Dispositivo GPS no encontrado.")
        if not target.activo or target.estado in {"mantenimiento", "baja"}:
            raise HTTPException(409, "El GPS seleccionado no está disponible para instalar.")
        conflict = db.query(models.Vehiculo.id).filter(
            models.Vehiculo.dispositivo_id == device_id,
            models.Vehiculo.activo.is_(True),
            models.Vehiculo.id != vehicle.id,
        ).with_for_update().first()
        if conflict:
            raise HTTPException(409, "El GPS ya está vinculado a otro vehículo activo.")

    owners = {device.empresa_id for device in devices.values() if device.empresa_id is not None}
    if previous and previous != target:
        # A legacy duplicate link must not release a GPS still used by another vehicle.
        other_vehicle = db.query(models.Vehiculo.id).filter(
            models.Vehiculo.dispositivo_id == previous.id,
            models.Vehiculo.activo.is_(True),
            models.Vehiculo.id != vehicle.id,
        ).with_for_update().first()
        if not other_vehicle:
            previous.empresa_id = None
            if previous.activo and previous.estado not in {"mantenimiento", "baja"}:
                previous.estado = "disponible"

    if vehicle.dispositivo_id != device_id:
        vehicle.gps_asignado_at = datetime.utcnow() if target else None
        vehicle.dispositivo_id = device_id
    if target:
        target.empresa_id = vehicle.empresa_id
        target.estado = "instalado"
    return owners


def notify_vehicle_change(empresa_id: int, vehiculo_id: int, inventory_owners: set[int] | None = None):
    manager.notify_sync(empresa_id, {"type": "entity_updated", "entity": "vehiculos", "vehiculo_id": vehiculo_id})
    if inventory_owners is not None:
        for owner_id in inventory_owners | {empresa_id}:
            manager.notify_sync(owner_id, {"type": "entity_updated", "entity": "dispositivos"})
