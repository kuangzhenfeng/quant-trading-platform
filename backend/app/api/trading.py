from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.trading import trading_service, get_monitor_service
from app.models.schemas import OrderSide, OrderType
from app.core.config import settings
from app.adapters.exceptions import BrokerAPIError

router = APIRouter(prefix="/api/trading", tags=["trading"])


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
    mode_descriptions = {
        "live": "真实盘 - 真实交易",
        "paper": "模拟盘 - 真实行情，模拟订单",
        "mock": "Mock 模式 - 完全模拟"
    }
    return {
        "mode": settings.trading_mode.value,
        "description": mode_descriptions[settings.trading_mode.value]
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
        # 系统错误，返回500
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        print(f"[ERROR] place_order failed: {error_detail}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/order/{broker}/{order_id}")
async def cancel_order(broker: str, order_id: str):
    """撤单"""
    success = await trading_service.cancel_order(broker, order_id)
    if not success:
        raise HTTPException(status_code=400, detail="撤单失败")
    return {"success": True}


@router.get("/order/{broker}/{order_id}")
async def get_order(broker: str, order_id: str, symbol: str | None = None):
    """查询订单"""
    order = await trading_service.get_order(broker, order_id, symbol)
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    return order


@router.get("/positions/{broker}")
async def get_positions(broker: str):
    """获取持仓"""
    positions = await trading_service.get_positions(broker)
    get_monitor_service().update_positions(broker, positions)
    return {"positions": positions}


@router.get("/account/{broker}")
async def get_account(broker: str):
    """获取账户信息"""
    account = await trading_service.get_account(broker)
    if not account:
        raise HTTPException(status_code=404, detail="账户不存在")
    return account
