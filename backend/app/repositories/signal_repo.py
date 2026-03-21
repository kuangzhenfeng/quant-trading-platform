from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.db_models import DBStrategySignal
from datetime import datetime


class SignalRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, strategy_id: str, symbol: str, side: str,
                     price: float, quantity: float, reason: str) -> int:
        signal = DBStrategySignal(
            strategy_id=strategy_id,
            timestamp=datetime.utcnow(),
            symbol=symbol,
            side=side,
            price=price,
            quantity=quantity,
            reason=reason,
            status="pending",
        )
        self.session.add(signal)
        await self.session.commit()
        await self.session.refresh(signal)
        return signal.id

    async def get_by_strategy(self, strategy_id: str, limit: int = 100) -> list:
        result = await self.session.execute(
            select(DBStrategySignal)
            .where(DBStrategySignal.strategy_id == strategy_id)
            .order_by(desc(DBStrategySignal.timestamp))
            .limit(limit)
        )
        return result.scalars().all()

    async def update_status(self, signal_id: int, status: str):
        result = await self.session.execute(
            select(DBStrategySignal).where(DBStrategySignal.id == signal_id)
        )
        signal = result.scalar_one_or_none()
        if signal:
            signal.status = status
            await self.session.commit()

    async def get_recent_signal(self, strategy_id: str, side: str,
                                 minutes: int = 5) -> DBStrategySignal | None:
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(minutes=minutes)
        result = await self.session.execute(
            select(DBStrategySignal)
            .where(
                DBStrategySignal.strategy_id == strategy_id,
                DBStrategySignal.side == side,
                DBStrategySignal.timestamp >= cutoff
            )
            .order_by(desc(DBStrategySignal.timestamp))
            .limit(1)
        )
        return result.scalar_one_or_none()
