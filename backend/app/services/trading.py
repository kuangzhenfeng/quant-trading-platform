from typing import Dict, List
from app.adapters.base import BrokerAdapter
from app.models.schemas import OrderSide, OrderType, OrderData, PositionData, AccountData


def get_monitor_service():
    from app.services.monitor import monitor_service
    return monitor_service


def get_log_service():
    from app.services.log import log_service
    return log_service


class RiskControl:
    """风控模块"""

    def __init__(self):
        self.max_position_ratio = 0.3  # 单个持仓最大占比
        self.max_order_amount = 100000.0  # 单笔最大金额

    async def check_order(self, broker: str, symbol: str, side: OrderSide,
                         quantity: float, price: float, account: AccountData) -> tuple[bool, str]:
        """检查订单是否符合风控规则"""
        order_amount = quantity * price

        # 检查单笔金额
        if order_amount > self.max_order_amount:
            return False, f"订单金额 {order_amount} 超过限制 {self.max_order_amount}"

        # 检查可用资金
        if side == OrderSide.BUY and order_amount > account.available:
            return False, f"可用资金不足: {account.available}"

        return True, "通过"


class TradingService:
    """交易服务"""

    def __init__(self):
        self.adapters: Dict[str, BrokerAdapter] = {}
        self.risk_control = RiskControl()

    def register_adapter(self, broker: str, adapter: BrokerAdapter):
        """注册券商适配器"""
        self.adapters[broker] = adapter

    async def place_order(self, broker: str, symbol: str, side: OrderSide,
                         order_type: OrderType, quantity: float,
                         price: float | None = None) -> tuple[bool, str]:
        """下单"""
        adapter = self.adapters.get(broker)
        if not adapter or not adapter.connected:
            from app.models.schemas import LogLevel
            get_log_service().log(LogLevel.ERROR, "trading", f"券商 {broker} 未连接")
            return False, f"券商 {broker} 未连接"

        # 获取账户信息
        account = await adapter.get_account()

        # 风控检查
        if price:
            passed, msg = await self.risk_control.check_order(
                broker, symbol, side, quantity, price, account
            )
            if not passed:
                from app.models.schemas import LogLevel
                get_log_service().log(LogLevel.WARNING, "trading", f"风控拦截: {msg}")
                return False, msg

        # 下单
        order_id = await adapter.place_order(symbol, side, order_type, quantity, price)

        # 记录订单
        order = await adapter.get_order(order_id, symbol)
        get_monitor_service().add_order(order)

        from app.models.schemas import LogLevel
        get_log_service().log(LogLevel.INFO, "trading", f"下单成功: {broker} {symbol} {side.value} {quantity}")

        return True, order_id

    async def cancel_order(self, broker: str, order_id: str) -> bool:
        """撤单"""
        adapter = self.adapters.get(broker)
        if not adapter:
            return False
        return await adapter.cancel_order(order_id)

    async def get_order(self, broker: str, order_id: str) -> OrderData | None:
        """查询订单"""
        adapter = self.adapters.get(broker)
        if not adapter:
            return None
        return await adapter.get_order(order_id)

    async def get_positions(self, broker: str) -> List[PositionData]:
        """获取持仓"""
        adapter = self.adapters.get(broker)
        if not adapter:
            return []
        return await adapter.get_positions()

    async def get_account(self, broker: str) -> AccountData | None:
        """获取账户信息"""
        adapter = self.adapters.get(broker)
        if not adapter:
            return None
        return await adapter.get_account()


trading_service = TradingService()
