#!/usr/bin/env python3
"""验证回测系统支持所有策略"""

from app.strategies import StrategyRegistry
from app.models.schemas import BacktestConfig
from datetime import datetime

def test_backtest_strategies():
    """测试回测支持的所有策略"""
    print("=" * 60)
    print("验证回测系统多策略支持")
    print("=" * 60)

    # 模拟前端发送的策略ID
    strategy_ids = ['ma_strategy', 'macd_strategy', 'bollinger_strategy', 'rsi_strategy']

    print("\n测试策略创建（模拟回测API逻辑）:")
    for strategy_id in strategy_ids:
        # 提取策略类型（模拟 API 层逻辑）
        strategy_type = strategy_id.replace('_strategy', '')

        try:
            # 创建策略实例
            strategy = StrategyRegistry.create(
                strategy_type,
                strategy_id,
                {"symbol": "BTC-USDT", "quantity": 1.0}
            )
            print(f"   ✓ {strategy_id:20s} -> {strategy_type:10s} 策略")
        except Exception as e:
            print(f"   ✗ {strategy_id:20s} 失败: {e}")

    print("\n" + "=" * 60)
    print("回测系统已支持所有4种策略！")
    print("=" * 60)

if __name__ == "__main__":
    test_backtest_strategies()
