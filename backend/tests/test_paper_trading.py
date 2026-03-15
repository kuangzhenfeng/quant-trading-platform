import pytest
from app.adapters.paper import PaperTradingAdapter
from app.adapters.okx import OKXAdapter
from app.models.schemas import OrderSide, OrderType, OrderStatus

@pytest.fixture
async def paper_adapter():
    """创建Paper适配器实例"""
    config = {
        "api_key": "",
        "secret_key": "",
        "passphrase": ""
    }
    real_adapter = OKXAdapter(config)
    adapter = PaperTradingAdapter(real_adapter)
    await adapter.connect()
    yield adapter
    await adapter.disconnect()

@pytest.mark.asyncio
async def test_initial_account_state(paper_adapter):
    """测试初始账户状态"""
    account = await paper_adapter.get_account()
    assert account.balance == 100000.0
    assert account.available == 100000.0
    assert account.frozen == 0.0
    assert account.broker == "paper"

@pytest.mark.asyncio
async def test_limit_buy(paper_adapter):
    """测试限价买入"""
    order_id = await paper_adapter.place_order(
        symbol="BTC-USDT",
        side=OrderSide.BUY,
        order_type=OrderType.LIMIT,
        quantity=0.01,
        price=70000.0
    )

    assert order_id.startswith("paper_")

    # 验证订单
    order = await paper_adapter.get_order(order_id)
    assert order.symbol == "BTC-USDT"
    assert order.quantity == 0.01
    assert order.status == OrderStatus.FILLED

    # 验证账户
    account = await paper_adapter.get_account()
    assert account.balance == 99300.0
    assert account.available == 99300.0

    # 验证持仓
    positions = await paper_adapter.get_positions()
    assert len(positions) == 1
    assert positions[0].symbol == "BTC-USDT"
    assert positions[0].quantity == 0.01
    assert positions[0].avg_price == 70000.0

@pytest.mark.asyncio
async def test_limit_sell(paper_adapter):
    """测试限价卖出"""
    # 先买入
    await paper_adapter.place_order("BTC-USDT", OrderSide.BUY, OrderType.LIMIT, 0.01, 70000.0)

    # 卖出
    order_id = await paper_adapter.place_order("BTC-USDT", OrderSide.SELL, OrderType.LIMIT, 0.01, 72000.0)

    # 验证账户
    account = await paper_adapter.get_account()
    assert account.balance == 100020.0

    # 验证持仓清空
    positions = await paper_adapter.get_positions()
    assert len(positions) == 0

@pytest.mark.asyncio
async def test_market_buy(paper_adapter):
    """测试市价买入"""
    order_id = await paper_adapter.place_order("BTC-USDT", OrderSide.BUY, OrderType.MARKET, 0.01)
    assert order_id.startswith("paper_")

@pytest.mark.asyncio
async def test_insufficient_balance(paper_adapter):
    """测试余额不足"""
    with pytest.raises(ValueError, match="Insufficient balance"):
        await paper_adapter.place_order("BTC-USDT", OrderSide.BUY, OrderType.LIMIT, 2.0, 70000.0)

@pytest.mark.asyncio
async def test_insufficient_position(paper_adapter):
    """测试持仓不足"""
    with pytest.raises(ValueError, match="No position"):
        await paper_adapter.place_order("BTC-USDT", OrderSide.SELL, OrderType.LIMIT, 0.01, 70000.0)

@pytest.mark.asyncio
async def test_multiple_buys_accumulate(paper_adapter):
    """测试多次买入累积持仓"""
    await paper_adapter.place_order("BTC-USDT", OrderSide.BUY, OrderType.LIMIT, 0.01, 70000.0)
    await paper_adapter.place_order("BTC-USDT", OrderSide.BUY, OrderType.LIMIT, 0.02, 71000.0)

    positions = await paper_adapter.get_positions()
    assert len(positions) == 1
    assert positions[0].quantity == 0.03
    assert abs(positions[0].avg_price - 70666.67) < 0.01

@pytest.mark.asyncio
async def test_partial_sell(paper_adapter):
    """测试部分卖出"""
    await paper_adapter.place_order("BTC-USDT", OrderSide.BUY, OrderType.LIMIT, 0.05, 70000.0)
    await paper_adapter.place_order("BTC-USDT", OrderSide.SELL, OrderType.LIMIT, 0.02, 70000.0)

    positions = await paper_adapter.get_positions()
    assert abs(positions[0].quantity - 0.03) < 0.0001
