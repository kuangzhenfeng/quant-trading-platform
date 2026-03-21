from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.trading import trading_service, get_monitor_service
from app.models.schemas import OrderSide, OrderType, LogLevel
from app.services.log import log_service
from app.core.config import settings
from app.adapters.exceptions import BrokerAPIError

router = APIRouter(prefix="/api/trading", tags=["trading"])

_MODE_DESCRIPTIONS = {
    "live": "真实盘 - 真实交易",
    "paper": "模拟盘 - 真实行情，模拟订单",
    "mock": "Mock 模式 - 完全模拟",
}


class PlaceOrderRequest(BaseModel):
    broker: str
    symbol: str
    side: OrderSide
    type: OrderType
    quantity: float
    price: float | None = None


@router.get("/mode")
async def get_trading_mode():
    """获取当前交易模式"""
    return {
        "mode": settings.trading_mode.value,
        "description": _MODE_DESCRIPTIONS[settings.trading_mode.value]
    }


@router.post("/order")
async def place_order(req: PlaceOrderRequest):
    """下单"""
    try:
        success, result = await trading_service.place_order(
            req.broker, req.symbol, req.side, req.type, req.quantity, req.price
        )
        if not success:
            raise HTTPException(status_code=400, detail=result)
        return {"order_id": result}
    except BrokerAPIError as e:
        # 券商API业务错误（如金额不足），返回400
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        log_service.log(LogLevel.ERROR, "trading", f"place_order failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/order/{broker}/{order_id}")
async def cancel_order(broker: str, order_id: str):
    """撤单"""
    success = await trading_service.cancel_order(broker, order_id)
    if not success:
        log_service.log(LogLevel.WARNING, "trading", f"撤单失败: {broker} {order_id}")
        raise HTTPException(status_code=400, detail="撤单失败")
    log_service.log(LogLevel.INFO, "trading", f"撤单成功: {broker} {order_id}")
    return {"success": True}


@router.get("/order/{broker}/{order_id}")
async def get_order(broker: str, order_id: str, symbol: str | None = None):
    """查询订单"""
    try:
        order = await trading_service.get_order(broker, order_id, symbol)
        if not order:
            log_service.log(LogLevel.WARNING, "trading", f"订单不存在: {broker} {order_id}")
            raise HTTPException(status_code=404, detail="订单不存在")
        return order
    except ValueError as e:
        log_service.log(LogLevel.ERROR, "trading", f"查询订单失败: {broker} {order_id}, {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/positions/{broker}")
async def get_positions(broker: str):
    """获取持仓"""
    try:
        positions = await trading_service.get_positions(broker)
        await get_monitor_service().update_positions(broker, positions)
        return {"positions": positions}
    except Exception as e:
        log_service.log(LogLevel.WARNING, "trading", f"获取持仓失败: {broker}, {e}")
        return {"positions": []}


@router.get("/account/{broker}")
async def get_account(broker: str):
    """获取账户信息"""
    try:
        account = await trading_service.get_account(broker)
        if not account:
            # adapter 未初始化时返回默认账户数据，避免前端 404 导致轮询停止
            return {"broker": broker, "balance": 0, "available": 0, "frozen": 0}
        return account
    except Exception as e:
        log_service.log(LogLevel.WARNING, "trading", f"获取账户信息失败: {broker}, {e}")
        return {"broker": broker, "balance": 0, "available": 0, "frozen": 0}


@router.get("/orders/{broker}")
async def get_orders(broker: str):
    """获取订单历史"""
    from app.services.monitor import monitor_service
    orders = await monitor_service.get_orders(broker)
    return {"orders": orders}
