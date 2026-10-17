from fastapi import WebSocket
from typing import Dict, List, Set
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # empresa_id -> lista de conexiones activas para esa empresa específica
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Conexiones exclusivas de Superadmin (pueden ver eventos de toda la plataforma)
        self.superadmin_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket, empresa_id: int, is_superadmin: bool = False):
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

    async def broadcast_flota(self, empresa_id: int, message: dict):
        """
        Envía telemetría o alertas EXCLUSIVAMENTE a:
        1. Los operadores y administradores de la empresa dueña del vehículo (empresa_id).
        2. Los Superadministradores de Copay.
        NINGUNA OTRA EMPRESA O CLIENTE PARTICULAR RECIBE ESTE MENSAJE.
        """
        message["empresa_id"] = empresa_id
        destinatarios = set()

        # 1. Conexiones de la empresa dueña
        if empresa_id in self.active_connections:
            for ws in self.active_connections[empresa_id]:
                destinatarios.add(ws)

        # 2. Conexiones de Superadmin
        for ws in self.superadmin_connections:
            destinatarios.add(ws)

        dead_connections = []
        for connection in destinatarios:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)

        for dead_conn in dead_connections:
            self.disconnect(dead_conn, empresa_id)

    async def broadcast_to_empresa(self, empresa_id: int, message: dict):
        await self.broadcast_flota(empresa_id, message)

    async def broadcast_all(self, message: dict):
        """Solo para mensajes administrativos globales del sistema"""
        for empresa_id in list(self.active_connections.keys()):
            await self.broadcast_flota(empresa_id, message)

manager = ConnectionManager()
