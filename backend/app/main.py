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
from app.api import websocket, market, trading, strategy, monitor, account, logs, backtest, auth, users, system, about
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


from app.models.schemas import ErrorResponse


def build_error_response(
    error_code: str,
    message: str,
    path: str,
    detail: str | None = None,
) -> dict:
    """构建统一错误响应"""
    from datetime import datetime, timezone
    return ErrorResponse(
        error_code=error_code,
        message=message,
        detail=detail if settings.DEBUG else None,
        path=path,
        timestamp=datetime.now(timezone.utc).isoformat(),
    ).model_dump()


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理器，提供结构化的错误信息"""
    from app.services.log import log_service
    from app.models.schemas import LogLevel
    from app.adapters.exceptions import BrokerAPIError, BrokerConnectionError

    path = str(request.url.path)
    exc_type = type(exc).__name__
    trace = traceback.format_exc()

    # 根据异常类型生成友好的错误码和消息
    if isinstance(exc, BrokerAPIError):
        error_code = "BROKER_API_ERROR"
        message = str(exc) or "券商API业务错误"
        log_service.log(LogLevel.ERROR, "system", f"[{error_code}] {path} - {exc}\n{trace}")
    elif isinstance(exc, BrokerConnectionError):
        error_code = "BROKER_CONNECTION_ERROR"
        message = f"券商连接失败，请检查网络或配置"
        log_service.log(LogLevel.ERROR, "system", f"[{error_code}] {path} - {exc}\n{trace}")
    elif isinstance(exc, ValueError):
        error_code = "VALIDATION_ERROR"
        message = f"参数错误: {str(exc)}"
        log_service.log(LogLevel.WARNING, "system", f"[{error_code}] {path} - {exc}\n{trace}")
    elif isinstance(exc, FileNotFoundError):
        error_code = "FILE_NOT_FOUND"
        message = f"文件未找到: {str(exc)}"
        log_service.log(LogLevel.WARNING, "system", f"[{error_code}] {path} - {exc}\n{trace}")
    elif isinstance(exc, TimeoutError):
        error_code = "TIMEOUT_ERROR"
        message = "请求超时，请稍后重试"
        log_service.log(LogLevel.ERROR, "system", f"[{error_code}] {path} - {exc}\n{trace}")
    else:
        error_code = "INTERNAL_ERROR"
        message = f"服务器内部错误 [{exc_type}]，请联系管理员"
        log_service.log(LogLevel.ERROR, "system", f"[{error_code}] {path} - {exc_type}: {exc}\n{trace}")

    return JSONResponse(
        status_code=500,
        content=build_error_response(error_code, message, path, trace),
    )


from fastapi import HTTPException
from fastapi.exceptions import RequestValidationError


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP 异常处理器，统一错误格式"""
    status_map = {
        400: ("BAD_REQUEST", "请求错误"),
        401: ("UNAUTHORIZED", "未授权，请先登录"),
        403: ("FORBIDDEN", "权限不足"),
        404: ("NOT_FOUND", "资源不存在"),
        405: ("METHOD_NOT_ALLOWED", "不支持的请求方法"),
        422: ("VALIDATION_ERROR", "请求参数校验失败"),
        429: ("RATE_LIMIT", "请求过于频繁，请稍后重试"),
        501: ("NOT_IMPLEMENTED", "功能暂未实现"),
    }
    error_code, default_msg = status_map.get(exc.status_code, ("HTTP_ERROR", "请求处理失败"))
    # 优先使用 exc.detail（具体业务错误信息），其次才是默认消息
    error_message = str(exc.detail) if exc.detail else default_msg
    return JSONResponse(
        status_code=exc.status_code,
        content=build_error_response(
            error_code=error_code,
            message=error_message,
            path=str(request.url.path),
            # HTTP 异常的 detail 即为错误信息，无需额外 detail
        ),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """请求参数校验异常"""
    errors = exc.errors()
    messages = []
    for err in errors:
        loc = " → ".join(str(l) for l in err["loc"])
        messages.append(f"{loc}: {err['msg']}")
    return JSONResponse(
        status_code=422,
        content=build_error_response(
            "VALIDATION_ERROR",
            "请求参数格式错误",
            str(request.url.path),
            "\n".join(messages),
        ),
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
app.include_router(about.router)

@app.get("/health")
async def health_check():
    return {"status": "ok"}
