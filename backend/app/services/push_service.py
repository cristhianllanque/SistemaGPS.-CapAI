import base64
import json
import logging
import os
from app.api.deps import is_company_subscription_active
from app.db.database import SessionLocal
from app.db import models

logger = logging.getLogger(__name__)

VAPID_KEYS_FILE = os.path.join(".secrets", "vapid_keys.json")
LEGACY_PUBLIC_VAPID_KEYS_FILE = os.path.join("uploads", "vapid_keys.json")
VAPID_CLAIMS = {"sub": "mailto:industriascopai@gmail.com"}


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


def send_web_push_sync(
    empresa_id: int,
    title: str,
    body: str,
    url: str = "/monitoreo",
    tag: str = "copai-alert",
) -> int:
    """
    Envía notificación Web Push en segundo plano exclusivamente a los dispositivos suscritos
    cuyos usuarios siguen activos, pertenecen actualmente a la empresa correspondiente
    (con suscripción activa) o son superadministradores activos.
    """
    webpush, WebPushException = _get_webpush_client()
    if webpush is None:
        return 0

    keys = get_or_create_vapid_keys()
    priv_key = keys.get("private_key")
    if not priv_key:
        return 0

    payload_str = json.dumps(
        {
            "title": title,
            "body": body,
            "icon": "/copai-symbol.png",
            "badge": "/copai-symbol.png",
            "url": url,
            "tag": tag,
        }
    )

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

            # Verificar autorización real de la cuenta antes de enviar
            if user.rol != "superadmin":
                if user.empresa_id is None or int(user.empresa_id) != int(empresa_id):
                    continue
                if not is_company_subscription_active(user.empresa):
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
                    ttl=120,
                )
                sent_count += 1
            except WebPushException as ex:
                status_code = getattr(getattr(ex, "response", None), "status_code", None)
                if status_code in (404, 410):
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

