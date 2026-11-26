from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import re
import unicodedata

from app.api.deps import get_db, get_current_user, require_role
from app.api.empresas import calcular_fecha_vencimiento_inicial, calcular_info_suscripcion
from app.db import models, schemas
from app.core.security import get_password_hash
from app.services.email_service import send_welcome_email
from app.websockets.manager import manager
from app.services.gps_assignments import notify_vehicle_change, set_vehicle_device

router = APIRouter()

MAX_USUARIOS_POR_PARTICULAR = 3

def slugify(text: str) -> str:
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    return re.sub(r'[-\s]+', '-', text)

def _limpiar_email_baja(email: str) -> str:
    return re.sub(r'^baja\d+_', '', email or '')

def _limpiar_placa_baja(placa: str) -> str:
    return re.sub(r'-B\d+$', '', placa or '')

def _gps_id_for_particular(db: Session, payload) -> int | None:
    if payload.dispositivo_id is not None:
        return payload.dispositivo_id
    if not payload.imei:
        return None
    imei = payload.imei.strip()
    if not re.fullmatch(r"[0-9]{15}", imei):
        raise HTTPException(400, "El IMEI debe tener exactamente 15 dígitos.")
    existing = db.query(models.Dispositivo.id).filter_by(imei=imei).first()
    if existing:
        return existing.id

    modelo = (payload.modelo_gps or "").strip().upper()
    if not modelo:
        raise HTTPException(400, "Indica el modelo Teltonika para registrar un IMEI nuevo.")
    gps = models.Dispositivo(imei=imei, numero_serie=f"IMEI-{imei}", modelo=modelo)
    db.add(gps)
    db.flush()
    return gps.id


