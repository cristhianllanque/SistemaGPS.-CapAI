from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional
from app.db.database import get_db
from app.db.models import Empresa
import os

router = APIRouter()

RESERVED_SUBDOMAINS = {'www', 'api', 'ws', 'mail', 'app', 'admin', 'copai', 'industriascopai', 'test'}

def extract_subdomain(host: str) -> Optional[str]:
    if not host:
        return None
    # Strip port if present
    clean_host = host.split(":")[0].lower()
    parts = clean_host.split(".")
    # Example: huaynaroque.industriascopai.com -> 3 parts
    if len(parts) >= 3:
        sub = parts[0]
        if sub not in RESERVED_SUBDOMAINS:
            return sub
    return None

def build_manifest_data(empresa: Optional[Empresa], host: str) -> dict:
    if empresa:
        app_name = f"{empresa.nombre} - Telematics GPS"
        short_name = empresa.nombre[:18]
        theme_color = empresa.color_primario or "#16A34A"
        bg_color = empresa.color_terciario or "#CCF5DC"
        description = empresa.slogan or f"Sistema de Rastreo Satelital y Telemetría de {empresa.nombre}"
        start_url = f"https://{empresa.slug}.industriascopai.com/?source=pwa"

        # Determine icon
        icon_src = "/copai-symbol.png"
        if empresa.logo_url:
            clean_logo = empresa.logo_url.strip()
            if clean_logo.startswith("http"):
                icon_src = clean_logo
            elif clean_logo.startswith("/"):
                icon_src = clean_logo
            else:
                icon_src = f"/uploads/logos/{os.path.basename(clean_logo)}"

        return {
            "name": app_name,
            "short_name": short_name,
            "description": description,
            "id": f"com.industriascopai.{empresa.slug}",
            "start_url": start_url,
            "scope": "/",
            "display": "standalone",
            "orientation": "any",
            "background_color": bg_color,
            "theme_color": theme_color,
            "lang": "es-PE",
            "icons": [
                {
                    "src": icon_src,
                    "sizes": "192x192",
                    "type": "image/png",
                    "purpose": "any maskable"
                },
                {
                    "src": icon_src,
                    "sizes": "512x512",
                    "type": "image/png",
                    "purpose": "any maskable"
                }
            ],
            "categories": ["business", "navigation", "utilities"],
            "screenshots": []
        }

    # Default COPAI Master Branding
    return {
        "name": "COPAI Telematics GPS",
        "short_name": "COPAI GPS",
        "description": "Plataforma Integral de Rastreo Satelital, Telemetría e IoT",
        "id": "com.industriascopai.central",
        "start_url": "/?source=pwa",
        "scope": "/",
        "display": "standalone",
        "orientation": "any",
        "background_color": "#0f172a",
        "theme_color": "#0f172a",
        "lang": "es-PE",
        "icons": [
            {
                "src": "/copai-symbol.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any maskable"
            },
            {
                "src": "/copai-symbol.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any maskable"
            }
        ],
        "categories": ["business", "navigation", "utilities"],
        "screenshots": []
    }

@router.get("/manifest.json")
@router.get("/manifest.webmanifest")
def get_manifest(
    request: Request,
    subdomain: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Retorna dinámicamente el manifiesto PWA con el logo, colores y nombre oficial 
    de la empresa según el subdominio del cliente o parámetro.
    """
    host = request.headers.get("host", "")
    target_slug = subdomain or extract_subdomain(host)

    empresa = None
    if target_slug:
        empresa = db.query(Empresa).filter(
            Empresa.slug == target_slug,
            Empresa.activo == True
        ).first()

    manifest = build_manifest_data(empresa, host)
    return JSONResponse(
        content=manifest,
        media_type="application/manifest+json",
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"}
    )

@router.get("/info")
def get_pwa_info(
    request: Request,
    subdomain: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Entrega los metadatos de instalación para Android e iOS (Apple Touch Icon y Título).
    """
    host = request.headers.get("host", "")
    target_slug = subdomain or extract_subdomain(host)

    empresa = None
    if target_slug:
        empresa = db.query(Empresa).filter(
            Empresa.slug == target_slug,
            Empresa.activo == True
        ).first()

    manifest = build_manifest_data(empresa, host)
    return {
        "is_custom_tenant": empresa is not None,
        "empresa_nombre": empresa.nombre if empresa else "COPAI",
        "empresa_slug": empresa.slug if empresa else None,
        "app_name": manifest["name"],
        "short_name": manifest["short_name"],
        "icon_url": manifest["icons"][0]["src"],
        "theme_color": manifest["theme_color"],
        "background_color": manifest["background_color"]
    }
