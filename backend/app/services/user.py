"""用户管理服务"""
from typing import Optional
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.core.database import AsyncSessionLocal


async def get_user(username: str) -> Optional[User]:
    """根据用户名获取用户"""
    async with AsyncSessionLocal() as session:
        repo = UserRepository(session)
        return await repo.get_by_username(username)


async def create_user(username: str, password: str) -> User:
    """创建新用户"""
    async with AsyncSessionLocal() as session:
        repo = UserRepository(session)
        existing = await repo.get_by_username(username)
        if existing:
            raise ValueError(f"User {username} already exists")
        return await repo.create(username, hash_password(password))


async def authenticate_user(username: str, password: str) -> Optional[User]:
    """使用用户名和密码验证用户"""
    user = await get_user(username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def list_users() -> list[User]:
    """获取所有用户列表"""
    async with AsyncSessionLocal() as session:
        repo = UserRepository(session)
        return await repo.get_all()


async def delete_user(username: str) -> None:
    """删除指定用户"""
    async with AsyncSessionLocal() as session:
        repo = UserRepository(session)
        if not await repo.delete(username):
            raise ValueError(f"User {username} not found")
