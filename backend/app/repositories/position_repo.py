from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models.db_models import DBPosition
from app.models.schemas import PositionData
from datetime import datetime

class PositionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def upsert(self, position: PositionData, broker: str) -> None:
        result = await self.session.execute(
            select(DBPosition).where(
                DBPosition.broker == broker,
                DBPosition.symbol == position.symbol
            )
        )
        db_position = result.scalar_one_or_none()

        if db_position:
            db_position.quantity = position.quantity
            db_position.avg_price = position.avg_price
            db_position.unrealized_pnl = position.unrealized_pnl
            db_position.updated_at = datetime.utcnow()
        else:
            db_position = DBPosition(
                broker=broker,
                symbol=position.symbol,
                quantity=position.quantity,
                avg_price=position.avg_price,
                unrealized_pnl=position.unrealized_pnl
            )
            self.session.add(db_position)

        await self.session.commit()

    async def get_all(self, broker: str | None = None) -> list[PositionData]:
        query = select(DBPosition)
        if broker:
            query = query.where(DBPosition.broker == broker)
        result = await self.session.execute(query)
        db_positions = result.scalars().all()
        return [PositionData(
            symbol=p.symbol,
            quantity=p.quantity,
            avg_price=p.avg_price,
            unrealized_pnl=p.unrealized_pnl
        ) for p in db_positions]

    async def clear(self, broker: str) -> None:
        await self.session.execute(delete(DBPosition).where(DBPosition.broker == broker))
        await self.session.commit()
