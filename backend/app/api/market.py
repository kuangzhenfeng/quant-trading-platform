from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
from app.websocket.manager import manager
from app.services.market import market_service
from app.adapters.okx import OKXAdapter
from app.adapters.guojin import GuojinAdapter
from app.adapters.moomoo import MoomooAdapter

router = APIRouter()

# 初始化 Adapters
market_service.register_adapter("okx", OKXAdapter({}))
market_service.register_adapter("guojin", GuojinAdapter({}))
market_service.register_adapter("moomoo", MoomooAdapter({}))


@router.websocket("/ws/market/{client_id}")
async def market_websocket(websocket: WebSocket, client_id: str):
    """行情 WebSocket 端点"""
    await manager.connect(websocket, client_id)

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "subscribe":
                broker = data.get("broker", "okx")
                symbols = data.get("symbols", [])

                adapter = market_service.adapters.get(broker)
                if adapter and not adapter.connected:
                    await adapter.connect()

                await market_service.subscribe(client_id, broker, symbols)

                await websocket.send_json({
                    "type": "subscribed",
                    "broker": broker,
                    "symbols": symbols
                })

    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)
