from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import asyncio
import traceback
from app.core.config import settings, TradingMode
from app.core.init_data import init_data_from_env
from app.core.init_db import init_database, migrate_from_json
from app.api import websocket, market, trading, strategy, monitor, account, logs, backtest, auth, users, system
from app.services.market import market_service
from app.services.trading import trading_service
from app.services.strategy import strategy_engine
from app.adapters.factory import AdapterFactory
from app.middleware.auth_middleware import AuthMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    from app.services.log import log_service
    from app.models.schemas import LogLevel

    # 初始化数据库
    await init_database()
    await migrate_from_json()

    # 从数据库加载配置
    await settings.load_from_db()
    log_service.log(LogLevel.INFO, "system", f"系统启动 - 交易模式: {settings.trading_mode.value}")

    # 从环境变量初始化数据
    await init_data_from_env()

    # 从数据库加载活跃账户并创建 adapter
    from app.services.account import account_service
    accounts = await account_service.list_accounts()

    if settings.trading_mode == TradingMode.MOCK:
        # MOCK 模式：为所有支持的 broker 自动注册 MockAdapter，无需数据库账户配置
        for broker_name in ["okx", "guojin", "moomoo"]:
            adapter = AdapterFactory.create(broker_name, {}, TradingMode.MOCK)
            await adapter.connect()
            trading_service.register_adapter(broker_name, adapter)
            market_service.register_adapter(broker_name, adapter)
            print(f"[INIT] MOCK 模式已注册 adapter: {broker_name}")
    else:
        for account in accounts:
            if account.active:
                try:
                    # 根据账户配置的 is_paper 字段决定使用实盘还是模拟盘适配器
                    is_paper_value = account.config.get('is_paper')
                    is_paper = is_paper_value == 'true' or is_paper_value is True
                    mode = TradingMode.PAPER if is_paper else TradingMode.LIVE

                    # 只加载与当前交易模式匹配的账户
                    if settings.trading_mode == TradingMode.PAPER and not is_paper:
                        continue  # PAPER 模式只加载模拟盘账户
                    if settings.trading_mode == TradingMode.LIVE and is_paper:
                        continue  # LIVE 模式只加载实盘账户

                    adapter = AdapterFactory.create(
                        account.broker,
                        account.config,
                        mode
                    )
                    await adapter.connect()
                    trading_service.register_adapter(account.broker, adapter)
                    market_service.register_adapter(account.broker, adapter)
                    mode_name = "模拟盘" if is_paper else "实盘"
                    print(f"[INIT] 已加载账户: {account.name} ({account.broker}) - {mode_name}")
                except Exception as e:
                    print(f"[WARNING] 加载账户失败 {account.name}: {e}")

    # 初始化策略引擎
    strategy_engine.trading_service = trading_service
    strategy_engine.market_service = market_service
    market_service.strategy_callback = strategy_engine.on_market_data

    # 从数据库恢复策略配置
    await strategy_engine.restore_from_db()

    task = asyncio.create_task(market_service.start_push())
    yield
    market_service.stop_push()
    task.cancel()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(AuthMiddleware)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理器，确保 500 错误也带正确的 CORS 头"""
    from app.services.log import log_service
    from app.models.schemas import LogLevel

    print(f"[ERROR] 未捕获异常: {request.url.path} - {exc}")
    traceback.print_exc()
    log_service.log(LogLevel.ERROR, "system", f"{request.url.path}: {str(exc)}")

    return JSONResponse(
        status_code=500,
        content={"detail": "内部服务器错误"},
    )

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(system.router)
app.include_router(websocket.router)
app.include_router(market.router)
app.include_router(trading.router)
app.include_router(strategy.router)
app.include_router(monitor.router)
app.include_router(account.router)
app.include_router(logs.router)
app.include_router(backtest.router)

@app.get("/health")
async def health_check():
    return {"status": "ok"}
