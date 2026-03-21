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


class LogService:
    """日志服务 - 同时写入内存和数据库"""

    def __init__(self, max_logs: int = 1000):
        self.logs: deque = deque(maxlen=max_logs)

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
        return list(reversed(result))


log_service = LogService()
