from typing import Dict, Type, Any
from app.strategies.base import Strategy


class StrategyRegistry:
    """策略注册器"""
    _strategies: Dict[str, Type[Strategy]] = {}

    @classmethod
    def register(cls, strategy_type: str):
        """装饰器: 注册策略"""
        def decorator(strategy_class: Type[Strategy]):
            cls._strategies[strategy_type] = strategy_class
            return strategy_class
        return decorator

    @classmethod
    def create(cls, strategy_type: str, name: str, params: Dict[str, Any]) -> Strategy:
        """工厂方法: 创建策略实例"""
        if strategy_type not in cls._strategies:
            raise ValueError(f"不支持的策略类型: {strategy_type}")
        strategy_class = cls._strategies[strategy_type]
        return strategy_class(name, params)

    @classmethod
    def get_params_schema(cls, strategy_type: str) -> Dict[str, Any]:
        """获取策略参数定义"""
        if strategy_type not in cls._strategies:
            raise ValueError(f"不支持的策略类型: {strategy_type}")
        return cls._strategies[strategy_type].PARAMS_SCHEMA

    @classmethod
    def get_all_types(cls) -> Dict[str, Dict[str, Any]]:
        """获取所有策略类型及参数定义"""
        return {
            strategy_type: strategy_class.PARAMS_SCHEMA
            for strategy_type, strategy_class in cls._strategies.items()
        }
