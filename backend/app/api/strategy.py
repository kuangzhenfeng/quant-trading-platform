from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.strategy import strategy_engine
from app.strategies.ma_strategy import MAStrategy

router = APIRouter(prefix="/api/strategy", tags=["strategy"])


class CreateStrategyRequest(BaseModel):
    strategy_type: str
    broker: str
    params: dict


@router.post("/create")
async def create_strategy(req: CreateStrategyRequest):
    """创建策略"""
    strategy_id = f"{req.strategy_type}_{req.broker}"

    if req.strategy_type == "ma":
        strategy = MAStrategy("均线策略", req.params)
    else:
        raise HTTPException(400, "不支持的策略类型")

    strategy_engine.register(strategy_id, strategy, req.broker)
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
    success = strategy_engine.stop(strategy_id)
    if not success:
        raise HTTPException(404, "策略不存在")
    return {"status": "stopped"}


@router.get("/{strategy_id}/logs")
async def get_logs(strategy_id: str):
    """获取策略日志"""
    logs = strategy_engine.get_logs(strategy_id)
    return {"logs": logs}
