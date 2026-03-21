"""系统管理 API"""
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.models.db_models import DBSystemConfig
from app.api.auth import get_current_user_dep
from app.core.database import get_db
from app.core.config import settings
from app.services.log import log_service
from app.models.schemas import LogLevel
from pydantic import BaseModel

router = APIRouter(prefix="/api/system", tags=["system"])

async def reload_adapters():
    """重新加载所有 adapter"""
    from app.services.trading import trading_service
    from app.services.market import market_service
    from app.services.account import account_service
    from app.services.strategy import strategy_engine
    from app.adapters.factory import AdapterFactory
    from app.core.config import TradingMode

    log_service.log(LogLevel.INFO, "system", "开始重新加载所有 adapter...")

    # 1. 停止所有运行中的策略
    for strategy_id in list(strategy_engine.strategies.keys()):
        try:
            await strategy_engine.stop(strategy_id)
        except:
            pass

    # 2. 断开并清空现有 adapter
    for adapter in trading_service.adapters.values():
        try:
            await adapter.disconnect()
        except:
            pass
    trading_service.adapters.clear()
    market_service.adapters.clear()

    # 3. 重新加载活跃账户
    if settings.trading_mode == TradingMode.MOCK:
        # MOCK模式：为所有已启用的broker创建MockAdapter
        accounts = await account_service.list_accounts()
        loaded_brokers = set()
        for account in accounts:
            if account.active and account.broker not in loaded_brokers:
                try:
                    adapter = AdapterFactory.create(account.broker, {}, TradingMode.MOCK)
                    await adapter.connect()
                    trading_service.register_adapter(account.broker, adapter)
                    market_service.register_adapter(account.broker, adapter)
                    loaded_brokers.add(account.broker)
                except Exception as e:
                    log_service.log(LogLevel.WARNING, "system", f"创建MockAdapter失败 {account.broker}: {e}")
    else:
        # PAPER/LIVE模式：加载匹配的真实账户
        accounts = await account_service.list_accounts()
        for account in accounts:
            if account.active:
                try:
                    is_paper_value = account.config.get('is_paper')
                    is_paper = is_paper_value == 'true' or is_paper_value is True
                    mode = TradingMode.PAPER if is_paper else TradingMode.LIVE

                    if settings.trading_mode == TradingMode.PAPER and not is_paper:
                        continue
                    if settings.trading_mode == TradingMode.LIVE and is_paper:
                        continue

                    adapter = AdapterFactory.create(account.broker, account.config, mode)
                    await adapter.connect()
                    trading_service.register_adapter(account.broker, adapter)
                    market_service.register_adapter(account.broker, adapter)
                except Exception as e:
                    log_service.log(LogLevel.WARNING, "system", f"重新加载账户失败 {account.name}: {e}")

    # 4. 重新初始化策略引擎（重新创建策略上下文）
    await strategy_engine.restore_from_db()

    log_service.log(LogLevel.INFO, "system", f"Adapter 重新加载完成，共加载 {len(trading_service.adapters)} 个券商")

class InitStatusResponse(BaseModel):
    has_admin: bool
    has_broker_config: bool

class ConfigItem(BaseModel):
    key: str
    value: str | None
    category: str
    is_sensitive: bool

class ConfigUpdateRequest(BaseModel):
    configs: list[ConfigItem]


def restart_server():
    """重启服务器 - 触摸主文件触发 uvicorn 热重载"""
    main_file = Path(__file__).parent.parent / "main.py"
    main_file.touch()


@router.post("/restart")
async def restart_service(
    background_tasks: BackgroundTasks,
    _: User = Depends(get_current_user_dep)
):
    """重启后端服务"""
    log_service.log(LogLevel.INFO, "system", "系统重启请求已提交")
    background_tasks.add_task(restart_server)
    return {"message": "服务正在重启..."}

