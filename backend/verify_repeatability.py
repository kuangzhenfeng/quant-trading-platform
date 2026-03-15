#!/usr/bin/env python3
"""验证回测结果的可重复性"""
import asyncio
from datetime import datetime
from app.models.schemas import BacktestConfig
from app.services.backtest import backtest_engine
from app.strategies.ma_strategy import MAStrategy


async def main():
    print("=" * 60)
    print("回测可重复性验证")
    print("=" * 60)

    config = BacktestConfig(
        strategy_id='ma_test',
        symbol='BTC-USDT',
        start_date='2024-03-01T00:00:00',
        end_date='2024-03-08T00:00:00',
        initial_capital=10000.0,
        data_source='mock',
        interval='1H'
    )

    results = []
    for i in range(3):
        strategy = MAStrategy(name='test', params={
            'symbol': 'BTC-USDT',
            'short_period': 5,
            'long_period': 20,
            'quantity': 0.001
        })

        backtest_id = await backtest_engine.run_backtest(config, strategy)
        result = backtest_engine.get_result(backtest_id)
        results.append(result)

        print(f"\n第{i+1}次回测:")
        print(f"  总收益率: {result.total_return:.6f}")
        print(f"  最大回撤: {result.max_drawdown:.6f}")
        print(f"  胜率: {result.win_rate:.2%}")
        print(f"  总交易次数: {result.total_trades}")

    # 验证所有结果是否一致
    all_same = all(
        r.total_return == results[0].total_return and
        r.total_trades == results[0].total_trades
        for r in results
    )

    print("\n" + "=" * 60)
    if all_same:
        print("✅ 验证通过：相同参数的回测结果完全一致！")
    else:
        print("❌ 验证失败：回测结果不一致")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
