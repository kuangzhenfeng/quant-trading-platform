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


@router.get("/signals")
async def get_signals(symbol: str, strategy_ids: str):
    """批量获取策略信号（用于K线图信号叠加）
    strategy_ids: 逗号分隔的策略ID列表，如 ma_okx_BTC-USDT,macd_okx_BTC-USDT
    """
    from sqlalchemy import select, desc, or_
    from app.models.db_models import DBStrategySignal
    from app.core.database import AsyncSessionLocal

    ids = [s.strip() for s in strategy_ids.split(',') if s.strip()]
    if not ids:
        return {"signals": {}}

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(DBStrategySignal)
            .where(
                DBStrategySignal.symbol == symbol,
                DBStrategySignal.strategy_id.in_(ids)
            )
            .order_by(desc(DBStrategySignal.timestamp))
            .limit(100)
        )
        signals = result.scalars().all()

    # 按 strategy_id 分组
    grouped: dict[str, list] = {sid: [] for sid in ids}
    for s in signals:
        if s.strategy_id in grouped:
            grouped[s.strategy_id].append({
                "id": s.id,
                "strategy_id": s.strategy_id,
                "timestamp": s.timestamp.isoformat() + "Z" if s.timestamp else None,
                "symbol": s.symbol,
                "side": s.side,
                "price": s.price,
                "quantity": s.quantity,
                "reason": s.reason,
                "status": s.status,
            })

    return {"signals": grouped}


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


# ─── 批量操作 ───────────────────────────────────────────────────────────────────

class BatchCreateRequest(BaseModel):
    broker: str


@router.post("/create-and-start-all")
async def create_and_start_all(req: BatchCreateRequest):
    """一键创建并启用全部策略（16种策略类型 × 2个交易对）"""
    from sqlalchemy import select
    from app.models.db_models import DBStrategyConfig
    from app.core.database import AsyncSessionLocal

    # 16种策略类型 × 2个交易对
    strategy_types = [
        "ma", "macd", "bollinger", "rsi", "supertrend", "parabolic",
        "stochastic", "adx", "momentum", "cci", "atr_channel", "keltner",
        "donchian", "dual_rsi", "ma_rsi", "ichimoku",
    ]
    symbols = ["BTC-USDT", "ETH-USDT"]
    quantity = 0.01

    created = 0
    skipped = 0
    errors: list[str] = []

    # 获取已存在的策略列表
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(DBStrategyConfig.strategy_id))
        existing_ids = {row[0] for row in result.fetchall()}

    for stype in strategy_types:
        for symbol in symbols:
            strategy_id = f"{stype}_{req.broker}_{symbol}"

            # 跳过已存在的策略
            if strategy_id in existing_ids:
                skipped += 1
                continue

            try:
                # 获取默认参数
                params_schema = StrategyRegistry.get_params_schema(stype)
                params: dict = {"symbol": symbol, "quantity": quantity}
                for key, cfg in params_schema.items():
                    params[key] = cfg.get("default", 0)

                # 创建策略
                strategy = StrategyRegistry.create(stype, f"{stype}策略", params)
                await strategy_engine.register(strategy_id, strategy, req.broker, params)

                # 立即启用
                await strategy_engine.start(strategy_id)

                created += 1
            except Exception as e:
                errors.append(f"{strategy_id}: {e}")

    return {"created": created, "skipped": skipped, "errors": errors}


@router.post("/delete-all")
async def delete_all_strategies():
    """一键删除全部策略"""
    from sqlalchemy import delete, select
    from app.models.db_models import DBStrategyConfig, DBStrategyPerformance, DBStrategySignal
    from app.core.database import AsyncSessionLocal

    # 获取所有策略
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(DBStrategyConfig.strategy_id))
        strategy_ids = [row[0] for row in result.fetchall()]

    deleted = 0
    errors: list[str] = []

    for strategy_id in strategy_ids:
        try:
            # 从引擎中停止并移除
            if strategy_id in strategy_engine.strategies:
                await strategy_engine.stop(strategy_id)
                strategy_engine.strategies.pop(strategy_id)

            # 删除数据库记录
            async with AsyncSessionLocal() as session:
                await session.execute(delete(DBStrategySignal).where(DBStrategySignal.strategy_id == strategy_id))
                await session.execute(delete(DBStrategyConfig).where(DBStrategyConfig.strategy_id == strategy_id))
                await session.execute(delete(DBStrategyPerformance).where(DBStrategyPerformance.strategy_id == strategy_id))
                await session.commit()

            deleted += 1
        except Exception as e:
            errors.append(f"{strategy_id}: {e}")

    return {"deleted": deleted, "errors": errors}
