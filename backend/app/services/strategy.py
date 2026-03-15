from typing import Dict
import asyncio
from app.strategies.base import Strategy, StrategyContext
from app.models.schemas import TickData
from app.repositories.strategy_repo import StrategyRepository
from app.core.database import AsyncSessionLocal


class StrategyEngine:
    """策略引擎"""
    def __init__(self, trading_service, market_service):
        self.trading_service = trading_service
        self.market_service = market_service
        self.strategies: Dict[str, tuple[Strategy, StrategyContext, bool]] = {}

    async def register(self, strategy_id: str, strategy: Strategy, broker: str, params: dict):
        """注册策略并保存到数据库"""
        ctx = StrategyContext(broker, self.trading_service, self.market_service)
        strategy.init(ctx)
        self.strategies[strategy_id] = (strategy, ctx, False)

        # 保存到数据库
        async with AsyncSessionLocal() as session:
            repo = StrategyRepository(session)
            await repo.save_config(strategy_id, broker, "", params)

    async def start(self, strategy_id: str):
        """启动策略"""
        if strategy_id not in self.strategies:
            return False
        strategy, ctx, _ = self.strategies[strategy_id]
        self.strategies[strategy_id] = (strategy, ctx, True)
        ctx.log(f"策略 {strategy.name} 已启动")

        # 更新数据库状态
        from sqlalchemy import update
        from app.models.db_models import DBStrategyConfig
        async with AsyncSessionLocal() as session:
            await session.execute(
                update(DBStrategyConfig)
                .where(DBStrategyConfig.strategy_id == strategy_id)
                .values(active=True)
            )
            await session.commit()

        from app.services.log import log_service
        from app.models.schemas import LogLevel
        log_service.log(LogLevel.INFO, "strategy", f"策略 {strategy.name} 已启动")

        return True

    async def stop(self, strategy_id: str):
        """停止策略"""
        if strategy_id not in self.strategies:
            return False
        strategy, ctx, _ = self.strategies[strategy_id]
        self.strategies[strategy_id] = (strategy, ctx, False)
        ctx.log(f"策略 {strategy.name} 已停止")

        # 更新数据库状态
        from sqlalchemy import update
        from app.models.db_models import DBStrategyConfig
        async with AsyncSessionLocal() as session:
            await session.execute(
                update(DBStrategyConfig)
                .where(DBStrategyConfig.strategy_id == strategy_id)
                .values(active=False)
            )
            await session.commit()

        return True

    async def on_market_data(self, data: TickData):
        """行情数据回调"""
        for strategy_id, (strategy, ctx, running) in self.strategies.items():
            if running and ctx.broker == data.broker:
                try:
                    await strategy.on_tick(data)
                except Exception as e:
                    ctx.log(f"策略执行错误: {e}")

                    from app.services.log import log_service
                    from app.models.schemas import LogLevel
                    log_service.log(LogLevel.ERROR, "strategy", f"策略 {strategy.name} 执行错误: {e}")

    def get_logs(self, strategy_id: str) -> list[str]:
        """获取策略日志"""
        if strategy_id not in self.strategies:
            return []
        _, ctx, _ = self.strategies[strategy_id]
        return ctx.logs

    async def restore_from_db(self):
        """从数据库恢复策略配置和运行状态"""
        from app.strategies.registry import StrategyRegistry
        from sqlalchemy import select
        from app.models.db_models import DBStrategyConfig

        async with AsyncSessionLocal() as session:
            result = await session.execute(select(DBStrategyConfig))
            configs = result.scalars().all()

            for config in configs:
                try:
                    # 从 strategy_id 解析 strategy_type (格式: {type}_{broker})
                    parts = config.strategy_id.rsplit('_', 1)
                    if len(parts) == 2:
                        strategy_type = parts[0]
                        strategy = StrategyRegistry.create(strategy_type, f"{strategy_type}策略", config.params)
                        ctx = StrategyContext(config.broker, self.trading_service, self.market_service)
                        strategy.init(ctx)
                        # 恢复运行状态
                        running = config.active
                        self.strategies[config.strategy_id] = (strategy, ctx, running)
                        status = "已启动" if running else "已恢复"
                        print(f"[RESTORE] 恢复策略: {config.strategy_id} ({status})")
                except Exception as e:
                    print(f"[ERROR] 恢复策略失败 {config.strategy_id}: {e}")


strategy_engine = StrategyEngine(None, None)
