from fastapi import APIRouter, HTTPException
from sqlalchemy import select, func
from app.services.monitor import monitor_service
from app.services.strategy import strategy_engine
from app.core.config import settings, TradingMode
from app.models.db_models import DBStrategyLog
from app.core.database import AsyncSessionLocal

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
    """获取策略状态（日志数从数据库实时统计）"""
    strategy_ids = list(strategy_engine.strategies.keys())

    # 从数据库批量查询各策略的日志条数
    log_counts: dict[str, int] = {}
    if strategy_ids:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(DBStrategyLog.strategy_id, func.count().label("cnt"))
                .where(DBStrategyLog.strategy_id.in_(strategy_ids))
                .group_by(DBStrategyLog.strategy_id)
            )
            log_counts = {row.strategy_id: row.cnt for row in result}

    # 批量查询绩效快照
    perf_map: dict[str, dict] = {}
    if strategy_ids:
        async with AsyncSessionLocal() as session:
            from app.models.db_models import DBStrategyPerformance
            result = await session.execute(
                select(DBStrategyPerformance).where(
                    DBStrategyPerformance.strategy_id.in_(strategy_ids)
                )
            )
            for row in result.scalars().all():
                perf_map[row.strategy_id] = {
                    "total_return": row.total_return,
                    "win_rate": row.win_rate,
                    "total_trades": row.total_trades,
                }

    # 批量查询各策略的持仓盈亏
    unrealized_pnl_map: dict[str, float] = {}
    if strategy_ids:
        async with AsyncSessionLocal() as session:
            from app.models.db_models import DBPosition
            # 按 broker+symbol 批量查询持仓
            pos_result = await session.execute(select(DBPosition))
            pos_by_broker_symbol: dict[tuple[str, str], float] = {}
            for row in pos_result.scalars().all():
                pos_by_broker_symbol[(row.broker, row.symbol)] = getattr(row, 'unrealized_pnl', 0.0)

            for sid in strategy_ids:
                _, _, running = strategy_engine.strategies[sid]
                broker = strategy_engine.strategies[sid][1].broker
                # 从 strategy_id 提取 symbol（格式: {type}_{broker}_{symbol}）
                parts = sid.rsplit("_", 2)
                symbol = parts[2] if len(parts) >= 3 else ""
                unrealized_pnl_map[sid] = pos_by_broker_symbol.get((broker, symbol), 0.0)

    return {
        "strategies": [
            {
                "id": sid,
                "running": running,
                "broker": ctx.broker,
                "log_count": log_counts.get(sid, 0),
                "unrealized_pnl": unrealized_pnl_map.get(sid, 0.0),
                "total_trades": perf_map.get(sid, {}).get("total_trades", 0),
                "total_return": perf_map.get(sid, {}).get("total_return", None),
                "win_rate": perf_map.get(sid, {}).get("win_rate", None),
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
