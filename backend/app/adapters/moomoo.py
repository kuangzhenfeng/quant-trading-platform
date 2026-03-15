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

        # 判断是否使用真实 API（需要本地运行 FutuOpenD）
        # 只有在配置中明确提供了 host 或 port 时才认为要使用真实 API
        self.use_real_api = bool("host" in config or "port" in config)

        if self.use_real_api:
            try:
                from futu import OpenQuoteContext, OpenSecTradeContext
                self.quote_ctx = None
                self.trade_ctx = None
            except ImportError:
                self.use_real_api = False

    async def connect(self) -> bool:
        """建立连接"""
        if self.use_real_api:
            try:
                from futu import OpenQuoteContext, OpenSecTradeContext
                self.quote_ctx = OpenQuoteContext(host=self.host, port=self.port)
                self.trade_ctx = OpenSecTradeContext(host=self.host, port=self.port)
                self.connected = True
                return True
            except Exception:
                self.connected = False
                return False
        else:
            await asyncio.sleep(0.1)
            self.connected = True
            return True

    async def disconnect(self) -> bool:
        """断开连接"""
        if self.use_real_api and self.quote_ctx:
            self.quote_ctx.close()
            if self.trade_ctx:
                self.trade_ctx.close()
        self.connected = False
        return True

    async def get_tick(self, symbol: str) -> TickData:
        """获取实时行情"""
        if self.use_real_api:
            return await self._get_tick_real(symbol)
        return self._get_tick_mock(symbol)

    async def _get_tick_real(self, symbol: str) -> TickData:
        """真实获取行情"""
        from futu import RET_OK
        ret, data = self.quote_ctx.get_market_snapshot([symbol])
        if ret != RET_OK or data.empty:
            raise ValueError(f"Failed to get tick for {symbol}")

        row = data.iloc[0]
        return TickData(
            broker="moomoo",
            symbol=symbol,
            last_price=float(row['last_price']),
            volume=int(row['volume']),
            timestamp=datetime.now()
        )

    def _get_tick_mock(self, symbol: str) -> TickData:
        """Mock 获取行情"""
        return TickData(
            broker="moomoo",
            symbol=symbol,
            last_price=150.25,
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
        """下单"""
        if self.use_real_api:
            return await self._place_order_real(symbol, side, order_type, quantity, price)
        return self._place_order_mock(symbol, side, order_type, quantity, price)

    async def _place_order_real(
        self,
        symbol: str,
        side: OrderSide,
        order_type: OrderType,
        quantity: float,
        price: float | None = None
    ) -> str:
        """真实下单"""
        from futu import RET_OK, TrdSide, OrderType as FutuOrderType

        futu_side = TrdSide.BUY if side == OrderSide.BUY else TrdSide.SELL
        futu_order_type = FutuOrderType.NORMAL if order_type == OrderType.LIMIT else FutuOrderType.MARKET

        ret, data = self.trade_ctx.place_order(
            price=price if price else 0,
            qty=quantity,
            code=symbol,
            trd_side=futu_side,
            order_type=futu_order_type
        )

        if ret != RET_OK:
            raise ValueError(f"Failed to place order: {data}")

        return str(data['order_id'][0])

    def _place_order_mock(
        self,
        symbol: str,
        side: OrderSide,
        order_type: OrderType,
        quantity: float,
        price: float | None = None
    ) -> str:
        """Mock 下单"""
        import uuid
        return f"mm_{uuid.uuid4().hex[:16]}"

    async def cancel_order(self, order_id: str) -> bool:
        """撤单"""
        if self.use_real_api:
            return await self._cancel_order_real(order_id)
        return True

    async def _cancel_order_real(self, order_id: str) -> bool:
        """真实撤单"""
        from futu import RET_OK
        ret, data = self.trade_ctx.modify_order(modify_order_op=2, order_id=int(order_id))
        return ret == RET_OK

    async def get_order(self, order_id: str, symbol: str | None = None) -> OrderData:
        """查询订单"""
        if self.use_real_api:
            return await self._get_order_real(order_id)
        return self._get_order_mock(order_id)

    async def _get_order_real(self, order_id: str) -> OrderData:
        """真实查询订单"""
        from futu import RET_OK, TrdSide, OrderStatus as FutuOrderStatus
        ret, data = self.trade_ctx.order_list_query(order_id=int(order_id))
        if ret != RET_OK or data.empty:
            raise ValueError(f"Failed to get order: {order_id}")

        row = data.iloc[0]
        status_map = {
            FutuOrderStatus.WAITING_SUBMIT: OrderStatus.PENDING,
            FutuOrderStatus.SUBMITTING: OrderStatus.PENDING,
            FutuOrderStatus.SUBMITTED: OrderStatus.PENDING,
            FutuOrderStatus.FILLED_PART: OrderStatus.PARTIAL,
            FutuOrderStatus.FILLED_ALL: OrderStatus.FILLED,
            FutuOrderStatus.CANCELLED_PART: OrderStatus.PARTIAL,
            FutuOrderStatus.CANCELLED_ALL: OrderStatus.CANCELLED,
        }
        return OrderData(
            order_id=str(row['order_id']),
            symbol=row['code'],
            side=OrderSide.BUY if row['trd_side'] == TrdSide.BUY else OrderSide.SELL,
            type=OrderType.LIMIT,
            quantity=float(row['qty']),
            price=float(row['price']),
            status=status_map.get(row['order_status'], OrderStatus.PENDING)
        )

    def _get_order_mock(self, order_id: str) -> OrderData:
        """Mock 查询订单"""
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
        """获取账户信息"""
        if self.use_real_api:
            return await self._get_account_real()
        return self._get_account_mock()

    async def _get_account_real(self) -> AccountData:
        """真实获取账户信息"""
        from futu import RET_OK
        ret, data = self.trade_ctx.accinfo_query()
        if ret != RET_OK or data.empty:
            raise ValueError("Failed to get account info")

        row = data.iloc[0]
        return AccountData(
            broker="moomoo",
            balance=float(row['total_assets']),
            available=float(row['cash']),
            frozen=float(row['frozen_cash'])
        )

    def _get_account_mock(self) -> AccountData:
        """Mock 获取账户信息"""
        return AccountData(
            broker="moomoo",
            balance=200000.0,
            available=180000.0,
            frozen=20000.0
        )

    async def get_positions(self) -> List[PositionData]:
        """获取持仓列表"""
        if self.use_real_api:
            return await self._get_positions_real()
        return self._get_positions_mock()

    async def _get_positions_real(self) -> List[PositionData]:
        """真实获取持仓列表"""
        from futu import RET_OK
        ret, data = self.trade_ctx.position_list_query()
        if ret != RET_OK:
            raise ValueError("Failed to get positions")

        positions = []
        for _, row in data.iterrows():
            if float(row['qty']) > 0:
                positions.append(PositionData(
                    symbol=row['code'],
                    quantity=float(row['qty']),
                    avg_price=float(row['cost_price']),
                    unrealized_pnl=float(row['pl_val'])
                ))
        return positions

    def _get_positions_mock(self) -> List[PositionData]:
        """Mock 获取持仓列表"""
        return [
            PositionData(
                symbol="AAPL",
                quantity=50.0,
                avg_price=148.50,
                unrealized_pnl=87.5
            )
        ]
