from typing import List
from app.models.schemas import BrokerConfig
from app.repositories.account_repo import AccountRepository
from app.core.database import AsyncSessionLocal


class AccountService:
    """账户管理服务"""

    async def add_account(self, config: BrokerConfig) -> bool:
        """添加账户"""
        async with AsyncSessionLocal() as session:
            repo = AccountRepository(session)
            await repo.create(config)
            return True

    async def remove_account(self, account_id: str) -> bool:
        """删除账户"""
        async with AsyncSessionLocal() as session:
            repo = AccountRepository(session)
            return await repo.delete(account_id)

    async def get_account(self, account_id: str) -> BrokerConfig | None:
        """获取账户"""
        async with AsyncSessionLocal() as session:
            repo = AccountRepository(session)
            return await repo.get_by_id(account_id)

    async def list_accounts(self) -> List[BrokerConfig]:
        """列出所有账户"""
        async with AsyncSessionLocal() as session:
            repo = AccountRepository(session)
            return await repo.get_all()

    async def set_active(self, account_id: str, active: bool) -> bool:
        """设置账户激活状态"""
        async with AsyncSessionLocal() as session:
            repo = AccountRepository(session)
            account = await repo.get_by_id(account_id)
            if account:
                account.active = active
                await repo.update(account)
                return True
            return False


account_service = AccountService()
