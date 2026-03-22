from typing import List
from datetime import datetime, timezone
from collections import deque
from app.models.schemas import LogEntry, LogLevel


def _persist_log_async(level: LogLevel, source: str, message: str):
    """异步持久化日志到数据库（后台任务，不阻塞主流程）"""
    import asyncio
    from app.core.database import AsyncSessionLocal
    from app.models.db_models import DBSystemLog

    async def _write():
        try:
            async with AsyncSessionLocal() as session:
                db_log = DBSystemLog(
                    level=level.value,
                    source=source,
                    message=message,
                    timestamp=datetime.utcnow()
                )
                session.add(db_log)
                await session.commit()
        except Exception:
            # 数据库写入失败不影响主流程，仅打印警告
            import traceback
            traceback.print_exc()

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_write())
    except RuntimeError:
        # 没有运行中的事件循环（极少情况），在新的事件循环中执行
        asyncio.run(_write())


def _cleanup_old_logs_async():
    """异步清理超过30天的日志（后台任务，每小时执行一次）"""
    import asyncio
    from datetime import timedelta
    from app.core.database import AsyncSessionLocal
    from app.models.db_models import DBSystemLog

    async def _cleanup():
        try:
            async with AsyncSessionLocal() as session:
                cutoff = datetime.utcnow() - timedelta(days=30)
                result = await session.execute(
                    session.query(DBSystemLog).filter(DBSystemLog.timestamp < cutoff).delete(synchronize_session=False)
                )
                await session.commit()
                if result > 0:
                    print(f"[LOG_CLEANUP] 已清理 {result} 条超过30天的日志")
        except Exception:
            import traceback
            traceback.print_exc()

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_cleanup())
    except RuntimeError:
        asyncio.run(_cleanup())


class LogService:
    """日志服务 - 同时写入内存和数据库"""

    def __init__(self, max_logs: int = 1000):
        self.logs: deque = deque(maxlen=max_logs)
        self._cleanup_task: "asyncio.Task[None] | None" = None

    def start_cleanup_task(self):
        """启动日志清理定时任务（每小时清理一次）"""
        import asyncio

        async def _run_cleanup_loop():
            while True:
                await asyncio.sleep(3600)  # 每小时执行一次
                _cleanup_old_logs_async()

        try:
            loop = asyncio.get_running_loop()
            self._cleanup_task = loop.create_task(_run_cleanup_loop())
        except RuntimeError:
            pass

    def stop_cleanup_task(self):
        """停止日志清理定时任务"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            self._cleanup_task = None

    def log(self, level: LogLevel, source: str, message: str):
        """记录日志（同步写入内存 + 异步持久化到数据库）"""
        entry = LogEntry(
            timestamp=datetime.now(timezone.utc),
            level=level,
            source=source,
            message=message
        )
        self.logs.append(entry)

        # 异步持久化到数据库（后台任务）
        _persist_log_async(level, source, message)

        # 检查告警条件
        if level == LogLevel.ERROR:
            self._trigger_alert(entry)

    def _trigger_alert(self, entry: LogEntry):
        """触发告警"""
        print(f"[ALERT] {entry.source}: {entry.message}")

    def get_logs(
        self,
        level: LogLevel | None = None,
        source: str | None = None,
        limit: int = 100
    ) -> List[LogEntry]:
        """获取日志（从内存读取）"""
        result = []
        for entry in reversed(self.logs):
            if level and entry.level != level:
                continue
            if source and entry.source != source:
                continue
            result.append(entry)
            if len(result) >= limit:
                break
        return result


log_service = LogService()
