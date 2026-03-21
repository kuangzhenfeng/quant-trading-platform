from fastapi import APIRouter
from app.services.log import log_service
from app.models.schemas import LogLevel

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("/")
async def get_logs(
    level: LogLevel | None = None,
    source: str | None = None,
    limit: int = 100
):
    """获取日志，支持按级别和来源过滤"""
    logs = log_service.get_logs(level=level, source=source, limit=limit)
    return {"logs": logs}
