import os
import re
import json
import socket
import subprocess
import urllib.request
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_db, get_current_user, require_role
from app.db import models, schemas
from app.core import security
from app.services.email_service import send_welcome_email

router = APIRouter()

PROTECTED_SUPERADMIN_EMAILS = {
    "cristhianllanque65@gmail.com",
    "industriascopai@gmail.com",
}

TYPO_DOMAINS = {
    "gmial.com": "gmail.com",
    "gamil.com": "gmail.com",
    "gmai.com": "gmail.com",
    "gmail.con": "gmail.com",
    "gmail.co": "gmail.com",
    "hotmial.com": "hotmail.com",
    "hotmal.com": "hotmail.com",
    "hotmail.con": "hotmail.com",
    "outlok.com": "outlook.com",
    "outlook.con": "outlook.com",
    "yaho.com": "yahoo.com",
    "yahoo.con": "yahoo.com",
}

PLACEHOLDER_DOMAINS = {
    "empresa.com",
    "ejemplo.com",
    "test.com",
    "prueba.com",
    "correo.com",
    "dominio.com",
    "miempresa.com",
    "transporte.com",
    "fake.com",
    "noexiste.com",
}


def _enrich_usuario_out(u: models.Usuario) -> schemas.UsuarioOut:
    u_out = schemas.UsuarioOut.model_validate(u)
    if u.empresa:
        u_out.empresa_nombre = u.empresa.nombre
        u_out.empresa_slug = u.empresa.slug
        u_out.empresa_tipo = u.empresa.tipo
    else:
        u_out.empresa_nombre = "Copai Central"
        u_out.empresa_slug = "copai-central"
        u_out.empresa_tipo = "central"
    return u_out


def _rol_legible(u: models.Usuario) -> str:
    if u.rol == "superadmin":
        return "Superadministrador Global (Dueño)"
    if u.rol == "admin":
        if u.empresa and u.empresa.tipo == "particular":
            return "Cliente Particular"
        return "Gerente de Empresa (Admin)"
    return "Operador de Monitoreo"


def _check_domain_mx(domain: str) -> bool:
    """Verifica si el dominio tiene servidores de correo (MX) activos."""
    try:
        if os.name != "nt":
            res = subprocess.run(
                ["host", "-t", "MX", domain],
                capture_output=True,
                text=True,
                timeout=3
            )
            if res.returncode == 0 and "mail is handled by" in (res.stdout or ""):
                return True
            if "not found" in (res.stdout or "").lower() or "has no mx" in (res.stdout or "").lower():
                return False
        else:
            res = subprocess.run(
                ["nslookup", "-querytype=mx", domain],
                capture_output=True,
                text=True,
                timeout=3
            )
            if "mail exchanger" in (res.stdout or "").lower():
                return True
        socket.getaddrinfo(domain, 80)
        return True
    except Exception:
        return False


