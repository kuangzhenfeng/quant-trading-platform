from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.strategy import strategy_engine
from app.strategies.registry import StrategyRegistry

router = APIRouter(prefix="/api/strategy", tags=["strategy"])


class CreateStrategyRequest(BaseModel):
    strategy_type: str
    broker: str
    params: dict


@router.get("/types")
async def get_strategy_types():
    """获取所有策略类型及参数定义"""
    return {"types": StrategyRegistry.get_all_types()}


@router.post("/create")
async def create_strategy(req: CreateStrategyRequest):
    """创建策略"""
    symbol = req.params.get("symbol", "")
    if not symbol:
        raise HTTPException(400, "参数中必须包含 symbol")

    strategy_id = f"{req.strategy_type}_{req.broker}_{symbol}"

    try:
        strategy = StrategyRegistry.create(req.strategy_type, f"{req.strategy_type}策略", req.params)
    except ValueError as e:
        raise HTTPException(400, str(e))

    await strategy_engine.register(strategy_id, strategy, req.broker, req.params)
    return {"strategy_id": strategy_id}


@router.post("/{strategy_id}/start")
async def start_strategy(strategy_id: str):
    """启动策略"""
    success = await strategy_engine.start(strategy_id)
    if not success:
        raise HTTPException(404, "策略不存在")
    return {"status": "started"}


@router.post("/{strategy_id}/stop")
async def stop_strategy(strategy_id: str):
    """停止策略"""
    success = await strategy_engine.stop(strategy_id)
    if not success:
        raise HTTPException(404, "策略不存在")
    return {"status": "stopped"}


@router.get("/{strategy_id}/logs")
async def get_logs(strategy_id: str, limit: int = 100):
    """获取策略日志"""
    from sqlalchemy import select
    from app.models.db_models import DBStrategyLog
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(DBStrategyLog)
            .where(DBStrategyLog.strategy_id == strategy_id)
            .order_by(DBStrategyLog.timestamp.desc())
            .limit(limit)
        )
        logs = result.scalars().all()
        return {
            "logs": [
                {
                    "timestamp": log.timestamp.isoformat() + "Z",  # 标记为 UTC，前端可正确转换本地时间
                    "level": log.level,
                    "message": log.message
                }
                for log in reversed(logs)
            ]
        }


@router.get("/{strategy_id}")
async def get_strategy(strategy_id: str):
    """获取策略详情"""
    try:
        detail = await strategy_engine.get_detail(strategy_id)
        if not detail:
            raise HTTPException(404, "策略不存在")
        return detail
    except Exception as e:
        import traceback
        print(f"[ERROR] get_strategy failed for {strategy_id}: {e}")
        traceback.print_exc()
        raise


@router.put("/{strategy_id}")
async def update_strategy(strategy_id: str, req: CreateStrategyRequest):
    """更新策略参数"""
    success = await strategy_engine.update_params(strategy_id, req.params)
    if not success:
        raise HTTPException(404, "策略不存在")
    return {"status": "updated"}


@router.get("/{strategy_id}/signals")
async def get_strategy_signals(strategy_id: str):
    """获取策略信号历史（最近100条，按时间倒序）"""
    from app.repositories.signal_repo import SignalRepository
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        repo = SignalRepository(session)
        signals = await repo.get_by_strategy(strategy_id, limit=100)
    return {
        "signals": [
            {
                "id": s.id,
                "strategy_id": s.strategy_id,
                "timestamp": s.timestamp.isoformat() if s.timestamp else None,
                "symbol": s.symbol,
                "side": s.side,
                "price": s.price,
                "quantity": s.quantity,
                "reason": s.reason,
                "status": s.status,
            }
            for s in signals
        ]
    }


@router.get("/{strategy_id}/performance")
async def get_strategy_performance(strategy_id: str):
    """获取策略绩效"""
    from app.services.strategy_performance import performance_service

    snapshot = await performance_service.get_snapshot(strategy_id)
    if snapshot:
        return snapshot
    return await performance_service.calculate_metrics(strategy_id)


@router.delete("/{strategy_id}")
async def delete_strategy(strategy_id: str):
    """删除策略"""
    from sqlalchemy import delete, select
    from app.models.db_models import DBStrategyConfig, DBStrategyPerformance, DBStrategySignal
    from app.core.database import AsyncSessionLocal

    # 检查策略是否存在（引擎中或数据库中）
    in_engine = strategy_id in strategy_engine.strategies
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(DBStrategyConfig).where(DBStrategyConfig.strategy_id == strategy_id))
        in_db = result.scalar_one_or_none() is not None

    if not in_engine and not in_db:
        raise HTTPException(404, "策略不存在")

    # 如果策略在引擎中，先停止它
    if in_engine:
        await strategy_engine.stop(strategy_id)
        # 从引擎中移除
        strategy_engine.strategies.pop(strategy_id)

    # 删除数据库记录
    async with AsyncSessionLocal() as session:
        await session.execute(delete(DBStrategySignal).where(DBStrategySignal.strategy_id == strategy_id))
        await session.execute(delete(DBStrategyConfig).where(DBStrategyConfig.strategy_id == strategy_id))
        await session.execute(delete(DBStrategyPerformance).where(DBStrategyPerformance.strategy_id == strategy_id))
        await session.commit()
    return {"message": "策略已删除"}
