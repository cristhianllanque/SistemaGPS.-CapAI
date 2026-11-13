import base64
import json
import logging
import os
from sqlalchemy import or_
from app.db.database import SessionLocal
from app.db import models

logger = logging.getLogger(__name__)

VAPID_KEYS_FILE = os.path.join("uploads", "vapid_keys.json")
VAPID_CLAIMS = {"sub": "mailto:industriascopai@gmail.com"}


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def get_or_create_vapid_keys() -> dict:
    """
    Obtiene o genera automáticamente el par de llaves VAPID ECDSA P-256
    para notificaciones Web Push (compatible con iOS 16.4+ PWA y Android Chrome/APK).
    """
    os.makedirs("uploads", exist_ok=True)
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
        return keys
    except Exception as e:
        logger.error(f"[PUSH] Error generando llaves VAPID: {e}")
        return {"public_key": "", "private_key": ""}


def send_web_push_sync(
    empresa_id: int,
    title: str,
    body: str,
    url: str = "/monitoreo",
    tag: str = "copai-alert",
) -> int:
    """
    Envía notificación Web Push en segundo plano a todos los dispositivos suscritos
    de la empresa correspondiente y a los superadministradores.
    """
    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        logger.warning("[PUSH] pywebpush no está instalado en el entorno.")
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
        subs = (
            db.query(models.PushSubscription)
            .filter(
                or_(
                    models.PushSubscription.empresa_id == empresa_id,
                    models.PushSubscription.rol == "superadmin",
                )
            )
            .all()
        )

        stale_ids = []
        for sub in subs:
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
            db.commit()

    return sent_count
