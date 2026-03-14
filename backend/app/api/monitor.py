from fastapi import APIRouter
from app.services.monitor import monitor_service
from app.services.strategy import strategy_engine

router = APIRouter(prefix="/api/monitor", tags=["monitor"])


@router.get("/pnl")
async def get_pnl():
    """获取 PnL 汇总"""
    return monitor_service.get_pnl_summary()


@router.get("/stats")
async def get_stats():
    """获取成交统计"""
    return monitor_service.get_trade_stats()


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
