from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.db_models import DBBrokerAccount
from app.models.schemas import BrokerConfig

class AccountRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, account_id: str) -> BrokerConfig | None:
        result = await self.session.execute(select(DBBrokerAccount).where(DBBrokerAccount.id == account_id))
        db_account = result.scalar_one_or_none()
        if db_account:
            return BrokerConfig(id=db_account.id, broker=db_account.broker, name=db_account.name, config=db_account.config, active=db_account.active)
        return None

    async def create(self, account: BrokerConfig) -> BrokerConfig:
        db_account = DBBrokerAccount(id=account.id, broker=account.broker, name=account.name, config=account.config, active=account.active)
        self.session.add(db_account)
        await self.session.commit()
        return account

    async def get_all(self) -> list[BrokerConfig]:
        result = await self.session.execute(select(DBBrokerAccount))
        db_accounts = result.scalars().all()
        return [BrokerConfig(id=a.id, broker=a.broker, name=a.name, config=a.config, active=a.active) for a in db_accounts]

    async def update(self, account: BrokerConfig) -> BrokerConfig:
        result = await self.session.execute(select(DBBrokerAccount).where(DBBrokerAccount.id == account.id))
        db_account = result.scalar_one_or_none()
        if db_account:
            db_account.broker = account.broker
            db_account.name = account.name
            db_account.config = account.config
            db_account.active = account.active
            await self.session.commit()
        return account

    async def delete(self, account_id: str) -> bool:
        result = await self.session.execute(select(DBBrokerAccount).where(DBBrokerAccount.id == account_id))
        db_account = result.scalar_one_or_none()
        if db_account:
            await self.session.delete(db_account)
            await self.session.commit()
            return True
        return False
