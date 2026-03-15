from typing import Dict, Set
from fastapi import WebSocket

class ConnectionManager:
    """WebSocket 连接管理器"""

    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        if client_id not in self.active_connections:
            self.active_connections[client_id] = set()
        self.active_connections[client_id].add(websocket)

    def disconnect(self, websocket: WebSocket, client_id: str):
        if client_id in self.active_connections:
            self.active_connections[client_id].discard(websocket)

    async def send_personal_message(self, message: dict, client_id: str):
        """发送个人消息"""
        connections = self.active_connections.get(client_id, set())
        for connection in connections:
            await connection.send_json(message)

    async def broadcast(self, message: dict, client_id: str = None):
        """广播消息"""
        if client_id:
            connections = self.active_connections.get(client_id, set())
        else:
            connections = [ws for conns in self.active_connections.values() for ws in conns]

        for connection in connections:
            await connection.send_json(message)

manager = ConnectionManager()
