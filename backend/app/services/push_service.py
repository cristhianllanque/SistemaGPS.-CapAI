import base64
import json
import logging
import os
from typing import Optional
from app.api.deps import is_company_subscription_active
from app.db.database import SessionLocal
from app.db import models

logger = logging.getLogger(__name__)

VAPID_KEYS_FILE = os.path.join(".secrets", "vapid_keys.json")
LEGACY_PUBLIC_VAPID_KEYS_FILE = os.path.join("uploads", "vapid_keys.json")
FIREBASE_SA_FILE = os.path.join(".secrets", "firebase_service_account.json")
VAPID_CLAIMS = {"sub": "mailto:industriascopai@gmail.com"}

_FCM_TOKEN_CACHE = {"access_token": None, "expires_at": 0.0, "project_id": None}


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _purge_legacy_public_vapid_keys() -> bool:
    """
    Si existía un archivo de claves VAPID en el directorio público 'uploads/',
    lo elimina de inmediato y fuerza la rotación del par de claves.
    """
    had_legacy = False
    if os.path.exists(LEGACY_PUBLIC_VAPID_KEYS_FILE):
        had_legacy = True
        try:
            os.remove(LEGACY_PUBLIC_VAPID_KEYS_FILE)
            logger.warning("[PUSH] Archivo VAPID legado eliminado del directorio público uploads/.")
        except Exception as e:
            logger.error(f"[PUSH] No se pudo eliminar {LEGACY_PUBLIC_VAPID_KEYS_FILE}: {e}")
    return had_legacy


def get_or_create_vapid_keys() -> dict:
    """
    Obtiene o genera automáticamente el par de llaves VAPID ECDSA P-256
    fuera del directorio público para notificaciones Web Push.
    Si detecta una clave legada en 'uploads/vapid_keys.json', la elimina y rota las llaves.
    """
    had_legacy = _purge_legacy_public_vapid_keys()
    secret_dir = os.path.dirname(VAPID_KEYS_FILE)
    if secret_dir:
        os.makedirs(secret_dir, exist_ok=True)

    if had_legacy and os.path.exists(VAPID_KEYS_FILE):
        try:
            os.remove(VAPID_KEYS_FILE)
        except Exception:
            pass

    if os.path.exists(VAPID_KEYS_FILE):
        try:
            with open(VAPID_KEYS_FILE, "r", encoding="utf-8") as fh:
                data = json.load(fh)
                if data.get("public_key") and data.get("private_key"):
                    return data
        except Exception as e:
            logger.warning(f"[PUSH] Error leyendo {VAPID_KEYS_FILE}, regenerando: {e}")

    try:
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives import serialization

        private_key = ec.generate_private_key(ec.SECP256R1())
        public_key = private_key.public_key()

        # Public key in uncompressed X9.62 format (65 bytes starting with 0x04) -> base64url
        pub_bytes = public_key.public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.UncompressedPoint,
        )
        # Private key raw 32-byte scalar -> base64url (accepted directly by pywebpush)
        priv_int = private_key.private_numbers().private_value
        priv_bytes = priv_int.to_bytes(32, byteorder="big")

        keys = {
            "public_key": _b64url_encode(pub_bytes),
            "private_key": _b64url_encode(priv_bytes),
        }
        with open(VAPID_KEYS_FILE, "w", encoding="utf-8") as fh:
            json.dump(keys, fh, indent=2)
        try:
            os.chmod(VAPID_KEYS_FILE, 0o600)
        except Exception:
            pass
        return keys
    except Exception as e:
        logger.error(f"[PUSH] Error generando llaves VAPID: {e}")
        return {"public_key": "", "private_key": ""}


def _get_webpush_client():
    try:
        from pywebpush import webpush, WebPushException
        return webpush, WebPushException
    except ImportError:
        logger.warning("[PUSH] pywebpush no está instalado en el entorno.")
        return None, Exception


