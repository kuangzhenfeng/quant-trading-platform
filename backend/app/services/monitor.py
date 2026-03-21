from typing import Dict, List
from app.models.schemas import OrderData, PositionData, OrderStatus
from app.repositories.order_repo import OrderRepository
from app.repositories.position_repo import PositionRepository
from app.core.database import AsyncSessionLocal
from app.core.config import settings, TradingMode


class MonitorService:
    """监控统计服务"""

    async def add_order(self, order: OrderData, broker: str):
        """记录订单"""
        async with AsyncSessionLocal() as session:
            repo = OrderRepository(session)
            await repo.create(order, broker)

    async def update_order(self, order: OrderData, broker: str):
        """更新订单"""
        async with AsyncSessionLocal() as session:
            repo = OrderRepository(session)
            await repo.update(order, broker)

    async def get_orders(self, broker: str | None = None) -> List[OrderData]:
        """获取订单历史"""
        async with AsyncSessionLocal() as session:
            repo = OrderRepository(session)
            orders = await repo.get_all(broker)
            return orders

    async def update_positions(self, broker: str, positions: List[PositionData]):
        """更新持仓"""
        async with AsyncSessionLocal() as session:
            repo = PositionRepository(session)
            for pos in positions:
                await repo.upsert(pos, broker)

    async def get_pnl_summary(self, broker: str | None = None) -> Dict:
        """获取 PnL 汇总"""
        positions: List[PositionData] = []

        if settings.trading_mode == TradingMode.MOCK:
            # MOCK 模式：从数据库读取
            async with AsyncSessionLocal() as session:
                repo = PositionRepository(session)
                positions = await repo.get_all(broker)
        else:
            # PAPER/LIVE 模式：从 adapter 获取实时数据
            from app.services.trading import trading_service
            for broker_name, adapter in trading_service.adapters.items():
                if broker and broker_name != broker:
                    continue
                if adapter.connected:
                    broker_positions = await adapter.get_positions()
                    positions.extend(broker_positions)

        total_pnl = sum(pos.unrealized_pnl for pos in positions)
        return {
            "total_pnl": total_pnl,
            "position_count": len(positions),
            "positions": [
                {
                    "symbol": pos.symbol,
                    "quantity": pos.quantity,
                    "avg_price": pos.avg_price,
                    "unrealized_pnl": pos.unrealized_pnl
                }
                for pos in positions
            ]
        }

    async def get_trade_stats(self, broker: str | None = None) -> Dict:
        """获取成交统计"""
        async with AsyncSessionLocal() as session:
            repo = OrderRepository(session)
            orders = await repo.get_all(broker)
            filled_orders = [o for o in orders if o.status == OrderStatus.FILLED]
            return {
                "total_orders": len(orders),
                "filled_orders": len(filled_orders),
                "total_volume": sum(o.quantity for o in filled_orders),
            }


monitor_service = MonitorService()
