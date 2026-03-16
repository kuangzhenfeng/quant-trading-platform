from typing import List, Dict, Any
from app.models.schemas import BrokerConfig
from app.repositories.account_repo import AccountRepository
from app.core.database import AsyncSessionLocal
import uuid


class AccountService:
    """账户管理服务"""

    async def add_account(self, config: BrokerConfig) -> bool:
        """添加账户 - 如果新账户启用，自动停用同平台同模式的其他账户"""
        async with AsyncSessionLocal() as session:
            repo = AccountRepository(session)

            # 如果新账户要启用，先停用同平台同模式的其他账户
            if config.active:
                is_paper_value = config.config.get('is_paper')
                is_paper = is_paper_value == 'true' or is_paper_value is True
                all_accounts = await repo.get_all()
                for acc in all_accounts:
                    acc_is_paper_value = acc.config.get('is_paper')
                    acc_is_paper = acc_is_paper_value == 'true' or acc_is_paper_value is True
                    if (acc.broker == config.broker and
                        acc.active and
                        acc_is_paper == is_paper):
                        acc.active = False
                        await repo.update(acc)

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
        """设置账户激活状态 - 同一平台同一模式只能有一个激活账号"""
        async with AsyncSessionLocal() as session:
            repo = AccountRepository(session)
            account = await repo.get_by_id(account_id)
            if not account:
                return False

            # 如果要激活账号，先停用同平台同模式的其他账号
            if active:
                is_paper_value = account.config.get('is_paper')
                is_paper = is_paper_value == 'true' or is_paper_value is True
                all_accounts = await repo.get_all()
                for acc in all_accounts:
                    acc_is_paper_value = acc.config.get('is_paper')
                    acc_is_paper = acc_is_paper_value == 'true' or acc_is_paper_value is True
                    if (acc.broker == account.broker and
                        acc.id != account_id and
                        acc.active and
                        acc_is_paper == is_paper):
                        acc.active = False
                        await repo.update(acc)

            account.active = active
            await repo.update(account)
            return True

    async def batch_import(self, accounts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """批量导入账户 - 自动生成ID和设置默认active状态"""
        async with AsyncSessionLocal() as session:
            repo = AccountRepository(session)
            success_count = 0
            failed = []

            for acc_data in accounts:
                try:
                    config = BrokerConfig(
                        id=f"{acc_data['broker']}_{uuid.uuid4().hex[:8]}",
                        broker=acc_data['broker'],
                        name=acc_data['name'],
                        config=acc_data['config'],
                        active=False
                    )
                    await repo.create(config)
                    success_count += 1
                except Exception as e:
                    failed.append({"name": acc_data.get('name', 'unknown'), "error": str(e)})

            return {"success": success_count, "failed": failed, "total": len(accounts)}


account_service = AccountService()
