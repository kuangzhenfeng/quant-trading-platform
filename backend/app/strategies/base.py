from abc import ABC, abstractmethod
from typing import Dict, List
from datetime import datetime
from app.models.schemas import TickData, OrderSide, OrderType, LogLevel


class StrategyContext:
    """策略运行时上下文"""
    def __init__(self, broker: str, trading_service, market_service, strategy_id: str = ""):
        self.broker = broker
        self._trading_service = trading_service
        self._market_service = market_service
        self.strategy_id = strategy_id
        self.positions: Dict[str, float] = {}
        self.logs: List[str] = []

    def log(self, msg: str, level: LogLevel = LogLevel.INFO):
        """记录日志"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_msg = f"[{timestamp}] {msg}"
        self.logs.append(log_msg)
        print(log_msg)

        # 持久化到数据库
        if self.strategy_id:
            import asyncio
            asyncio.create_task(self._save_log(level, msg))

    async def _save_log(self, level: LogLevel, message: str):
        """保存日志到数据库"""
        from app.core.database import AsyncSessionLocal
        from app.models.db_models import DBStrategyLog

        async with AsyncSessionLocal() as session:
            log = DBStrategyLog(
                strategy_id=self.strategy_id,
                level=level.value,
                message=message
            )
            session.add(log)
            await session.commit()

    async def buy(self, symbol: str, quantity: float, price: float = None):
        """买入"""
        order_type = OrderType.MARKET if price is None else OrderType.LIMIT
        success, order_id = await self._trading_service.place_order(
            self.broker, symbol, OrderSide.BUY, order_type, quantity, price
        )
        if success:
            price_str = f"{price}" if price else "市价"
            self.log(f"买入成功 | 标的:{symbol} 数量:{quantity} 价格:{price_str} 订单ID:{order_id}", LogLevel.INFO)
        else:
            self.log(f"买入失败 | 标的:{symbol} 数量:{quantity}", LogLevel.ERROR)
        return success, order_id

    async def sell(self, symbol: str, quantity: float, price: float = None):
        """卖出"""
        order_type = OrderType.MARKET if price is None else OrderType.LIMIT
        success, order_id = await self._trading_service.place_order(
            self.broker, symbol, OrderSide.SELL, order_type, quantity, price
        )
        if success:
            price_str = f"{price}" if price else "市价"
            self.log(f"卖出成功 | 标的:{symbol} 数量:{quantity} 价格:{price_str} 订单ID:{order_id}", LogLevel.INFO)
        else:
            self.log(f"卖出失败 | 标的:{symbol} 数量:{quantity}", LogLevel.ERROR)
        return success, order_id

    def get_price(self, symbol: str) -> float:
        """获取最新价格"""
        data = self._market_service.get_latest_data(self.broker, symbol)
        return data.last_price if data else 0.0


class Strategy(ABC):
    """策略基类"""
    def __init__(self, name: str, params: Dict):
        self.name = name
        self.params = params
        self.ctx: StrategyContext = None

    def init(self, ctx: StrategyContext):
        """初始化策略"""
        self.ctx = ctx
        self.on_init()

    @abstractmethod
    def on_init(self):
        """策略初始化回调"""
        pass

    @abstractmethod
    async def on_tick(self, data: TickData):
        """行情更新回调"""
        pass
