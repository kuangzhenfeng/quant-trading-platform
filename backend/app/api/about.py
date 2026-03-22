import json
from pathlib import Path

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.models.user import User
from app.api.auth import get_current_user_dep

router = APIRouter(prefix="/api/system", tags=["system"])


class SystemInfo(BaseModel):
    app_name: str
    version: str


def get_version() -> str:
    """从 version.json 读取版本"""
    docker_path = Path("/app/version.json")
    if docker_path.exists():
        with open(docker_path) as f:
            data = json.load(f)
            return data.get("version", "未知")
    local_path = Path(__file__).parent.parent.parent.parent / "version.json"
    if local_path.exists():
        with open(local_path) as f:
            data = json.load(f)
            return data.get("version", "未知")
    return "未知"


@router.get("/info", response_model=SystemInfo)
async def get_system_info(_: User = Depends(get_current_user_dep)):
    """获取系统信息"""
    from app.core.config import settings

    return SystemInfo(
        app_name=settings.app_name,
        version=get_version(),
    )
