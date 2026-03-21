import asyncio
from typing import List, Dict, Any, Callable
from datetime import datetime
from app.adapters.base import BrokerAdapter
from app.models.schemas import (
    TickData, OrderData, PositionData, AccountData,
    OrderSide, OrderType, OrderStatus, KlineData
)


class GuojinLiveAdapter(BrokerAdapter):
    """国金证券真实交易适配器（暂时为 Mock 实现）"""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.account_id = config.get("account_id", "")
        self.password = config.get("password", "")

    async def connect(self) -> bool:
        """建立连接"""
        from app.services.log import log_service
        from app.models.schemas import LogLevel
        await asyncio.sleep(0.1)
        self.connected = True
        log_service.log(LogLevel.INFO, "adapter:guojin", "国金证券适配器连接成功")
        return True

    async def disconnect(self) -> bool:
        """断开连接"""
        from app.services.log import log_service
        from app.models.schemas import LogLevel
        self.connected = False
        log_service.log(LogLevel.INFO, "adapter:guojin", "国金证券适配器已断开连接")
        return True

    async def get_tick(self, symbol: str) -> TickData:
        """获取实时行情"""
        return TickData(
            broker="guojin",
            symbol=symbol,
            last_price=10.50,
            volume=1000000,
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
        """下单"""
        import uuid
        return f"gj_{uuid.uuid4().hex[:16]}"

    async def cancel_order(self, order_id: str) -> bool:
        """撤单"""
        return True

    async def get_order(self, order_id: str, symbol: str | None = None) -> OrderData:
        """查询订单"""
        return OrderData(
            order_id=order_id,
            symbol="600000",
            side=OrderSide.BUY,
            type=OrderType.LIMIT,
            quantity=100.0,
            price=10.50,
            status=OrderStatus.FILLED
        )

    async def get_account(self) -> AccountData:
        """获取账户信息"""
        return AccountData(
            broker="guojin",
            balance=500000.0,
            available=450000.0,
            frozen=50000.0
        )

    async def get_positions(self) -> List[PositionData]:
        """获取持仓列表"""
        return [
            PositionData(
                symbol="600000",
                quantity=1000.0,
                avg_price=10.20,
                unrealized_pnl=300.0
            )
        ]

    async def get_klines(
        self,
        symbol: str,
        interval: str,
        start_time: datetime,
        end_time: datetime,
        limit: int = 100
    ) -> List[KlineData]:
        """获取历史K线数据（待实现）"""
        raise NotImplementedError("国金证券历史K线功能待实现")
