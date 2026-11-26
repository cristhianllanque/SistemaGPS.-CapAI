from typing import Generator, Optional
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.core.config import settings
from app.db import models

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

def is_company_subscription_active(empresa: Optional[models.Empresa]) -> bool:
    if empresa is None or not empresa.activo:
        return False
    plan = (getattr(empresa, "plan_servicio", None) or "mensual").lower().strip()
    corte_auto = getattr(empresa, "corte_automatico", True)
    if corte_auto is None:
        corte_auto = True
    fecha_venc = getattr(empresa, "fecha_vencimiento", None)
    if corte_auto and plan != "ilimitado" and fecha_venc is not None:
        hoy = datetime.now(timezone(timedelta(hours=-5))).date()
        if hoy > fecha_venc:
            return False
    return True

def is_user_access_allowed(user: Optional[models.Usuario]) -> bool:
    if user is None or not user.activo:
        return False
    if user.rol != "superadmin":
        if user.empresa is None or not is_company_subscription_active(user.empresa):
            return False
    return True

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": False},
        )
        if payload.get("type") == "password_reset":
            raise credentials_exception
        email: str = payload.get("sub")
        user_id = payload.get("user_id")
        if email is None and user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = None
    if email:
        user = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if user is None and user_id is not None:
        user = db.query(models.Usuario).filter(models.Usuario.id == int(user_id)).first()
    if user is None or not user.activo:
        raise credentials_exception

    # Verificar que la empresa/cuenta del usuario no esté suspendida ni vencida con corte automático
    if user.rol != "superadmin":
        if user.empresa is None or not user.empresa.activo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="SERVICIO_SUSPENDIDO: El servicio GPS de tu cuenta se encuentra en pausa por renovación."
            )
        if not is_company_subscription_active(user.empresa):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="SERVICIO_VENCIDO: Tu suscripción GPS ha vencido. Comunícate con soporte para renovarla."
            )

    return user

def require_role(allowed_roles: list[str]):
    def role_checker(current_user: models.Usuario = Depends(get_current_user)):
        if current_user.rol not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes los permisos necesarios para realizar esta acción"
            )
        return current_user
    return role_checker
