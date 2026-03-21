from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from typing import Any
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


async def update_all_performance_snapshots():
    """定时更新所有活跃策略的绩效快照，每60秒执行一次"""
    from app.services.strategy_performance import performance_service
    while True:
        try:
            strategy_ids = list(strategy_engine.strategies.keys())
            for sid in strategy_ids:
                await performance_service.update_snapshot(sid)
            print(f"[SNAPSHOT] Updated {len(strategy_ids)} strategy snapshots")
        except Exception as e:
            print(f"[SNAPSHOT] Error: {e}")
        await asyncio.sleep(60)


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
        async def connect_mock(broker_name: str):
            adapter = AdapterFactory.create(broker_name, {}, TradingMode.MOCK)
            await adapter.connect()
            trading_service.register_adapter(broker_name, adapter)
            market_service.register_adapter(broker_name, adapter)
            log_service.log(LogLevel.INFO, "system", f"MOCK 模式已注册 adapter: {broker_name}")

        await asyncio.gather(*[connect_mock(b) for b in ["okx", "guojin", "moomoo"]])
    else:
        async def connect_account(acc: Any) -> tuple[str, str] | None:
            try:
                is_paper_value = acc.config.get('is_paper')
                is_paper = is_paper_value == 'true' or is_paper_value is True
                if settings.trading_mode == TradingMode.PAPER and not is_paper:
                    return None
                if settings.trading_mode == TradingMode.LIVE and is_paper:
                    return None
                mode = TradingMode.PAPER if is_paper else TradingMode.LIVE
                adapter = AdapterFactory.create(acc.broker, acc.config, mode)
                await adapter.connect()
                trading_service.register_adapter(acc.broker, adapter)
                market_service.register_adapter(acc.broker, adapter)
                log_service.log(LogLevel.INFO, "system", f"已加载账户: {acc.name} ({acc.broker}) - {'模拟盘' if is_paper else '实盘'}")
                return acc.broker, acc.name
            except Exception as e:
                log_service.log(LogLevel.WARNING, "system", f"加载账户失败 {acc.name}: {e}")
                return None

        await asyncio.gather(*[connect_account(a) for a in accounts if a.active])

    # 初始化策略引擎
    strategy_engine.trading_service = trading_service
    strategy_engine.market_service = market_service
    market_service.strategy_callback = strategy_engine.on_market_data

    # 从数据库恢复策略配置
    await strategy_engine.restore_from_db()

    _snapshot_task = asyncio.create_task(update_all_performance_snapshots())
    _push_task = asyncio.create_task(market_service.start_push())
    yield
    market_service.stop_push()
    _push_task.cancel()
    _snapshot_task.cancel()


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

    log_service.log(LogLevel.ERROR, "system", f"未捕获异常: {request.url.path} - {exc}\n{traceback.format_exc()}")

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
