import asyncio
from typing import List, Dict, Any, Callable
from datetime import datetime
from app.adapters.base import BrokerAdapter
from app.models.schemas import (
    TickData, OrderData, PositionData, AccountData,
    OrderSide, OrderType, OrderStatus
)


class MoomooAdapter(BrokerAdapter):
    """moomoo（富途）适配器"""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.host = config.get("host", "127.0.0.1")
        self.port = config.get("port", 11111)

    async def connect(self) -> bool:
        """建立连接"""
        await asyncio.sleep(0.1)
        self.connected = True
        return True

    async def disconnect(self) -> bool:
        """断开连接"""
        self.connected = False
        return True

    async def get_tick(self, symbol: str) -> TickData:
        """获取实时行情"""
        # Mock 实现
        return TickData(
            symbol=symbol,
            price=150.25,
            volume=500000,
            timestamp=datetime.now()
        )

    async def subscribe_market_data(self, symbols: List[str], callback: Callable):
        """订阅实时行情推送"""
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
        order_id = f"mm_{uuid.uuid4().hex[:16]}"
        return order_id

    async def cancel_order(self, order_id: str) -> bool:
        """撤单（Mock 实现）"""
        return True

    async def get_order(self, order_id: str) -> OrderData:
        """查询订单（Mock 实现）"""
        return OrderData(
            order_id=order_id,
            symbol="AAPL",
            side=OrderSide.BUY,
            type=OrderType.LIMIT,
            quantity=10.0,
            price=150.00,
            status=OrderStatus.FILLED
        )

    async def get_account(self) -> AccountData:
        """获取账户信息（Mock 实现）"""
        return AccountData(
            broker="moomoo",
            balance=200000.0,
            available=180000.0,
            frozen=20000.0
        )

    async def get_positions(self) -> List[PositionData]:
        """获取持仓列表（Mock 实现）"""
        return [
            PositionData(
                symbol="AAPL",
                quantity=50.0,
                avg_price=148.50,
                unrealized_pnl=87.5
            )
        ]
