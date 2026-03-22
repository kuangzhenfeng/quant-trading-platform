from typing import List, Dict, Any
from app.models.schemas import BrokerConfig, LogLevel
from app.repositories.account_repo import AccountRepository
from app.core.database import AsyncSessionLocal
from app.services.log import log_service
import uuid


def _is_paper(config: dict) -> bool:
    """解析 is_paper 配置字段"""
    val = config.get('is_paper')
    return val == 'true' or val is True


async def _deactivate_other_accounts(repo: AccountRepository, broker: str, exclude_id: str | None, is_paper: bool):
    """停用同平台同模式的其他账户"""
    all_accounts = await repo.get_all()
    for acc in all_accounts:
        if (acc.broker == broker and
                acc.id != exclude_id and
                acc.active and
                _is_paper(acc.config) == is_paper):
            acc.active = False
            await repo.update(acc)


class AccountService:
    """账户管理服务"""

    async def add_account(self, config: BrokerConfig) -> bool:
        """添加账户 - 如果新账户启用，自动停用同平台同模式的其他账户"""
        async with AsyncSessionLocal() as session:
            repo = AccountRepository(session)

            # 如果新账户要启用，先停用同平台同模式的其他账户
            if config.active:
                await _deactivate_other_accounts(repo, config.broker, None, _is_paper(config.config))

            await repo.create(config)
            log_service.log(LogLevel.INFO, "account", f"添加账户成功: {config.broker} - {config.name} (ID: {config.id})")
            return True

    async def remove_account(self, account_id: str) -> bool:
        """删除账户"""
        async with AsyncSessionLocal() as session:
            repo = AccountRepository(session)
            success = await repo.delete(account_id)
            if success:
                log_service.log(LogLevel.INFO, "account", f"删除账户成功: {account_id}")
            else:
                log_service.log(LogLevel.WARNING, "account", f"删除账户失败: {account_id} 不存在")
            return success

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
                log_service.log(LogLevel.WARNING, "account", f"激活账户失败: {account_id} 不存在")
                return False

            # 如果要激活账号，先停用同平台同模式的其他账号
            if active:
                await _deactivate_other_accounts(repo, account.broker, account_id, _is_paper(account.config))

            account.active = active
            await repo.update(account)
            status = "激活" if active else "停用"
            log_service.log(LogLevel.INFO, "account", f"账户{status}: {account.broker} - {account.name} (ID: {account_id})")
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
                    log_service.log(LogLevel.ERROR, "account", f"批量导入账户失败: {acc_data.get('name', 'unknown')}, 错误: {e}")

            log_service.log(LogLevel.INFO, "account", f"批量导入完成: 成功 {success_count}, 失败 {len(failed)}")
            return {"success": success_count, "failed": failed, "total": len(accounts)}


account_service = AccountService()
