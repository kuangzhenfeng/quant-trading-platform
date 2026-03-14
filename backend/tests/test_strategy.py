import pytest
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

    strategy = MAStrategy("测试策略", {"symbol": "BTC-USDT", "short_period": 5, "long_period": 20})
    engine.register("test_strategy", strategy, "okx")

    assert "test_strategy" in engine.strategies


@pytest.mark.asyncio
async def test_strategy_start_stop():
    """测试策略启停"""
    trading_service = TradingService()
    market_service = MarketDataService()
    engine = StrategyEngine(trading_service, market_service)

    strategy = MAStrategy("测试策略", {"symbol": "BTC-USDT"})
    engine.register("test_strategy", strategy, "okx")

    success = await engine.start("test_strategy")
    assert success

    success = engine.stop("test_strategy")
    assert success


@pytest.mark.asyncio
async def test_strategy_logs():
    """测试策略日志"""
    trading_service = TradingService()
    market_service = MarketDataService()
    engine = StrategyEngine(trading_service, market_service)

    strategy = MAStrategy("测试策略", {"symbol": "BTC-USDT"})
    engine.register("test_strategy", strategy, "okx")

    logs = engine.get_logs("test_strategy")
    assert len(logs) > 0
    assert "均线策略初始化" in logs[0]
