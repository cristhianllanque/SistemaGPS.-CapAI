from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.db import models, schemas

router = APIRouter()


@router.get("/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    empresa_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    target_eid = current_user.empresa_id
    if current_user.rol == 'superadmin':
        target_eid = empresa_id  # If None, global metrics

    disp_query = db.query(models.Dispositivo).filter(models.Dispositivo.activo == True)
    veh_query = db.query(models.Vehiculo).filter(models.Vehiculo.activo == True)
    cond_query = db.query(models.Conductor).filter(models.Conductor.activo == True)

    if target_eid:
        disp_query = disp_query.filter(models.Dispositivo.empresa_id == target_eid)
        veh_query = veh_query.filter(models.Vehiculo.empresa_id == target_eid)
        cond_query = cond_query.filter(models.Conductor.empresa_id == target_eid)

    total_dispositivos = disp_query.count()
    dispositivos_disponibles = disp_query.filter(models.Dispositivo.estado == 'disponible').count()
    dispositivos_asignados = disp_query.filter(models.Dispositivo.estado == 'instalado').count()

    total_vehiculos = veh_query.count()
    vehiculos_activos = veh_query.filter(models.Vehiculo.estado == 'activo').count()
    vehiculos_sin_dispositivo = veh_query.filter(models.Vehiculo.dispositivo_id.is_(None)).count()

    total_conductores = cond_query.count()

    alerta_query = db.query(models.AlertaPanico).filter(models.AlertaPanico.estado == 'pendiente')
    if target_eid:
        vehiculo_ids = [v.id for v in veh_query.all()]
        if vehiculo_ids:
            alerta_query = alerta_query.filter(models.AlertaPanico.vehiculo_id.in_(vehiculo_ids))
        else:
            alerta_query = alerta_query.filter(models.AlertaPanico.id == -1)
    
    alertas_pendientes = alerta_query.count()

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
