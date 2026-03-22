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
    result = await account_service.add_account(config)
    assert result is True

    # 验证从数据库读取
    accounts = await account_service.list_accounts()
    found = any(acc.id == "test_okx_001" for acc in accounts)
    assert found

    # 清理
    await account_service.remove_account("test_okx_001")


@pytest.mark.asyncio
async def test_list_accounts():
    """测试列出账户"""
    accounts = await account_service.list_accounts()
    assert isinstance(accounts, list)


@pytest.mark.asyncio
async def test_set_active():
    """测试设置激活状态"""
    # 先添加账户
    config = BrokerConfig(
        id="test_okx_002",
        broker="okx",
        name="测试账户2",
        config={"is_paper": True},
        active=True
    )
    await account_service.add_account(config)

    # 停用它
    result = await account_service.set_active("test_okx_002", False)
    assert result is True

    # 清理
    await account_service.remove_account("test_okx_002")


@pytest.mark.asyncio
async def test_remove_account():
    """测试删除账户"""
    # 先添加账户
    config = BrokerConfig(
        id="test_okx_003",
        broker="okx",
        name="测试账户3",
        config={"api_key": "test"},
        active=False
    )
    await account_service.add_account(config)

    # 删除
    result = await account_service.remove_account("test_okx_003")
    assert result is True

    # 验证已删除
    accounts = await account_service.list_accounts()
    found = any(acc.id == "test_okx_003" for acc in accounts)
    assert not found
