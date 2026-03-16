from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.manager import manager
from app.services.market import market_service

router = APIRouter()

@router.websocket("/ws/health")
async def health_websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass

@router.websocket("/ws/market/{client_id}")
async def market_websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            if action == "subscribe":
                broker = data.get("broker")
                symbols = data.get("symbols", [])
                # 注册订阅
                await market_service.subscribe(client_id, broker, symbols)
                # 发送确认消息
                await manager.send_personal_message(
                    {"type": "subscribed", "broker": broker, "symbols": symbols},
                    client_id
                )
            elif action == "unsubscribe":
                # 取消订阅
                await market_service.unsubscribe(client_id)
                # 发送确认消息
                await manager.send_personal_message(
                    {"type": "unsubscribed"},
                    client_id
                )
            else:
                await manager.broadcast({"type": "echo", "data": data}, client_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)
