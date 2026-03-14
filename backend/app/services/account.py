from typing import Dict, List
from app.models.schemas import BrokerConfig
import json
import os


class AccountService:
    """账户管理服务"""

    def __init__(self):
        self.accounts: Dict[str, BrokerConfig] = {}
        self.config_file = "accounts.json"
        self.load_accounts()

    def load_accounts(self):
        """加载账户配置"""
        if os.path.exists(self.config_file):
            with open(self.config_file, 'r') as f:
                data = json.load(f)
                for item in data:
                    config = BrokerConfig(**item)
                    self.accounts[config.id] = config

    def save_accounts(self):
        """保存账户配置"""
        data = [acc.model_dump() for acc in self.accounts.values()]
        with open(self.config_file, 'w') as f:
            json.dump(data, f, indent=2)

    def add_account(self, config: BrokerConfig) -> bool:
        """添加账户"""
        self.accounts[config.id] = config
        self.save_accounts()
        return True

    def remove_account(self, account_id: str) -> bool:
        """删除账户"""
        if account_id in self.accounts:
            del self.accounts[account_id]
            self.save_accounts()
            return True
        return False

    def get_account(self, account_id: str) -> BrokerConfig | None:
        """获取账户"""
        return self.accounts.get(account_id)

    def list_accounts(self) -> List[BrokerConfig]:
        """列出所有账户"""
        return list(self.accounts.values())

    def set_active(self, account_id: str, active: bool) -> bool:
        """设置账户激活状态"""
        if account_id in self.accounts:
            self.accounts[account_id].active = active
            self.save_accounts()
            return True
        return False


account_service = AccountService()
