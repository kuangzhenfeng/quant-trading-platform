"""用户管理 API"""
from fastapi import APIRouter, HTTPException, Depends
from app.services.user import list_users, delete_user
from app.models.user import User
from app.api.auth import get_current_user_dep

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/")
async def get_users(_: User = Depends(get_current_user_dep)) -> list[User]:
    """获取所有用户列表"""
    return list_users()


@router.delete("/{username}")
async def remove_user(username: str, _: User = Depends(get_current_user_dep)) -> dict:
    """删除指定用户"""
    try:
        delete_user(username)
        return {"message": f"User {username} deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
