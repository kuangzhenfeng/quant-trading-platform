import asyncio
from typing import List, Dict, Any, Callable
from datetime import datetime
from app.adapters.base import BrokerAdapter
from app.models.schemas import (
    TickData, OrderData, PositionData, AccountData,
    OrderSide, OrderType, OrderStatus, KlineData
)


class MoomooLiveAdapter(BrokerAdapter):
    """Moomoo（富途）真实交易适配器"""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.host = config.get("host", "127.0.0.1")
        self.port = config.get("port", 11111)

        try:
            from futu import OpenQuoteContext, OpenSecTradeContext
            self.quote_ctx = None
            self.trade_ctx = None
        except ImportError:
            raise ImportError("futu-api package is required for Moomoo adapter")

    async def connect(self) -> bool:
        """建立连接"""
        from app.services.log import log_service
        from app.models.schemas import LogLevel
        try:
            from futu import OpenQuoteContext, OpenSecTradeContext
            self.quote_ctx = OpenQuoteContext(host=self.host, port=self.port)
            self.trade_ctx = OpenSecTradeContext(host=self.host, port=self.port)
            self.connected = True
            log_service.log(LogLevel.INFO, "adapter:moomoo", f"Moomoo 适配器连接成功 ({self.host}:{self.port})")
            return True
        except Exception as e:
            self.connected = False
            log_service.log(LogLevel.ERROR, "adapter:moomoo", f"Moomoo 适配器连接失败: {e}")
            return False

    async def disconnect(self) -> bool:
        """断开连接"""
        from app.services.log import log_service
        from app.models.schemas import LogLevel
        if self.quote_ctx:
            self.quote_ctx.close()
        if self.trade_ctx:
            self.trade_ctx.close()
        self.connected = False
        log_service.log(LogLevel.INFO, "adapter:moomoo", "Moomoo 适配器已断开连接")
        return True

    async def get_tick(self, symbol: str) -> TickData:
        """获取实时行情"""
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
        from app.services.log import log_service
        from app.models.schemas import LogLevel
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
            log_service.log(LogLevel.ERROR, "adapter:moomoo", f"Moomoo 下单失败: {symbol} {side.value} {quantity}, 错误: {data}")
            raise ValueError(f"Failed to place order: {data}")

        order_id = str(data['order_id'][0])
        log_service.log(LogLevel.INFO, "adapter:moomoo", f"Moomoo 下单成功: {symbol} {side.value} {quantity}, 订单ID: {order_id}")
        return order_id

    async def cancel_order(self, order_id: str) -> bool:
        """撤单"""
        from app.services.log import log_service
        from app.models.schemas import LogLevel
        from futu import RET_OK
        ret, data = self.trade_ctx.modify_order(modify_order_op=2, order_id=int(order_id))
        success = ret == RET_OK
        if success:
            log_service.log(LogLevel.INFO, "adapter:moomoo", f"Moomoo 撤单成功: {order_id}")
        else:
            log_service.log(LogLevel.ERROR, "adapter:moomoo", f"Moomoo 撤单失败: {order_id}, 错误: {data}")
        return success

    async def get_order(self, order_id: str, symbol: str | None = None) -> OrderData:
        """查询订单"""
        from app.services.log import log_service
        from app.models.schemas import LogLevel
        from futu import RET_OK, TrdSide, OrderStatus as FutuOrderStatus
        ret, data = self.trade_ctx.order_list_query(order_id=int(order_id))
        if ret != RET_OK or data.empty:
            log_service.log(LogLevel.ERROR, "adapter:moomoo", f"Moomoo 查询订单失败: {order_id}, 错误: {data}")
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

    async def get_account(self) -> AccountData:
        """获取账户信息"""
        from app.services.log import log_service
        from app.models.schemas import LogLevel
        from futu import RET_OK
        ret, data = self.trade_ctx.accinfo_query()
        if ret != RET_OK or data.empty:
            log_service.log(LogLevel.ERROR, "adapter:moomoo", f"Moomoo 获取账户信息失败: {data}")
            raise ValueError("Failed to get account info")

        row = data.iloc[0]
        log_service.log(LogLevel.INFO, "adapter:moomoo", f"Moomoo 获取账户信息成功: 总资产 ${float(row['total_assets']):.2f}")
        return AccountData(
            broker="moomoo",
            balance=float(row['total_assets']),
            available=float(row['cash']),
            frozen=float(row['frozen_cash'])
        )

    async def get_positions(self) -> List[PositionData]:
        """获取持仓列表"""
        from app.services.log import log_service
        from app.models.schemas import LogLevel
        from futu import RET_OK
        ret, data = self.trade_ctx.position_list_query()
        if ret != RET_OK:
            log_service.log(LogLevel.ERROR, "adapter:moomoo", f"Moomoo 获取持仓列表失败: {data}")
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
        log_service.log(LogLevel.INFO, "adapter:moomoo", f"Moomoo 获取持仓列表成功: {len(positions)} 个持仓")
        return positions

    async def get_klines(
        self,
        symbol: str,
        interval: str,
        start_time: datetime,
        end_time: datetime,
        limit: int = 100
    ) -> List[KlineData]:
        """获取历史K线数据（待实现）"""
        raise NotImplementedError("Moomoo历史K线功能待实现")
