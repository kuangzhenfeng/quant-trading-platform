"""初始化监控页面测试数据"""
import asyncio
from app.core.database import AsyncSessionLocal
from app.repositories.order_repo import OrderRepository
from app.repositories.position_repo import PositionRepository
from app.models.schemas import OrderData, PositionData, OrderStatus, OrderSide, OrderType
from datetime import datetime


async def init_test_data():
    """初始化测试数据"""
    async with AsyncSessionLocal() as session:
        order_repo = OrderRepository(session)
        pos_repo = PositionRepository(session)

        # 创建测试订单
        test_orders = [
            OrderData(
                order_id="TEST001",
                symbol="AAPL",
                side=OrderSide.BUY,
                type=OrderType.LIMIT,
                quantity=100,
                price=150.0,
                status=OrderStatus.FILLED
            ),
            OrderData(
                order_id="TEST002",
                symbol="TSLA",
                side=OrderSide.BUY,
                type=OrderType.LIMIT,
                quantity=50,
                price=200.0,
                status=OrderStatus.FILLED
            ),
        ]

        for order in test_orders:
            await order_repo.create(order, "moomoo")

        # 创建测试持仓
        test_positions = [
            PositionData(
                symbol="AAPL",
                quantity=100,
                avg_price=150.0,
                current_price=155.0,
                unrealized_pnl=500.0
            ),
            PositionData(
                symbol="TSLA",
                quantity=50,
                avg_price=200.0,
                current_price=195.0,
                unrealized_pnl=-250.0
            ),
        ]

        for pos in test_positions:
            await pos_repo.upsert(pos, "moomoo")

        print("✅ 测试数据初始化完成")
        print(f"- 创建了 {len(test_orders)} 个订单")
        print(f"- 创建了 {len(test_positions)} 个持仓")


if __name__ == "__main__":
    asyncio.run(init_test_data())
