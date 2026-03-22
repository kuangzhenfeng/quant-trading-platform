from typing import Dict, List
from app.adapters.base import BrokerAdapter
from app.models.schemas import OrderSide, OrderType, OrderData, PositionData, AccountData, LogLevel
from app.core.config import settings, TradingMode
from app.services.log import log_service
from app.services.monitor import monitor_service
from app.services.account import _is_paper


async def _find_active_account_config(mode: TradingMode) -> dict:
    """根据交易模式查找活跃账户配置"""
    from app.services.account import account_service
    accounts = await account_service.list_accounts()
    for acc in accounts:
        if acc.active and _is_paper(acc.config) == (mode == TradingMode.PAPER):
            return acc.config
    return {}


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
        """下单，根据当前交易模式选择合适的adapter"""
        adapter = await self._ensure_adapter(broker)
        if not adapter or not adapter.connected:
            return False, f"连接失败，{broker} 不可用"

        # 获取账户信息
        account = await adapter.get_account()

        # 风控检查
        if price:
            passed, msg = await self.risk_control.check_order(
                broker, symbol, side, quantity, price, account
            )
            if not passed:
                log_service.log(LogLevel.WARNING, "trading", f"风控拦截: {msg}")
                return False, msg

        # 下单
        order_id = await adapter.place_order(symbol, side, order_type, quantity, price)

        # 记录订单
        order = await adapter.get_order(order_id, symbol)
        await monitor_service.add_order(order, broker)

        # 更新持仓到数据库
        positions = await adapter.get_positions()
        await monitor_service.update_positions(broker, positions)

        log_service.log(LogLevel.INFO, "trading", f"下单成功: {broker} {symbol} {side.value} {quantity}")

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

    async def _ensure_adapter(self, broker: str) -> BrokerAdapter | None:
        """确保 broker 对应的 adapter 已注册并连接，严格按交易模式区分"""
        # adapter 已注册且已连接，直接返回
        if broker in self.adapters and self.adapters[broker].connected:
            return self.adapters[broker]

        # 未注册或未连接时创建
        if settings.trading_mode == TradingMode.MOCK:
            from app.adapters.mock import MockAdapter
            adapter = MockAdapter({})
        else:
            from app.adapters.factory import AdapterFactory
            mode = TradingMode.PAPER if settings.trading_mode == TradingMode.PAPER else TradingMode.LIVE
            account_config = await _find_active_account_config(mode)
            adapter = AdapterFactory.create(broker, account_config, mode)

        await adapter.connect()
        self.adapters[broker] = adapter
        log_service.log(LogLevel.INFO, "trading", f"{broker} 使用 {settings.trading_mode.value} 模式")
        return adapter if adapter.connected else None

    async def get_positions(self, broker: str) -> List[PositionData]:
        """获取持仓，自动初始化 adapter"""
        adapter = await self._ensure_adapter(broker)
        if not adapter:
            return []
        positions = await adapter.get_positions()
        log_service.log(LogLevel.INFO, "trading",
            f"获取持仓: {broker} {len(positions)} 个")
        return positions

    async def get_account(self, broker: str) -> AccountData | None:
        """获取账户信息，自动初始化 adapter"""
        adapter = await self._ensure_adapter(broker)
        if not adapter:
            return None
        account = await adapter.get_account()
        log_service.log(LogLevel.INFO, "trading",
            f"获取账户: {broker} 余额={account.balance if account else 0}")
        return account


trading_service = TradingService()
