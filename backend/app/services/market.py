import asyncio
from typing import Dict, List
from app.adapters.base import BrokerAdapter
from app.websocket.manager import manager


class MarketDataService:
    """行情数据服务"""

    def __init__(self):
        self.adapters: Dict[str, BrokerAdapter] = {}
        self.subscriptions: Dict[str, List[str]] = {}
        self.running = False

    def register_adapter(self, name: str, adapter: BrokerAdapter):
        """注册 Adapter"""
        self.adapters[name] = adapter

    async def subscribe(self, client_id: str, broker: str, symbols: List[str]):
        """订阅行情"""
        key = f"{client_id}:{broker}"
        self.subscriptions[key] = symbols

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


market_service = MarketDataService()
