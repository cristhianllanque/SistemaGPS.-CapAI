from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta

from app.api.deps import get_db, get_current_user
from app.db import models, schemas
from app.websockets.manager import manager

router = APIRouter()


@router.get("/", response_model=List[schemas.DispositivoOut])
def list_dispositivos(
    estado: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    query = db.query(models.Dispositivo).filter(models.Dispositivo.activo == True)
    if current_user.rol != 'superadmin':
        query = query.filter(models.Dispositivo.empresa_id == current_user.empresa_id)
    if estado:
        if estado in ('asignado', 'instalado'):
            query = query.filter(models.Dispositivo.estado.in_(['asignado', 'instalado']))
        else:
            query = query.filter(models.Dispositivo.estado == estado)
    if search:
        query = query.filter(
            (models.Dispositivo.imei.contains(search)) |
            (models.Dispositivo.numero_serie.contains(search)) |
            (models.Dispositivo.numero_sim.contains(search)) |
            (models.Dispositivo.iccid_sim.contains(search)) |
            (models.Dispositivo.operador_sim.contains(search)) |
            (models.Dispositivo.plan_sim.contains(search)) |
            (models.Dispositivo.apn_sim.contains(search))
        )
    dispositivos = query.order_by(models.Dispositivo.created_at.desc()).all()

    result = []
    for d in dispositivos:
        data = schemas.DispositivoOut.model_validate(d)
        if d.vehiculo:
            data.vehiculo_placa = d.vehiculo.placa
            if not data.ultima_conexion:
                ultima_lect = db.query(models.LecturaGPS.timestamp).filter(
                    models.LecturaGPS.vehiculo_id == d.vehiculo.id
                ).order_by(models.LecturaGPS.timestamp.desc()).first()
                if ultima_lect and ultima_lect[0]:
                    data.ultima_conexion = ultima_lect[0]
        if d.empresa:
            data.empresa_nombre = d.empresa.nombre
        elif d.vehiculo and d.vehiculo.empresa:
            data.empresa_nombre = d.vehiculo.empresa.nombre
        result.append(data)
    return result


@router.get("/disponibles", response_model=List[schemas.DispositivoOut])
def list_dispositivos_disponibles(
    empresa_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    query = db.query(models.Dispositivo).filter(
        models.Dispositivo.estado == 'disponible',
        models.Dispositivo.activo == True
    )
    if current_user.rol != 'superadmin':
        query = query.filter(models.Dispositivo.empresa_id == current_user.empresa_id)
    elif empresa_id:
        query = query.filter(
            (models.Dispositivo.empresa_id == empresa_id) | (models.Dispositivo.empresa_id == None)
        )
    dispositivos = query.all()
    return [schemas.DispositivoOut.model_validate(d) for d in dispositivos]


@router.get("/{dispositivo_id}", response_model=schemas.DispositivoOut)
def get_dispositivo(
    dispositivo_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    query = db.query(models.Dispositivo).filter(models.Dispositivo.id == dispositivo_id)
    if current_user.rol != 'superadmin':
        query = query.filter(models.Dispositivo.empresa_id == current_user.empresa_id)
    d = query.first()
    if not d:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    data = schemas.DispositivoOut.model_validate(d)
    if d.vehiculo:
        data.vehiculo_placa = d.vehiculo.placa
    return data


@router.post("/", response_model=schemas.DispositivoOut, status_code=201)
def create_dispositivo(
    payload: schemas.DispositivoCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != 'superadmin':
        raise HTTPException(status_code=403, detail="Acción permitida exclusivamente para el Administrador Principal (Copai)")

    # Check unique IMEI
    exists = db.query(models.Dispositivo).filter(models.Dispositivo.imei == payload.imei).first()
    if exists:
        raise HTTPException(status_code=400, detail="Ya existe un dispositivo con ese IMEI")
    exists_serie = db.query(models.Dispositivo).filter(models.Dispositivo.numero_serie == payload.numero_serie).first()
    if exists_serie:
        raise HTTPException(status_code=400, detail="Ya existe un dispositivo con ese número de serie")

    dump_data = payload.model_dump()
    dispositivo = models.Dispositivo(**dump_data)
    db.add(dispositivo)
    db.commit()
    db.refresh(dispositivo)
    manager.notify_sync(dispositivo.empresa_id, {"type": "entity_updated", "entity": "dispositivos", "dispositivo_id": dispositivo.id})
    return schemas.DispositivoOut.model_validate(dispositivo)


@router.put("/{dispositivo_id}", response_model=schemas.DispositivoOut)
def update_dispositivo(
    dispositivo_id: int,
    payload: schemas.DispositivoUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != 'superadmin':
        raise HTTPException(status_code=403, detail="Acción permitida exclusivamente para el Administrador Principal (Copai)")

    d = db.query(models.Dispositivo).filter(models.Dispositivo.id == dispositivo_id).with_for_update().first()
    if not d:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    old_owner = d.empresa_id
    assigned = db.query(models.Vehiculo.id, models.Vehiculo.empresa_id).filter_by(
        dispositivo_id=d.id, activo=True,
    ).first()
    if assigned and (
        update_data.get("empresa_id", assigned.empresa_id) != assigned.empresa_id
        or update_data.get("estado", "instalado") != "instalado"
    ):
        raise HTTPException(409, "Desvincula el GPS del vehículo antes de cambiar su empresa o estado.")
    if "imei" in update_data and update_data["imei"] != d.imei and assigned:
        raise HTTPException(409, "Desvincula el GPS antes de corregir su IMEI para conservar la asignación histórica.")

    # Validate unique constraints if changing
    if "imei" in update_data:
        exists = db.query(models.Dispositivo).filter(
            models.Dispositivo.imei == update_data["imei"],
            models.Dispositivo.id != dispositivo_id
        ).first()
        if exists:
            raise HTTPException(status_code=400, detail="Ya existe un dispositivo con ese IMEI")

    if "numero_serie" in update_data:
        exists = db.query(models.Dispositivo).filter(
            models.Dispositivo.numero_serie == update_data["numero_serie"],
            models.Dispositivo.id != dispositivo_id
        ).first()
        if exists:
            raise HTTPException(status_code=400, detail="Ya existe un dispositivo con ese número de serie")

    for key, value in update_data.items():
        setattr(d, key, value)

    db.commit()
    db.refresh(d)
    data = schemas.DispositivoOut.model_validate(d)
    if d.vehiculo:
        data.vehiculo_placa = d.vehiculo.placa
    manager.notify_sync(d.empresa_id, {"type": "entity_updated", "entity": "dispositivos", "dispositivo_id": d.id})
    if old_owner != d.empresa_id and old_owner is not None:
        manager.notify_sync(old_owner, {"type": "entity_updated", "entity": "dispositivos"})
    return data


@router.post("/{dispositivo_id}/renovar-sim", response_model=schemas.DispositivoOut)
def renovar_sim_dispositivo(
    dispositivo_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != 'superadmin':
        raise HTTPException(status_code=403, detail="Acción permitida exclusivamente para el Administrador Principal (Copai)")

    d = db.query(models.Dispositivo).filter(models.Dispositivo.id == dispositivo_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")

    hoy = date.today()
    if not d.fecha_activacion_sim:
        d.fecha_activacion_sim = hoy

    base_date = d.fecha_vencimiento_sim if (d.fecha_vencimiento_sim and d.fecha_vencimiento_sim >= hoy) else hoy
    try:
        d.fecha_vencimiento_sim = base_date.replace(year=base_date.year + 1)
    except ValueError:
        # En caso de 29 de febrero (año bisiesto)
        d.fecha_vencimiento_sim = base_date + timedelta(days=365)

    db.commit()
    db.refresh(d)
    data = schemas.DispositivoOut.model_validate(d)
    if d.vehiculo:
        data.vehiculo_placa = d.vehiculo.placa
    if d.empresa:
        data.empresa_nombre = d.empresa.nombre
    elif d.vehiculo and d.vehiculo.empresa:
        data.empresa_nombre = d.vehiculo.empresa.nombre
    manager.notify_sync(d.empresa_id, {"type": "entity_updated", "entity": "dispositivos", "dispositivo_id": d.id})
    return data


@router.delete("/{dispositivo_id}")
def delete_dispositivo(
    dispositivo_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != 'superadmin':
        raise HTTPException(status_code=403, detail="Acción permitida exclusivamente para el Administrador Principal (Copai)")

    d = db.query(models.Dispositivo).filter(models.Dispositivo.id == dispositivo_id).with_for_update().first()
    if not d:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")

    assigned = db.query(models.Vehiculo.id).filter_by(dispositivo_id=d.id, activo=True).first()
    if assigned:
        raise HTTPException(status_code=400, detail="No se puede dar de baja un dispositivo instalado. Desvincúlelo primero.")

    d.activo = False
    d.estado = 'baja'
    db.commit()
    manager.notify_sync(d.empresa_id, {"type": "entity_updated", "entity": "dispositivos", "dispositivo_id": d.id})
    return {"status": "ok", "message": "Dispositivo dado de baja"}
