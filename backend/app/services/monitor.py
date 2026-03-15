from typing import Dict, List
from app.models.schemas import OrderData, PositionData, OrderStatus
from app.repositories.order_repo import OrderRepository
from app.repositories.position_repo import PositionRepository
from app.core.database import AsyncSessionLocal


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

    async def update_positions(self, broker: str, positions: List[PositionData]):
        """更新持仓"""
        async with AsyncSessionLocal() as session:
            repo = PositionRepository(session)
            for pos in positions:
                await repo.upsert(pos, broker)

    async def get_pnl_summary(self, broker: str | None = None) -> Dict:
        """获取 PnL 汇总"""
        async with AsyncSessionLocal() as session:
            repo = PositionRepository(session)
            positions = await repo.get_all(broker)
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
