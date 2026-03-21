from pydantic_settings import BaseSettings
from enum import Enum
from typing import Dict, Any

class TradingMode(str, Enum):
    LIVE = "live"    # 真实盘
    PAPER = "paper"  # 模拟盘
    MOCK = "mock"    # Mock 模式

class Broker(str, Enum):
    OKX = "okx"
    MOOMOO = "moomoo"
    GUOJIN = "guojin"

class Settings(BaseSettings):
    app_name: str = "Quant Trading Platform"
    api_host: str = "0.0.0.0"
    api_port: int = 9000
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"]

    # 交易模式
    trading_mode: TradingMode = TradingMode.MOCK

    # 当前券商
    current_broker: Broker = Broker.OKX

    # 数据库配置
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/quant_trading"

    # 账号批量导入文件路径（可选），启动时自动读取并导入，按 broker+name 去重
    ACCOUNTS_IMPORT_FILE: str | None = None

    # 认证配置
    AUTH_ENABLED: bool = False
    AUTH_JWT_SECRET: str = "your-secret-key-change-in-production"
    AUTH_JWT_ALGORITHM: str = "HS256"
    AUTH_ACCESS_TOKEN_EXPIRE_DAYS: int = 7

    class Config:
        env_file = ".env"
        extra = "ignore"  # 忽略额外的环境变量


    async def load_from_db(self):
        """从数据库加载配置"""
        from sqlalchemy import select
        from app.core.database import AsyncSessionLocal
        from app.models.db_models import DBSystemConfig

        async with AsyncSessionLocal() as session:
            result = await session.execute(select(DBSystemConfig))
            configs = result.scalars().all()

            for config in configs:
                key_lower = config.key.lower()
                if hasattr(self, key_lower) and config.value:
                    # 处理枚举类型
                    field_type = type(getattr(self, key_lower))
                    if field_type == TradingMode:
                        setattr(self, key_lower, TradingMode(config.value))
                    elif field_type == Broker:
                        setattr(self, key_lower, Broker(config.value))
                    else:
                        setattr(self, key_lower, config.value)

settings = Settings()
