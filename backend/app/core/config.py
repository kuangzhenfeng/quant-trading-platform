from pydantic_settings import BaseSettings
from enum import Enum
from typing import Dict, Any

class TradingMode(str, Enum):
    LIVE = "live"    # 真实盘
    PAPER = "paper"  # 模拟盘
    MOCK = "mock"    # Mock 模式

class Settings(BaseSettings):
    app_name: str = "Quant Trading Platform"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"]

    # 交易模式
    trading_mode: TradingMode = TradingMode.MOCK

    # OKX Live
    okx_live_api_key: str = ""
    okx_live_secret_key: str = ""
    okx_live_passphrase: str = ""

    # OKX Paper
    okx_paper_api_key: str = ""
    okx_paper_secret_key: str = ""
    okx_paper_passphrase: str = ""

    # Moomoo Live
    moomoo_live_host: str = ""
    moomoo_live_port: int = 0

    # Moomoo Paper
    moomoo_paper_host: str = ""
    moomoo_paper_port: int = 0

    # 国金证券 Live
    guojin_live_account_id: str = ""
    guojin_live_password: str = ""

    # 认证配置
    AUTH_ENABLED: bool = False
    AUTH_DEFAULT_USERNAME: str = "admin"
    AUTH_DEFAULT_PASSWORD: str = "admin123"
    AUTH_JWT_SECRET: str = "your-secret-key-change-in-production"
    AUTH_JWT_ALGORITHM: str = "HS256"
    AUTH_ACCESS_TOKEN_EXPIRE_DAYS: int = 7

    class Config:
        env_file = ".env"
        extra = "ignore"  # 忽略额外的环境变量

    def get_broker_config(self, broker: str, mode: TradingMode) -> Dict[str, Any]:
        """获取指定平台和模式的配置"""
        prefix = f"{broker}_{mode.value}_"
        config = {}

        for field_name, field_value in self.model_dump().items():
            if field_name.startswith(prefix):
                key = field_name[len(prefix):]
                config[key] = field_value

        return config

settings = Settings()