def _get_fcm_access_token() -> tuple[Optional[str], Optional[str]]:
    """
    Obtiene un token OAuth2 para Firebase Cloud Messaging HTTP v1 usando
    .secrets/firebase_service_account.json (sin requerir paquetes externos adicionales).
    """
    import time
    import urllib.request

    now = time.time()
    if _FCM_TOKEN_CACHE["access_token"] and now < _FCM_TOKEN_CACHE["expires_at"] - 60:
        return _FCM_TOKEN_CACHE["access_token"], _FCM_TOKEN_CACHE["project_id"]

    sa_data = None
    env_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    if env_json:
        try:
            sa_data = json.loads(env_json)
        except Exception:
            sa_data = None
    elif os.path.exists(FIREBASE_SA_FILE):
        try:
            with open(FIREBASE_SA_FILE, "r", encoding="utf-8") as fh:
                sa_data = json.load(fh)
        except Exception as e:
            logger.warning(f"[PUSH-FCM] No se pudo leer {FIREBASE_SA_FILE}: {e}")

    if not sa_data or not sa_data.get("private_key") or not sa_data.get("client_email"):
        return None, None

    try:
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding

        iat = int(now)
        exp = iat + 3600
        header_b64 = _b64url_encode(json.dumps({"alg": "RS256", "typ": "JWT"}).encode("utf-8"))
        claim_b64 = _b64url_encode(
            json.dumps(
                {
                    "iss": sa_data["client_email"],
                    "scope": "https://www.googleapis.com/auth/firebase.messaging",
                    "aud": sa_data.get("token_uri", "https://oauth2.googleapis.com/token"),
                    "iat": iat,
                    "exp": exp,
                }
            ).encode("utf-8")
        )
        signing_input = f"{header_b64}.{claim_b64}".encode("ascii")
        priv_key = serialization.load_pem_private_key(
            sa_data["private_key"].encode("utf-8"), password=None
        )
        signature = priv_key.sign(signing_input, padding.PKCS1v15(), hashes.SHA256())
        jwt_assertion = f"{header_b64}.{claim_b64}.{_b64url_encode(signature)}"

        body = (
            "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer"
            f"&assertion={jwt_assertion}"
        ).encode("utf-8")
        req = urllib.request.Request(
            sa_data.get("token_uri", "https://oauth2.googleapis.com/token"),
            data=body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=6) as resp:
            token_resp = json.loads(resp.read().decode("utf-8"))
            access_token = token_resp.get("access_token")
            project_id = sa_data.get("project_id")
            if access_token and project_id:
                _FCM_TOKEN_CACHE["access_token"] = access_token
                _FCM_TOKEN_CACHE["project_id"] = project_id
                _FCM_TOKEN_CACHE["expires_at"] = now + float(token_resp.get("expires_in", 3600))
                return access_token, project_id
    except Exception as e:
        logger.warning(f"[PUSH-FCM] Error obteniendo token OAuth2 de Firebase: {e}")

    return None, None


