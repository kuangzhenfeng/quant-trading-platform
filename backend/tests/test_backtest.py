import pytest
from app.services.backtest import backtest_engine, BacktestContext
from app.models.schemas import BacktestConfig
from app.strategies.ma_strategy import MAStrategy


@pytest.mark.asyncio
async def test_backtest_context():
    """测试回测上下文"""
    ctx = BacktestContext(100000.0)
    await ctx.buy("BTC-USDT", 1.0, 50000.0)
    assert ctx.position == 1.0
    assert ctx.capital == 50000.0

    await ctx.sell("BTC-USDT", 1.0, 51000.0)
    assert ctx.position == 0.0
    assert ctx.capital == 101000.0


@pytest.mark.asyncio
async def test_backtest_run():
    """测试回测运行"""
    config = BacktestConfig(
        strategy_id="test_ma",
        symbol="BTC-USDT",
        start_date="2024-01-01",
        end_date="2024-01-02",
        initial_capital=100000.0
    )
    strategy = MAStrategy(
        name="test_ma",
        params={"symbol": "BTC-USDT", "short_period": 5, "long_period": 20, "quantity": 1.0}
    )
    backtest_id = await backtest_engine.run_backtest(config, strategy)
    assert backtest_id.startswith("bt_")

    result = backtest_engine.get_result(backtest_id)
    assert result is not None
    assert hasattr(result, 'total_return')
