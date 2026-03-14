from typing import Dict
import asyncio
from app.strategies.base import Strategy, StrategyContext
from app.models.schemas import TickData


class StrategyEngine:
    """策略引擎"""
    def __init__(self, trading_service, market_service):
        self.trading_service = trading_service
        self.market_service = market_service
        self.strategies: Dict[str, tuple[Strategy, StrategyContext, bool]] = {}

    def register(self, strategy_id: str, strategy: Strategy, broker: str):
        """注册策略"""
        ctx = StrategyContext(broker, self.trading_service, self.market_service)
        strategy.init(ctx)
        self.strategies[strategy_id] = (strategy, ctx, False)

    async def start(self, strategy_id: str):
        """启动策略"""
        if strategy_id not in self.strategies:
            return False
        strategy, ctx, _ = self.strategies[strategy_id]
        self.strategies[strategy_id] = (strategy, ctx, True)
        ctx.log(f"策略 {strategy.name} 已启动")
        return True

    def stop(self, strategy_id: str):
        """停止策略"""
        if strategy_id not in self.strategies:
            return False
        strategy, ctx, _ = self.strategies[strategy_id]
        self.strategies[strategy_id] = (strategy, ctx, False)
        ctx.log(f"策略 {strategy.name} 已停止")
        return True

    async def on_market_data(self, data: TickData):
        """行情数据回调"""
        for strategy_id, (strategy, ctx, running) in self.strategies.items():
            if running and ctx.broker == data.broker:
                try:
                    await strategy.on_tick(data)
                except Exception as e:
                    ctx.log(f"策略执行错误: {e}")

    def get_logs(self, strategy_id: str) -> list[str]:
        """获取策略日志"""
        if strategy_id not in self.strategies:
            return []
        _, ctx, _ = self.strategies[strategy_id]
        return ctx.logs


strategy_engine = StrategyEngine(None, None)
