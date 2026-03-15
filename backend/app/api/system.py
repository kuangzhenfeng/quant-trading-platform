"""系统管理 API"""
import os
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks
from app.models.user import User
from app.api.auth import get_current_user_dep
from fastapi import Depends

router = APIRouter(prefix="/api/system", tags=["system"])


def restart_server():
    """重启服务器 - 触摸主文件触发 uvicorn 热重载"""
    main_file = Path(__file__).parent.parent / "main.py"
    main_file.touch()


@router.post("/restart")
async def restart_service(
    background_tasks: BackgroundTasks,
    _: User = Depends(get_current_user_dep)
):
    """重启后端服务"""
    background_tasks.add_task(restart_server)
    return {"message": "服务正在重启..."}
