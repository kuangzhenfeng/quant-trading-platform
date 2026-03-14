import random
from datetime import datetime
from typing import List, Dict, Any, Callable
from app.adapters.base import BrokerAdapter
from app.models.schemas import OrderSide, OrderType, OrderStatus, TickData, OrderData, PositionData, AccountData

class MockAdapter(BrokerAdapter):
    """模拟适配器，用于开发测试"""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.orders: Dict[str, OrderData] = {}
        self.positions: Dict[str, PositionData] = {}
        self.balance = 100000.0

    async def connect(self) -> bool:
        self.connected = True
        return True

    async def disconnect(self) -> bool:
        self.connected = False
        return True

    async def get_tick(self, symbol: str) -> TickData:
        base_price = 100.0
        return TickData(
            broker="mock",
            symbol=symbol,
            last_price=base_price + random.uniform(-5, 5),
            volume=random.randint(1000, 10000),
            timestamp=datetime.now()
        )

    async def subscribe_market_data(self, symbols: List[str], callback: Callable):
        pass

    async def place_order(
        self,
        symbol: str,
        side: OrderSide,
        order_type: OrderType,
        quantity: float,
        price: float | None = None
    ) -> str:
        order_id = f"MOCK_{len(self.orders) + 1}"
        order = OrderData(
            order_id=order_id,
            symbol=symbol,
            side=side,
            type=order_type,
            quantity=quantity,
            price=price or 100.0,
            status=OrderStatus.FILLED
        )
        self.orders[order_id] = order
        return order_id

    async def cancel_order(self, order_id: str) -> bool:
        if order_id in self.orders:
            self.orders[order_id].status = OrderStatus.CANCELLED
            return True
        return False

    async def get_order(self, order_id: str) -> OrderData:
        return self.orders.get(order_id)

    async def get_account(self) -> AccountData:
        return AccountData(
            broker="mock",
            balance=self.balance,
            available=self.balance * 0.8,
            frozen=self.balance * 0.2
        )

    async def get_positions(self) -> List[PositionData]:
        return list(self.positions.values())
