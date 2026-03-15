#!/usr/bin/env python3
"""测试多策略支持"""

from app.strategies import StrategyRegistry

def test_all_strategies():
    """测试所有策略类型"""
    print("=" * 60)
    print("测试多策略支持系统")
    print("=" * 60)

    # 1. 测试策略注册
    print("\n1. 已注册的策略类型:")
    for strategy_type in StrategyRegistry._strategies.keys():
        print(f"   ✓ {strategy_type}")

    # 2. 测试获取参数定义
    print("\n2. 测试获取参数定义:")
    types = StrategyRegistry.get_all_types()
    for strategy_type, schema in types.items():
        print(f"   {strategy_type}: {len(schema)} 个参数")

    # 3. 测试创建策略实例
    print("\n3. 测试创建策略实例:")
    test_cases = [
        ("ma", {"symbol": "BTC-USDT", "short_period": 5, "long_period": 20, "quantity": 0.01}),
        ("macd", {"symbol": "ETH-USDT", "fast_period": 12, "slow_period": 26, "signal_period": 9, "quantity": 0.01}),
        ("bollinger", {"symbol": "BTC-USDT", "period": 20, "std_dev": 2, "quantity": 0.01}),
        ("rsi", {"symbol": "ETH-USDT", "period": 14, "oversold": 30, "overbought": 70, "quantity": 0.01}),
    ]

    for strategy_type, params in test_cases:
        try:
            strategy = StrategyRegistry.create(strategy_type, f"{strategy_type}测试", params)
            print(f"   ✓ {strategy_type} 策略创建成功")
        except Exception as e:
            print(f"   ✗ {strategy_type} 策略创建失败: {e}")

    # 4. 测试错误处理
    print("\n4. 测试错误处理:")
    try:
        StrategyRegistry.create("invalid", "测试", {})
        print("   ✗ 应该抛出异常")
    except ValueError as e:
        print(f"   ✓ 正确捕获异常: {e}")

    print("\n" + "=" * 60)
    print("测试完成！")
    print("=" * 60)

if __name__ == "__main__":
    test_all_strategies()
