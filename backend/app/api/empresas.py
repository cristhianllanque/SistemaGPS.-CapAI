import re
import unicodedata
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_db, get_current_user, require_role
from app.db import models, schemas
from app.core import security
from app.services.email_service import send_welcome_email

router = APIRouter()

def slugify(text: str) -> str:
    """Converts a company name to a URL-safe unique slug."""
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    return re.sub(r'[-\s]+', '-', text)

@router.get("/", response_model=List[schemas.EmpresaOut])
def list_empresas(
    tipo: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    query = db.query(models.Empresa)
    if tipo:
        query = query.filter(models.Empresa.tipo == tipo)
    else:
        query = query.filter(models.Empresa.tipo != 'particular')

    if current_user.rol != 'superadmin':
        query = query.filter(models.Empresa.id == current_user.empresa_id)
        
    empresas = query.all()
    result = []
    for emp in empresas:
        total_veh = db.query(models.Vehiculo).filter(models.Vehiculo.empresa_id == emp.id, models.Vehiculo.activo == True).count()
        total_disp = db.query(models.Dispositivo).filter(models.Dispositivo.empresa_id == emp.id, models.Dispositivo.activo == True).count()
        total_usr = db.query(models.Usuario).filter(models.Usuario.empresa_id == emp.id, models.Usuario.activo == True).count()
        
        emp_dict = schemas.EmpresaOut.model_validate(emp)
        emp_dict.total_vehiculos = total_veh
        emp_dict.total_dispositivos = total_disp
        emp_dict.total_usuarios = total_usr
        result.append(emp_dict)
        
    return result

@router.get("/portal/{slug}", response_model=schemas.EmpresaPublicPortal)
def get_empresa_public_portal(
    slug: str,
    db: Session = Depends(get_db)
):
    """Obtiene los datos públicos de marca y presentación para la landing white-label del subdominio"""
    emp = db.query(models.Empresa).filter(
        models.Empresa.slug == slug.lower().strip(),
        models.Empresa.activo == True
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    total_veh = db.query(models.Vehiculo).filter(
        models.Vehiculo.empresa_id == emp.id, 
        models.Vehiculo.activo == True
    ).count()

    return schemas.EmpresaPublicPortal(
        id=emp.id,
        nombre=emp.nombre,
        slug=emp.slug,
        logo_url=emp.logo_url,
        banner_url=emp.banner_url,
        color_primario=emp.color_primario or "#1E40AF",
        color_secundario=getattr(emp, 'color_secundario', None) or "#FFFFFF",
        color_terciario=getattr(emp, 'color_terciario', None),
        slogan=emp.slogan,
        servicios=emp.servicios,
        telefono=emp.telefono,
        documento=emp.documento,
        total_vehiculos=total_veh,
        limite_velocidad=emp.limite_velocidad or 90
    )

@router.get("/{empresa_id}", response_model=schemas.EmpresaOut)
def get_empresa(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != 'superadmin' and current_user.empresa_id != empresa_id:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta empresa")
        
    emp = db.query(models.Empresa).filter(models.Empresa.id == empresa_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
        
    total_veh = db.query(models.Vehiculo).filter(models.Vehiculo.empresa_id == emp.id, models.Vehiculo.activo == True).count()
    total_disp = db.query(models.Dispositivo).filter(models.Dispositivo.empresa_id == emp.id, models.Dispositivo.activo == True).count()
    total_usr = db.query(models.Usuario).filter(models.Usuario.empresa_id == emp.id, models.Usuario.activo == True).count()
    
    emp_dict = schemas.EmpresaOut.model_validate(emp)
    emp_dict.total_vehiculos = total_veh
    emp_dict.total_dispositivos = total_disp
    emp_dict.total_usuarios = total_usr
    return emp_dict

import uuid
import os
from fastapi import UploadFile, File

@router.post("/upload-logo")
async def upload_logo(
    request: Request,
    file: UploadFile = File(...),
    current_user: models.Usuario = Depends(require_role(['superadmin', 'admin']))
):
    """Permite subir el logotipo PNG de una empresa directamente desde el equipo"""
    filename = file.filename.lower()
    if not filename.endswith('.png') or (file.content_type and 'png' not in file.content_type.lower()):
        raise HTTPException(
            status_code=400,
            detail="Formato de imagen inválido. Solo se admiten archivos en formato PNG (.png)."
        )

    os.makedirs("uploads/logos", exist_ok=True)
    unique_filename = f"logo_{uuid.uuid4().hex[:10]}.png"
    filepath = os.path.join("uploads", "logos", unique_filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    base_url = str(request.base_url).rstrip('/')
    logo_url = f"{base_url}/uploads/logos/{unique_filename}"
    return {"logo_url": logo_url, "filename": file.filename}

@router.post("/upload-banner")
async def upload_banner(
    request: Request,
    file: UploadFile = File(...),
    current_user: models.Usuario = Depends(require_role(['superadmin', 'admin']))
):
    """Permite subir la foto panorámica o banner de la flota de la empresa (PNG, JPG, WEBP)"""
    filename = file.filename.lower()
    allowed_exts = ('.png', '.jpg', '.jpeg', '.webp')
    if not any(filename.endswith(ext) for ext in allowed_exts):
        raise HTTPException(
            status_code=400,
            detail="Formato de imagen inválido. Solo se admiten archivos PNG, JPG o WEBP."
        )

    os.makedirs("uploads/banners", exist_ok=True)
    ext = os.path.splitext(filename)[1]
    unique_filename = f"banner_{uuid.uuid4().hex[:10]}{ext}"
    filepath = os.path.join("uploads", "banners", unique_filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    base_url = str(request.base_url).rstrip('/')
    banner_url = f"{base_url}/uploads/banners/{unique_filename}"
    return {"banner_url": banner_url, "filename": file.filename}

@router.post("/", response_model=schemas.EmpresaOut, status_code=201)
def create_empresa(
    payload: schemas.EmpresaCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_role(['superadmin']))
):
    # Generate unique slug (respecting custom slug if specified)
    base_slug = slugify(payload.slug) if payload.slug else slugify(payload.nombre)
    slug = base_slug
    counter = 1
    while db.query(models.Empresa).filter(models.Empresa.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    nueva_empresa = models.Empresa(
        nombre=payload.nombre,
        slug=slug,
        documento=payload.documento,
        telefono=payload.telefono,
        logo_url=payload.logo_url,
        banner_url=payload.banner_url,
        slogan=payload.slogan,
        servicios=payload.servicios,
        color_primario=payload.color_primario or "#1E40AF",
        color_secundario=payload.color_secundario or "#FFFFFF",
        color_terciario=payload.color_terciario,
        limite_velocidad=payload.limite_velocidad or 90,
        activo=True
    )
    db.add(nueva_empresa)
    db.commit()
    db.refresh(nueva_empresa)

    # Optional: Automatically create the Gerente user for this company
    if payload.gerente_email and payload.gerente_password:
        existing_user = db.query(models.Usuario).filter(models.Usuario.email == payload.gerente_email).first()
        if not existing_user:
            nuevo_gerente = models.Usuario(
                empresa_id=nueva_empresa.id,
                nombre=payload.gerente_nombre or f"Gerente {payload.nombre}",
                email=payload.gerente_email,
                rol='admin',
                password_hash=security.get_password_hash(payload.gerente_password),
                activo=True
            )
            db.add(nuevo_gerente)
            db.commit()
            print(f"[COPAI NOTIFICACIÓN] Creado usuario Gerente ({payload.gerente_email}) para la empresa '{payload.nombre}'. Enlace de bienvenida enviado por correo.", flush=True)

            # Enviar correo de bienvenida al gerente en segundo plano
            background_tasks.add_task(
                send_welcome_email,
                to_email=payload.gerente_email,
                nombre=payload.gerente_nombre or f"Gerente {payload.nombre}",
                password_temp=payload.gerente_password,
                entidad_o_placa=payload.nombre,
                tipo="empresa"
            )

    emp_dict = schemas.EmpresaOut.model_validate(nueva_empresa)
    emp_dict.total_vehiculos = 0
    emp_dict.total_dispositivos = 0
    emp_dict.total_usuarios = 1 if payload.gerente_email else 0
    return emp_dict

@router.put("/{empresa_id}", response_model=schemas.EmpresaOut)
def update_empresa(
    empresa_id: int,
    payload: schemas.EmpresaUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_role(['superadmin', 'admin']))
):
    if current_user.rol != 'superadmin' and current_user.empresa_id != empresa_id:
        raise HTTPException(status_code=403, detail="No tienes permisos para modificar esta empresa")

    emp = db.query(models.Empresa).filter(models.Empresa.id == empresa_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    if payload.nombre is not None:
        emp.nombre = payload.nombre
    if payload.slug is not None and current_user.rol == 'superadmin':
        clean_slug = slugify(payload.slug)
        existing = db.query(models.Empresa).filter(models.Empresa.slug == clean_slug, models.Empresa.id != emp.id).first()
        if not existing:
            emp.slug = clean_slug
    if payload.logo_url is not None:
        emp.logo_url = payload.logo_url
    if payload.banner_url is not None:
        emp.banner_url = payload.banner_url
    if payload.slogan is not None:
        emp.slogan = payload.slogan
    if payload.servicios is not None:
        emp.servicios = payload.servicios
    if payload.color_primario is not None:
        emp.color_primario = payload.color_primario
    if payload.color_secundario is not None:
        emp.color_secundario = payload.color_secundario
    if payload.color_terciario is not None:
        emp.color_terciario = payload.color_terciario
    if payload.limite_velocidad is not None:
        emp.limite_velocidad = payload.limite_velocidad
    if payload.documento is not None:
        emp.documento = payload.documento
    if payload.telefono is not None:
        emp.telefono = payload.telefono
    if payload.activo is not None and current_user.rol == 'superadmin':
        emp.activo = payload.activo

    db.commit()
    db.refresh(emp)

    total_veh = db.query(models.Vehiculo).filter(models.Vehiculo.empresa_id == emp.id, models.Vehiculo.activo == True).count()
    total_disp = db.query(models.Dispositivo).filter(models.Dispositivo.empresa_id == emp.id, models.Dispositivo.activo == True).count()
    total_usr = db.query(models.Usuario).filter(models.Usuario.empresa_id == emp.id, models.Usuario.activo == True).count()

    emp_dict = schemas.EmpresaOut.model_validate(emp)
    emp_dict.total_vehiculos = total_veh
    emp_dict.total_dispositivos = total_disp
    emp_dict.total_usuarios = total_usr
    return emp_dict

@router.put("/{empresa_id}/limite-velocidad")
def set_limite_velocidad(
    empresa_id: int,
    payload: schemas.LimiteVelocidadUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_role(['superadmin', 'admin']))
):
    """Permite tanto al Superadmin como al Admin de la empresa configurar el límite de velocidad en km/h"""
    if current_user.rol != 'superadmin' and current_user.empresa_id != empresa_id:
        raise HTTPException(status_code=403, detail="No tienes permisos para modificar el límite de esta empresa")

    emp = db.query(models.Empresa).filter(models.Empresa.id == empresa_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    if payload.limite_velocidad < 20 or payload.limite_velocidad > 160:
        raise HTTPException(status_code=400, detail="El límite de velocidad debe estar entre 20 y 160 km/h")

    emp.limite_velocidad = payload.limite_velocidad
    db.commit()
    db.refresh(emp)

    return {
        "status": "ok",
        "empresa_id": emp.id,
        "limite_velocidad": emp.limite_velocidad,
        "message": f"Límite de velocidad actualizado a {emp.limite_velocidad} km/h para {emp.nombre}"
    }
