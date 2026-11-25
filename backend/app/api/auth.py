from datetime import timedelta, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.api.deps import get_db, get_current_user
from app.api.empresas import calcular_info_suscripcion
from app.core import security
from app.db import models, schemas
from app.core.config import settings
from app.services.email_service import send_password_reset_email

router = APIRouter()

@router.post("/login", response_model=schemas.UsuarioToken)
def login_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = db.query(models.Usuario).filter(models.Usuario.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Credenciales incorrectas. Verifica tu correo y contraseña.")
    elif not user.activo:
        raise HTTPException(
            status_code=403,
            detail="SERVICIO_SUSPENDIDO: Tu usuario se encuentra desactivado temporalmente. Comunícate con tu administrador o soporte de Industrias CopAI (+51 974 342 536)."
        )

    if user.rol != "superadmin" and user.empresa:
        if not user.empresa.activo:
            raise HTTPException(
                status_code=403,
                detail="SERVICIO_SUSPENDIDO: El servicio de monitoreo GPS de tu cuenta se encuentra en pausa por renovación. Comunícate con soporte de Industrias CopAI (+51 974 342 536) para reactivarlo de inmediato."
            )
        plan = (getattr(user.empresa, "plan_servicio", None) or "mensual").lower().strip()
        corte_auto = getattr(user.empresa, "corte_automatico", True)
        fecha_venc = getattr(user.empresa, "fecha_vencimiento", None)
        if corte_auto and plan != "ilimitado" and fecha_venc is not None:
            hoy = datetime.now(timezone(timedelta(hours=-5))).date()
            if hoy > fecha_venc:
                raise HTTPException(
                    status_code=403,
                    detail=f"SERVICIO_VENCIDO: Tu periodo de suscripción GPS venció el {fecha_venc.strftime('%d/%m/%Y')}. Comunícate con Industrias CopAI (+51 974 342 536) para renovar tu plan y reactivar el acceso al instante."
                )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email, "user_id": user.id, "empresa_id": user.empresa_id, "rol": user.rol}, expires_delta=access_token_expires
    )
    
    user_out = schemas.UsuarioOut.model_validate(user)
    if not user.empresa:
        empresa_data = schemas.Empresa(
            id=0,
            nombre="Copai Telematics (Central)",
            slug="copai-central",
            logo_url=None,
            color_primario="#4F46E5",
            activo=True,
            plan_servicio="ilimitado",
            estado_suscripcion="ilimitado"
        )
        user_out.empresa_nombre = "Copai Central"
    else:
        sub_info = calcular_info_suscripcion(user.empresa)
        empresa_data = schemas.Empresa.model_validate(user.empresa)
        empresa_data.plan_servicio = sub_info["plan_servicio"]
        empresa_data.fecha_vencimiento = sub_info["fecha_vencimiento"]
        empresa_data.corte_automatico = sub_info["corte_automatico"]
        empresa_data.dias_restantes = sub_info["dias_restantes"]
        empresa_data.estado_suscripcion = sub_info["estado_suscripcion"]
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
    if not current_user.empresa:
        empresa_data = schemas.Empresa(
            id=0,
            nombre="Copai Telematics (Central)",
            slug="copai-central",
            logo_url=None,
            color_primario="#4F46E5",
            activo=True,
            plan_servicio="ilimitado",
            estado_suscripcion="ilimitado"
        )
        user_out.empresa_nombre = "Copai Central"
    else:
        sub_info = calcular_info_suscripcion(current_user.empresa)
        empresa_data = schemas.Empresa.model_validate(current_user.empresa)
        empresa_data.plan_servicio = sub_info["plan_servicio"]
        empresa_data.fecha_vencimiento = sub_info["fecha_vencimiento"]
        empresa_data.corte_automatico = sub_info["corte_automatico"]
        empresa_data.dias_restantes = sub_info["dias_restantes"]
        empresa_data.estado_suscripcion = sub_info["estado_suscripcion"]
        user_out.empresa_nombre = current_user.empresa.nombre

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    fresh_token = security.create_access_token(
        data={
            "sub": current_user.email,
            "user_id": current_user.id,
            "empresa_id": current_user.empresa_id,
            "rol": current_user.rol,
        },
        expires_delta=access_token_expires,
    )

    return {
        "access_token": fresh_token,
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


@router.post("/change-password")
def change_password(
    payload: schemas.ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Permite a cualquier usuario autenticado actualizar su propia contraseña personal.
    """
    if not security.verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual ingresada no es correcta")

    clean_new = (payload.new_password or "").strip()
    if len(clean_new) < 6:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 6 caracteres")

    if security.verify_password(clean_new, current_user.password_hash):
        raise HTTPException(status_code=400, detail="La nueva contraseña debe ser diferente a la actual")

    current_user.password_hash = security.get_password_hash(clean_new)
    db.commit()

    return {"message": "Tu contraseña personal ha sido actualizada correctamente."}


