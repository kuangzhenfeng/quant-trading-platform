from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.db_models import DBSystemLog
from datetime import datetime

class LogRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add_log(self, level: str, source: str, message: str) -> None:
        db_log = DBSystemLog(
            level=level,
            source=source,
            message=message,
            timestamp=datetime.utcnow()
        )
        self.session.add(db_log)
        await self.session.commit()

    async def get_logs(self, limit: int = 100) -> list[dict]:
        result = await self.session.execute(
            select(DBSystemLog)
            .order_by(DBSystemLog.timestamp.desc())
            .limit(limit)
        )
        logs = result.scalars().all()
        return [{"timestamp": log.timestamp, "level": log.level, "source": log.source, "message": log.message} for log in logs]
