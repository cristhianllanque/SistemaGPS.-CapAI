from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import re
import unicodedata

from app.api.deps import get_db, get_current_user, require_role
from app.db import models, schemas
from app.core.security import get_password_hash

router = APIRouter()

def slugify(text: str) -> str:
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    return re.sub(r'[-\s]+', '-', text)

@router.get("/")
def list_clientes_particulares(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Lista todos los clientes particulares registrados (personas naturales con vehículos individuales)"""
    query = db.query(models.Empresa).filter(models.Empresa.tipo == 'particular')
    
    if current_user.rol != 'superadmin':
        # Un cliente particular solo puede ver su propia cuenta
        query = query.filter(models.Empresa.id == current_user.empresa_id)

    particulares = query.order_by(models.Empresa.id.desc()).all()
    resultado = []

    for p in particulares:
        vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.empresa_id == p.id, models.Vehiculo.activo == True).first()
        usuario = db.query(models.Usuario).filter(models.Usuario.empresa_id == p.id, models.Usuario.activo == True).first()
        
        dispositivo_info = None
        if vehiculo and vehiculo.dispositivo:
            dispositivo_info = {
                "id": vehiculo.dispositivo.id,
                "imei": vehiculo.dispositivo.imei,
                "modelo": vehiculo.dispositivo.modelo,
                "numero_sim": vehiculo.dispositivo.numero_sim,
                "operador_sim": vehiculo.dispositivo.operador_sim
            }

        resultado.append({
            "id": p.id,
            "nombre": p.nombre,
            "documento": p.documento,
            "telefono": p.telefono,
            "email": usuario.email if usuario else None,
            "usuario_id": usuario.id if usuario else None,
            "limite_velocidad": p.limite_velocidad or 90,
            "color_primario": p.color_primario or "#0D9488",
            "activo": p.activo,
            "created_at": p.created_at,
            "vehiculo": {
                "id": vehiculo.id if vehiculo else None,
                "placa": vehiculo.placa if vehiculo else "Sin asignar",
                "marca": vehiculo.marca if vehiculo else None,
                "modelo": vehiculo.modelo if vehiculo else None,
                "color": vehiculo.color if vehiculo else None,
                "tipo": vehiculo.tipo if vehiculo else "sedan",
                "anio": vehiculo.anio if vehiculo else None,
            } if vehiculo else None,
            "dispositivo": dispositivo_info
        })

    return resultado

@router.post("/", status_code=201)
def create_cliente_particular(
    payload: schemas.ClienteParticularCreate,
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

    # 3. Validar dispositivo GPS si se especificó
    dispositivo = None
    if payload.dispositivo_id:
        dispositivo = db.query(models.Dispositivo).filter(models.Dispositivo.id == payload.dispositivo_id).first()
        if not dispositivo:
            raise HTTPException(status_code=404, detail="El dispositivo GPS seleccionado no existe.")
        # Verificar que no esté asignado
        veh_ocupado = db.query(models.Vehiculo).filter(models.Vehiculo.dispositivo_id == dispositivo.id, models.Vehiculo.activo == True).first()
        if veh_ocupado:
            raise HTTPException(status_code=400, detail=f"El GPS ya está asignado al vehículo con placa {veh_ocupado.placa}.")
    elif payload.imei:
        imei_clean = payload.imei.strip()
        dispositivo = db.query(models.Dispositivo).filter(models.Dispositivo.imei == imei_clean).first()
        if dispositivo:
            veh_ocupado = db.query(models.Vehiculo).filter(models.Vehiculo.dispositivo_id == dispositivo.id, models.Vehiculo.activo == True).first()
            if veh_ocupado:
                raise HTTPException(status_code=400, detail=f"El GPS con IMEI {imei_clean} ya está asignado a la placa {veh_ocupado.placa}.")
        else:
            # Crear dispositivo automáticamente en inventario
            dispositivo = models.Dispositivo(
                imei=imei_clean,
                numero_serie=f"SN-{imei_clean[-6:]}",
                modelo="FMC130",
                estado="disponible",
                activo=True
            )
            db.add(dispositivo)
            db.flush()

    # 4. Crear Cuenta Particular (en tabla empresas con tipo='particular')
    base_slug = f"part-{slugify(placa_clean)}"
    slug = f"{base_slug}-{uuid.uuid4().hex[:4]}"
    
    empresa_part = models.Empresa(
        nombre=payload.nombre.strip(),
        slug=slug,
        tipo="particular",
        documento=payload.documento.strip() if payload.documento else None,
        telefono=payload.telefono.strip() if payload.telefono else None,
        color_primario="#0D9488", # Color distintivo esmeralda/teal para particulares
        limite_velocidad=payload.limite_velocidad or 90,
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
        dispositivo_id=dispositivo.id if dispositivo else None,
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
    
    # Si se asignó dispositivo, actualizar su estado y empresa_id
    if dispositivo:
        dispositivo.empresa_id = empresa_part.id
        dispositivo.estado = "asignado"

    db.commit()
    db.refresh(empresa_part)
    db.refresh(vehiculo_part)

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

    # Desvincular GPS y ponerlo en disponible
    vehiculos = db.query(models.Vehiculo).filter(models.Vehiculo.empresa_id == emp.id).all()
    for v in vehiculos:
        if v.dispositivo:
            v.dispositivo.estado = "disponible"
            v.dispositivo.empresa_id = None
        v.activo = False

    # Desactivar usuarios
    usuarios = db.query(models.Usuario).filter(models.Usuario.empresa_id == emp.id).all()
    for u in usuarios:
        u.activo = False

    emp.activo = False
    db.commit()

    return {"message": f"Cliente particular {emp.nombre} desactivado y GPS liberado."}
