from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from app.core.config import settings, TradingMode
from app.api import websocket, market, trading, strategy, monitor, account, logs, backtest
from app.services.market import market_service
from app.services.trading import trading_service
from app.services.strategy import strategy_engine
from app.adapters.factory import AdapterFactory


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 使用工厂方法创建适配器，配置根据模式自动选择
    try:
        okx_adapter = AdapterFactory.create(
            "okx",
            settings.get_broker_config("okx", settings.trading_mode),
            settings.trading_mode
        )
    except NotImplementedError as e:
        print(f"[WARNING] OKX {settings.trading_mode} not supported, using Mock: {e}")
        okx_adapter = AdapterFactory.create("okx", {}, TradingMode.MOCK)

    try:
        guojin_adapter = AdapterFactory.create(
            "guojin",
            settings.get_broker_config("guojin", settings.trading_mode),
            settings.trading_mode
        )
    except NotImplementedError as e:
        print(f"[WARNING] Guojin {settings.trading_mode} not supported, using Mock: {e}")
        guojin_adapter = AdapterFactory.create("guojin", {}, TradingMode.MOCK)

    try:
        moomoo_adapter = AdapterFactory.create(
            "moomoo",
            settings.get_broker_config("moomoo", settings.trading_mode),
            settings.trading_mode
        )
    except NotImplementedError as e:
        print(f"[WARNING] Moomoo {settings.trading_mode} not supported, using Mock: {e}")
        moomoo_adapter = AdapterFactory.create("moomoo", {}, TradingMode.MOCK)

    await okx_adapter.connect()
    await guojin_adapter.connect()
    try:
        await asyncio.wait_for(moomoo_adapter.connect(), timeout=5.0)
    except (asyncio.TimeoutError, Exception) as e:
        print(f"[WARNING] moomoo adapter connection failed: {e}")

    trading_service.register_adapter("okx", okx_adapter)
    trading_service.register_adapter("guojin", guojin_adapter)
    trading_service.register_adapter("moomoo", moomoo_adapter)

    market_service.register_adapter("okx", okx_adapter)
    market_service.register_adapter("guojin", guojin_adapter)
    market_service.register_adapter("moomoo", moomoo_adapter)

    # 初始化策略引擎
    strategy_engine.trading_service = trading_service
    strategy_engine.market_service = market_service
    market_service.strategy_callback = strategy_engine.on_market_data

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
