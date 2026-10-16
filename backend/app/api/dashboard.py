from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.db import models, schemas

router = APIRouter()


@router.get("/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    eid = current_user.empresa_id

    total_dispositivos = db.query(models.Dispositivo).filter(
        models.Dispositivo.empresa_id == eid,
        models.Dispositivo.activo == True
    ).count()

    dispositivos_disponibles = db.query(models.Dispositivo).filter(
        models.Dispositivo.empresa_id == eid,
        models.Dispositivo.estado == 'disponible',
        models.Dispositivo.activo == True
    ).count()

    dispositivos_asignados = db.query(models.Dispositivo).filter(
        models.Dispositivo.empresa_id == eid,
        models.Dispositivo.estado == 'asignado',
        models.Dispositivo.activo == True
    ).count()

    total_vehiculos = db.query(models.Vehiculo).filter(
        models.Vehiculo.empresa_id == eid,
        models.Vehiculo.activo == True
    ).count()

    vehiculos_activos = db.query(models.Vehiculo).filter(
        models.Vehiculo.empresa_id == eid,
        models.Vehiculo.estado == 'activo',
        models.Vehiculo.activo == True
    ).count()

    vehiculos_sin_dispositivo = db.query(models.Vehiculo).filter(
        models.Vehiculo.empresa_id == eid,
        models.Vehiculo.dispositivo_id.is_(None),
        models.Vehiculo.activo == True
    ).count()

    total_conductores = db.query(models.Conductor).filter(
        models.Conductor.empresa_id == eid,
        models.Conductor.activo == True
    ).count()

    alertas_pendientes = 0
    vehiculo_ids = [v.id for v in db.query(models.Vehiculo.id).filter(
        models.Vehiculo.empresa_id == eid
    ).all()]
    if vehiculo_ids:
        alertas_pendientes = db.query(models.AlertaPanico).filter(
            models.AlertaPanico.vehiculo_id.in_(vehiculo_ids),
            models.AlertaPanico.estado == 'pendiente'
        ).count()

    return schemas.DashboardStats(
        total_dispositivos=total_dispositivos,
        dispositivos_disponibles=dispositivos_disponibles,
        dispositivos_asignados=dispositivos_asignados,
        total_vehiculos=total_vehiculos,
        vehiculos_activos=vehiculos_activos,
        vehiculos_sin_dispositivo=vehiculos_sin_dispositivo,
        total_conductores=total_conductores,
        alertas_pendientes=alertas_pendientes
    )
