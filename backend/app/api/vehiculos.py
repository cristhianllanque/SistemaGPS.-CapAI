from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import String, cast
from typing import List, Optional
from datetime import datetime, timezone, timedelta

PERU_TZ = timezone(timedelta(hours=-5))


def parse_filter_to_naive_utc(raw_str: str, is_end: bool = False) -> datetime:
    """
    Convierte un parámetro ISO con o sin zona horaria a UTC naive (formato de MySQL).
    Si llega sin zona horaria (ej. '2026-11-07T11:15'), se interpreta estrictamente
    como Hora Oficial de Perú (America/Lima, UTC-05:00). Si is_end=True y viene
    solo con minutos ('HH:MM') o solo fecha ('YYYY-MM-DD'), se extiende hasta ':59.999999'.
    """
    s = raw_str.strip()
    is_date_only = len(s) == 10 and "T" not in s and " " not in s
    has_only_minutes = len(s) == 16 and ("T" in s or " " in s) and s.count(":") == 1
    dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=PERU_TZ)
    if is_end:
        if is_date_only:
            dt = dt.replace(hour=23, minute=59, second=59, microsecond=999999)
        elif has_only_minutes or (dt.second == 0 and dt.microsecond == 0 and s.count(":") == 1):
            dt = dt.replace(second=59, microsecond=999999)
    return dt.astimezone(timezone.utc).replace(tzinfo=None)

from app.api.deps import get_db, get_current_user
from app.db import models, schemas
from app.websockets.manager import manager
from app.services.gps_assignments import notify_vehicle_change, set_vehicle_device

router = APIRouter()


def _vehiculos_con_telemetria(query, db: Session):
    lectura = models.LecturaGPS
    vehiculo = models.Vehiculo
    ultima_id = db.query(lectura.id).filter(
        lectura.vehiculo_id == vehiculo.id,
        lectura.timestamp.is_not(None),
        lectura.latitud.between(-90, 90),
        lectura.longitud.between(-180, 180),
        (lectura.latitud != 0) | (lectura.longitud != 0),
    ).order_by(lectura.timestamp.desc(), lectura.id.desc()).limit(1).correlate(vehiculo).scalar_subquery()
    rows = query.options(
        joinedload(vehiculo.dispositivo), joinedload(vehiculo.conductor), joinedload(vehiculo.empresa)
    ).outerjoin(lectura, lectura.id == ultima_id).add_entity(lectura).all()
    with_readings = [vehicle.id for vehicle, last in rows if last]
    pending = set(db.query(models.AlertaPanico.vehiculo_id, models.AlertaPanico.tipo).filter(
        models.AlertaPanico.vehiculo_id.in_(with_readings),
        models.AlertaPanico.estado == "pendiente",
        models.AlertaPanico.tipo.in_(["sabotaje", "panico"]),
    ).all()) if with_readings else set()

    now = datetime.utcnow()
    result = []
    for vehicle, last in rows:
        data = schemas.VehiculoOut.model_validate(vehicle)
        if vehicle.empresa:
            data.empresa_nombre = vehicle.empresa.nombre
            data.empresa_limite_velocidad = vehicle.empresa.limite_velocidad or 90
        if last:
            demo = vehicle.activo and vehicle.placa.startswith("DEMO-")
            online = demo or bool(
                vehicle.activo and vehicle.dispositivo and vehicle.dispositivo.activo
                and (vehicle.gps_asignado_at is None or last.timestamp >= vehicle.gps_asignado_at.replace(microsecond=0))
                and abs((now - last.timestamp).total_seconds()) <= 900
            )
            data.ultima_lectura = schemas.LecturaGPSBase(
                latitud=last.latitud, longitud=last.longitud, timestamp=now if demo else last.timestamp,
                velocidad=(last.velocidad or 0) if online else 0,
                ignicion=online and bool(last.ignicion),
                boton_panico=(vehicle.id, "panico") in pending,
                sabotaje=(vehicle.id, "sabotaje") in pending and (last.bateria_ext is None or last.bateria_ext < 7),
                bateria_ext=last.bateria_ext, bateria_int=last.bateria_int,
                bateria_porcentaje=last.bateria_porcentaje, online=online,
            )
        result.append(data)
    return result


