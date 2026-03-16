import asyncio
from typing import Dict, List
from app.adapters.base import BrokerAdapter
from app.websocket.manager import manager
from app.models.schemas import TickData


class MarketDataService:
    """行情数据服务"""

    def __init__(self):
        self.adapters: Dict[str, BrokerAdapter] = {}
        self.subscriptions: Dict[str, List[str]] = {}
        self.running = False
        self.latest_data: Dict[str, TickData] = {}
        self.strategy_callback = None

    def register_adapter(self, name: str, adapter: BrokerAdapter):
        """注册 Adapter"""
        self.adapters[name] = adapter

    async def subscribe(self, client_id: str, broker: str, symbols: List[str]):
        """订阅行情"""
        key = f"{client_id}:{broker}"
        self.subscriptions[key] = symbols

        from app.services.log import log_service
        from app.models.schemas import LogLevel
        log_service.log(LogLevel.INFO, "market", f"订阅行情: {broker} {', '.join(symbols)}")

    async def unsubscribe(self, client_id: str):
        """取消订阅"""
        keys_to_remove = [key for key in self.subscriptions if key.startswith(f"{client_id}:")]
        for key in keys_to_remove:
            del self.subscriptions[key]

        from app.services.log import log_service
        from app.models.schemas import LogLevel
        log_service.log(LogLevel.INFO, "market", f"取消订阅: {client_id}")

    async def start_push(self):
        """启动行情推送"""
        self.running = True
        while self.running:
            for key, symbols in self.subscriptions.items():
                client_id, broker = key.split(":")
                adapter = self.adapters.get(broker)

                if adapter and adapter.connected:
                    for symbol in symbols:
                        try:
                            tick = await adapter.get_tick(symbol)

                            # 缓存最新数据
                            cache_key = f"{broker}:{symbol}"
                            self.latest_data[cache_key] = tick

                            # 通知策略引擎
                            if self.strategy_callback:
                                await self.strategy_callback(tick)

                            await manager.broadcast({
                                "type": "tick",
                                "data": tick.model_dump(mode="json")
                            }, client_id)
                        except Exception:
                            pass

            await asyncio.sleep(1)

    def stop_push(self):
        """停止行情推送"""
        self.running = False

    def get_latest_data(self, broker: str, symbol: str) -> TickData:
        """获取最新行情数据"""
        cache_key = f"{broker}:{symbol}"
        return self.latest_data.get(cache_key)


market_service = MarketDataService()
