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
from app.db.database import engine, Base
from app.services.tcp_listener import start_tcp_server

# Ensure upload directories exist
os.makedirs("uploads/logos", exist_ok=True)
os.makedirs("uploads/banners", exist_ok=True)

# Create tables on startup
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the Teltonika TCP Server in the background
    tcp_task = asyncio.create_task(start_tcp_server(host='0.0.0.0', port=5000))
    yield
    # Cancel the task on shutdown
    tcp_task.cancel()
    try:
        await tcp_task
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
    # Verify JWT Token before accepting connection
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_empresa_id = payload.get("empresa_id")
        user_email = payload.get("sub")
        user_rol = payload.get("rol")
        if not user_email:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        if user_rol != 'superadmin':
            if user_empresa_id is None or int(user_empresa_id) != empresa_id:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
    except (JWTError, Exception):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    is_superadmin = (user_rol == 'superadmin')
    await manager.connect(websocket, empresa_id, is_superadmin=is_superadmin)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, empresa_id)


@app.get("/")
def read_root():
    return {"message": "Teltonika IoT Platform API"}
