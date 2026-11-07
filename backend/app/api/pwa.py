from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse, Response, RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional
from app.api.deps import get_db
from app.db.models import Empresa
import io
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
        # Nombre corto optimizado para el icono en la pantalla de inicio del celular
        import re
        clean_short = re.sub(r'^(empresa\s+de\s+transportes?\s+|transportes?\s+|empresa\s+)', '', empresa.nombre, flags=re.I).strip()
        short_name = clean_short[:18] if clean_short else empresa.nombre[:18]
        theme_color = empresa.color_primario or "#16A34A"
        bg_color = empresa.color_terciario or "#CCF5DC"
        description = empresa.slogan or f"Sistema de Rastreo Satelital y Telemetría de {empresa.nombre}"
        start_url = f"https://{empresa.slug}.industriascopai.com/?source=pwa"

        # Generar URLs cuadradas exactas PNG (192x192 y 512x512) válidas para WebAPK de cualquier empresa
        icon_192 = f"/api/pwa/icon/{empresa.slug}/192.png" if empresa.logo_url else "/copai-symbol.png"
        icon_512 = f"/api/pwa/icon/{empresa.slug}/512.png" if empresa.logo_url else "/copai-symbol.png"

        return {
            "name": app_name,
            "short_name": short_name,
            "description": description,
            "id": f"com.industriascopai.{empresa.slug}",
            "start_url": start_url,
            "scope": "/",
            "display": "standalone",
            "orientation": "portrait",
            "background_color": "#020617",
            "theme_color": "#020617",
            "lang": "es-PE",
            "icons": [
                {
                    "src": icon_192,
                    "sizes": "192x192",
                    "type": "image/png",
                    "purpose": "any"
                },
                {
                    "src": icon_512,
                    "sizes": "512x512",
                    "type": "image/png",
                    "purpose": "any"
                },
                {
                    "src": icon_512,
                    "sizes": "512x512",
                    "type": "image/png",
                    "purpose": "maskable"
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


@router.api_route("/icon/{slug}/{size}.png", methods=["GET", "HEAD"])
def get_dynamic_company_pwa_icon(
    slug: str,
    size: int,
    db: Session = Depends(get_db)
):
    """
    Genera al vuelo un ícono cuadrado exacto (192x192 o 512x512 PNG) a partir del logo
    de cualquier empresa cliente (x.industriascopai.com), garantizando compatibilidad
    universal con WebAPK en Android e iOS sin importar si el logo original era JPG o rectangular.
    """
    safe_size = 512 if size >= 300 else 192
    empresa = db.query(Empresa).filter(
        Empresa.slug == slug.lower().strip(),
        Empresa.activo == True
    ).first()

    if not empresa or not empresa.logo_url:
        return RedirectResponse(url="/copai-symbol.png")

    logo_filename = os.path.basename(empresa.logo_url.strip())
    local_logo_path = os.path.join("uploads", "logos", logo_filename)
    if not os.path.exists(local_logo_path):
        return RedirectResponse(url="/copai-symbol.png")

    try:
        from PIL import Image
        img = Image.open(local_logo_path).convert("RGBA")
        canvas = Image.new("RGBA", (safe_size, safe_size), (255, 255, 255, 255))
        target_box = int(safe_size * 0.80)
        iw, ih = img.size
        ratio = min(target_box / max(1, iw), target_box / max(1, ih))
        nw, nh = max(1, int(iw * ratio)), max(1, int(ih * ratio))
        resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
        ox = (safe_size - nw) // 2
        oy = (safe_size - nh) // 2
        canvas.paste(resized, (ox, oy), resized)

        buf = io.BytesIO()
        canvas.convert("RGB").save(buf, format="PNG", optimize=True)
        return Response(
            content=buf.getvalue(),
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=3600"}
        )
    except Exception:
        return RedirectResponse(url="/copai-symbol.png")

