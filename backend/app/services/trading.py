from typing import Dict, List
from app.adapters.base import BrokerAdapter
from app.models.schemas import OrderSide, OrderType, OrderData, PositionData, AccountData
from app.core.config import settings, TradingMode


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

        # Live 模式强制限制
        if settings.trading_mode == TradingMode.LIVE and order_amount > 10:
            return False, f"Live 模式: 订单金额 ${order_amount:.2f} 超过 $10 限制"

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
        """下单，根据当前交易模式选择合适的adapter，连接失败时降级到Mock"""
        from app.core.config import TradingMode
        from app.adapters.mock import MockAdapter

        adapter = self.adapters.get(broker)
        use_mock = False

        # 如果指定broker的adapter不存在，根据交易模式创建
        if not adapter:
            try:
                if settings.trading_mode == TradingMode.MOCK:
                    adapter = MockAdapter({})
                    await adapter.connect()
                    self.register_adapter(broker, adapter)
                    print(f"[INFO] {broker} 使用 Mock 模式")
                elif settings.trading_mode in (TradingMode.PAPER, TradingMode.LIVE):
                    from app.adapters.factory import AdapterFactory
                    mode = TradingMode.PAPER if settings.trading_mode == TradingMode.PAPER else TradingMode.LIVE
                    adapter = AdapterFactory.create(broker, {}, mode)
                    await adapter.connect()
                    self.register_adapter(broker, adapter)
                    mode_name = "Paper" if mode == TradingMode.PAPER else "Live"
                    print(f"[INFO] {broker} 使用 {mode_name} 模式")
            except Exception as e:
                print(f"[WARNING] 创建 {broker} adapter失败: {e}")

        # 如果adapter未连接，尝试连接
        if adapter and not adapter.connected:
            try:
                await adapter.connect()
            except Exception as e:
                print(f"[WARNING] 连接 {broker} adapter失败: {e}")

        # 如果adapter仍然不可用，降级到Mock
        if not adapter or not adapter.connected:
            use_mock = True
            adapter = MockAdapter({})
            await adapter.connect()
            self.register_adapter(broker, adapter)
            print(f"[INFO] {broker} 降级使用 Mock 模式")

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
        await get_monitor_service().add_order(order, broker)

        # 更新持仓到数据库
        positions = await adapter.get_positions()
        await get_monitor_service().update_positions(broker, positions)

        from app.models.schemas import LogLevel
        get_log_service().log(LogLevel.INFO, "trading", f"下单成功: {broker} {symbol} {side.value} {quantity}")

        return True, order_id

    async def cancel_order(self, broker: str, order_id: str) -> bool:
        """撤单"""
        adapter = self.adapters.get(broker)
        if not adapter:
            return False
        return await adapter.cancel_order(order_id)

    async def get_order(self, broker: str, order_id: str, symbol: str | None = None) -> OrderData | None:
        """查询订单"""
        adapter = self.adapters.get(broker)
        if not adapter:
            return None
        return await adapter.get_order(order_id, symbol)

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