@router.get("/init-status")
async def get_init_status(db: AsyncSession = Depends(get_db)):
    """获取系统初始化状态（无需认证）"""
    from app.repositories.user_repo import UserRepository
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        repo = UserRepository(session)
        users = await repo.get_all()
        has_admin = len(users) > 0

    result = await db.execute(select(DBSystemConfig))
    configs = result.scalars().all()
    has_broker_config = any(c.value for c in configs if c.category in ['okx', 'moomoo', 'guojin'])

    return InitStatusResponse(has_admin=has_admin, has_broker_config=has_broker_config)

@router.get("/config")
async def get_config(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user_dep)
):
    """获取所有系统配置"""
    result = await db.execute(select(DBSystemConfig))
    configs = result.scalars().all()
    return {"configs": [
        {
            "key": c.key,
            "value": c.value,
            "category": c.category,
            "is_sensitive": c.is_sensitive
        } for c in configs
    ]}

@router.put("/config")
async def update_config(
    request: ConfigUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user_dep)
):
    """批量更新系统配置"""
    # 检查是否在切换交易模式
    for item in request.configs:
        if item.key == "TRADING_MODE" and item.value in ["live", "paper"]:
            from app.services.account import account_service
            accounts = await account_service.list_accounts()

            # 判断需要的账号类型
            need_paper = (item.value == "paper")

            # 检查是否有对应模式的激活账号
            def check_is_paper(config_value):
                if need_paper:
                    return config_value == 'true' or config_value is True
                else:
                    return config_value == 'false' or config_value is False or config_value is None

            has_valid_account = any(
                acc.active and check_is_paper(acc.config.get('is_paper'))
                for acc in accounts
            )

            if not has_valid_account:
                mode_name = "模拟盘" if need_paper else "实盘"
                raise HTTPException(
                    status_code=400,
                    detail=f"切换到{mode_name}模式失败：未找到已启用的{mode_name}账号"
                )

    for item in request.configs:
        result = await db.execute(
            select(DBSystemConfig).where(DBSystemConfig.key == item.key)
        )
        config = result.scalar_one_or_none()

        if config:
            config.value = item.value
        else:
            config = DBSystemConfig(
                key=item.key,
                value=item.value,
                category=item.category,
                is_sensitive=item.is_sensitive
            )
            db.add(config)

    await db.commit()

    # 重新加载配置到内存
    from app.core.config import settings
    await settings.load_from_db()

    # 如果切换了交易模式，重新加载 adapter
    mode_switched = any(item.key == "TRADING_MODE" for item in request.configs)
    if mode_switched:
        new_mode = next(item.value for item in request.configs if item.key == "TRADING_MODE")
        log_service.log(LogLevel.INFO, "system", f"交易模式切换为: {new_mode}")
        await reload_adapters()

    updated_keys = [item.key for item in request.configs]
    log_service.log(LogLevel.INFO, "system", f"系统配置更新: {updated_keys}")
    return {"message": "配置更新成功"}

@router.get("/adapters")
async def get_adapters_status(_: User = Depends(get_current_user_dep)):
    """获取当前加载的adapter状态"""
    from app.services.trading import trading_service
    return {
        "adapters": list(trading_service.adapters.keys()),
        "trading_mode": settings.trading_mode.value
    }

@router.post("/reset")
async def reset_system(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user_dep)
):
    """重置系统（清空所有数据）"""
    from sqlalchemy import text
    log_service.log(LogLevel.WARNING, "system", "系统重置开始...")
    await db.execute(text("DELETE FROM strategy_logs"))
    await db.execute(text("DELETE FROM strategy_configs"))
    await db.execute(text("DELETE FROM positions"))
    await db.execute(text("DELETE FROM orders"))
    await db.execute(text("DELETE FROM broker_accounts"))
    await db.execute(text("DELETE FROM system_logs"))
    await db.execute(text("DELETE FROM system_config"))
    await db.execute(text("DELETE FROM users"))
    await db.commit()

    # 重新初始化默认配置
    from app.core.init_data import init_system_config, import_accounts_from_file
    await init_system_config(force=True)

    # 自动导入 accounts_import.json 中的账户
    await import_accounts_from_file()

    log_service.log(LogLevel.INFO, "system", "系统重置完成，所有数据已清空")
    return {"message": "系统已重置"}
