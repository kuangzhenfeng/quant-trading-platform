from abc import ABC, abstractmethod
from typing import List, Dict, Any, Callable
from app.models.schemas import OrderSide, OrderType, TickData, OrderData, PositionData, AccountData

class BrokerAdapter(ABC):
    """统一券商适配器抽象基类"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.connected = False

    @abstractmethod
    async def connect(self) -> bool:
        """建立连接"""
        pass

    @abstractmethod
    async def disconnect(self) -> bool:
        """断开连接"""
        pass

    @abstractmethod
    async def get_tick(self, symbol: str) -> TickData:
        """获取实时行情"""
        pass

    @abstractmethod
    async def subscribe_market_data(self, symbols: List[str], callback: Callable):
        """订阅实时行情推送"""
        pass

    @abstractmethod
    async def place_order(
        self,
        symbol: str,
        side: OrderSide,
        order_type: OrderType,
        quantity: float,
        price: float | None = None
    ) -> str:
        """下单，返回订单ID"""
        pass

    @abstractmethod
    async def cancel_order(self, order_id: str) -> bool:
        """撤单"""
        pass

    @abstractmethod
    async def get_order(self, order_id: str) -> OrderData:
        """查询订单"""
        pass

    @abstractmethod
    async def get_account(self) -> AccountData:
        """获取账户信息"""
        pass

    @abstractmethod
    async def get_positions(self) -> List[PositionData]:
        """获取持仓列表"""
        pass
