from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import JSONResponse, Response, HTMLResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, Dict
from app.api.deps import get_db, get_current_user
from app.db.models import Empresa, Usuario, PushSubscription
from app.services.push_service import get_or_create_vapid_keys, send_web_push_sync
import html
import io
import os
import re

router = APIRouter()

RESERVED_SUBDOMAINS = {'www', 'api', 'ws', 'mail', 'app', 'admin', 'copai', 'industriascopai', 'test'}


def extract_subdomain(host: str) -> Optional[str]:
    if not host:
        return None
    clean_host = host.split(":")[0].lower()
    parts = clean_host.split(".")
    if len(parts) >= 3:
        sub = parts[0]
        if sub not in RESERVED_SUBDOMAINS:
            return sub
    return None


def clean_company_short_name(nombre: str) -> str:
    clean_short = re.sub(
        r'^(empresa\s+de\s+transportes?\s+|transportes?\s+|empresa\s+)',
        '',
        nombre or '',
        flags=re.I
    ).strip()
    return (clean_short[:20] if clean_short else (nombre or 'COPAI GPS')[:20]).strip()


def get_logo_cache_key(empresa: Optional[Empresa]) -> str:
    if not empresa or not empresa.logo_url:
        return "copai"
    base = os.path.splitext(os.path.basename(empresa.logo_url.strip()))[0]
    return base[-10:] if base else "v1"


def _find_copai_default_icon_path() -> Optional[str]:
    candidates = [
        "/var/www/copay/html/apple-touch-icon.png",
        "/var/www/copay/html/copai-symbol.png",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "public", "apple-touch-icon.png")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "public", "copai-symbol.png")),
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


def _render_square_png_bytes(empresa: Optional[Empresa], size: int) -> Optional[bytes]:
    from PIL import Image

    # 1. Si es una empresa con logo propio cargado en el servidor
    if empresa and empresa.logo_url:
        logo_filename = os.path.basename(empresa.logo_url.strip())
        local_logo_path = os.path.join("uploads", "logos", logo_filename)
        if os.path.exists(local_logo_path):
            try:
                img = Image.open(local_logo_path).convert("RGBA")
                canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
                target_box = int(size * 0.82)
                iw, ih = img.size
                ratio = min(target_box / max(1, iw), target_box / max(1, ih))
                nw, nh = max(1, int(iw * ratio)), max(1, int(ih * ratio))
                resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
                ox = (size - nw) // 2
                oy = (size - nh) // 2
                canvas.paste(resized, (ox, oy), resized)

                buf = io.BytesIO()
                canvas.convert("RGB").save(buf, format="PNG", optimize=True)
                return buf.getvalue()
            except Exception:
                pass

    # 2. Respaldo oficial COPAI (dominio principal industriascopai.com o empresa aún sin logo)
    fallback_path = _find_copai_default_icon_path()
    if fallback_path:
        try:
            img = Image.open(fallback_path).convert("RGBA")
            resized = img.resize((size, size), Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            resized.convert("RGB").save(buf, format="PNG", optimize=True)
            return buf.getvalue()
        except Exception:
            try:
                with open(fallback_path, "rb") as fh:
                    return fh.read()
            except Exception:
                pass
    return None


def build_manifest_data(empresa: Optional[Empresa], host: str) -> dict:
    if empresa:
        app_name = f"{empresa.nombre} - Telematics GPS"
        short_name = clean_company_short_name(empresa.nombre)
        description = empresa.slogan or f"Sistema de Rastreo Satelital y Telemetría de {empresa.nombre}"
        start_url = f"https://{empresa.slug}.industriascopai.com/?source=pwa"
        ver = get_logo_cache_key(empresa)

        icon_192 = f"/api/pwa/icon/{empresa.slug}/192.png?v={ver}" if empresa.logo_url else "/copai-symbol.png"
        icon_512 = f"/api/pwa/icon/{empresa.slug}/512.png?v={ver}" if empresa.logo_url else "/copai-symbol.png"

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


@router.api_route("/apple-touch-icon.png", methods=["GET", "HEAD"])
@router.api_route("/apple-touch-icon-precomposed.png", methods=["GET", "HEAD"])
def get_dynamic_apple_touch_icon(
    request: Request,
    subdomain: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Sirve al instante (200 OK PNG 180x180) el ícono oficial para Safari en iPhone/iPad
    según el subdominio (<empresa>.industriascopai.com -> logo de la empresa;
    industriascopai.com -> logo maestro de COPAI).
    """
    host = request.headers.get("host", "")
    target_slug = subdomain or extract_subdomain(host)

    empresa = None
    if target_slug:
        empresa = db.query(Empresa).filter(
            Empresa.slug == target_slug.lower().strip(),
            Empresa.activo == True
        ).first()

    png_bytes = _render_square_png_bytes(empresa, 180)
    if png_bytes:
        return Response(
            content=png_bytes,
            media_type="image/png",
            headers={"Cache-Control": "no-cache, must-revalidate"}
        )
    return RedirectResponse(url="/copai-symbol.png")


@router.api_route("/icon/{slug}/{size}.png", methods=["GET", "HEAD"])
def get_dynamic_company_pwa_icon(
    slug: str,
    size: int,
    db: Session = Depends(get_db)
):
    """
    Genera al vuelo un ícono cuadrado exacto (180x180, 192x192 o 512x512 PNG) a partir del logo
    de cualquier empresa cliente (x.industriascopai.com), garantizando compatibilidad universal
    tanto en iPhone (Safari Add to Home Screen) como en Android (WebAPK).
    """
    safe_size = 512 if size >= 300 else (180 if size <= 180 else 192)
    empresa = db.query(Empresa).filter(
        Empresa.slug == slug.lower().strip(),
        Empresa.activo == True
    ).first()

    png_bytes = _render_square_png_bytes(empresa, safe_size)
    if png_bytes:
        return Response(
            content=png_bytes,
            media_type="image/png",
            headers={"Cache-Control": "no-cache, must-revalidate"}
        )
    return RedirectResponse(url="/copai-symbol.png")


@router.api_route("/index.html", methods=["GET", "HEAD"])
def get_dynamic_tenant_index_html(
    request: Request,
    subdomain: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Entrega el index.html compilado inyectando desde el milisegundo cero el nombre corto
    y el Apple Touch Icon propio de la empresa cuando se accede desde <empresa>.industriascopai.com.
    En industriascopai.com conserva intacta la identidad maestra de COPAI GPS.
    """
    candidates = [
        "/var/www/copay/html/index.html",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "dist", "index.html")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "index.html")),
    ]
    raw_html = None
    for path in candidates:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as fh:
                raw_html = fh.read()
            break

    if not raw_html:
        return HTMLResponse("<!doctype html><html><body>Cargando...</body></html>", status_code=200)

    host = request.headers.get("host", "")
    target_slug = subdomain or extract_subdomain(host)

    if target_slug:
        empresa = db.query(Empresa).filter(
            Empresa.slug == target_slug.lower().strip(),
            Empresa.activo == True
        ).first()
        if empresa:
            short_title = html.escape(clean_company_short_name(empresa.nombre), quote=True)
            ver = get_logo_cache_key(empresa)
            raw_html = raw_html.replace(
                'content="COPAI GPS" id="meta-apple-title"',
                f'content="{short_title}" id="meta-apple-title"'
            )
            raw_html = raw_html.replace(
                "<title>COPAI</title>",
                f"<title>{short_title}</title>"
            )
            if empresa.logo_url:
                apple_href = f"/api/pwa/icon/{empresa.slug}/180.png?v={ver}"
                fav_href = f"/api/pwa/icon/{empresa.slug}/192.png?v={ver}"
                raw_html = raw_html.replace(
                    'href="/apple-touch-icon.png" id="meta-apple-icon"',
                    f'href="{apple_href}" id="meta-apple-icon"'
                )
                raw_html = raw_html.replace(
                    'href="/copai-symbol.png"',
                    f'href="{fav_href}"'
                )

    return HTMLResponse(
        content=raw_html,
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
        }
    )


