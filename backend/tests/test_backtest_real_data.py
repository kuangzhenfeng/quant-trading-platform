import pytest
from datetime import datetime, timedelta
from app.adapters.mock import MockAdapter
from app.adapters.okx.live import OKXLiveAdapter
from app.models.schemas import BacktestConfig
from app.services.backtest import backtest_engine


@pytest.mark.asyncio
async def test_mock_get_klines():
    """测试Mock适配器获取K线"""
    adapter = MockAdapter({})
    await adapter.connect()

    klines = await adapter.get_klines(
        symbol="BTC-USDT",
        interval="1H",
        start_time=datetime.now() - timedelta(days=1),
        end_time=datetime.now(),
        limit=24
    )

    assert len(klines) > 0
    assert klines[0].close > 0
    assert klines[0].broker == "mock"

    await adapter.disconnect()


@pytest.mark.skip(reason="需要连接 OKX API，CI 环境网络不通")
@pytest.mark.asyncio
async def test_okx_get_klines():
    """测试OKX获取真实K线数据（公开API）"""
    adapter = OKXLiveAdapter({})
    await adapter.connect()

    klines = await adapter.get_klines(
        symbol="BTC-USDT",
        interval="1H",
        start_time=datetime.now() - timedelta(days=1),
        end_time=datetime.now(),
        limit=24
    )

    assert len(klines) > 0
    assert klines[0].close > 0
    assert klines[0].broker == "okx"
    assert klines[0].symbol == "BTC-USDT"

    await adapter.disconnect()


@pytest.mark.asyncio
async def test_backtest_with_mock_data():
    """测试使用Mock数据回测"""
    config = BacktestConfig(
        strategy_id="ma_test",
        symbol="BTC-USDT",
        start_date=(datetime.now() - timedelta(days=7)).isoformat(),
        end_date=datetime.now().isoformat(),
        initial_capital=10000.0,
        data_source="mock",
        interval="1H"
    )

    from app.strategies.ma_strategy import MAStrategy
    strategy = MAStrategy(name="test", params={
        "symbol": "BTC-USDT",
        "short_period": 5,
        "long_period": 20,
        "quantity": 0.001
    })

    backtest_id = await backtest_engine.run_backtest(config, strategy)
    result = backtest_engine.get_result(backtest_id)

    assert result is not None
    assert result.total_trades >= 0


@pytest.mark.skip(reason="需要连接 OKX API，CI 环境网络不通")
@pytest.mark.asyncio
async def test_backtest_with_okx_data():
    """测试使用OKX真实数据回测"""
    config = BacktestConfig(
        strategy_id="ma_test",
        symbol="BTC-USDT",
        start_date=(datetime.now() - timedelta(days=7)).isoformat(),
        end_date=datetime.now().isoformat(),
        initial_capital=10000.0,
        data_source="okx",
        interval="1H"
    )

    from app.strategies.ma_strategy import MAStrategy
    strategy = MAStrategy(name="test", params={
        "symbol": "BTC-USDT",
        "short_period": 5,
        "long_period": 20,
        "quantity": 0.001
    })

    backtest_id = await backtest_engine.run_backtest(config, strategy)
    result = backtest_engine.get_result(backtest_id)

    assert result is not None
    assert result.total_trades >= 0
