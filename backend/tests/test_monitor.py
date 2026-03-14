import pytest
from app.services.monitor import monitor_service
from app.models.schemas import OrderData, PositionData, OrderSide, OrderType, OrderStatus


@pytest.mark.asyncio
async def test_monitor_add_order():
    """测试添加订单"""
    order = OrderData(
        order_id="test_001",
        symbol="BTC-USDT",
        side=OrderSide.BUY,
        type=OrderType.LIMIT,
        quantity=1.0,
        price=50000.0,
        status=OrderStatus.FILLED
    )
    monitor_service.add_order(order)
    assert len(monitor_service.orders) > 0


@pytest.mark.asyncio
async def test_monitor_pnl():
    """测试 PnL 统计"""
    monitor_service.positions = {}
    monitor_service.update_positions("okx", [
        PositionData(symbol="BTC-USDT", quantity=1.0, avg_price=50000.0, unrealized_pnl=1000.0)
    ])
    pnl = monitor_service.get_pnl_summary()
    assert pnl["total_pnl"] == 1000.0
    assert pnl["position_count"] == 1


@pytest.mark.asyncio
async def test_monitor_stats():
    """测试成交统计"""
    stats = monitor_service.get_trade_stats()
    assert "total_orders" in stats
    assert "filled_orders" in stats