def _send_fcm_push(fcm_token: str, title: str, body: str, url: str, tag: str) -> tuple[bool, bool]:
    """
    Envía notificación nativa de alta prioridad por Firebase Cloud Messaging HTTP v1.
    Retorna (enviado_ok, token_invalido_para_eliminar).
    """
    import urllib.error
    import urllib.request

    access_token, project_id = _get_fcm_access_token()
    if not access_token or not project_id:
        # Si aún no se colocó firebase_service_account.json, conservar la suscripción activa sin borrarla
        return True, False

    fcm_url = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
    message_payload = {
        "message": {
            "token": fcm_token,
            "notification": {
                "title": title,
                "body": body,
            },
            "data": {
                "title": title,
                "body": body,
                "url": url,
                "tag": tag,
            },
            "android": {
                "priority": "HIGH",
                "ttl": "300s",
                "notification": {
                    "channel_id": "copai_emergency_alerts",
                    "sound": "default",
                    "notification_priority": "PRIORITY_MAX",
                    "visibility": "PUBLIC",
                    "default_vibrate_timings": False,
                    "vibrate_timings": ["0.6s", "0.15s", "0.6s", "0.15s", "0.8s", "0.15s", "1.0s"],
                    "tag": tag,
                },
            },
        }
    }
    req = urllib.request.Request(
        fcm_url,
        data=json.dumps(message_payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json; charset=UTF-8",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            return (200 <= resp.status < 300), False
    except urllib.error.HTTPError as he:
        if he.code in (400, 404, 410):
            return False, True
        logger.warning(f"[PUSH-FCM] HTTP {he.code} enviando FCM: {he}")
        return False, False
    except Exception as e:
        logger.warning(f"[PUSH-FCM] Error enviando FCM: {e}")
        return False, False


def send_web_push_sync(
    empresa_id: Optional[int],
    title: str,
    body: str,
    url: str = "/monitoreo",
    tag: str = "copai-alert",
    target_user_id: Optional[int] = None,
    target_endpoint: Optional[str] = None,
) -> int:
    """
    Envía notificación Web Push en segundo plano respetando aislamiento estricto:
    - Si se indica `target_endpoint` o `target_user_id` (ej. confirmación al activar la campana),
      se envía ÚNICAMENTE a ese dispositivo/usuario individual (nunca a otros usuarios ni al superadmin).
    - Si es una alerta vehicular de `empresa_id`, se envía ÚNICAMENTE a los usuarios activos
      asignados a esa `empresa_id` específica (con suscripción activa). Cada cuenta es 100% independiente.
    """
    webpush, WebPushException = _get_webpush_client()
    keys = get_or_create_vapid_keys()
    priv_key = keys.get("private_key")

    payload_str = json.dumps(
        {
            "title": title,
            "body": body,
            "icon": "/copai-symbol.png",
            "badge": "/copai-symbol.png",
            "url": url,
            "tag": tag,
            "vibrate": [600, 150, 600, 150, 800, 150, 1000],
            "requireInteraction": True,
            "renotify": True,
        }
    )

    clean_target_ep = (target_endpoint or "").strip()

    sent_count = 0
    with SessionLocal() as db:
        rows = (
            db.query(models.PushSubscription, models.Usuario)
            .outerjoin(
                models.Usuario,
                models.PushSubscription.usuario_id == models.Usuario.id,
            )
            .all()
        )

        stale_ids = []
        dirty_subs = False
        for sub, user in rows:
            # Si el usuario fue eliminado o desactivado, revocar la suscripción push
            if user is None or not user.activo:
                stale_ids.append(sub.id)
                continue

            # Sincronizar rol y empresa_id de la suscripción con el estado real del usuario
            if sub.rol != user.rol or sub.empresa_id != user.empresa_id:
                sub.rol = user.rol
                sub.empresa_id = user.empresa_id
                dirty_subs = True

            # Caso 1: Envío dirigido a un dispositivo o usuario específico (ej. prueba de campanita)
            if clean_target_ep or target_user_id is not None:
                if clean_target_ep and sub.endpoint != clean_target_ep:
                    continue
                if target_user_id is not None and int(user.id) != int(target_user_id):
                    continue
                if user.rol != "superadmin" and not is_company_subscription_active(user.empresa):
                    continue
            else:
                # Caso 2: Alerta vehicular de una empresa o cliente particular específico
                # Aislamiento estricto: solo reciben la alerta los usuarios que pertenecen a esa empresa_id
                if empresa_id is None or user.empresa_id is None or int(user.empresa_id) != int(empresa_id):
                    continue
                if user.rol != "superadmin" and not is_company_subscription_active(user.empresa):
                    continue

            if sub.endpoint.startswith("fcm://"):
                raw_fcm_token = sub.endpoint[len("fcm://"):].strip()
                ok_fcm, is_stale = _send_fcm_push(raw_fcm_token, title, body, url, tag)
                if ok_fcm:
                    sent_count += 1
                elif is_stale:
                    stale_ids.append(sub.id)
                continue

            if sub.endpoint.startswith("copai-android://"):
                # Suscripción activa de la App Oficial Android (canal híbrido WebView + Bridge Nativo)
                sent_count += 1
                continue

            if webpush is None or not priv_key:
                continue

            subscription_info = {
                "endpoint": sub.endpoint,
                "keys": {
                    "p256dh": sub.p256dh,
                    "auth": sub.auth,
                },
            }
            try:
                webpush(
                    subscription_info=subscription_info,
                    data=payload_str,
                    vapid_private_key=priv_key,
                    vapid_claims=dict(VAPID_CLAIMS),
                    ttl=300,
                    headers={"Urgency": "high"},
                )
                sent_count += 1
            except WebPushException as ex:
                status_code = getattr(getattr(ex, "response", None), "status_code", None)
                if status_code in (400, 401, 403, 404, 410):
                    stale_ids.append(sub.id)
                else:
                    logger.warning(f"[PUSH] Fallo enviando a endpoint ({status_code}): {ex}")
            except Exception as ex:
                logger.warning(f"[PUSH] Error inesperado enviando push: {ex}")

        if stale_ids:
            db.query(models.PushSubscription).filter(
                models.PushSubscription.id.in_(stale_ids)
            ).delete(synchronize_session=False)
            dirty_subs = True

        if dirty_subs:
            db.commit()

    return sent_count

