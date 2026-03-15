#!/usr/bin/env python3
"""回测功能验证脚本"""
import asyncio
from datetime import datetime, timedelta
from app.models.schemas import BacktestConfig
from app.services.backtest import backtest_engine
from app.strategies.ma_strategy import MAStrategy


async def main():
    print("=" * 60)
    print("回测功能验证")
    print("=" * 60)

    # 测试1: Mock数据源
    print("\n【测试1】使用Mock模拟数据")
    config_mock = BacktestConfig(
        strategy_id="ma_test",
        symbol="BTC-USDT",
        start_date=(datetime.now() - timedelta(days=7)).isoformat(),
        end_date=datetime.now().isoformat(),
        initial_capital=10000.0,
        data_source="mock",
        interval="1H"
    )

    strategy_mock = MAStrategy(name="test", params={
        "symbol": "BTC-USDT",
        "short_period": 5,
        "long_period": 20,
        "quantity": 0.001
    })

    backtest_id_mock = await backtest_engine.run_backtest(config_mock, strategy_mock)
    result_mock = backtest_engine.get_result(backtest_id_mock)

    print(f"回测ID: {backtest_id_mock}")
    print(f"总收益率: {result_mock.total_return:.2%}")
    print(f"最大回撤: {result_mock.max_drawdown:.2%}")
    print(f"胜率: {result_mock.win_rate:.2%}")
    print(f"总交易次数: {result_mock.total_trades}")

    # 测试2: OKX真实数据
    print("\n【测试2】使用OKX真实数据")
    config_okx = BacktestConfig(
        strategy_id="ma_test",
        symbol="BTC-USDT",
        start_date=(datetime.now() - timedelta(days=7)).isoformat(),
        end_date=datetime.now().isoformat(),
        initial_capital=10000.0,
        data_source="okx",
        interval="1H"
    )

    strategy_okx = MAStrategy(name="test", params={
        "symbol": "BTC-USDT",
        "short_period": 5,
        "long_period": 20,
        "quantity": 0.001
    })

    backtest_id_okx = await backtest_engine.run_backtest(config_okx, strategy_okx)
    result_okx = backtest_engine.get_result(backtest_id_okx)

    print(f"回测ID: {backtest_id_okx}")
    print(f"总收益率: {result_okx.total_return:.2%}")
    print(f"最大回撤: {result_okx.max_drawdown:.2%}")
    print(f"胜率: {result_okx.win_rate:.2%}")
    print(f"总交易次数: {result_okx.total_trades}")

    print("\n" + "=" * 60)
    print("✅ 验证完成！两种数据源都能正常工作")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
