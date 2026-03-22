import pytest
import time
from app.services.monitor import monitor_service
from app.models.schemas import OrderData, PositionData, OrderSide, OrderType, OrderStatus


@pytest.mark.asyncio
async def test_monitor_add_order():
    """测试添加订单"""
    order_id = f"test_order_{int(time.time() * 1000)}"
    order = OrderData(
        order_id=order_id,
        symbol="BTC-USDT",
        side=OrderSide.BUY,
        type=OrderType.LIMIT,
        quantity=1.0,
        price=50000.0,
        status=OrderStatus.FILLED
    )
    await monitor_service.add_order(order, "okx")

    # 验证从数据库读取
    orders = await monitor_service.get_orders("okx")
    assert len(orders) > 0
    found = any(o.order_id == order_id for o in orders)
    assert found


@pytest.mark.asyncio
async def test_monitor_pnl():
    """测试 PnL 统计"""
    # 更新持仓到数据库
    await monitor_service.update_positions("okx", [
        PositionData(symbol="BTC-USDT", quantity=1.0, avg_price=50000.0, unrealized_pnl=1000.0)
    ])

    # 验证从数据库读取
    pnl = await monitor_service.get_pnl_summary("okx")
    assert pnl["total_pnl"] == 1000.0
    assert pnl["position_count"] == 1
    assert len(pnl["positions"]) == 1
    assert pnl["positions"][0]["symbol"] == "BTC-USDT"


@pytest.mark.asyncio
async def test_monitor_stats():
    """测试成交统计"""
    # 先添加一个订单
    order_id = f"test_order_stats_{int(time.time() * 1000)}"
    order = OrderData(
        order_id=order_id,
        symbol="ETH-USDT",
        side=OrderSide.BUY,
        type=OrderType.LIMIT,
        quantity=1.0,
        price=3000.0,
        status=OrderStatus.FILLED
    )
    await monitor_service.add_order(order, "okx")

    stats = await monitor_service.get_trade_stats("okx")
    assert "total_orders" in stats
    assert "filled_orders" in stats
    assert stats["total_orders"] >= 1
    assert stats["filled_orders"] >= 1
