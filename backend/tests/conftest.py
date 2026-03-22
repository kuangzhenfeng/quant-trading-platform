import pytest
import asyncio


@pytest.fixture(scope="session", autouse=True)
async def setup_database():
    """初始化测试数据库表"""
    from app.core.init_db import init_database
    await init_database()


@pytest.fixture(autouse=True)
async def cleanup_background_tasks():
    """每个测试后等待后台任务完成，避免 DB 锁竞争"""
    yield
    await asyncio.sleep(0.05)
