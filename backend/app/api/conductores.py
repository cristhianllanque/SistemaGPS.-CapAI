from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_db, get_current_user
from app.db import models, schemas

router = APIRouter()


@router.get("/", response_model=List[schemas.ConductorOut])
def list_conductores(
    search: Optional[str] = Query(None),
    empresa_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    query = db.query(models.Conductor).filter(models.Conductor.activo == True)
    if current_user.rol == 'superadmin':
        if empresa_id:
            query = query.filter(models.Conductor.empresa_id == empresa_id)
    else:
        query = query.filter(models.Conductor.empresa_id == current_user.empresa_id)

    if search:
        query = query.filter(
            (models.Conductor.nombre.contains(search)) |
            (models.Conductor.dni.contains(search))
        )
    conductores = query.order_by(models.Conductor.created_at.desc()).all()

    result = []
    for c in conductores:
        data = schemas.ConductorOut.model_validate(c)
        if c.vehiculo:
            data.vehiculo_placa = c.vehiculo.placa
        result.append(data)
    return result


@router.get("/disponibles", response_model=List[schemas.ConductorOut])
def list_conductores_disponibles(
    empresa_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Conductores que no están asignados a ningún vehículo"""
    target_empresa_id = current_user.empresa_id
    if current_user.rol == 'superadmin' and empresa_id:
        target_empresa_id = empresa_id

    # Get all conductor IDs that are assigned to a vehicle
    assigned_query = db.query(models.Vehiculo.conductor_id).filter(
        models.Vehiculo.conductor_id.isnot(None),
        models.Vehiculo.activo == True
    )
    if target_empresa_id:
        assigned_query = assigned_query.filter(models.Vehiculo.empresa_id == target_empresa_id)
    assigned_ids = [v.conductor_id for v in assigned_query.all()]

    cond_query = db.query(models.Conductor).filter(models.Conductor.activo == True)
    if target_empresa_id:
        cond_query = cond_query.filter(models.Conductor.empresa_id == target_empresa_id)
    if assigned_ids:
        cond_query = cond_query.filter(~models.Conductor.id.in_(assigned_ids))

    conductores = cond_query.all()
    return [schemas.ConductorOut.model_validate(c) for c in conductores]


@router.get("/{conductor_id}", response_model=schemas.ConductorOut)
def get_conductor(
    conductor_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    c = db.query(models.Conductor).filter(
        models.Conductor.id == conductor_id,
        models.Conductor.empresa_id == current_user.empresa_id
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    data = schemas.ConductorOut.model_validate(c)
    if c.vehiculo:
        data.vehiculo_placa = c.vehiculo.placa
    return data


@router.post("/", response_model=schemas.ConductorOut, status_code=201)
def create_conductor(
    payload: schemas.ConductorCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != 'superadmin':
        raise HTTPException(status_code=403, detail="Acción permitida exclusivamente para el Administrador Principal (Copay)")

    exists = db.query(models.Conductor).filter(models.Conductor.dni == payload.dni).first()
    if exists:
        raise HTTPException(status_code=400, detail="Ya existe un conductor con ese DNI")

    target_empresa_id = payload.empresa_id if (current_user.rol == 'superadmin' and payload.empresa_id) else current_user.empresa_id
    if not target_empresa_id:
        emp_default = db.query(models.Empresa).first()
        target_empresa_id = emp_default.id if emp_default else 1

    cond_data = payload.model_dump()
    cond_data["empresa_id"] = target_empresa_id

    conductor = models.Conductor(**cond_data)
    db.add(conductor)
    db.commit()
    db.refresh(conductor)
    
    out = schemas.ConductorOut.model_validate(conductor)
    if conductor.empresa:
        out.empresa_nombre = conductor.empresa.nombre
    return out


@router.put("/{conductor_id}", response_model=schemas.ConductorOut)
def update_conductor(
    conductor_id: int,
    payload: schemas.ConductorUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != 'superadmin':
        raise HTTPException(status_code=403, detail="Acción permitida exclusivamente para el Administrador Principal (Copay)")

    c = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")

    update_data = payload.model_dump(exclude_unset=True)

    if "dni" in update_data:
        exists = db.query(models.Conductor).filter(
            models.Conductor.dni == update_data["dni"],
            models.Conductor.id != conductor_id
        ).first()
        if exists:
            raise HTTPException(status_code=400, detail="Ya existe un conductor con ese DNI")

    for key, value in update_data.items():
        setattr(c, key, value)

    db.commit()
    db.refresh(c)
    data = schemas.ConductorOut.model_validate(c)
    if c.vehiculo:
        data.vehiculo_placa = c.vehiculo.placa
    if c.empresa:
        data.empresa_nombre = c.empresa.nombre
    return data


@router.delete("/{conductor_id}")
def delete_conductor(
    conductor_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != 'superadmin':
        raise HTTPException(status_code=403, detail="Acción permitida exclusivamente para el Administrador Principal (Copay)")

    c = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")

    # Check if assigned to a vehicle
    if c.vehiculo:
        raise HTTPException(status_code=400, detail="No se puede dar de baja un conductor asignado a un vehículo. Desvincúlelo primero.")

    c.activo = False
    db.commit()
    return {"status": "ok", "message": "Conductor dado de baja"}
