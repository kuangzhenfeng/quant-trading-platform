import pytest
from app.services.log import log_service
from app.models.schemas import LogLevel


@pytest.mark.asyncio
async def test_log_info():
    """测试记录 INFO 日志"""
    log_service.log(LogLevel.INFO, "test", "测试信息")
    logs = log_service.get_logs()
    assert len(logs) > 0
    assert logs[-1].level == LogLevel.INFO


@pytest.mark.asyncio
async def test_log_error():
    """测试记录 ERROR 日志"""
    log_service.log(LogLevel.ERROR, "test", "测试错误")
    logs = log_service.get_logs(LogLevel.ERROR)
    assert any(log.level == LogLevel.ERROR for log in logs)


@pytest.mark.asyncio
async def test_log_filter():
    """测试日志过滤"""
    log_service.log(LogLevel.WARNING, "test", "测试警告")
    logs = log_service.get_logs(LogLevel.WARNING)
    assert all(log.level == LogLevel.WARNING for log in logs)
