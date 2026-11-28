from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import asyncio
import os
from contextlib import asynccontextmanager
from jose import jwt, JWTError
from app.api import auth, vehiculos, alertas, dispositivos, conductores, dashboard, reportes, usuarios, empresas, particulares, pwa
from app.websockets.manager import manager
from app.core.config import settings
from app.db.database import engine, Base, SessionLocal
from app.db import models
from datetime import datetime, timedelta
from sqlalchemy import inspect, text
from app.services.tcp_listener import start_tcp_server

# Ensure upload directories exist
os.makedirs("uploads/logos", exist_ok=True)
os.makedirs("uploads/banners", exist_ok=True)

# Create tables on startup
Base.metadata.create_all(bind=engine)

def ensure_subscription_columns():
    """Agrega de forma segura e idempotente las columnas de suscripción y diagnóstico si no existen."""
    try:
        inspector = inspect(engine)
        tables = set(inspector.get_table_names())
        with engine.begin() as conn:
            if "empresas" in tables:
                cols = {c["name"] for c in inspector.get_columns("empresas")}
                if "plan_servicio" not in cols:
                    conn.execute(text("ALTER TABLE empresas ADD COLUMN plan_servicio VARCHAR(30) DEFAULT 'mensual'"))
                if "fecha_vencimiento" not in cols:
                    conn.execute(text("ALTER TABLE empresas ADD COLUMN fecha_vencimiento DATE NULL"))
                if "corte_automatico" not in cols:
                    conn.execute(text("ALTER TABLE empresas ADD COLUMN corte_automatico BOOLEAN DEFAULT TRUE"))
            if "dispositivos" in tables:
                dcols = {c["name"] for c in inspector.get_columns("dispositivos")}
                if "ultima_conexion" not in dcols:
                    conn.execute(text("ALTER TABLE dispositivos ADD COLUMN ultima_conexion DATETIME NULL"))
                if "plan_sim" not in dcols:
                    conn.execute(text("ALTER TABLE dispositivos ADD COLUMN plan_sim VARCHAR(150) NULL"))
                if "costo_sim" not in dcols:
                    conn.execute(text("ALTER TABLE dispositivos ADD COLUMN costo_sim FLOAT NULL"))
                if "fecha_activacion_sim" not in dcols:
                    conn.execute(text("ALTER TABLE dispositivos ADD COLUMN fecha_activacion_sim DATE NULL"))
                if "fecha_vencimiento_sim" not in dcols:
                    conn.execute(text("ALTER TABLE dispositivos ADD COLUMN fecha_vencimiento_sim DATE NULL"))
                if "apn_sim" not in dcols:
                    conn.execute(text("ALTER TABLE dispositivos ADD COLUMN apn_sim VARCHAR(100) NULL"))
                if engine.dialect.name in {"mysql", "mariadb"}:
                    conn.execute(text("ALTER TABLE dispositivos MODIFY COLUMN numero_sim VARCHAR(30) NULL"))
    except Exception as exc:
        print(f"[DB MIGRATION WARN] ensure_subscription_columns: {exc}", flush=True)

ensure_subscription_columns()

def ensure_vehicle_lifecycle_columns():
    columns = {column["name"] for column in inspect(engine).get_columns("vehiculos")}
    datetime_type = "DATETIME(6)" if engine.dialect.name in {"mysql", "mariadb"} else "DATETIME"
    with engine.begin() as conn:
        if "gps_asignado_at" not in columns:
            conn.execute(text(f"ALTER TABLE vehiculos ADD COLUMN gps_asignado_at {datetime_type} NULL"))
        if "baja_individual_at" not in columns:
            conn.execute(text("ALTER TABLE vehiculos ADD COLUMN baja_individual_at DATETIME NULL"))

ensure_vehicle_lifecycle_columns()

def purge_old_gps_readings(retention_days: int = 180):
    """Limpia lecturas crudas de GPS con más de 180 días (6 meses) para mantener la base de datos ligera y veloz."""
    try:
        cutoff = datetime.utcnow() - timedelta(days=retention_days)
        with SessionLocal() as db:
            deleted = db.query(models.LecturaGPS).filter(models.LecturaGPS.timestamp < cutoff).delete(synchronize_session=False)
            db.commit()
            if deleted:
                print(f"[DB MAINTENANCE] Limpieza automática completada: {deleted} lecturas GPS antiguas (> {retention_days} días) depuradas.", flush=True)
    except Exception as exc:
        print(f"[DB MAINTENANCE WARN] Error en limpieza automática de lecturas: {exc}", flush=True)

async def maintenance_cleanup_loop():
    """Ejecuta la limpieza de lecturas antiguas (> 180 días) una vez cada 24 horas en segundo plano."""
    await asyncio.sleep(30)
    while True:
        await asyncio.to_thread(purge_old_gps_readings, 180)
        await asyncio.sleep(86400)

@asynccontextmanager
async def lifespan(app: FastAPI):
    manager.set_loop(asyncio.get_running_loop())
    from app.services.push_service import get_or_create_vapid_keys, init_firebase_admin
    get_or_create_vapid_keys()
    init_firebase_admin()
    # Start the Teltonika TCP Server in the background
    tcp_task = asyncio.create_task(start_tcp_server(host='0.0.0.0', port=5000))
    cleanup_task = asyncio.create_task(maintenance_cleanup_loop())
    yield
    # Cancel tasks on shutdown
    tcp_task.cancel()
    cleanup_task.cancel()
    try:
        await tcp_task
    except asyncio.CancelledError:
        pass
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(empresas.router, prefix="/api/empresas", tags=["empresas"])
app.include_router(particulares.router, prefix="/api/particulares", tags=["particulares"])
app.include_router(dispositivos.router, prefix="/api/dispositivos", tags=["dispositivos"])
app.include_router(conductores.router, prefix="/api/conductores", tags=["conductores"])
app.include_router(vehiculos.router, prefix="/api/vehiculos", tags=["vehiculos"])
app.include_router(alertas.router, prefix="/api/alertas", tags=["alertas"])
app.include_router(reportes.router, prefix="/api/reportes", tags=["reportes"])
app.include_router(usuarios.router, prefix="/api/usuarios", tags=["usuarios"])
app.include_router(pwa.router, prefix="/api/pwa", tags=["pwa"])


@app.websocket("/ws/flota/{empresa_id}")
async def websocket_endpoint(websocket: WebSocket, empresa_id: int, token: str = None):
    # Verify JWT Token and live account/company status before accepting connection
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    try:
        from app.api.deps import is_user_access_allowed
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": False},
        )
        if payload.get("type") == "password_reset":
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        user_email = payload.get("sub")
        user_id = payload.get("user_id")
        if not user_email and user_id is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        with SessionLocal() as db:
            db_user = None
            if user_id is not None:
                db_user = db.query(models.Usuario).filter(models.Usuario.id == int(user_id)).first()
            if db_user is None and user_email:
                db_user = db.query(models.Usuario).filter(models.Usuario.email == user_email).first()
            if not is_user_access_allowed(db_user):
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
            live_user_id = db_user.id
            user_empresa_id = db_user.empresa_id
            user_rol = db_user.rol
        if user_rol != 'superadmin':
            if user_empresa_id is None or int(user_empresa_id) != empresa_id:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
    except (JWTError, Exception):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    is_superadmin = (user_rol == 'superadmin')
    await manager.connect(websocket, empresa_id, is_superadmin=is_superadmin, user_id=live_user_id)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, empresa_id)


@app.get("/")
def read_root():
    return {"message": "Teltonika IoT Platform API"}
