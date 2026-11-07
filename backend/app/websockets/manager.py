from fastapi import WebSocket
from typing import Dict, List, Set, Optional
import asyncio
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # empresa_id -> lista de conexiones activas para esa empresa específica
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Conexiones exclusivas de Superadmin (pueden ver eventos de toda la plataforma)
        self.superadmin_connections: Set[WebSocket] = set()
        self.loop: Optional[asyncio.AbstractEventLoop] = None

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        self.loop = loop

    async def connect(self, websocket: WebSocket, empresa_id: int, is_superadmin: bool = False):
        if self.loop is None:
            try:
                self.loop = asyncio.get_running_loop()
            except RuntimeError:
                pass
        await websocket.accept()
        if is_superadmin:
            self.superadmin_connections.add(websocket)
        else:
            if empresa_id not in self.active_connections:
                self.active_connections[empresa_id] = []
            self.active_connections[empresa_id].append(websocket)

    def disconnect(self, websocket: WebSocket, empresa_id: int):
        self.superadmin_connections.discard(websocket)
        if empresa_id in self.active_connections:
            if websocket in self.active_connections[empresa_id]:
                self.active_connections[empresa_id].remove(websocket)
            if not self.active_connections[empresa_id]:
                del self.active_connections[empresa_id]

    async def broadcast_flota(self, empresa_id: Optional[int], message: dict):
        """
        Envía telemetría, alertas o sincronizaciones en vivo EXCLUSIVAMENTE a:
        1. Los operadores y administradores de la empresa involucrada (empresa_id).
        2. Los Superadministradores de Copai.
        NINGUNA OTRA EMPRESA O CLIENTE PARTICULAR RECIBE ESTE MENSAJE.
        """
        payload = dict(message)
        payload["empresa_id"] = empresa_id
        destinatarios = set()

        # 1. Conexiones de la empresa dueña (si aplica)
        if empresa_id is not None and empresa_id in self.active_connections:
            for ws in self.active_connections[empresa_id]:
                destinatarios.add(ws)

        # 2. Conexiones de Superadmin
        for ws in self.superadmin_connections:
            destinatarios.add(ws)

        dead_connections = []
        for connection in destinatarios:
            try:
                await connection.send_json(payload)
            except Exception:
                dead_connections.append(connection)

        for dead_conn in dead_connections:
            self.disconnect(dead_conn, empresa_id or 0)

    def notify_sync(self, empresa_id: Optional[int], message: dict):
        """
        Puente seguro entre endpoints síncronos (hilos FastAPI) y el event loop asíncrono
        para emitir actualizaciones en tiempo real sin bloquear transacciones HTTP.
        """
        if not self.loop or self.loop.is_closed():
            return
        try:
            running_loop = None
            try:
                running_loop = asyncio.get_running_loop()
            except RuntimeError:
                running_loop = None

            if running_loop is self.loop:
                self.loop.create_task(self.broadcast_flota(empresa_id, message))
            else:
                asyncio.run_coroutine_threadsafe(self.broadcast_flota(empresa_id, message), self.loop)
        except Exception as exc:
            logger.warning(f"No se pudo emitir evento WS en vivo: {exc}")

    async def broadcast_to_empresa(self, empresa_id: int, message: dict):
        await self.broadcast_flota(empresa_id, message)

    async def broadcast_all(self, message: dict):
        """Solo para mensajes administrativos globales del sistema"""
        if not self.active_connections:
            await self.broadcast_flota(None, message)
            return
        for empresa_id in list(self.active_connections.keys()):
            await self.broadcast_flota(empresa_id, message)

manager = ConnectionManager()
