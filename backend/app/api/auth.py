from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.api.deps import get_db, get_current_user
from app.core import security
from app.db import models, schemas
from app.core.config import settings
from app.services.email_service import send_password_reset_email

router = APIRouter()

@router.post("/login", response_model=schemas.UsuarioToken)
def login_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = db.query(models.Usuario).filter(models.Usuario.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.activo:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email, "empresa_id": user.empresa_id, "rol": user.rol}, expires_delta=access_token_expires
    )
    
    user_out = schemas.UsuarioOut.model_validate(user)
    empresa_data = user.empresa
    if not empresa_data:
        empresa_data = schemas.Empresa(
            id=0,
            nombre="Copai Telematics (Central)",
            slug="copai-central",
            logo_url=None,
            color_primario="#4F46E5",
            activo=True
        )
        user_out.empresa_nombre = "Copai Central"
    else:
        user_out.empresa_nombre = user.empresa.nombre

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario": user_out,
        "empresa": empresa_data
    }

@router.get("/me")
def get_current_user_profile(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    user_out = schemas.UsuarioOut.model_validate(current_user)
    empresa_data = current_user.empresa
    if not empresa_data:
        empresa_data = schemas.Empresa(
            id=0,
            nombre="Copai Telematics (Central)",
            slug="copai-central",
            logo_url=None,
            color_primario="#4F46E5",
            activo=True
        )
        user_out.empresa_nombre = "Copai Central"
    else:
        user_out.empresa_nombre = current_user.empresa.nombre

    return {
        "usuario": user_out,
        "empresa": empresa_data
    }


@router.post("/forgot-password")
def forgot_password(
    payload: schemas.ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Solicita el restablecimiento de contraseña enviando un enlace al correo del usuario.
    Responde siempre con éxito para prevenir enumeración de usuarios.
    """
    email_clean = payload.email.strip().lower()
    user = db.query(models.Usuario).filter(models.Usuario.email == email_clean, models.Usuario.activo == True).first()
    
    if user:
        reset_token_expires = timedelta(hours=2)
        token = security.create_access_token(
            data={"sub": user.email, "type": "password_reset"}, 
            expires_delta=reset_token_expires
        )
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        
        background_tasks.add_task(
            send_password_reset_email,
            to_email=user.email,
            nombre=user.nombre,
            reset_link=reset_link
        )
        print(f"[AUTH RECOVERY] Enlace de recuperación generado para {user.email}", flush=True)

    return {
        "message": "Si la dirección de correo electrónico está registrada en el sistema, recibirás un enlace de restablecimiento en unos momentos."
    }


@router.post("/reset-password")
def reset_password(
    payload: schemas.ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Valida el token de recuperación y establece la nueva contraseña.
    """
    if not payload.new_password or len(payload.new_password.strip()) < 6:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 6 caracteres")

    try:
        token_data = jwt.decode(payload.token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email = token_data.get("sub")
        token_type = token_data.get("type")
        if not email or token_type != "password_reset":
            raise HTTPException(status_code=400, detail="Token inválido o expirado")
    except JWTError:
        raise HTTPException(status_code=400, detail="El enlace de recuperación es inválido o ha expirado")

    user = db.query(models.Usuario).filter(models.Usuario.email == email, models.Usuario.activo == True).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.password_hash = security.get_password_hash(payload.new_password.strip())
    db.commit()

    return {"message": "Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión con tu nueva clave."}

