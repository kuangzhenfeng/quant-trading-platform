from fastapi import APIRouter, HTTPException
from app.services.backtest import backtest_engine
from app.models.schemas import BacktestConfig
from app.strategies.ma_strategy import MAStrategy

router = APIRouter(prefix="/api/backtest", tags=["backtest"])


@router.post("/run")
async def run_backtest(config: BacktestConfig):
    """运行回测"""
    strategy = MAStrategy(
        name=config.strategy_id,
        params={
            "symbol": config.symbol,
            "short_period": 5,
            "long_period": 20,
            "quantity": 1.0
        }
    )
    backtest_id = await backtest_engine.run_backtest(config, strategy)
    return {"backtest_id": backtest_id}


@router.get("/{backtest_id}")
async def get_backtest_result(backtest_id: str):
    """获取回测结果"""
    result = backtest_engine.get_result(backtest_id)
    if not result:
        raise HTTPException(status_code=404, detail="回测结果不存在")
    return result
