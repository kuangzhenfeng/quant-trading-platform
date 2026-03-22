"""OKX 交易所适配器"""

from typing import Dict, Any
from .live import OKXLiveAdapter
from .paper import OKXPaperAdapter


class OKXAdapter:
    """OKX 适配器工厂，根据 mode 配置返回实盘或模拟盘适配器"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.mode = config.get("mode", "paper")
        if self.mode == "live":
            self._adapter = OKXLiveAdapter(config)
        else:
            self._adapter = OKXPaperAdapter(config)

    def __getattr__(self, name: str):
        return getattr(self._adapter, name)

    async def connect(self) -> bool:
        return await self._adapter.connect()

    async def disconnect(self) -> bool:
        return await self._adapter.disconnect()

    async def get_tick(self, symbol: str):
        return await self._adapter.get_tick(symbol)

    async def subscribe_market_data(self, symbols, callback):
        return await self._adapter.subscribe_market_data(symbols, callback)

    async def place_order(self, symbol, side, order_type, quantity, price=None):
        return await self._adapter.place_order(symbol, side, order_type, quantity, price)

    async def cancel_order(self, order_id: str) -> bool:
        return await self._adapter.cancel_order(order_id)

    async def get_order(self, order_id: str, symbol: str | None = None):
        return await self._adapter.get_order(order_id, symbol)

    async def get_account(self):
        return await self._adapter.get_account()

    async def get_positions(self):
        return await self._adapter.get_positions()

    async def get_klines(self, symbol, interval, start_time, end_time, limit=100):
        return await self._adapter.get_klines(symbol, interval, start_time, end_time, limit)


__all__ = ["OKXAdapter", "OKXLiveAdapter", "OKXPaperAdapter"]
