from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime

from app.api.deps import get_db, get_current_user
from app.db import models, schemas

router = APIRouter()


@router.get("/", response_model=List[schemas.VehiculoOut])
def list_vehiculos(
    search: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    empresa_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    query = db.query(models.Vehiculo).options(
        joinedload(models.Vehiculo.dispositivo),
        joinedload(models.Vehiculo.conductor),
        joinedload(models.Vehiculo.empresa)
    ).filter(models.Vehiculo.activo == True)

    if current_user.rol == 'superadmin':
        if empresa_id:
            query = query.filter(models.Vehiculo.empresa_id == empresa_id)
    else:
        query = query.filter(models.Vehiculo.empresa_id == current_user.empresa_id)

    if estado:
        query = query.filter(models.Vehiculo.estado == estado)
    if search:
        query = query.filter(models.Vehiculo.placa.contains(search))

    vehiculos = query.order_by(models.Vehiculo.created_at.desc()).all()

    result = []
    for v in vehiculos:
        data = schemas.VehiculoOut.model_validate(v)
        if v.empresa:
            data.empresa_nombre = v.empresa.nombre
        # Attach last GPS reading
        ultima = db.query(models.LecturaGPS).filter(
            models.LecturaGPS.vehiculo_id == v.id
        ).order_by(desc(models.LecturaGPS.timestamp)).first()
        if ultima:
            data.ultima_lectura = schemas.LecturaGPSBase.model_validate(ultima)
        result.append(data)
    return result


@router.get("/{vehiculo_id}", response_model=schemas.VehiculoOut)
def get_vehiculo(
    vehiculo_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    query = db.query(models.Vehiculo).options(
        joinedload(models.Vehiculo.dispositivo),
        joinedload(models.Vehiculo.conductor),
        joinedload(models.Vehiculo.empresa)
    ).filter(models.Vehiculo.id == vehiculo_id)

    if current_user.rol != 'superadmin':
        query = query.filter(models.Vehiculo.empresa_id == current_user.empresa_id)

    v = query.first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    data = schemas.VehiculoOut.model_validate(v)
    if v.empresa:
        data.empresa_nombre = v.empresa.nombre
    return data


@router.post("/", response_model=schemas.VehiculoOut, status_code=201)
def create_vehiculo(
    payload: schemas.VehiculoCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    exists = db.query(models.Vehiculo).filter(models.Vehiculo.placa == payload.placa).first()
    if exists:
        raise HTTPException(status_code=400, detail="Ya existe un vehículo con esa placa")

    target_empresa_id = current_user.empresa_id
    if current_user.rol == 'superadmin' and payload.empresa_id:
        target_empresa_id = payload.empresa_id

    if not target_empresa_id:
        empresa_default = db.query(models.Empresa).first()
        target_empresa_id = empresa_default.id if empresa_default else 1

    vehiculo_data = payload.model_dump()
    vehiculo_data["empresa_id"] = target_empresa_id

    vehiculo = models.Vehiculo(**vehiculo_data)
    db.add(vehiculo)
    db.commit()
    db.refresh(vehiculo)

    # Reload with relations
    v = db.query(models.Vehiculo).options(
        joinedload(models.Vehiculo.empresa),
        joinedload(models.Vehiculo.dispositivo),
        joinedload(models.Vehiculo.conductor)
    ).filter(models.Vehiculo.id == vehiculo.id).first()

    data = schemas.VehiculoOut.model_validate(v)
    if v.empresa:
        data.empresa_nombre = v.empresa.nombre
    return data


@router.put("/{vehiculo_id}", response_model=schemas.VehiculoOut)
def update_vehiculo(
    vehiculo_id: int,
    payload: schemas.VehiculoUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    query = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id)
    if current_user.rol != 'superadmin':
        query = query.filter(models.Vehiculo.empresa_id == current_user.empresa_id)

    v = query.first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    if current_user.rol != 'superadmin':
        update_data.pop("empresa_id", None)

    if "placa" in update_data:
        exists = db.query(models.Vehiculo).filter(
            models.Vehiculo.placa == update_data["placa"],
            models.Vehiculo.id != vehiculo_id
        ).first()
        if exists:
            raise HTTPException(status_code=400, detail="Ya existe un vehículo con esa placa")

    for key, value in update_data.items():
        setattr(v, key, value)

    db.commit()
    db.refresh(v)

    v_reloaded = db.query(models.Vehiculo).options(
        joinedload(models.Vehiculo.empresa),
        joinedload(models.Vehiculo.dispositivo),
        joinedload(models.Vehiculo.conductor)
    ).filter(models.Vehiculo.id == v.id).first()

    data = schemas.VehiculoOut.model_validate(v_reloaded)
    if v_reloaded.empresa:
        data.empresa_nombre = v_reloaded.empresa.nombre
    return data


@router.put("/{vehiculo_id}/vincular", response_model=schemas.VehiculoOut)
def vincular_vehiculo(
    vehiculo_id: int,
    payload: schemas.VehiculoVincular,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    query = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id)
    if current_user.rol != 'superadmin':
        query = query.filter(models.Vehiculo.empresa_id == current_user.empresa_id)

    v = query.first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    if payload.dispositivo_id is not None:
        disp_query = db.query(models.Dispositivo).filter(models.Dispositivo.id == payload.dispositivo_id)
        if current_user.rol != 'superadmin':
            disp_query = disp_query.filter(models.Dispositivo.empresa_id == current_user.empresa_id)
        disp = disp_query.first()

        if not disp:
            raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
        if disp.estado == 'instalado' and v.dispositivo_id != disp.id:
            raise HTTPException(status_code=400, detail="El dispositivo ya está instalado en otro vehículo")

        # If vehicle already had a different device, release the old one
        if v.dispositivo_id and v.dispositivo_id != payload.dispositivo_id:
            old_disp = db.query(models.Dispositivo).filter(models.Dispositivo.id == v.dispositivo_id).first()
            if old_disp:
                old_disp.estado = 'disponible'

        v.dispositivo_id = payload.dispositivo_id
        disp.estado = 'instalado'
        disp.empresa_id = v.empresa_id

    if payload.conductor_id is not None:
        cond_query = db.query(models.Conductor).filter(models.Conductor.id == payload.conductor_id)
        if current_user.rol != 'superadmin':
            cond_query = cond_query.filter(models.Conductor.empresa_id == current_user.empresa_id)
        cond = cond_query.first()
        if not cond:
            raise HTTPException(status_code=404, detail="Conductor no encontrado")

        # Check if conductor is already assigned to another vehicle
        existing = db.query(models.Vehiculo).filter(
            models.Vehiculo.conductor_id == payload.conductor_id,
            models.Vehiculo.id != vehiculo_id,
            models.Vehiculo.empresa_id == v.empresa_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"El conductor ya está asignado al vehículo {existing.placa}")

        v.conductor_id = payload.conductor_id

    db.commit()
    db.refresh(v)
    
    v_reloaded = db.query(models.Vehiculo).options(
        joinedload(models.Vehiculo.empresa),
        joinedload(models.Vehiculo.dispositivo),
        joinedload(models.Vehiculo.conductor)
    ).filter(models.Vehiculo.id == v.id).first()

    data = schemas.VehiculoOut.model_validate(v_reloaded)
    if v_reloaded.empresa:
        data.empresa_nombre = v_reloaded.empresa.nombre
    return data


@router.put("/{vehiculo_id}/desvincular-dispositivo", response_model=schemas.VehiculoOut)
def desvincular_dispositivo(
    vehiculo_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    query = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id)
    if current_user.rol != 'superadmin':
        query = query.filter(models.Vehiculo.empresa_id == current_user.empresa_id)
    v = query.first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    if v.dispositivo_id:
        disp = db.query(models.Dispositivo).filter(models.Dispositivo.id == v.dispositivo_id).first()
        if disp:
            disp.estado = 'disponible'
        v.dispositivo_id = None

    db.commit()
    db.refresh(v)

    v_reloaded = db.query(models.Vehiculo).options(
        joinedload(models.Vehiculo.empresa),
        joinedload(models.Vehiculo.dispositivo),
        joinedload(models.Vehiculo.conductor)
    ).filter(models.Vehiculo.id == v.id).first()

    data = schemas.VehiculoOut.model_validate(v_reloaded)
    if v_reloaded.empresa:
        data.empresa_nombre = v_reloaded.empresa.nombre
    return data


@router.put("/{vehiculo_id}/desvincular-conductor", response_model=schemas.VehiculoOut)
def desvincular_conductor(
    vehiculo_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    query = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id)
    if current_user.rol != 'superadmin':
        query = query.filter(models.Vehiculo.empresa_id == current_user.empresa_id)
    v = query.first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    v.conductor_id = None
    db.commit()
    db.refresh(v)

    v_reloaded = db.query(models.Vehiculo).options(
        joinedload(models.Vehiculo.empresa),
        joinedload(models.Vehiculo.dispositivo),
        joinedload(models.Vehiculo.conductor)
    ).filter(models.Vehiculo.id == v.id).first()

    data = schemas.VehiculoOut.model_validate(v_reloaded)
    if v_reloaded.empresa:
        data.empresa_nombre = v_reloaded.empresa.nombre
    return data


@router.delete("/{vehiculo_id}")
def delete_vehiculo(
    vehiculo_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    query = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id)
    if current_user.rol != 'superadmin':
        query = query.filter(models.Vehiculo.empresa_id == current_user.empresa_id)
    v = query.first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    # Release the device if assigned
    if v.dispositivo_id:
        disp = db.query(models.Dispositivo).filter(models.Dispositivo.id == v.dispositivo_id).first()
        if disp:
            disp.estado = 'disponible'

    v.activo = False
    v.dispositivo_id = None
    v.conductor_id = None
    db.commit()
    return {"status": "ok", "message": "Vehículo dado de baja"}


import math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0 # Radius of earth in kilometers
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    lat1 = math.radians(lat1)
    lat2 = math.radians(lat2)
    a = math.sin(dLat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dLon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

@router.get("/{vehiculo_id}/historial", response_model=schemas.HistorialResponse)
def get_historial(
    vehiculo_id: int,
    fecha_inicio: str,
    fecha_fin: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    query = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id)
    if current_user.rol != 'superadmin':
        query = query.filter(models.Vehiculo.empresa_id == current_user.empresa_id)
    vehiculo = query.first()

    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    # The frontend might pass datetime with Z, so handle it
    try:
        inicio = datetime.fromisoformat(fecha_inicio.replace('Z', '+00:00'))
        fin = datetime.fromisoformat(fecha_fin.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido")

    lecturas = db.query(models.LecturaGPS).filter(
        models.LecturaGPS.vehiculo_id == vehiculo_id,
        models.LecturaGPS.timestamp >= inicio,
        models.LecturaGPS.timestamp <= fin
    ).order_by(models.LecturaGPS.timestamp).all()

    coordenadas = []
    distancia_total = 0.0
    velocidad_maxima = 0
    tiempo_encendido_minutos = 0.0
    
    paradas = []
    
    # State tracking for stops
    stop_start_time = None
    stop_lat = None
    stop_lon = None

    if not lecturas:
        return {
            "coordenadas": [],
            "estadisticas": {
                "distancia_km": 0.0,
                "velocidad_maxima": 0,
                "velocidad_promedio": 0.0,
                "tiempo_encendido_minutos": 0.0
            },
            "paradas": []
        }

    for i, lec in enumerate(lecturas):
        coordenadas.append({
            "latitud": lec.latitud,
            "longitud": lec.longitud,
            "velocidad": lec.velocidad,
            "ignicion": lec.ignicion,
            "timestamp": lec.timestamp
        })
        
        if lec.velocidad > velocidad_maxima:
            velocidad_maxima = lec.velocidad
            
        if i > 0:
            prev_lec = lecturas[i-1]
            # Calculate distance
            dist = haversine(prev_lec.latitud, prev_lec.longitud, lec.latitud, lec.longitud)
            distancia_total += dist
            
            # Time difference in minutes
            dt_mins = (lec.timestamp - prev_lec.timestamp).total_seconds() / 60.0
            
            if prev_lec.ignicion:
                tiempo_encendido_minutos += dt_mins
                
        # Stop logic: If speed is 0 or ignition is false
        is_stopped = lec.velocidad == 0 or not lec.ignicion
        
        if is_stopped:
            if stop_start_time is None:
                stop_start_time = lec.timestamp
                stop_lat = lec.latitud
                stop_lon = lec.longitud
        else:
            if stop_start_time is not None:
                duracion = (lec.timestamp - stop_start_time).total_seconds() / 60.0
                if duracion >= 3.0: # Only count stops longer than 3 minutes
                    paradas.append({
                        "latitud": stop_lat,
                        "longitud": stop_lon,
                        "timestamp_inicio": stop_start_time,
                        "timestamp_fin": lec.timestamp,
                        "duracion_minutos": round(duracion, 2)
                    })
                stop_start_time = None
                
    # Close any ongoing stop at the end of the data
    if stop_start_time is not None:
        last_lec = lecturas[-1]
        duracion = (last_lec.timestamp - stop_start_time).total_seconds() / 60.0
        if duracion >= 3.0:
            paradas.append({
                "latitud": stop_lat,
                "longitud": stop_lon,
                "timestamp_inicio": stop_start_time,
                "timestamp_fin": last_lec.timestamp,
                "duracion_minutos": round(duracion, 2)
            })

    # Average speed
    total_time_hours = (lecturas[-1].timestamp - lecturas[0].timestamp).total_seconds() / 3600.0
    velocidad_promedio = (distancia_total / total_time_hours) if total_time_hours > 0 else 0.0

    return {
        "coordenadas": coordenadas,
        "estadisticas": {
            "distancia_km": round(distancia_total, 2),
            "velocidad_maxima": velocidad_maxima,
            "velocidad_promedio": round(velocidad_promedio, 2),
            "tiempo_encendido_minutos": round(tiempo_encendido_minutos, 2)
        },
        "paradas": paradas
    }
