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
        from app.services.log import log_service
        from app.models.schemas import LogLevel
        log_service.log(LogLevel.INFO, "adapter:mock", "Mock 适配器连接成功")
        return True

    async def disconnect(self) -> bool:
        self.connected = False
        from app.services.log import log_service
        from app.models.schemas import LogLevel
        log_service.log(LogLevel.INFO, "adapter:mock", "Mock 适配器已断开连接")
        return True

    async def get_tick(self, symbol: str) -> TickData:
        """生成模拟行情数据"""
        import random
        # 根据 symbol 生成稳定的基准价格
        base_prices = {
            "BTC-USDT": 65000.0,
            "ETH-USDT": 3500.0,
            "BTC/USDT": 65000.0,
            "ETH/USDT": 3500.0,
        }
        base = base_prices.get(symbol, 100.0)
        # 使用 symbol 的 hash 作为种子，保证相同 symbol 生成相近的价格
        seed = hash(symbol) % 1000
        random.seed(seed)
        price = base + random.uniform(-base * 0.02, base * 0.02)
        return TickData(
            broker="mock",
            symbol=symbol,
            last_price=price,
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
        fill_price = price or 100.0
        order = OrderData(
            order_id=order_id,
            symbol=symbol,
            side=side,
            type=order_type,
            quantity=quantity,
            price=fill_price,
            status=OrderStatus.FILLED
        )
        self.orders[order_id] = order

        # 更新持仓
        if symbol in self.positions:
            pos = self.positions[symbol]
            if side == OrderSide.BUY:
                # 买入：增加持仓
                total_cost = pos.avg_price * pos.quantity + fill_price * quantity
                pos.quantity += quantity
                pos.avg_price = total_cost / pos.quantity
            else:
                # 卖出：减少持仓
                pos.quantity -= quantity
                if pos.quantity <= 0:
                    del self.positions[symbol]
        else:
            # 新建持仓
            if side == OrderSide.BUY:
                self.positions[symbol] = PositionData(
                    symbol=symbol,
                    quantity=quantity,
                    avg_price=fill_price,
                    unrealized_pnl=0.0
                )

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
        """获取持仓列表，并计算实时浮动盈亏"""
        result = []
        for symbol, pos in self.positions.items():
            # 获取当前市场价格
            tick = await self.get_tick(symbol)
            current_price = tick.last_price

            # 计算浮动盈亏 = (当前价 - 均价) × 持仓量
            unrealized_pnl = (current_price - pos.avg_price) * pos.quantity

            result.append(PositionData(
                symbol=pos.symbol,
                quantity=pos.quantity,
                avg_price=pos.avg_price,
                unrealized_pnl=unrealized_pnl
            ))
        return result

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
