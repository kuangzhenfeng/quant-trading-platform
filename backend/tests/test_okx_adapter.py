import pytest
from app.adapters.okx import OKXAdapter


@pytest.mark.asyncio
async def test_okx_connect():
    """测试 OKX 连接"""
    adapter = OKXAdapter({})
    result = await adapter.connect()
    assert result is True
    assert adapter.connected is True
    await adapter.disconnect()


@pytest.mark.asyncio
async def test_okx_get_tick():
    """测试获取 OKX 行情"""
    adapter = OKXAdapter({})
    await adapter.connect()

    tick = await adapter.get_tick("BTC-USDT")

    assert tick.symbol == "BTC-USDT"
    assert tick.last_price > 0
    assert tick.volume >= 0

    await adapter.disconnect()
