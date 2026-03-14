import asyncio
import json
from typing import List, Dict, Any, Callable
import httpx
from datetime import datetime
from app.adapters.base import BrokerAdapter
from app.models.schemas import (
    TickData, OrderData, PositionData, AccountData,
    OrderSide, OrderType, OrderStatus
)


class OKXAdapter(BrokerAdapter):
    """OKX 交易所适配器"""

    BASE_URL = "https://www.okx.com"

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.api_key = config.get("api_key", "")
        self.secret_key = config.get("secret_key", "")
        self.passphrase = config.get("passphrase", "")
        self.client = httpx.AsyncClient(base_url=self.BASE_URL, timeout=10.0)

    async def connect(self) -> bool:
        """建立连接"""
        try:
            response = await self.client.get("/api/v5/public/time")
            self.connected = response.status_code == 200
            return self.connected
        except Exception:
            self.connected = False
            return False

    async def disconnect(self) -> bool:
        """断开连接"""
        await self.client.aclose()
        self.connected = False
        return True

    async def get_tick(self, symbol: str) -> TickData:
        """获取实时行情"""
        response = await self.client.get(f"/api/v5/market/ticker?instId={symbol}")
        data = response.json()

        if data["code"] != "0" or not data["data"]:
            raise ValueError(f"Failed to get ticker: {data.get('msg')}")

        ticker = data["data"][0]
        return TickData(
            symbol=symbol,
            price=float(ticker["last"]),
            volume=int(float(ticker.get("vol24h", 0))),
            timestamp=datetime.now()
        )

    async def subscribe_market_data(self, symbols: List[str], callback: Callable):
        """订阅实时行情推送（WebSocket）"""
        # TODO: 实现 WebSocket 订阅
        pass

    async def place_order(
        self,
        symbol: str,
        side: OrderSide,
        order_type: OrderType,
        quantity: float,
        price: float | None = None
    ) -> str:
        """下单（Mock 实现）"""
        import uuid
        order_id = f"okx_{uuid.uuid4().hex[:16]}"
        return order_id

    async def cancel_order(self, order_id: str) -> bool:
        """撤单（Mock 实现）"""
        return True

    async def get_order(self, order_id: str) -> OrderData:
        """查询订单（Mock 实现）"""
        return OrderData(
            order_id=order_id,
            symbol="BTC-USDT",
            side=OrderSide.BUY,
            type=OrderType.LIMIT,
            quantity=0.01,
            price=70000.0,
            status=OrderStatus.FILLED
        )

    async def get_account(self) -> AccountData:
        """获取账户信息（Mock 实现）"""
        return AccountData(
            broker="okx",
            balance=100000.0,
            available=95000.0,
            frozen=5000.0
        )

    async def get_positions(self) -> List[PositionData]:
        """获取持仓列表（Mock 实现）"""
        return [
            PositionData(
                symbol="BTC-USDT",
                quantity=0.5,
                avg_price=68000.0,
                unrealized_pnl=1500.0
            )
        ]
