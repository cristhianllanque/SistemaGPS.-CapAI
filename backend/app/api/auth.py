from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.core import security
from app.db import models, schemas
from app.core.config import settings

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
    if user.empresa:
        user_out.empresa_nombre = user.empresa.nombre

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario": user_out,
        "empresa": user.empresa
    }

@router.get("/me")
def get_current_user_profile(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    user_out = schemas.UsuarioOut.model_validate(current_user)
    if current_user.empresa:
        user_out.empresa_nombre = current_user.empresa.nombre
    return {
        "usuario": user_out,
        "empresa": current_user.empresa
    }