@router.get("/")
def list_clientes_particulares(
    inactivos: bool = False,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Lista clientes particulares activos (o los dados de baja si inactivos=true, solo superadmin)"""
    if inactivos and current_user.rol != 'superadmin':
        raise HTTPException(status_code=403, detail="Solo el Superadmin puede ver clientes dados de baja.")

    query = db.query(models.Empresa).filter(models.Empresa.tipo == 'particular')
    
    if current_user.rol != 'superadmin':
        # Un cliente particular solo puede ver su propia cuenta
        query = query.filter(models.Empresa.id == current_user.empresa_id)

    particulares = query.order_by(models.Empresa.id.desc()).all()
    resultado = []

    for p in particulares:
        vq = db.query(models.Vehiculo).filter(models.Vehiculo.empresa_id == p.id)
        uq = db.query(models.Usuario).filter(models.Usuario.empresa_id == p.id)
        todos_vehiculos = vq.order_by(models.Vehiculo.id.asc()).all()
        elegibles = todos_vehiculos if inactivos else [v for v in todos_vehiculos if v.activo]
        vehiculo = elegibles[0] if elegibles else None
        todos_usuarios = uq.order_by(models.Usuario.id.asc()).all()
        usuario = todos_usuarios[0] if todos_usuarios else None

        # Determinar si es una baja definitiva (con GPS liberado y correo prefijado 'baja')
        es_baja_definitiva = bool(
            not p.activo and (
                (usuario and (usuario.email or '').startswith('baja')) or
                any(not v.activo and v.baja_individual_at is None for v in todos_vehiculos)
            )
        )
        if inactivos != es_baja_definitiva:
            continue
        
        dispositivo_info = None
        if vehiculo and vehiculo.dispositivo:
            dispositivo_info = {
                "id": vehiculo.dispositivo.id,
                "imei": vehiculo.dispositivo.imei,
                "modelo": vehiculo.dispositivo.modelo,
                "numero_sim": vehiculo.dispositivo.numero_sim,
                "operador_sim": vehiculo.dispositivo.operador_sim
            }

        vehiculos_lista = []
        for v_item in todos_vehiculos:
            if not inactivos and not v_item.activo:
                continue
            d_item = v_item.dispositivo
            vehiculos_lista.append({
                "id": v_item.id,
                "placa": _limpiar_placa_baja(v_item.placa),
                "marca": v_item.marca,
                "modelo": v_item.modelo,
                "color": v_item.color,
                "tipo": v_item.tipo or "sedan",
                "anio": v_item.anio,
                "dispositivo": {
                    "id": d_item.id,
                    "imei": d_item.imei,
                    "modelo": d_item.modelo,
                    "numero_sim": d_item.numero_sim,
                    "operador_sim": d_item.operador_sim
                } if d_item else None
            })

        sub_info = calcular_info_suscripcion(p)

        usuarios_lista = []
        for idx_u, u_item in enumerate(todos_usuarios):
            if not inactivos and not u_item.activo:
                continue
            usuarios_lista.append({
                "id": u_item.id,
                "nombre": u_item.nombre,
                "email": _limpiar_email_baja(u_item.email),
                "rol": u_item.rol,
                "es_titular": idx_u == 0,
            })

        resultado.append({
            "id": p.id,
            "nombre": p.nombre,
            "documento": p.documento,
            "telefono": p.telefono,
            "email": _limpiar_email_baja(usuario.email) if usuario else None,
            "usuario_id": usuario.id if usuario else None,
            "total_usuarios": len(usuarios_lista),
            "max_usuarios": MAX_USUARIOS_POR_PARTICULAR,
            "usuarios": usuarios_lista,
            "limite_velocidad": p.limite_velocidad or 90,
            "color_primario": p.color_primario or "#0D9488",
            "activo": p.activo,
            "created_at": p.created_at,
            **sub_info,
            "total_vehiculos": len(vehiculos_lista),
            "vehiculos": vehiculos_lista,
            "vehiculo": {
                "id": vehiculo.id if vehiculo else None,
                "placa": _limpiar_placa_baja(vehiculo.placa) if vehiculo else "Sin asignar",
                "marca": vehiculo.marca if vehiculo else None,
                "modelo": vehiculo.modelo if vehiculo else None,
                "color": vehiculo.color if vehiculo else None,
                "tipo": vehiculo.tipo if vehiculo else "sedan",
                "anio": vehiculo.anio if vehiculo else None,
            } if vehiculo else None,
            "dispositivo": dispositivo_info
        })

    return resultado

@router.post("/{particular_id}/vehiculos", status_code=201)
def add_vehiculo_particular(
    particular_id: int,
    payload: schemas.ParticularVehiculoCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_role(['superadmin']))
):
    """Agrega un vehículo adicional (2do, 3er, 5to carro) a la cuenta de un mismo Cliente Particular."""
    emp = db.query(models.Empresa).filter(
        models.Empresa.id == particular_id,
        models.Empresa.tipo == 'particular'
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Cliente particular no encontrado.")

    placa_clean = payload.placa.strip().upper()
    if db.query(models.Vehiculo).filter(models.Vehiculo.placa == placa_clean).first():
        raise HTTPException(
            status_code=400,
            detail=f"La placa {placa_clean} ya se encuentra registrada en el sistema."
        )

    device_id = _gps_id_for_particular(db, payload)

    tipo_v = payload.tipo_vehiculo or 'sedan'
    if tipo_v not in ['minivan', 'bus', 'camioneta', 'sedan', 'otro']:
        tipo_v = 'sedan'

    nuevo_veh = models.Vehiculo(
        empresa_id=emp.id,
        conductor_id=None,
        padron="S/N",
        placa=placa_clean,
        marca=payload.marca.strip() if payload.marca else None,
        modelo=payload.modelo.strip() if payload.modelo else None,
        color=payload.color.strip() if payload.color else None,
        tipo=tipo_v,
        anio=payload.anio,
        estado="activo",
        activo=True
    )
    db.add(nuevo_veh)

    owners = set_vehicle_device(db, nuevo_veh, device_id)

    db.commit()
    db.refresh(nuevo_veh)
    manager.notify_sync(emp.id, {"type": "entity_updated", "entity": "particulares"})
    notify_vehicle_change(emp.id, nuevo_veh.id, owners if device_id else None)

    return {
        "status": "ok",
        "vehiculo_id": nuevo_veh.id,
        "placa": nuevo_veh.placa,
        "message": f"Vehículo {nuevo_veh.placa} agregado a la cuenta de {emp.nombre}."
    }


@router.put("/{particular_id}/vehiculos/{vehiculo_id}")
def update_vehiculo_particular(
    particular_id: int,
    vehiculo_id: int,
    payload: schemas.ParticularVehiculoUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_role(['superadmin']))
):
    """Permite al Superadmin editar los datos de un vehículo particular y cambiar/corregir su GPS o IMEI."""
    emp = db.query(models.Empresa).filter(
        models.Empresa.id == particular_id,
        models.Empresa.tipo == 'particular'
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Cliente particular no encontrado.")

    veh = db.query(models.Vehiculo).filter(
        models.Vehiculo.id == vehiculo_id,
        models.Vehiculo.empresa_id == emp.id
    ).with_for_update().first()
    if not veh:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado en este cliente particular.")

    # 1. Actualizar Placa si cambió
    if payload.placa:
        placa_clean = payload.placa.strip().upper()
        if placa_clean != veh.placa:
            conflict = db.query(models.Vehiculo).filter(
                models.Vehiculo.placa == placa_clean,
                models.Vehiculo.id != veh.id
            ).first()
            if conflict:
                raise HTTPException(status_code=400, detail=f"La placa {placa_clean} ya está registrada en otra unidad.")
            veh.placa = placa_clean

    # 2. Actualizar Marca, Modelo, Color y Tipo
    if payload.marca is not None:
        veh.marca = payload.marca.strip() or None
    if payload.modelo is not None:
        veh.modelo = payload.modelo.strip() or None
    if payload.color is not None:
        veh.color = payload.color.strip() or None
    if payload.tipo_vehiculo:
        tipo_v = payload.tipo_vehiculo.strip().lower()
        if tipo_v in ['minivan', 'bus', 'camioneta', 'sedan', 'otro']:
            veh.tipo = tipo_v

    owners = None
    if payload.desvincular_gps:
        owners = set_vehicle_device(db, veh, None)
    elif payload.dispositivo_id is not None or payload.imei:
        owners = set_vehicle_device(db, veh, _gps_id_for_particular(db, payload))

    db.commit()
    db.refresh(veh)
    manager.notify_sync(emp.id, {"type": "entity_updated", "entity": "particulares"})
    notify_vehicle_change(emp.id, veh.id, owners)

    return {
        "status": "ok",
        "vehiculo_id": veh.id,
        "placa": veh.placa,
        "message": f"Vehículo {veh.placa} actualizado correctamente."
    }


@router.post("/{particular_id}/usuarios", status_code=201)
def add_usuario_particular(
    particular_id: int,
    payload: schemas.ParticularUsuarioCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_role(['superadmin']))
):
    """Agrega un usuario adicional/familiar (hasta un máximo de 3 usuarios en total) a la cuenta de un Cliente Particular."""
    emp = db.query(models.Empresa).filter(
        models.Empresa.id == particular_id,
        models.Empresa.tipo == 'particular'
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Cliente particular no encontrado.")

    usuarios_activos = db.query(models.Usuario).filter(
        models.Usuario.empresa_id == emp.id,
        models.Usuario.activo.is_(True)
    ).count()
    if usuarios_activos >= MAX_USUARIOS_POR_PARTICULAR:
        raise HTTPException(
            status_code=400,
            detail=f"Esta cuenta particular ya alcanzó el límite máximo de {MAX_USUARIOS_POR_PARTICULAR} usuarios con acceso."
        )

    email_clean = payload.email.strip().lower()
    if db.query(models.Usuario).filter(models.Usuario.email == email_clean).first():
        raise HTTPException(
            status_code=400,
            detail=f"El correo {email_clean} ya está registrado en otra cuenta del sistema."
        )

    nombre_clean = payload.nombre.strip()
    if not nombre_clean:
        raise HTTPException(status_code=400, detail="El nombre del usuario es obligatorio.")

    if not payload.password or len(payload.password.strip()) < 4:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 4 caracteres.")

    nuevo_usr = models.Usuario(
        empresa_id=emp.id,
        nombre=nombre_clean,
        email=email_clean,
        password_hash=get_password_hash(payload.password),
        rol="operador",
        activo=True
    )
    db.add(nuevo_usr)
    db.commit()
    db.refresh(nuevo_usr)

    veh = db.query(models.Vehiculo).filter(
        models.Vehiculo.empresa_id == emp.id,
        models.Vehiculo.activo.is_(True)
    ).first()
    desc_veh = f"{veh.placa} ({veh.marca or 'Vehículo'})" if veh else emp.nombre

    background_tasks.add_task(
        send_welcome_email,
        to_email=email_clean,
        nombre=nombre_clean,
        password_temp=payload.password,
        entidad_o_placa=desc_veh,
        tipo="particular"
    )

    manager.notify_sync(emp.id, {"type": "entity_updated", "entity": "particulares"})
    manager.notify_sync(emp.id, {"type": "entity_updated", "entity": "usuarios"})

    return {
        "status": "ok",
        "usuario": {
            "id": nuevo_usr.id,
            "nombre": nuevo_usr.nombre,
            "email": nuevo_usr.email,
            "rol": nuevo_usr.rol,
            "es_titular": False,
        },
        "message": f"Acceso creado para {nuevo_usr.nombre} ({nuevo_usr.email})."
    }


@router.delete("/{particular_id}/usuarios/{usuario_id}", status_code=200)
def delete_usuario_particular(
    particular_id: int,
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_role(['superadmin']))
):
    """Elimina un usuario adicional (2do o 3er usuario) de la cuenta de un Cliente Particular, protegiendo al Titular."""
    emp = db.query(models.Empresa).filter(
        models.Empresa.id == particular_id,
        models.Empresa.tipo == 'particular'
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Cliente particular no encontrado.")

    todos_usuarios = db.query(models.Usuario).filter(
        models.Usuario.empresa_id == emp.id
    ).order_by(models.Usuario.id.asc()).all()

    if not todos_usuarios:
        raise HTTPException(status_code=404, detail="No se encontraron usuarios en esta cuenta.")

    titular = todos_usuarios[0]
    if titular.id == usuario_id:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar al usuario Titular principal de la cuenta particular."
        )

    target = next((u for u in todos_usuarios if u.id == usuario_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado en este cliente particular.")

    nombre_eliminado = target.nombre
    db.query(models.PushSubscription).filter(
        models.PushSubscription.usuario_id == target.id
    ).delete(synchronize_session=False)
    db.delete(target)
    db.commit()

    manager.revoke_user_sync(usuario_id)
    manager.notify_sync(emp.id, {"type": "entity_updated", "entity": "particulares"})
    manager.notify_sync(emp.id, {"type": "entity_updated", "entity": "usuarios"})

    return {
        "status": "ok",
        "message": f"Acceso de {nombre_eliminado} eliminado correctamente."
    }

@router.post("/", status_code=201)
def create_cliente_particular(
    payload: schemas.ClienteParticularCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_role(['superadmin']))
):
    """Permite al Superadmin dar de alta a un Cliente Particular en 1 solo paso"""
    # 1. Validar que el email no esté registrado
    email_clean = payload.email.strip().lower()
    if db.query(models.Usuario).filter(models.Usuario.email == email_clean).first():
        raise HTTPException(
            status_code=400, 
            detail=f"El correo {email_clean} ya está registrado para otro usuario del sistema."
        )

    # 2. Validar que la placa no exista
    placa_clean = payload.placa.strip().upper()
    if db.query(models.Vehiculo).filter(models.Vehiculo.placa == placa_clean).first():
        raise HTTPException(
            status_code=400, 
            detail=f"La placa {placa_clean} ya se encuentra registrada en el sistema."
        )

    device_id = _gps_id_for_particular(db, payload)

    # 4. Crear Cuenta Particular (en tabla empresas con tipo='particular')
    base_slug = f"part-{slugify(placa_clean)}"
    slug = f"{base_slug}-{uuid.uuid4().hex[:4]}"
    plan_inicial = (payload.plan_servicio or "mensual").lower().strip()
    fecha_venc_inicial = calcular_fecha_vencimiento_inicial(plan_inicial, payload.fecha_vencimiento)
    
    empresa_part = models.Empresa(
        nombre=payload.nombre.strip(),
        slug=slug,
        tipo="particular",
        documento=payload.documento.strip() if payload.documento else None,
        telefono=payload.telefono.strip() if payload.telefono else None,
        color_primario="#0D9488", # Color distintivo esmeralda/teal para particulares
        limite_velocidad=payload.limite_velocidad or 90,
        plan_servicio=plan_inicial,
        fecha_vencimiento=fecha_venc_inicial,
        corte_automatico=True if payload.corte_automatico is None else payload.corte_automatico,
        activo=True
    )
    db.add(empresa_part)
    db.flush()

    # 5. Crear Usuario para el cliente particular
    usuario_part = models.Usuario(
        empresa_id=empresa_part.id,
        nombre=payload.nombre.strip(),
        email=email_clean,
        password_hash=get_password_hash(payload.password),
        rol="admin", # Admin de su cuenta personal
        activo=True
    )
    db.add(usuario_part)

    # 6. Crear Vehículo del particular
    tipo_v = payload.tipo_vehiculo or 'sedan'
    if tipo_v not in ['minivan', 'bus', 'camioneta', 'sedan', 'otro']:
        tipo_v = 'sedan'

    vehiculo_part = models.Vehiculo(
        empresa_id=empresa_part.id,
        conductor_id=None,
        padron="S/N",
        placa=placa_clean,
        marca=payload.marca.strip() if payload.marca else None,
        modelo=payload.modelo.strip() if payload.modelo else None,
        color=payload.color.strip() if payload.color else None,
        tipo=tipo_v,
        anio=payload.anio,
        estado="activo",
        activo=True
    )
    db.add(vehiculo_part)
    
    owners = set_vehicle_device(db, vehiculo_part, device_id)

    db.commit()
    db.refresh(empresa_part)
    db.refresh(vehiculo_part)

    manager.notify_sync(empresa_part.id, {"type": "entity_updated", "entity": "particulares"})
    notify_vehicle_change(empresa_part.id, vehiculo_part.id, owners if device_id else None)

    # Disparar correo de bienvenida y credenciales en segundo plano (no bloqueante)
    desc_vehiculo = f"{placa_clean} ({payload.marca.strip() if payload.marca else 'Vehículo'} {payload.modelo.strip() if payload.modelo else ''})".strip()
    background_tasks.add_task(
        send_welcome_email,
        to_email=email_clean,
        nombre=payload.nombre.strip(),
        password_temp=payload.password,
        entidad_o_placa=desc_vehiculo,
        tipo="particular"
    )

    dispositivo = vehiculo_part.dispositivo
    return {
        "id": empresa_part.id,
        "nombre": empresa_part.nombre,
        "documento": empresa_part.documento,
        "telefono": empresa_part.telefono,
        "email": usuario_part.email,
        "vehiculo": {
            "id": vehiculo_part.id,
            "placa": vehiculo_part.placa,
            "marca": vehiculo_part.marca,
            "modelo": vehiculo_part.modelo,
            "color": vehiculo_part.color,
            "tipo": vehiculo_part.tipo
        },
        "dispositivo": {
            "id": dispositivo.id,
            "imei": dispositivo.imei
        } if dispositivo else None,
        "message": f"Cliente particular {payload.nombre} registrado con éxito con vehículo {placa_clean}."
    }

@router.delete("/{particular_id}", status_code=200)
def delete_cliente_particular(
    particular_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_role(['superadmin']))
):
    """Desactiva un cliente particular y libera el GPS para reutilización"""
    emp = db.query(models.Empresa).filter(models.Empresa.id == particular_id, models.Empresa.tipo == 'particular').first()
    if not emp:
        raise HTTPException(status_code=404, detail="Cliente particular no encontrado.")

    vehiculos = db.query(models.Vehiculo).filter(
        models.Vehiculo.empresa_id == emp.id,
        models.Vehiculo.baja_individual_at.is_(None),
    ).order_by(models.Vehiculo.id).with_for_update().all()
    inventory_owners = set()
    for v in vehiculos:
        inventory_owners.update(set_vehicle_device(db, v, None))
        v.activo = False
        if not v.placa.endswith(f"-B{v.id}"):
            v.placa = f"{v.placa[:14]}-B{v.id}"

    # Desactivar usuarios y liberar su email (unique), y revocar sus suscripciones Push
    usuarios = db.query(models.Usuario).filter(models.Usuario.empresa_id == emp.id).all()
    user_ids = []
    for u in usuarios:
        u.activo = False
        user_ids.append(u.id)
        if not u.email.startswith("baja"):
            u.email = f"baja{u.id}_{u.email}"

    db.query(models.PushSubscription).filter(
        models.PushSubscription.empresa_id == emp.id
    ).delete(synchronize_session=False)
    if user_ids:
        db.query(models.PushSubscription).filter(
            models.PushSubscription.usuario_id.in_(user_ids)
        ).delete(synchronize_session=False)

    emp.activo = False
    db.commit()
    manager.revoke_empresa_sync(emp.id)
    for uid in user_ids:
        manager.revoke_user_sync(uid)
    manager.notify_sync(emp.id, {"type": "entity_updated", "entity": "particulares"})

    manager.notify_sync(emp.id, {"type": "entity_updated", "entity": "vehiculos"})
    for owner_id in inventory_owners | {emp.id}:
        manager.notify_sync(owner_id, {"type": "entity_updated", "entity": "dispositivos"})

    return {"message": f"Cliente particular {emp.nombre} desactivado y GPS liberado."}


@router.post("/{particular_id}/reactivar", status_code=200)
def reactivar_cliente_particular(
    particular_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_role(['superadmin']))
):
    """Reactiva un cliente particular dado de baja, restaurando su correo y placa originales.
    El GPS no se reasigna automáticamente (se vincula luego desde Vinculación o Dispositivos)."""
    emp = db.query(models.Empresa).filter(
        models.Empresa.id == particular_id,
        models.Empresa.tipo == 'particular',
        models.Empresa.activo == False
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Cliente dado de baja no encontrado.")

    usuarios = db.query(models.Usuario).filter(models.Usuario.empresa_id == emp.id).all()
    vehiculos = db.query(models.Vehiculo).filter(
        models.Vehiculo.empresa_id == emp.id,
        models.Vehiculo.baja_individual_at.is_(None),
    ).with_for_update().all()

    # Validar que correo y placa originales sigan libres antes de tocar nada
    for u in usuarios:
        original = _limpiar_email_baja(u.email)
        choque = db.query(models.Usuario).filter(models.Usuario.email == original, models.Usuario.id != u.id).first()
        if choque:
            raise HTTPException(status_code=400, detail=f"No se puede reactivar: el correo {original} ya fue registrado por otro usuario.")
    for v in vehiculos:
        original = _limpiar_placa_baja(v.placa)
        choque = db.query(models.Vehiculo).filter(models.Vehiculo.placa == original, models.Vehiculo.id != v.id).first()
        if choque:
            raise HTTPException(status_code=400, detail=f"No se puede reactivar: la placa {original} ya fue registrada en otro cliente.")

    for u in usuarios:
        u.email = _limpiar_email_baja(u.email)
        u.activo = True
    for v in vehiculos:
        v.placa = _limpiar_placa_baja(v.placa)
        v.activo = True
    emp.activo = True
    db.commit()
    manager.notify_sync(emp.id, {"type": "entity_updated", "entity": "particulares"})

    manager.notify_sync(emp.id, {"type": "entity_updated", "entity": "vehiculos"})

    return {"message": f"Cliente particular {emp.nombre} reactivado. Recuerda vincularle un GPS."}

