from fastapi import APIRouter, HTTPException
from app.services.monitor import monitor_service
from app.services.strategy import strategy_engine
from app.core.config import settings, TradingMode

router = APIRouter(prefix="/api/monitor", tags=["monitor"])


@router.get("/pnl")
async def get_pnl():
    """获取 PnL 汇总"""
    return await monitor_service.get_pnl_summary()


@router.get("/stats")
async def get_stats():
    """获取成交统计"""
    return await monitor_service.get_trade_stats()


@router.get("/strategies")
async def get_strategy_status():
    """获取策略状态"""
    return {
        "strategies": [
            {
                "id": sid,
                "running": running,
                "broker": ctx.broker,
                "log_count": len(ctx.logs)
            }
            for sid, (_, ctx, running) in strategy_engine.strategies.items()
        ]
    }


@router.post("/reset-mock-data")
async def reset_mock_data():
    """重置 Mock 测试数据（仅在 MOCK 模式下可用）"""
    if settings.trading_mode != TradingMode.MOCK:
        raise HTTPException(status_code=400, detail="仅在 MOCK 模式下可用")

    from app.core.database import AsyncSessionLocal
    from app.repositories.order_repo import OrderRepository
    from app.repositories.position_repo import PositionRepository
    from app.models.schemas import OrderData, PositionData, OrderStatus, OrderSide, OrderType
    from sqlalchemy import delete
    from app.models.db_models import DBOrder, DBPosition

    async with AsyncSessionLocal() as session:
        # 清空现有数据
        await session.execute(delete(DBOrder))
        await session.execute(delete(DBPosition))
        await session.commit()

        # 重新创建测试数据
        order_repo = OrderRepository(session)
        pos_repo = PositionRepository(session)

        test_orders = [
            OrderData(
                order_id="MOCK001",
                symbol="AAPL",
                side=OrderSide.BUY,
                type=OrderType.LIMIT,
                quantity=100,
                price=150.0,
                status=OrderStatus.FILLED
            ),
            OrderData(
                order_id="MOCK002",
                symbol="TSLA",
                side=OrderSide.BUY,
                type=OrderType.LIMIT,
                quantity=50,
                price=200.0,
                status=OrderStatus.FILLED
            ),
        ]

        for order in test_orders:
            await order_repo.create(order, "mock")

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
            await pos_repo.upsert(pos, "mock")

    return {"message": "Mock 数据已重置"}
