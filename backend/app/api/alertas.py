from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime

from app.api.deps import get_db, get_current_user
from app.db import models, schemas

router = APIRouter()


@router.get("/", response_model=List[schemas.AlertaPanicoOut])
def get_alertas_pendientes(
    estado: Optional[str] = None,
    db: Session = Depends(get_db), 
    current_user: models.Usuario = Depends(get_current_user)
):
    vehiculos_empresa = [v.id for v in db.query(models.Vehiculo.id).filter(
        models.Vehiculo.empresa_id == current_user.empresa_id
    ).all()]

    if not vehiculos_empresa:
        return []

    query = db.query(models.AlertaPanico).options(
        joinedload(models.AlertaPanico.usuario_atendio)
    ).filter(
        models.AlertaPanico.vehiculo_id.in_(vehiculos_empresa)
    )
    
    if estado:
        query = query.filter(models.AlertaPanico.estado == estado)
    else:
        query = query.filter(models.AlertaPanico.estado == 'pendiente')

    alertas = query.order_by(models.AlertaPanico.fecha_hora.desc()).all()

    result = []
    for a in alertas:
        data = schemas.AlertaPanicoOut.model_validate(a)
        if a.usuario_atendio:
            data.usuario_atendio_nombre = a.usuario_atendio.nombre
            
        vehiculo = db.query(models.Vehiculo).options(
            joinedload(models.Vehiculo.conductor)
        ).filter(models.Vehiculo.id == a.vehiculo_id).first()
        if vehiculo:
            data.placa = vehiculo.placa
            if vehiculo.conductor:
                data.conductor_nombre = vehiculo.conductor.nombre
        result.append(data)
    return result


@router.get("/historial", response_model=List[schemas.AlertaPanicoOut])
def get_alertas_historial(
    db: Session = Depends(get_db), 
    current_user: models.Usuario = Depends(get_current_user)
):
    vehiculos_empresa = [v.id for v in db.query(models.Vehiculo.id).filter(
        models.Vehiculo.empresa_id == current_user.empresa_id
    ).all()]

    if not vehiculos_empresa:
        return []

    alertas = db.query(models.AlertaPanico).options(
        joinedload(models.AlertaPanico.usuario_atendio)
    ).filter(
        models.AlertaPanico.vehiculo_id.in_(vehiculos_empresa)
    ).order_by(models.AlertaPanico.fecha_hora.desc()).limit(100).all()

    result = []
    for a in alertas:
        data = schemas.AlertaPanicoOut.model_validate(a)
        if a.usuario_atendio:
            data.usuario_atendio_nombre = a.usuario_atendio.nombre
            
        vehiculo = db.query(models.Vehiculo).options(
            joinedload(models.Vehiculo.conductor)
        ).filter(models.Vehiculo.id == a.vehiculo_id).first()
        if vehiculo:
            data.placa = vehiculo.placa
            if vehiculo.conductor:
                data.conductor_nombre = vehiculo.conductor.nombre
        result.append(data)
    return result


@router.put("/{alerta_id}/atender")
def atender_alerta(
    alerta_id: int, 
    payload: schemas.AlertaAtender,
    db: Session = Depends(get_db), 
    current_user: models.Usuario = Depends(get_current_user)
):
    alerta = db.query(models.AlertaPanico).filter(models.AlertaPanico.id == alerta_id).first()
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == alerta.vehiculo_id).first()
    if not vehiculo or vehiculo.empresa_id != current_user.empresa_id:
        raise HTTPException(status_code=403, detail="No tienes permisos sobre esta alerta")

    alerta.estado = payload.estado
    alerta.observaciones_atencion = payload.observaciones_atencion
    alerta.usuario_atendio_id = current_user.id
    alerta.fecha_atencion = datetime.utcnow()
    db.commit()

    return {"status": "ok", "message": "Alerta actualizada exitosamente"}
