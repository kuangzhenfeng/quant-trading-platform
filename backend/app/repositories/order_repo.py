from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.db_models import DBOrder
from app.models.schemas import OrderData
from datetime import datetime

class OrderRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, order: OrderData, broker: str) -> None:
        db_order = DBOrder(
            order_id=order.order_id,
            broker=broker,
            symbol=order.symbol,
            side=order.side.value,
            type=order.type.value,
            quantity=order.quantity,
            price=order.price,
            status=order.status.value,
            created_at=datetime.utcnow()
        )
        self.session.add(db_order)
        await self.session.commit()

    async def update(self, order: OrderData, broker: str) -> None:
        result = await self.session.execute(select(DBOrder).where(DBOrder.order_id == order.order_id))
        db_order = result.scalar_one_or_none()
        if db_order:
            db_order.status = order.status.value
            db_order.price = order.price
            db_order.updated_at = datetime.utcnow()
            await self.session.commit()

    async def get_all(self, broker: str | None = None) -> list[OrderData]:
        query = select(DBOrder).order_by(desc(DBOrder.created_at))
        if broker:
            query = query.where(DBOrder.broker == broker)
        result = await self.session.execute(query)
        db_orders = result.scalars().all()
        return [OrderData(
            order_id=o.order_id,
            symbol=o.symbol,
            side=o.side,
            type=o.type,
            quantity=o.quantity,
            price=o.price,
            status=o.status,
            created_at=o.created_at.isoformat() if o.created_at else None,
            broker=o.broker
        ) for o in db_orders]
