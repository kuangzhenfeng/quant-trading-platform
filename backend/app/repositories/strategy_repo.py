from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.db_models import DBStrategyConfig, DBStrategyLog
from datetime import datetime

class StrategyRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def save_config(self, strategy_id: str, broker: str, symbol: str, params: dict) -> None:
        db_config = DBStrategyConfig(
            strategy_id=strategy_id,
            broker=broker,
            symbol=symbol,
            params=params,
            active=True
        )
        self.session.add(db_config)
        await self.session.commit()

    async def add_log(self, strategy_id: str, level: str, message: str) -> None:
        db_log = DBStrategyLog(
            strategy_id=strategy_id,
            level=level,
            message=message,
            timestamp=datetime.utcnow()
        )
        self.session.add(db_log)
        await self.session.commit()

    async def get_logs(self, strategy_id: str, limit: int = 100) -> list[dict]:
        result = await self.session.execute(
            select(DBStrategyLog)
            .where(DBStrategyLog.strategy_id == strategy_id)
            .order_by(DBStrategyLog.timestamp.desc())
            .limit(limit)
        )
        logs = result.scalars().all()
        return [{"timestamp": log.timestamp, "level": log.level, "message": log.message} for log in logs]
