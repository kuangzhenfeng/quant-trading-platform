"""用户管理服务"""
import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.core.security import hash_password, verify_password
from app.models.user import User


USERS_FILE = Path(__file__).parent.parent.parent / "users.json"


def _load_users() -> dict[str, User]:
    """从 JSON 文件加载用户"""
    if not USERS_FILE.exists():
        return {}
    with open(USERS_FILE) as f:
        data = json.load(f)
    return {username: User(**user_data) for username, user_data in data.items()}


def _save_users(users: dict[str, User]) -> None:
    """保存用户到 JSON 文件"""
    data = {username: user.model_dump(mode="json") for username, user in users.items()}
    with open(USERS_FILE, "w") as f:
        json.dump(data, f, indent=2, default=str)


def get_user(username: str) -> Optional[User]:
    """根据用户名获取用户"""
    users = _load_users()
    return users.get(username)


def create_user(username: str, password: str) -> User:
    """创建新用户"""
    users = _load_users()
    if username in users:
        raise ValueError(f"User {username} already exists")

    user = User(
        username=username,
        hashed_password=hash_password(password),
        created_at=datetime.utcnow()
    )
    users[username] = user
    _save_users(users)
    return user


def authenticate_user(username: str, password: str) -> Optional[User]:
    """使用用户名和密码验证用户"""
    user = get_user(username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def list_users() -> list[User]:
    """获取所有用户列表"""
    users = _load_users()
    return list(users.values())


def delete_user(username: str) -> None:
    """删除指定用户"""
    users = _load_users()
    if username not in users:
        raise ValueError(f"User {username} not found")
    del users[username]
    _save_users(users)
