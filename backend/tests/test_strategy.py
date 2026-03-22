import pytest
import time
from app.services.strategy import StrategyEngine
from app.services.trading import TradingService
from app.services.market import MarketDataService
from app.strategies.ma_strategy import MAStrategy


@pytest.mark.asyncio
async def test_strategy_register():
    """测试策略注册"""
    trading_service = TradingService()
    market_service = MarketDataService()
    engine = StrategyEngine(trading_service, market_service)

    strategy_id = f"test_strategy_reg_{int(time.time() * 1000)}"
    params = {"symbol": "BTC-USDT", "short_period": 5, "long_period": 20}
    strategy = MAStrategy("测试策略", params)
    await engine.register(strategy_id, strategy, "okx", params)

    assert strategy_id in engine.strategies


@pytest.mark.asyncio
async def test_strategy_start_stop():
    """测试策略启停"""
    trading_service = TradingService()
    market_service = MarketDataService()
    engine = StrategyEngine(trading_service, market_service)

    strategy_id = f"test_strategy_ss_{int(time.time() * 1000)}"
    params = {"symbol": "BTC-USDT"}
    strategy = MAStrategy("测试策略", params)
    await engine.register(strategy_id, strategy, "okx", params)

    success = await engine.start(strategy_id)
    assert success

    success = await engine.stop(strategy_id)
    assert success


@pytest.mark.asyncio
async def test_strategy_logs():
    """测试策略日志"""
    trading_service = TradingService()
    market_service = MarketDataService()
    engine = StrategyEngine(trading_service, market_service)

    strategy_id = f"test_strategy_log_{int(time.time() * 1000)}"
    params = {"symbol": "BTC-USDT"}
    strategy = MAStrategy("测试策略", params)
    await engine.register(strategy_id, strategy, "okx", params)

    logs = engine.get_logs(strategy_id)
    assert len(logs) > 0
    assert "均线策略初始化" in logs[0]
