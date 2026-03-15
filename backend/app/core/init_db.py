from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import engine, AsyncSessionLocal
from app.models.db_models import Base, DBUser, DBBrokerAccount
from datetime import datetime
import json
import os

async def init_database():
    """初始化数据库表"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, checkfirst=True)

async def migrate_from_json():
    """从JSON文件迁移数据到数据库（仅在数据库为空时）"""
    async with AsyncSessionLocal() as session:
        # 检查是否已有用户数据
        result = await session.execute(select(DBUser))
        existing_users = result.scalars().first()

        # 只有数据库为空时才迁移用户
        if not existing_users:
            users_file = "users.json"
            if os.path.exists(users_file):
                with open(users_file, "r") as f:
                    users_data = json.load(f)
                    for username, user_info in users_data.items():
                        db_user = DBUser(
                            username=username,
                            hashed_password=user_info["hashed_password"],
                            created_at=datetime.fromisoformat(user_info["created_at"])
                        )
                        session.add(db_user)

        # 检查是否已有账户数据
        result = await session.execute(select(DBBrokerAccount))
        existing_accounts = result.scalars().first()

        # 只有数据库为空时才迁移账户
        if not existing_accounts:
            accounts_file = "accounts.json"
            if os.path.exists(accounts_file):
                with open(accounts_file, "r") as f:
                    accounts_data = json.load(f)
                    for account in accounts_data:
                        db_account = DBBrokerAccount(
                            id=account["id"],
                            broker=account["broker"],
                            name=account["name"],
                            config=account["config"],
                            active=account.get("active", True)
                        )
                        session.add(db_account)

        await session.commit()
