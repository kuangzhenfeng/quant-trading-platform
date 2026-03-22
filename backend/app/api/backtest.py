from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import asyncio
from app.services.backtest import backtest_engine
from app.models.schemas import BacktestConfig, BacktestResult
from app.strategies.registry import StrategyRegistry

router = APIRouter(prefix="/api/backtest", tags=["backtest"])


# 策略元数据：type -> (显示名称, 描述, 分类)
STRATEGY_META = {
    "ma": ("MA", "均线交叉", "趋势跟踪"),
    "macd": ("MACD", "MACD 指标", "趋势跟踪"),
    "bollinger": ("Bollinger", "布林带", "均值回归"),
    "rsi": ("RSI", "相对强弱指标", "均值回归"),
    "supertrend": ("Supertrend", "超级趋势", "趋势跟踪"),
    "parabolic": ("Parabolic SAR", "抛物线止损", "趋势跟踪"),
    "stochastic": ("Stochastic", "随机指标", "均值回归"),
    "adx": ("ADX", "平均趋向指数", "趋势跟踪"),
    "momentum": ("Momentum", "动量策略", "趋势跟踪"),
    "cci": ("CCI", "顺势指标", "均值回归"),
    "atr_channel": ("ATR Channel", "ATR 通道", "通道突破"),
    "keltner": ("Keltner", "肯特纳通道", "通道突破"),
    "donchian": ("Donchian", "唐奇安通道", "通道突破"),
    "dual_rsi": ("Dual RSI", "双 RSI 策略", "均值回归"),
    "ma_rsi": ("MA+RSI", "均线 RSI 组合", "趋势跟踪"),
    "ichimoku": ("Ichimoku", "一目均衡表", "趋势跟踪"),
}


class StrategyInfo(BaseModel):
    type: str
    strategy_id: str
    name: str
    description: str
    category: str


class BatchResult(BaseModel):
    strategy_id: str
    name: str
    category: str
    result: BacktestResult | None
    error: str | None = None


@router.get("/strategies")
async def list_strategies():
    """获取所有可用策略列表"""
    strategies = []
    for stype, (name, desc, category) in STRATEGY_META.items():
        strategies.append(StrategyInfo(
            type=stype,
            strategy_id=f"{stype}_strategy",
            name=name,
            description=desc,
            category=category,
        ))
    return {"strategies": strategies}


@router.post("/run-all")
async def run_all_backtests(config: BacktestConfig):
    """批量运行所有策略的回测"""
    results = []

    for stype, (name, desc, category) in STRATEGY_META.items():
        strategy_id = f"{stype}_strategy"
        try:
            strategy = StrategyRegistry.create(
                stype,
                strategy_id,
                {"symbol": config.symbol, "quantity": 1.0},
            )
        except ValueError as e:
            results.append(BatchResult(
                strategy_id=strategy_id,
                name=name,
                category=category,
                result=None,
                error=str(e),
            ))
            continue

        try:
            backtest_id = await backtest_engine.run_backtest(config, strategy)
            result = backtest_engine.get_result(backtest_id)
            results.append(BatchResult(
                strategy_id=strategy_id,
                name=name,
                category=category,
                result=result,
            ))
        except Exception as e:
            results.append(BatchResult(
                strategy_id=strategy_id,
                name=name,
                category=category,
                result=None,
                error=str(e),
            ))

    return {"results": results}


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
