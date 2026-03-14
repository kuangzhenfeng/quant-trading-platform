import pytest
from app.services.account import account_service
from app.models.schemas import BrokerConfig


@pytest.mark.asyncio
async def test_add_account():
    """测试添加账户"""
    config = BrokerConfig(
        id="test_okx_001",
        broker="okx",
        name="测试账户",
        config={"api_key": "test"},
        active=True
    )
    result = account_service.add_account(config)
    assert result is True
    assert "test_okx_001" in account_service.accounts


@pytest.mark.asyncio
async def test_list_accounts():
    """测试列出账户"""
    accounts = account_service.list_accounts()
    assert isinstance(accounts, list)


@pytest.mark.asyncio
async def test_set_active():
    """测试设置激活状态"""
    result = account_service.set_active("test_okx_001", False)
    assert result is True
    assert account_service.accounts["test_okx_001"].active is False


@pytest.mark.asyncio
async def test_remove_account():
    """测试删除账户"""
    result = account_service.remove_account("test_okx_001")
    assert result is True
    assert "test_okx_001" not in account_service.accounts
