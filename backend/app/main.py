from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from app.core.config import settings
from app.api import websocket, market
from app.services.market import market_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
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

@app.get("/health")
async def health_check():
    return {"status": "ok"}
