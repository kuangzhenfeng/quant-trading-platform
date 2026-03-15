"""从环境变量初始化数据"""
from app.core.config import settings
from app.services.user import create_user, _load_users
from app.services.account import account_service
from app.models.schemas import BrokerConfig


def init_users_from_env():
    """从环境变量初始化默认用户"""
    users = _load_users()
    if not users:
        try:
            create_user(settings.AUTH_DEFAULT_USERNAME, settings.AUTH_DEFAULT_PASSWORD)
            print(f"[INIT] 创建默认用户: {settings.AUTH_DEFAULT_USERNAME}")
        except ValueError:
            pass


def init_accounts_from_env():
    """从环境变量初始化账户配置"""
    accounts = account_service.list_accounts()
    if accounts:
        return

    mode = settings.trading_mode.value

    # OKX
    okx_config = settings.get_broker_config("okx", settings.trading_mode)
    if okx_config.get("api_key"):
        account_service.add_account(BrokerConfig(
            id=f"okx_{mode}",
            broker="okx",
            name=f"OKX {mode.upper()}",
            config=okx_config,
            active=True
        ))
        print(f"[INIT] 创建 OKX 账户: {mode}")

    # Moomoo
    moomoo_config = settings.get_broker_config("moomoo", settings.trading_mode)
    if moomoo_config.get("host"):
        account_service.add_account(BrokerConfig(
            id=f"moomoo_{mode}",
            broker="moomoo",
            name=f"Moomoo {mode.upper()}",
            config=moomoo_config,
            active=True
        ))
        print(f"[INIT] 创建 Moomoo 账户: {mode}")

    # 国金证券
    guojin_config = settings.get_broker_config("guojin", settings.trading_mode)
    if guojin_config.get("account_id"):
        account_service.add_account(BrokerConfig(
            id=f"guojin_{mode}",
            broker="guojin",
            name=f"国金证券 {mode.upper()}",
            config=guojin_config,
            active=True
        ))
        print(f"[INIT] 创建国金证券账户: {mode}")


def init_data_from_env():
    """从环境变量初始化所有数据"""
    init_users_from_env()
    init_accounts_from_env()
