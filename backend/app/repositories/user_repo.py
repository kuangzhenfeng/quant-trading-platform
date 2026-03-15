from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.db_models import DBUser
from app.models.user import User
from datetime import datetime

class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_username(self, username: str) -> User | None:
        result = await self.session.execute(select(DBUser).where(DBUser.username == username))
        db_user = result.scalar_one_or_none()
        if db_user:
            return User(username=db_user.username, hashed_password=db_user.hashed_password, created_at=db_user.created_at)
        return None

    async def create(self, username: str, hashed_password: str) -> User:
        db_user = DBUser(username=username, hashed_password=hashed_password, created_at=datetime.utcnow())
        self.session.add(db_user)
        await self.session.commit()
        return User(username=db_user.username, hashed_password=db_user.hashed_password, created_at=db_user.created_at)

    async def get_all(self) -> list[User]:
        result = await self.session.execute(select(DBUser))
        db_users = result.scalars().all()
        return [User(username=u.username, hashed_password=u.hashed_password, created_at=u.created_at) for u in db_users]

    async def delete(self, username: str) -> bool:
        result = await self.session.execute(select(DBUser).where(DBUser.username == username))
        db_user = result.scalar_one_or_none()
        if db_user:
            await self.session.delete(db_user)
            await self.session.commit()
            return True
        return False