@router.get("/", response_model=List[schemas.VehiculoOut])
def list_vehiculos(
    search: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    empresa_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
    archivados: bool = False,
):
    query = db.query(models.Vehiculo)
    if archivados:
        if current_user.rol != "superadmin":
            raise HTTPException(403, "Solo el administrador principal puede ver las bajas individuales.")
        vehicle = models.Vehiculo
        legacy_suffix = "-B" + cast(vehicle.id, String)
        query = query.filter(
            vehicle.activo.is_(False),
            vehicle.baja_individual_at.is_not(None)
            | (vehicle.empresa.has(activo=True) & ~vehicle.placa.endswith(legacy_suffix)),
        )
    else:
        query = query.filter(models.Vehiculo.activo.is_(True))
    if current_user.rol == "superadmin":
        if empresa_id:
            query = query.filter(models.Vehiculo.empresa_id == empresa_id)
    else:
        query = query.filter(models.Vehiculo.empresa_id == current_user.empresa_id)
    if estado:
        query = query.filter(models.Vehiculo.estado == estado)
    if search:
        query = query.filter(models.Vehiculo.placa.contains(search))
    return _vehiculos_con_telemetria(query.order_by(models.Vehiculo.created_at.desc()), db)


@router.get("/{vehiculo_id}", response_model=schemas.VehiculoOut)
def get_vehiculo(
    vehiculo_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    query = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id)
    if current_user.rol != "superadmin":
        query = query.filter(models.Vehiculo.empresa_id == current_user.empresa_id)
    rows = _vehiculos_con_telemetria(query, db)
    if not rows:
        raise HTTPException(404, "Vehículo no encontrado")
    return rows[0]


