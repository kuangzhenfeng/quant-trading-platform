from typing import Dict, List
from datetime import datetime
from app.models.schemas import OrderData, PositionData


class MonitorService:
    """监控统计服务"""

    def __init__(self):
        self.orders: List[OrderData] = []
        self.positions: Dict[str, PositionData] = {}

    def add_order(self, order: OrderData):
        """记录订单"""
        self.orders.append(order)

    def update_positions(self, broker: str, positions: List[PositionData]):
        """更新持仓"""
        for pos in positions:
            key = f"{broker}:{pos.symbol}"
            self.positions[key] = pos

    def get_pnl_summary(self) -> Dict:
        """获取 PnL 汇总"""
        total_pnl = sum(pos.unrealized_pnl for pos in self.positions.values())
        return {
            "total_pnl": total_pnl,
            "position_count": len(self.positions),
            "positions": [
                {
                    "symbol": pos.symbol,
                    "quantity": pos.quantity,
                    "avg_price": pos.avg_price,
                    "unrealized_pnl": pos.unrealized_pnl
                }
                for pos in self.positions.values()
            ]
        }

    def get_trade_stats(self) -> Dict:
        """获取成交统计"""
        from app.models.schemas import OrderStatus
        filled_orders = [o for o in self.orders if o.status == OrderStatus.FILLED]
        return {
            "total_orders": len(self.orders),
            "filled_orders": len(filled_orders),
            "total_volume": sum(o.quantity for o in filled_orders),
        }


monitor_service = MonitorService()
