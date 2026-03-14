from typing import List
from datetime import datetime
from collections import deque
from app.models.schemas import LogEntry, LogLevel


class LogService:
    """日志服务"""

    def __init__(self, max_logs: int = 1000):
        self.logs: deque = deque(maxlen=max_logs)

    def log(self, level: LogLevel, source: str, message: str):
        """记录日志"""
        entry = LogEntry(
            timestamp=datetime.now(),
            level=level,
            source=source,
            message=message
        )
        self.logs.append(entry)

        # 检查告警条件
        if level == LogLevel.ERROR:
            self._trigger_alert(entry)

    def _trigger_alert(self, entry: LogEntry):
        """触发告警"""
        print(f"[ALERT] {entry.source}: {entry.message}")

    def get_logs(self, level: LogLevel | None = None, limit: int = 100) -> List[LogEntry]:
        """获取日志"""
        logs = list(self.logs)
        if level:
            logs = [log for log in logs if log.level == level]
        return logs[-limit:]


log_service = LogService()
