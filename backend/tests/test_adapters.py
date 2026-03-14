import pytest
from app.adapters.mock import MockAdapter
from app.adapters.factory import AdapterFactory
from app.models.schemas import OrderSide, OrderType

@pytest.mark.asyncio
async def test_mock_adapter_connect():
    adapter = MockAdapter({})
    result = await adapter.connect()
    assert result is True
    assert adapter.connected is True

@pytest.mark.asyncio
async def test_mock_adapter_get_tick():
    adapter = MockAdapter({})
    tick = await adapter.get_tick("AAPL")
    assert tick.symbol == "AAPL"
    assert tick.price > 0
    assert tick.volume > 0

@pytest.mark.asyncio
async def test_mock_adapter_place_order():
    adapter = MockAdapter({})
    order_id = await adapter.place_order("AAPL", OrderSide.BUY, OrderType.LIMIT, 100, 150.0)
    assert order_id.startswith("MOCK_")
    order = await adapter.get_order(order_id)
    assert order.symbol == "AAPL"
    assert order.quantity == 100

def test_adapter_factory():
    adapter = AdapterFactory.create("mock", {})
    assert isinstance(adapter, MockAdapter)
