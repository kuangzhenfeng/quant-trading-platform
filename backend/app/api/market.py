from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query
from typing import List
from datetime import datetime, timedelta
from app.websocket.manager import manager
from app.services.market import market_service
from app.services.log import log_service
from app.models.schemas import LogLevel

router = APIRouter(prefix="/api/market", tags=["market"])

_INTERVAL_SECONDS = {"1m": 60, "5m": 300, "15m": 900, "1H": 3600, "1D": 86400}


@router.get("/tick/{symbol}")
async def get_tick(symbol: str, broker: str = "okx"):
    """获取行情快照"""
    adapter = market_service.adapters.get(broker)
    if not adapter:
        log_service.log(LogLevel.WARNING, "market", f"获取行情失败: 券商 {broker} 不存在")
        raise HTTPException(status_code=404, detail="券商不存在")

    if not adapter.connected:
        try:
            await adapter.connect()
        except Exception as e:
            log_service.log(LogLevel.ERROR, "market", f"获取行情失败: {broker} 连接失败, {e}")
            raise HTTPException(status_code=500, detail=f"连接券商失败: {e}")

    try:
        tick = await adapter.get_tick(symbol)
        return tick
    except Exception as e:
        log_service.log(LogLevel.ERROR, "market", f"获取行情失败: {broker} {symbol}, {e}")
        raise HTTPException(status_code=500, detail=f"获取行情失败: {e}")


@router.get("/klines/{symbol}")
async def get_klines(
    symbol: str,
    broker: str = "okx",
    interval: str = Query("1H", description="K线周期: 1m, 5m, 15m, 1H, 1D"),
    limit: int = Query(100, ge=1, le=1000, description="返回数量")
):
    """获取K线数据，根据当前交易模式选择合适的数据源"""
    from app.core.config import TradingMode, settings
    from app.adapters.factory import AdapterFactory
    from app.adapters.mock import MockAdapter

    adapter = market_service.adapters.get(broker)

    # 如果指定broker的adapter不存在或未连接，根据交易模式创建
    use_mock = False
    if not adapter or not adapter.connected:
        try:
            if settings.trading_mode == TradingMode.MOCK:
                adapter = MockAdapter({})
                await adapter.connect()
                market_service.register_adapter(broker, adapter)
                log_service.log(LogLevel.INFO, "market", f"K线数据使用 Mock 模式: {broker}")
            else:
                # PAPER 或 LIVE 模式，使用对应adapter
                mode = TradingMode.PAPER if settings.trading_mode == TradingMode.PAPER else TradingMode.LIVE
                adapter = AdapterFactory.create(broker, {}, mode)
                await adapter.connect()
                market_service.register_adapter(broker, adapter)
                log_service.log(LogLevel.INFO, "market", f"K线数据使用 {mode.value} 模式: {broker}")
        except Exception as e:
            log_service.log(LogLevel.WARNING, "market", f"创建 {broker} K线 adapter失败: {e}, 降级使用 Mock")
            # 降级使用mock
            adapter = MockAdapter({})
            await adapter.connect()
            market_service.register_adapter(broker, adapter)
            log_service.log(LogLevel.INFO, "market", f"K线数据降级使用 Mock 模式: {broker}")

    # 计算时间范围
    end_time = datetime.now()
    seconds = _INTERVAL_SECONDS.get(interval, 3600)
    start_time = end_time - timedelta(seconds=seconds * limit)

    source = "live"
    try:
        klines = await adapter.get_klines(symbol, interval, start_time, end_time, limit)
    except NotImplementedError:
        log_service.log(LogLevel.WARNING, "market", f"{broker} 券商不支持K线数据: {symbol}")
        raise HTTPException(status_code=501, detail=f"{broker} 券商不支持K线数据")
    except Exception as e:
        # 网络等原因导致K线获取失败，降级使用 Mock 数据
        log_service.log(LogLevel.WARNING, "market", f"获取 {broker} K线失败: {e}, 降级使用 Mock 数据")
        mock_adapter = MockAdapter({})
        await mock_adapter.connect()
        klines = await mock_adapter.get_klines(symbol, interval, start_time, end_time, limit)
        source = "mock"

    return {
        "symbol": symbol,
        "broker": broker,
        "interval": interval,
        "source": source,
        "klines": [
            {
                "time": k.timestamp.isoformat(),
                "open": k.open,
                "high": k.high,
                "low": k.low,
                "close": k.close,
                "volume": k.volume
            }
            for k in klines
        ]
    }


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
