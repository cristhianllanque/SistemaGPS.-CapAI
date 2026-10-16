from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_db, get_current_user
from app.db import models, schemas

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
        query = query.filter(models.Dispositivo.estado == estado)
    if search:
        query = query.filter(
            (models.Dispositivo.imei.contains(search)) |
            (models.Dispositivo.numero_serie.contains(search))
        )
    dispositivos = query.order_by(models.Dispositivo.created_at.desc()).all()

    result = []
    for d in dispositivos:
        data = schemas.DispositivoOut.model_validate(d)
        if d.vehiculo:
            data.vehiculo_placa = d.vehiculo.placa
        if d.empresa:
            data.empresa_nombre = d.empresa.nombre
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
        raise HTTPException(status_code=403, detail="Acción permitida exclusivamente para el Administrador Principal (Copay)")

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
    return schemas.DispositivoOut.model_validate(dispositivo)


@router.put("/{dispositivo_id}", response_model=schemas.DispositivoOut)
def update_dispositivo(
    dispositivo_id: int,
    payload: schemas.DispositivoUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != 'superadmin':
        raise HTTPException(status_code=403, detail="Acción permitida exclusivamente para el Administrador Principal (Copay)")

    d = db.query(models.Dispositivo).filter(models.Dispositivo.id == dispositivo_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")

    update_data = payload.model_dump(exclude_unset=True)

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
    return data


@router.delete("/{dispositivo_id}")
def delete_dispositivo(
    dispositivo_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != 'superadmin':
        raise HTTPException(status_code=403, detail="Acción permitida exclusivamente para el Administrador Principal (Copay)")

    d = db.query(models.Dispositivo).filter(models.Dispositivo.id == dispositivo_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")

    if d.estado == 'instalado':
        raise HTTPException(status_code=400, detail="No se puede dar de baja un dispositivo instalado. Desvincúlelo primero.")

    d.activo = False
    d.estado = 'baja'
    db.commit()
    return {"status": "ok", "message": "Dispositivo dado de baja"}