class PushSubscriptionPayload(BaseModel):
    endpoint: str
    keys: Dict[str, str]


@router.get("/vapid-public-key")
def get_vapid_public_key():
    keys = get_or_create_vapid_keys()
    return {"publicKey": keys.get("public_key", "")}


@router.post("/push/subscribe")
def subscribe_push_notifications(
    payload: PushSubscriptionPayload,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    endpoint = (payload.endpoint or "").strip()
    p256dh = (payload.keys or {}).get("p256dh", "").strip()
    auth_key = (payload.keys or {}).get("auth", "").strip()

    if not endpoint or not p256dh or not auth_key:
        raise HTTPException(status_code=400, detail="Suscripción Push incompleta")

    ua = (request.headers.get("user-agent") or "")[:250]
    existing = (
        db.query(PushSubscription)
        .filter(PushSubscription.endpoint == endpoint)
        .first()
    )
    if existing:
        existing.usuario_id = current_user.id
        existing.empresa_id = current_user.empresa_id
        existing.rol = current_user.rol
        existing.p256dh = p256dh
        existing.auth = auth_key
        existing.user_agent = ua
    else:
        sub = PushSubscription(
            usuario_id=current_user.id,
            empresa_id=current_user.empresa_id,
            rol=current_user.rol,
            endpoint=endpoint,
            p256dh=p256dh,
            auth=auth_key,
            user_agent=ua,
        )
        db.add(sub)

    db.commit()
    return {"status": "subscribed", "rol": current_user.rol}


@router.post("/push/test")
def test_push_notification(
    current_user: Usuario = Depends(get_current_user),
):
    target_empresa = current_user.empresa_id or 1
    sent = send_web_push_sync(
        empresa_id=target_empresa,
        title="🔔 Alertas COPAI GPS Activas",
        body="Tu teléfono sonará en tu bolsillo ante Botón de Pánico, Sabotaje o Exceso de Velocidad.",
        url="/monitoreo",
        tag="copai-test-alert",
    )
    return {"status": "ok", "sent": sent}


@router.get("/route")
def get_street_route(
    u_lat: float,
    u_lng: float,
    v_lat: float,
    v_lng: float,
):
    """
    Calcula la ruta vial exacta por calles (geometría GeoJSON) desde el servidor EC2
    hacia los motores OSRM / OpenStreetMap, evitando bloqueos o lentitud de operadoras móviles.
    """
    import json
    import urllib.request

    coords = f"{u_lng},{u_lat};{v_lng},{v_lat}"
    endpoints = [
        f"https://routing.openstreetmap.de/routed-car/route/v1/driving/{coords}?overview=full&geometries=geojson",
        f"https://router.project-osrm.org/route/v1/driving/{coords}?overview=full&geometries=geojson",
    ]
    headers = {
        "User-Agent": "CopAI-Telematics-GPS/2.0 (https://industriascopai.com)",
        "Accept": "application/json",
    }

    for url in endpoints:
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=5.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                routes = data.get("routes") or []
                if routes and routes[0].get("geometry", {}).get("coordinates"):
                    return data
        except Exception:
            continue

    raise HTTPException(status_code=502, detail="No se pudo obtener ruta vial en este momento")


