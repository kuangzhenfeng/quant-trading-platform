from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from app.core.config import settings
from app.api import websocket, market, trading
from app.services.market import market_service
from app.services.trading import trading_service
from app.adapters.okx import OKXAdapter
from app.adapters.guojin import GuojinAdapter
from app.adapters.moomoo import MoomooAdapter


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 注册交易适配器
    okx_adapter = OKXAdapter({})
    guojin_adapter = GuojinAdapter({})
    moomoo_adapter = MoomooAdapter({})

    await okx_adapter.connect()
    await guojin_adapter.connect()
    await moomoo_adapter.connect()

    trading_service.register_adapter("okx", okx_adapter)
    trading_service.register_adapter("guojin", guojin_adapter)
    trading_service.register_adapter("moomoo", moomoo_adapter)

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

@app.get("/health")
async def health_check():
    return {"status": "ok"}
