from fastapi import WebSocket
from typing import Dict, List
import json

class ConnectionManager:
    def __init__(self):
        # empresa_id -> list of active connections
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, empresa_id: int):
        await websocket.accept()
        if empresa_id not in self.active_connections:
            self.active_connections[empresa_id] = []
        self.active_connections[empresa_id].append(websocket)

    def disconnect(self, websocket: WebSocket, empresa_id: int):
        if empresa_id in self.active_connections:
            if websocket in self.active_connections[empresa_id]:
                self.active_connections[empresa_id].remove(websocket)
            if not self.active_connections[empresa_id]:
                del self.active_connections[empresa_id]

    async def broadcast_to_empresa(self, empresa_id: int, message: dict):
        if empresa_id not in self.active_connections:
            return
            
        dead_connections = []
        for connection in list(self.active_connections[empresa_id]):
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)
                
        for dead_conn in dead_connections:
            self.disconnect(dead_conn, empresa_id)

    async def broadcast_all(self, message: dict):
        for empresa_id in list(self.active_connections.keys()):
            await self.broadcast_to_empresa(empresa_id, message)

manager = ConnectionManager()