def _check_microsoft_mailbox(email: str) -> Optional[bool]:
    """Para cuentas Microsoft (hotmail/outlook/live), verifica si la cuenta existe realmente."""
    try:
        req = urllib.request.Request(
            "https://login.live.com/GetCredentialType.srf",
            data=json.dumps({"username": email}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=2.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if "IfExistsResult" in data:
                # 0 = existe, 1 = no existe
                return data["IfExistsResult"] == 0
    except Exception:
        pass
    return None


@router.get("/verificar-email")
def verificar_email(
    email: str = Query(..., description="Correo electrónico a verificar"),
    exclude_id: Optional[int] = Query(None, description="ID de usuario a excluir en modo edición"),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_role(["superadmin", "admin"]))
):
    """
    Verifica si un correo electrónico:
    1. Ya existe y está vinculado a un usuario/empresa o Superadmin en la plataforma.
    2. Si no está registrado aún, verifica si el dominio/servidor de correo existe o si parece un correo inventado,
       permitiendo al administrador confirmar si desea continuar con ese correo.
    """
    email_clean = (email or "").strip().lower()
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$", email_clean):
        return {
            "email": email_clean,
            "formato_valido": False,
            "en_sistema": False,
            "es_superadmin": False,
            "existe_buzon": False,
            "puede_usar": False,
            "requiere_confirmacion": False,
            "estado": "formato_invalido",
            "mensaje": "El formato del correo electrónico no es válido (ejemplo: usuario@gmail.com)."
        }

    # 1. Verificar si ya existe en la base de datos de Copai Telematics
    q = db.query(models.Usuario).filter(models.Usuario.email == email_clean)
    if exclude_id:
        q = q.filter(models.Usuario.id != exclude_id)
    existente = q.first()

    if existente:
        rol_label = _rol_legible(existente)
        emp_nombre = existente.empresa.nombre if existente.empresa else "Copai Central (Global)"
        if existente.rol == "superadmin":
            return {
                "email": email_clean,
                "formato_valido": True,
                "en_sistema": True,
                "es_superadmin": True,
                "existe_buzon": True,
                "puede_usar": False,
                "requiere_confirmacion": False,
                "estado": "bloqueado_superadmin",
                "usuario_actual": {
                    "id": existente.id,
                    "nombre": existente.nombre,
                    "rol": existente.rol,
                    "rol_legible": rol_label,
                    "empresa_id": existente.empresa_id,
                    "empresa_nombre": emp_nombre,
                },
                "mensaje": f"Este correo SÍ existe en el sistema y pertenece a '{existente.nombre}' ({rol_label}). Por seguridad, un correo de Superadmin no puede asignarse como Gerente ni Operador de una empresa."
            }

        return {
            "email": email_clean,
            "formato_valido": True,
            "en_sistema": True,
            "es_superadmin": False,
            "existe_buzon": True,
            "puede_usar": False,
            "requiere_confirmacion": False,
            "estado": "ya_vinculado",
            "usuario_actual": {
                "id": existente.id,
                "nombre": existente.nombre,
                "rol": existente.rol,
                "rol_legible": rol_label,
                "empresa_id": existente.empresa_id,
                "empresa_nombre": emp_nombre,
            },
            "mensaje": f"Este correo SÍ existe en el sistema y ya está vinculado a '{existente.nombre}' con el rol de '{rol_label}' en la empresa '{emp_nombre}'."
        }

    # 2. El correo NO existe aún en nuestra base de datos: verificar existencia del servidor/buzón
    local_part, domain = email_clean.split("@", 1)

    if domain in TYPO_DOMAINS:
        sugerencia = TYPO_DOMAINS[domain]
        return {
            "email": email_clean,
            "formato_valido": True,
            "en_sistema": False,
            "es_superadmin": False,
            "existe_buzon": False,
            "puede_usar": True,
            "requiere_confirmacion": True,
            "estado": "no_existe_buzon",
            "mensaje": f"Este correo NO existe: el dominio '@{domain}' parece mal escrito (¿quisiste decir '@{sugerencia}'?). ¿Desea seguir con este correo y crear normal?"
        }

    if domain in PLACEHOLDER_DOMAINS or not _check_domain_mx(domain):
        return {
            "email": email_clean,
            "formato_valido": True,
            "en_sistema": False,
            "es_superadmin": False,
            "existe_buzon": False,
            "puede_usar": True,
            "requiere_confirmacion": True,
            "estado": "no_existe_buzon",
            "mensaje": f"Este correo NO existe (el servidor '@{domain}' no tiene buzón de correo activo). No recibirá notificaciones por email, aunque podrá iniciar sesión con su clave. ¿Desea seguir con este correo y crear normal?"
        }

    if domain in ("hotmail.com", "outlook.com", "live.com", "msn.com", "hotmail.es", "outlook.es"):
        ms_exists = _check_microsoft_mailbox(email_clean)
        if ms_exists is False:
            return {
                "email": email_clean,
                "formato_valido": True,
                "en_sistema": False,
                "es_superadmin": False,
                "existe_buzon": False,
                "puede_usar": True,
                "requiere_confirmacion": True,
                "estado": "no_existe_buzon",
                "mensaje": f"Este correo ({email_clean}) NO existe en Microsoft/Outlook. Si es un correo inventado de prueba, podrá iniciar sesión pero no recibirá emails. ¿Desea seguir con este correo y crear normal?"
            }
        elif ms_exists is True:
            return {
                "email": email_clean,
                "formato_valido": True,
                "en_sistema": False,
                "es_superadmin": False,
                "existe_buzon": True,
                "puede_usar": True,
                "requiere_confirmacion": False,
                "estado": "disponible_verificado",
                "mensaje": f"Este correo SÍ existe y está libre (no vinculado a ninguna otra empresa en Copai)."
            }

    # Para Gmail u otros dominios con servidor MX válido que aún no están registrados en el sistema:
    return {
        "email": email_clean,
        "formato_valido": True,
        "en_sistema": False,
        "es_superadmin": False,
        "existe_buzon": True,
        "puede_usar": True,
        "requiere_confirmacion": True,
        "estado": "nuevo_no_registrado",
        "mensaje": f"Este correo no está vinculado a ninguna otra cuenta en el sistema (servidor @{domain} válido). Si es un correo nuevo o inventado para prueba, ¿desea seguir con este correo y crear normal?"
    }


@router.get("/", response_model=List[schemas.UsuarioOut])
def list_usuarios(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    query = db.query(models.Usuario)
    if current_user.rol != 'superadmin':
        # Client companies only see users of their own company, NEVER superadmin
        query = query.filter(
            models.Usuario.empresa_id == current_user.empresa_id,
            models.Usuario.rol != 'superadmin'
        )
    usuarios = query.order_by(models.Usuario.id.asc()).all()
    return [_enrich_usuario_out(u) for u in usuarios]


@router.post("/", response_model=schemas.UsuarioOut, status_code=201)
def create_usuario(
    payload: schemas.UsuarioCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_role(['superadmin', 'admin']))
):
    email_clean = payload.email.strip().lower()
    # Check if user already exists
    exists = db.query(models.Usuario).filter(models.Usuario.email == email_clean).first()
    if exists:
        rol_label = _rol_legible(exists)
        emp_actual = exists.empresa.nombre if exists.empresa else "Copai Central"
        raise HTTPException(
            status_code=400,
            detail=f"El correo '{email_clean}' ya está registrado como {rol_label} en '{emp_actual}'."
        )

    if current_user.rol != 'superadmin':
        if payload.rol == 'superadmin':
            raise HTTPException(status_code=403, detail="Solo el Superadmin puede crear cuentas Superadmin")
        empresa_id = current_user.empresa_id
        rol_final = payload.rol if payload.rol in ('admin', 'operador') else 'operador'
    else:
        rol_final = payload.rol
        if rol_final == 'superadmin':
            # Un Superadmin SIEMPRE es global (Copai Central), nunca pertenece a una empresa cliente
            empresa_id = None
        else:
            empresa_id = payload.empresa_id
            if not empresa_id:
                raise HTTPException(
                    status_code=400,
                    detail="Debes seleccionar a qué Empresa pertenece este Gerente u Operador."
                )

    hashed_password = security.get_password_hash(payload.password)
    
    nuevo_usuario = models.Usuario(
        empresa_id=empresa_id,
        nombre=payload.nombre,
        email=email_clean,
        rol=rol_final,
        password_hash=hashed_password
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    # Enviar correo de bienvenida con credenciales y enlace directo al portal de la empresa
    empresa_slug = None
    empresa_nombre = None
    if nuevo_usuario.empresa_id:
        empresa_obj = db.query(models.Empresa).filter(models.Empresa.id == nuevo_usuario.empresa_id).first()
        if empresa_obj:
            empresa_slug = empresa_obj.slug
            empresa_nombre = empresa_obj.nombre

    background_tasks.add_task(
        send_welcome_email,
        to_email=nuevo_usuario.email,
        nombre=nuevo_usuario.nombre,
        password_temp=payload.password,
        entidad_o_placa=empresa_nombre or "Industrias Copai",
        tipo="empresa" if empresa_slug else "plataforma",
        empresa_slug=empresa_slug
    )

    return _enrich_usuario_out(nuevo_usuario)


@router.put("/{usuario_id}", response_model=schemas.UsuarioOut)
def update_usuario(
    usuario_id: int,
    payload: schemas.UsuarioUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_role(['superadmin', 'admin']))
):
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if current_user.rol != 'superadmin':
        if usuario.empresa_id != current_user.empresa_id or usuario.rol == 'superadmin':
            raise HTTPException(status_code=403, detail="No tienes permisos para editar este usuario")

    update_data = payload.model_dump(exclude_unset=True)
    old_email = usuario.email
    new_plain_password = None

    # Proteger las cuentas principales de Superadministrador contra conversión accidental en gerente de empresa
    if usuario.rol == 'superadmin':
        if update_data.get('empresa_id'):
            raise HTTPException(
                status_code=400,
                detail="No puedes asignar una Empresa Cliente a una cuenta de Superadministrador Global. Para registrar al Gerente u Operador de una empresa, usa 'Crear Nuevo Usuario'."
            )
        if update_data.get('rol') and update_data['rol'] != 'superadmin':
            raise HTTPException(
                status_code=400,
                detail="No se puede degradar el rol de una cuenta de Superadministrador Principal. Crea un usuario separado para la empresa."
            )
        if old_email in PROTECTED_SUPERADMIN_EMAILS and 'email' in update_data and update_data['email'].strip().lower() != old_email:
            raise HTTPException(
                status_code=400,
                detail=f"La cuenta principal de Superadmin ({old_email}) está protegida y su correo no debe reemplazarse por el de un cliente o gerente. Usa 'Crear Nuevo Usuario'."
            )

    if 'email' in update_data and update_data['email']:
        update_data['email'] = update_data['email'].strip().lower()
        exists = db.query(models.Usuario).filter(models.Usuario.email == update_data['email'], models.Usuario.id != usuario_id).first()
        if exists:
            rol_label = _rol_legible(exists)
            emp_actual = exists.empresa.nombre if exists.empresa else "Copai Central"
            raise HTTPException(
                status_code=400,
                detail=f"El correo '{update_data['email']}' ya está registrado por '{exists.nombre}' ({rol_label} en '{emp_actual}')."
            )

    # Garantizar coherencia entre rol y empresa_id
    target_rol = update_data.get('rol', usuario.rol)
    target_empresa_id = update_data.get('empresa_id', usuario.empresa_id)
    if target_rol == 'superadmin':
        update_data['empresa_id'] = None
    else:
        if not target_empresa_id:
            raise HTTPException(
                status_code=400,
                detail="Todo Gerente (admin) u Operador debe estar vinculado a una Empresa Cliente."
            )

    if 'password' in update_data:
        raw_pwd = update_data.pop('password')
        if raw_pwd:
            new_plain_password = raw_pwd
            usuario.password_hash = security.get_password_hash(raw_pwd)
        
    for key, value in update_data.items():
        setattr(usuario, key, value)

    db.commit()
    db.refresh(usuario)

    # Si se cambió el correo o se asignó una nueva contraseña, enviar notificación por correo
    email_changed = (usuario.email != old_email)
    if email_changed or new_plain_password:
        empresa_slug = None
        empresa_nombre = None
        if usuario.empresa_id:
            empresa_obj = db.query(models.Empresa).filter(models.Empresa.id == usuario.empresa_id).first()
            if empresa_obj:
                empresa_slug = empresa_obj.slug
                empresa_nombre = empresa_obj.nombre

        background_tasks.add_task(
            send_welcome_email,
            to_email=usuario.email,
            nombre=usuario.nombre,
            password_temp=new_plain_password or "(Tu contraseña actual)",
            entidad_o_placa=empresa_nombre or "Industrias Copai",
            tipo="empresa" if empresa_slug else "plataforma",
            empresa_slug=empresa_slug
        )
    
    return _enrich_usuario_out(usuario)


@router.put("/{usuario_id}/toggle-estado", response_model=schemas.UsuarioOut)
def toggle_estado_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_role(['superadmin']))
):
    if current_user.id == usuario_id:
        raise HTTPException(status_code=400, detail="No puedes desactivar tu propio usuario")
        
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if usuario.rol == 'superadmin':
        raise HTTPException(status_code=400, detail="No se puede desactivar la cuenta del Administrador Principal")

    usuario.activo = not usuario.activo
    db.commit()
    db.refresh(usuario)
    
    return _enrich_usuario_out(usuario)
