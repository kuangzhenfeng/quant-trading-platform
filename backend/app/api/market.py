from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from typing import List
from app.websocket.manager import manager
from app.services.market import market_service

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/tick/{symbol}")
async def get_tick(symbol: str, broker: str = "okx"):
    """获取行情快照"""
    adapter = market_service.adapters.get(broker)
    if not adapter:
        raise HTTPException(status_code=404, detail="券商不存在")

    if not adapter.connected:
        await adapter.connect()

    tick = await adapter.get_tick(symbol)
    return tick


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
