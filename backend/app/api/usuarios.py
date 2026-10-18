from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_user, require_role
from app.db import models, schemas
from app.core import security
from app.services.email_service import send_welcome_email

router = APIRouter()

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
    usuarios = query.all()
    
    result = []
    for u in usuarios:
        u_out = schemas.UsuarioOut.model_validate(u)
        if u.empresa:
            u_out.empresa_nombre = u.empresa.nombre
        result.append(u_out)
    return result


@router.post("/", response_model=schemas.UsuarioOut, status_code=201)
def create_usuario(
    payload: schemas.UsuarioCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_role(['superadmin']))
):
    # Check if user already exists
    exists = db.query(models.Usuario).filter(models.Usuario.email == payload.email).first()
    if exists:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    # Superadmin assigns to company specified in payload or leaves platform-level
    empresa_id = payload.empresa_id

    hashed_password = security.get_password_hash(payload.password)
    
    nuevo_usuario = models.Usuario(
        empresa_id=empresa_id,
        nombre=payload.nombre,
        email=payload.email,
        rol=payload.rol,
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

    result = schemas.UsuarioOut.model_validate(nuevo_usuario)
    if nuevo_usuario.empresa:
        result.empresa_nombre = nuevo_usuario.empresa.nombre
    return result


@router.put("/{usuario_id}", response_model=schemas.UsuarioOut)
def update_usuario(
    usuario_id: int,
    payload: schemas.UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_role(['superadmin']))
):
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    
    if 'email' in update_data:
        exists = db.query(models.Usuario).filter(models.Usuario.email == update_data['email'], models.Usuario.id != usuario_id).first()
        if exists:
            raise HTTPException(status_code=400, detail="El email ya está registrado por otro usuario")
            
    if 'password' in update_data:
        usuario.password_hash = security.get_password_hash(update_data.pop('password'))
        
    for key, value in update_data.items():
        setattr(usuario, key, value)

    db.commit()
    db.refresh(usuario)
    
    result = schemas.UsuarioOut.model_validate(usuario)
    if usuario.empresa:
        result.empresa_nombre = usuario.empresa.nombre
    return result


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
    
    result = schemas.UsuarioOut.model_validate(usuario)
    if usuario.empresa:
        result.empresa_nombre = usuario.empresa.nombre
    return result
