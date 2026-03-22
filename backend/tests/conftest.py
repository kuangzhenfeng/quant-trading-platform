import pytest
import asyncio


@pytest.fixture(autouse=True)
async def cleanup_background_tasks():
    """每个测试后等待后台任务完成，避免 DB 锁竞争"""
    yield
    await asyncio.sleep(0.05)
