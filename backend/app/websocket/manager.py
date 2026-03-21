from typing import Dict, Set
from fastapi import WebSocket
from app.services.log import log_service
from app.models.schemas import LogLevel


class ConnectionManager:
    """WebSocket 连接管理器"""

    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        if client_id not in self.active_connections:
            self.active_connections[client_id] = set()
        self.active_connections[client_id].add(websocket)
        log_service.log(LogLevel.INFO, "websocket", f"WebSocket 客户端连接: {client_id}, 当前连接数: {self._total_connections()}")

    def disconnect(self, websocket: WebSocket, client_id: str):
        if client_id in self.active_connections:
            self.active_connections[client_id].discard(websocket)
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]
        log_service.log(LogLevel.INFO, "websocket", f"WebSocket 客户端断开: {client_id}, 当前连接数: {self._total_connections()}")

    def _total_connections(self) -> int:
        return sum(len(conns) for conns in self.active_connections.values())

    async def send_personal_message(self, message: dict, client_id: str):
        """发送个人消息"""
        connections = self.active_connections.get(client_id, set())
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception:
                log_service.log(LogLevel.WARNING, "websocket", f"WebSocket 发送消息失败: {client_id}")

    async def broadcast(self, message: dict, client_id: str = None):
        """广播消息"""
        if client_id:
            connections = self.active_connections.get(client_id, set())
        else:
            connections = [ws for conns in self.active_connections.values() for ws in conns]

        failed = 0
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception:
                failed += 1
        if failed > 0:
            log_service.log(LogLevel.WARNING, "websocket", f"WebSocket 广播失败: {failed}/{len(connections)} 条消息发送失败")


manager = ConnectionManager()
