import pytest
from app.services.trading import TradingService, RiskControl
from app.adapters.okx import OKXAdapter
from app.models.schemas import OrderSide, OrderType


@pytest.mark.skip(reason="需要连接 OKX API，CI 环境网络不通")
@pytest.mark.asyncio
async def test_place_order():
    """测试下单功能"""
    service = TradingService()
    adapter = OKXAdapter({})
    await adapter.connect()
    service.register_adapter("okx", adapter)

    success, order_id = await service.place_order(
        "okx", "BTC-USDT", OrderSide.BUY, OrderType.LIMIT, 0.01, 70000.0
    )
    assert success
    assert order_id.startswith("okx_")


@pytest.mark.skip(reason="需要连接 OKX API，CI 环境网络不通")
@pytest.mark.asyncio
async def test_get_positions():
    """测试获取持仓"""
    service = TradingService()
    adapter = OKXAdapter({})
    await adapter.connect()
    service.register_adapter("okx", adapter)

    positions = await service.get_positions("okx")
    assert len(positions) > 0
    assert positions[0].symbol == "BTC-USDT"


@pytest.mark.skip(reason="需要连接 OKX API，CI 环境网络不通")
@pytest.mark.asyncio
async def test_get_account():
    """测试获取账户信息"""
    service = TradingService()
    adapter = OKXAdapter({})
    await adapter.connect()
    service.register_adapter("okx", adapter)

    account = await service.get_account("okx")
    assert account is not None
    assert account.broker == "okx"
    assert account.balance > 0


@pytest.mark.asyncio
async def test_risk_control():
    """测试风控"""
    from app.models.schemas import AccountData

    risk = RiskControl()
    account = AccountData(broker="okx", balance=100000, available=50000)

    # 测试超过单笔限额
    passed, msg = await risk.check_order("okx", "BTC-USDT", OrderSide.BUY, 10, 20000, account)
    assert not passed
    assert "超过限制" in msg

    # 测试资金不足
    passed, msg = await risk.check_order("okx", "BTC-USDT", OrderSide.BUY, 1, 60000, account)
    assert not passed
    assert "资金不足" in msg

    # 测试正常订单
    passed, msg = await risk.check_order("okx", "BTC-USDT", OrderSide.BUY, 0.5, 70000, account)
    assert passed
