from typing import Dict
import asyncio
from sqlalchemy import select, update
from app.strategies.base import Strategy, StrategyContext
from app.strategies.registry import StrategyRegistry
from app.models.schemas import TickData
from app.models.db_models import DBStrategyConfig
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
        ctx = StrategyContext(broker, self.trading_service, self.market_service, strategy_id)
        strategy.init(ctx)
        self.strategies[strategy_id] = (strategy, ctx, False)

        # 保存到数据库
        symbol = params.get("symbol", "")
        async with AsyncSessionLocal() as session:
            repo = StrategyRepository(session)
            await repo.save_config(strategy_id, broker, symbol, params)

    async def start(self, strategy_id: str):
        """启动策略"""
        if strategy_id not in self.strategies:
            return False
        strategy, ctx, _ = self.strategies[strategy_id]
        self.strategies[strategy_id] = (strategy, ctx, True)
        ctx.log(f"策略 {strategy.name} 已启动")

        # 订阅策略所需的行情（从 strategy_id 解析 symbol，格式: {type}_{broker}_{symbol}）
        if self.market_service:
            parts = strategy_id.rsplit("_", 2)
            if len(parts) >= 3:
                _, broker, symbol = parts[0], parts[1], parts[2]
                await self.market_service.subscribe_strategy(strategy_id, broker, symbol)

        # 更新数据库状态
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

        # 取消行情订阅
        if self.market_service:
            self.market_service.unsubscribe_strategy(strategy_id)

        # 更新数据库状态
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
                    from app.models.schemas import LogLevel
                    ctx.log(f"策略执行错误: {e}", LogLevel.ERROR)

    def get_logs(self, strategy_id: str) -> list[str]:
        """获取策略日志"""
        if strategy_id not in self.strategies:
            return []
        _, ctx, _ = self.strategies[strategy_id]
        return ctx.logs

    async def get_detail(self, strategy_id: str):
        """获取策略详情"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(DBStrategyConfig)
                .where(DBStrategyConfig.strategy_id == strategy_id)
                .order_by(DBStrategyConfig.id.desc())
            )
            config = result.scalars().first()
            if not config:
                return None

            running = strategy_id in self.strategies and self.strategies[strategy_id][2]
            return {
                "strategy_id": config.strategy_id,
                "broker": config.broker,
                "params": config.params,
                "running": running
            }

    async def update_params(self, strategy_id: str, params: dict):
        """更新策略参数"""
        if strategy_id not in self.strategies:
            return False

        # 更新数据库
        async with AsyncSessionLocal() as session:
            await session.execute(
                update(DBStrategyConfig)
                .where(DBStrategyConfig.strategy_id == strategy_id)
                .values(params=params)
            )
            await session.commit()

        # 重新创建策略实例
        strategy, ctx, running = self.strategies[strategy_id]
        parts = strategy_id.rsplit('_', 2)
        if len(parts) >= 2:
            strategy_type = parts[0]
            new_strategy = StrategyRegistry.create(strategy_type, f"{strategy_type}策略", params)
            new_strategy.init(ctx)
            self.strategies[strategy_id] = (new_strategy, ctx, running)

        return True

    async def restore_from_db(self):
        """从数据库恢复策略配置和运行状态"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(DBStrategyConfig))
            configs = result.scalars().all()

            for config in configs:
                try:
                    # 从 strategy_id 解析 strategy_type (格式: {type}_{broker}_{symbol})
                    parts = config.strategy_id.rsplit('_', 2)
                    if len(parts) >= 2:
                        strategy_type = parts[0]
                        strategy = StrategyRegistry.create(strategy_type, f"{strategy_type}策略", config.params)
                        ctx = StrategyContext(config.broker, self.trading_service, self.market_service, config.strategy_id)
                        strategy.init(ctx)
                        # 恢复运行状态
                        running = config.active
                        self.strategies[config.strategy_id] = (strategy, ctx, running)
                        # 如果策略是激活状态，恢复行情订阅
                        if running and self.market_service and config.params.get("symbol"):
                            await self.market_service.subscribe_strategy(config.strategy_id, config.broker, config.params["symbol"])
                        status = "已启动" if running else "已恢复"
                        print(f"[RESTORE] 恢复策略: {config.strategy_id} ({status})")
                except Exception as e:
                    print(f"[ERROR] 恢复策略失败 {config.strategy_id}: {e}")


strategy_engine = StrategyEngine(None, None)
