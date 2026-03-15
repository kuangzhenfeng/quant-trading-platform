import random
from datetime import datetime, timedelta
from typing import List, Dict, Any, Callable
from app.adapters.base import BrokerAdapter
from app.models.schemas import OrderSide, OrderType, OrderStatus, TickData, OrderData, PositionData, AccountData, KlineData

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

    async def get_order(self, order_id: str, symbol: str | None = None) -> OrderData:
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

    async def get_klines(
        self,
        symbol: str,
        interval: str,
        start_time: datetime,
        end_time: datetime,
        limit: int = 100
    ) -> List[KlineData]:
        """生成模拟K线数据（使用固定种子保证可重复性）"""
        # 使用时间戳作为随机种子，保证相同参数生成相同数据
        seed = int(start_time.timestamp()) + hash(symbol)
        random.seed(seed)

        klines = []
        current = start_time
        price = 50000.0

        delta_map = {
            "1m": timedelta(minutes=1),
            "5m": timedelta(minutes=5),
            "15m": timedelta(minutes=15),
            "1H": timedelta(hours=1),
            "1D": timedelta(days=1),
        }
        delta = delta_map.get(interval, timedelta(hours=1))

        while current <= end_time and len(klines) < limit:
            open_price = price
            high_price = price * (1 + random.uniform(0, 0.02))
            low_price = price * (1 - random.uniform(0, 0.02))
            close_price = price * (1 + random.uniform(-0.02, 0.02))

            klines.append(KlineData(
                broker="mock",
                symbol=symbol,
                timestamp=current,
                open=open_price,
                high=high_price,
                low=low_price,
                close=close_price,
                volume=random.uniform(1000, 10000)
            ))

            price = close_price
            current += delta

        return klines
