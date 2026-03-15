from fastapi import APIRouter, HTTPException
from app.services.backtest import backtest_engine
from app.models.schemas import BacktestConfig
from app.strategies.registry import StrategyRegistry

router = APIRouter(prefix="/api/backtest", tags=["backtest"])


@router.post("/run")
async def run_backtest(config: BacktestConfig):
    """运行回测

    支持的数据源 (data_source):
    - mock: 随机模拟数据（默认）
    - okx: OKX真实历史数据
    - moomoo: moomoo历史数据（待实现）
    - guojin: 国金历史数据（待实现）

    支持的K线周期 (interval):
    - 1m, 5m, 15m, 1H, 1D
    """
    # 从 strategy_id 提取策略类型（格式：ma_strategy -> ma）
    strategy_type = config.strategy_id.replace('_strategy', '')

    try:
        strategy = StrategyRegistry.create(
            strategy_type,
            config.strategy_id,
            {
                "symbol": config.symbol,
                "quantity": 1.0
            }
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    backtest_id = await backtest_engine.run_backtest(config, strategy)
    return {"backtest_id": backtest_id}


@router.get("/{backtest_id}")
async def get_backtest_result(backtest_id: str):
    """获取回测结果"""
    result = backtest_engine.get_result(backtest_id)
    if not result:
        raise HTTPException(status_code=404, detail="回测结果不存在")
    return result
