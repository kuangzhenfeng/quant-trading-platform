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
        # 策略订阅：strategy_id -> (broker, symbol)
        self.strategy_subscriptions: Dict[str, tuple[str, str]] = {}
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

    async def subscribe_strategy(self, strategy_id: str, broker: str, symbol: str):
        """订阅策略所需的行情（策略启动时调用）"""
        self.strategy_subscriptions[strategy_id] = (broker, symbol)
        from app.services.log import log_service
        from app.models.schemas import LogLevel
        log_service.log(LogLevel.INFO, "market", f"策略订阅行情: {strategy_id} -> {broker} {symbol}")

    def unsubscribe_strategy(self, strategy_id: str):
        """取消策略行情订阅（策略停止时调用）"""
        if strategy_id in self.strategy_subscriptions:
            del self.strategy_subscriptions[strategy_id]
            from app.services.log import log_service
            from app.models.schemas import LogLevel
            log_service.log(LogLevel.INFO, "market", f"策略取消订阅: {strategy_id}")

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
            # 处理 WebSocket 订阅
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

            # 处理策略订阅（策略运行所需的实时行情）
            for strategy_id, (broker, symbol) in self.strategy_subscriptions.items():
                from app.core.config import settings, TradingMode
                try:
                    adapter = self.adapters.get(broker)
                    if adapter and adapter.connected:
                        tick = await adapter.get_tick(symbol)
                    elif settings.trading_mode == TradingMode.MOCK:
                        # MOCK 模式：降级使用内建 Mock adapter
                        from app.adapters.mock import MockAdapter
                        mock_adapter = MockAdapter({})
                        await mock_adapter.connect()
                        tick = await mock_adapter.get_tick(symbol)
                    else:
                        # Paper/Live 模式：adapter 不可用时记录错误
                        from app.services.log import log_service
                        from app.models.schemas import LogLevel
                        if not adapter:
                            log_service.log(LogLevel.ERROR, "market", f"策略 {strategy_id} 券商 {broker} 未注册 adapter，无法获取行情")
                        else:
                            log_service.log(LogLevel.ERROR, "market", f"策略 {strategy_id} 券商 {broker} adapter 未连接，无法获取行情")
                        continue

                    cache_key = f"{broker}:{symbol}"
                    self.latest_data[cache_key] = tick
                    if self.strategy_callback:
                        await self.strategy_callback(tick)
                except Exception as e:
                    from app.services.log import log_service
                    from app.models.schemas import LogLevel
                    log_service.log(LogLevel.ERROR, "market", f"策略 {strategy_id} 获取行情异常: {e}")
                    continue

            await asyncio.sleep(1)

    def stop_push(self):
        """停止行情推送"""
        self.running = False

    def get_latest_data(self, broker: str, symbol: str) -> TickData:
        """获取最新行情数据"""
        cache_key = f"{broker}:{symbol}"
        return self.latest_data.get(cache_key)


market_service = MarketDataService()