@router.post("/", response_model=schemas.VehiculoOut, status_code=201)
def create_vehiculo(
    payload: schemas.VehiculoCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != 'superadmin':
        raise HTTPException(status_code=403, detail="Acción permitida exclusivamente para el Administrador Principal (Copai)")

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
        data.empresa_limite_velocidad = v.empresa.limite_velocidad or 90
    manager.notify_sync(v.empresa_id, {"type": "entity_updated", "entity": "vehiculos", "vehiculo_id": v.id})
    return data


@router.put("/{vehiculo_id}", response_model=schemas.VehiculoOut)
def update_vehiculo(
    vehiculo_id: int,
    payload: schemas.VehiculoUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol not in ['superadmin', 'admin']:
        raise HTTPException(status_code=403, detail="Acción permitida exclusivamente para Administradores de Empresa y Superadmin")

    query = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id)
    if current_user.rol != 'superadmin':
        query = query.filter(models.Vehiculo.empresa_id == current_user.empresa_id)

    v = query.filter(models.Vehiculo.activo.is_(True)).with_for_update().first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    if current_user.rol != 'superadmin':
        update_data.pop("empresa_id", None)
    old_owner = v.empresa_id
    if "empresa_id" in update_data and update_data["empresa_id"] != old_owner:
        if v.dispositivo_id or db.query(models.LecturaGPS.id).filter_by(vehiculo_id=v.id).first() \
                or db.query(models.AlertaPanico.id).filter_by(vehiculo_id=v.id).first():
            raise HTTPException(409, "Para cambiar de empresa, crea una ficha en el destino y traslada el GPS. El historial pertenece a la empresa original.")
        target = db.query(models.Empresa.id).filter_by(id=update_data["empresa_id"], activo=True).first()
        if not target:
            raise HTTPException(400, "Selecciona una empresa activa.")
        v.conductor_id = None

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
        data.empresa_limite_velocidad = v_reloaded.empresa.limite_velocidad or 90
    notify_vehicle_change(v_reloaded.empresa_id, v_reloaded.id)
    if old_owner != v_reloaded.empresa_id:
        notify_vehicle_change(old_owner, v_reloaded.id)
    return data


@router.put("/{vehiculo_id}/vincular", response_model=schemas.VehiculoOut)
def vincular_vehiculo(
    vehiculo_id: int,
    payload: schemas.VehiculoVincular,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != 'superadmin':
        raise HTTPException(status_code=403, detail="Acción permitida exclusivamente para el Administrador Principal (Copai)")

    query = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id)
    if current_user.rol != 'superadmin':
        query = query.filter(models.Vehiculo.empresa_id == current_user.empresa_id)

    v = query.filter(models.Vehiculo.activo.is_(True)).with_for_update().first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    inventory_owners = None
    if payload.dispositivo_id is not None:
        inventory_owners = set_vehicle_device(db, v, payload.dispositivo_id)

    if payload.conductor_id is not None:
        cond_query = db.query(models.Conductor).filter(
            models.Conductor.id == payload.conductor_id,
            models.Conductor.empresa_id == v.empresa_id,
            models.Conductor.activo.is_(True),
        )
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
        data.empresa_limite_velocidad = v_reloaded.empresa.limite_velocidad or 90
    notify_vehicle_change(v_reloaded.empresa_id, v_reloaded.id, inventory_owners)
    return data


@router.put("/{vehiculo_id}/desvincular-dispositivo", response_model=schemas.VehiculoOut)
def desvincular_dispositivo(
    vehiculo_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != 'superadmin':
        raise HTTPException(status_code=403, detail="Acción permitida exclusivamente para el Administrador Principal (Copai)")

    query = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id)
    if current_user.rol != 'superadmin':
        query = query.filter(models.Vehiculo.empresa_id == current_user.empresa_id)
    v = query.filter(models.Vehiculo.activo.is_(True)).with_for_update().first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    inventory_owners = set_vehicle_device(db, v, None)

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
        data.empresa_limite_velocidad = v_reloaded.empresa.limite_velocidad or 90
    notify_vehicle_change(v_reloaded.empresa_id, v_reloaded.id, inventory_owners)
    return data


@router.put("/{vehiculo_id}/desvincular-conductor", response_model=schemas.VehiculoOut)
def desvincular_conductor(
    vehiculo_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != 'superadmin':
        raise HTTPException(status_code=403, detail="Acción permitida exclusivamente para el Administrador Principal (Copai)")

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
        data.empresa_limite_velocidad = v_reloaded.empresa.limite_velocidad or 90
    manager.notify_sync(v_reloaded.empresa_id, {"type": "entity_updated", "entity": "vehiculos", "vehiculo_id": v_reloaded.id})
    return data


@router.delete("/{vehiculo_id}")
def delete_vehiculo(
    vehiculo_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != "superadmin":
        raise HTTPException(403, "Solo el administrador principal puede dar de baja vehículos.")
    v = db.query(models.Vehiculo).filter_by(id=vehiculo_id).with_for_update().first()
    if not v or (not v.activo and not _individual_archive(v)):
        raise HTTPException(404, "Vehículo no encontrado")
    if v.dispositivo_id is not None:
        raise HTTPException(409, "Desvincule el GPS antes de dar de baja el vehículo.")
    if v.activo:
        v.activo = False
        v.baja_individual_at = datetime.utcnow()
        v.conductor_id = None
        db.commit()
        notify_vehicle_change(v.empresa_id, v.id)
    return {"status": "ok", "message": "Vehículo dado de baja"}


def _individual_archive(vehicle: models.Vehiculo):
    return vehicle.baja_individual_at is not None or (
        bool(vehicle.empresa and vehicle.empresa.activo) and not vehicle.placa.endswith(f"-B{vehicle.id}")
    )


@router.post("/{vehiculo_id}/reactivar")
def restore_vehiculo(
    vehiculo_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != "superadmin":
        raise HTTPException(403, "Solo el administrador principal puede reactivar vehículos.")
    v = db.query(models.Vehiculo).filter_by(id=vehiculo_id).with_for_update().first()
    if not v or (not v.activo and not _individual_archive(v)):
        raise HTTPException(404, "Baja individual no encontrada")
    if not v.empresa or not v.empresa.activo:
        raise HTTPException(409, "Reactive primero la cuenta propietaria del vehículo.")
    if not v.activo:
        v.activo = True
        v.baja_individual_at = None
        db.commit()
        notify_vehicle_change(v.empresa_id, v.id)
    return {"status": "ok", "message": "Vehículo reactivado"}


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

    # Normalizar siempre a UTC naive interpretando entradas sin zona como Hora Perú (UTC-5)
    try:
        inicio = parse_filter_to_naive_utc(fecha_inicio, is_end=False)
        fin = parse_filter_to_naive_utc(fecha_fin, is_end=True)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido")

    lecturas = db.query(models.LecturaGPS).filter(
        models.LecturaGPS.vehiculo_id == vehiculo_id,
        models.LecturaGPS.timestamp >= inicio,
        models.LecturaGPS.timestamp <= fin,
        models.LecturaGPS.latitud.between(-90, 90),
        models.LecturaGPS.longitud.between(-180, 180),
        (models.LecturaGPS.latitud != 0) | (models.LecturaGPS.longitud != 0),
    ).order_by(models.LecturaGPS.timestamp).all()

    if not lecturas and bool(vehiculo.placa and vehiculo.placa.startswith('DEMO-')):
        demo_all = db.query(models.LecturaGPS).filter(
            models.LecturaGPS.vehiculo_id == vehiculo_id
        ).order_by(models.LecturaGPS.id.asc()).all()
        if demo_all:
            base_time = inicio.replace(hour=8, minute=0, second=0, microsecond=0)
            lecturas = []
            for idx, d_lec in enumerate(demo_all):
                fake_pt = models.LecturaGPS(
                    vehiculo_id=d_lec.vehiculo_id,
                    latitud=d_lec.latitud,
                    longitud=d_lec.longitud,
                    velocidad=d_lec.velocidad,
                    ignicion=d_lec.ignicion,
                    bateria_ext=d_lec.bateria_ext,
                    bateria_int=d_lec.bateria_int,
                    bateria_porcentaje=d_lec.bateria_porcentaje,
                    timestamp=base_time + timedelta(minutes=idx * 2)
                )
                lecturas.append(fake_pt)

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
                "tiempo_encendido_minutos": 0.0,
                "tiempo_detenido_minutos": 0.0,
                "total_paradas": 0
            },
            "paradas": []
        }

    for i, lec in enumerate(lecturas):
        coordenadas.append({
            "latitud": lec.latitud,
            "longitud": lec.longitud,
            "velocidad": lec.velocidad or 0,
            "ignicion": bool(lec.ignicion),
            "bateria_ext": lec.bateria_ext,
            "bateria_int": lec.bateria_int,
            "bateria_porcentaje": lec.bateria_porcentaje,
            "timestamp": lec.timestamp
        })
        
        velocidad_maxima = max(velocidad_maxima, lec.velocidad or 0)
            
        if i > 0:
            prev_lec = lecturas[i-1]
            # Calculate distance
            dist = haversine(prev_lec.latitud, prev_lec.longitud, lec.latitud, lec.longitud)
            distancia_total += dist
            
            # Time difference in minutes (cap telemetry gaps > 15 min so signal loss doesn't inflate engine hours)
            dt_mins = (lec.timestamp - prev_lec.timestamp).total_seconds() / 60.0
            
            if 0 < dt_mins <= 15.0 and prev_lec.ignicion:
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
    tiempo_detenido_minutos = round(sum(p['duracion_minutos'] for p in paradas), 2)

    return {
        "coordenadas": coordenadas,
        "estadisticas": {
            "distancia_km": round(distancia_total, 2),
            "velocidad_maxima": velocidad_maxima,
            "velocidad_promedio": round(velocidad_promedio, 2),
            "tiempo_encendido_minutos": round(tiempo_encendido_minutos, 2),
            "tiempo_detenido_minutos": tiempo_detenido_minutos,
            "total_paradas": len(paradas)
        },
        "paradas": paradas
    }
