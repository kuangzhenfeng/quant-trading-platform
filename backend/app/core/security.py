"""JWT token 和密码哈希工具"""
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
import jwt
from app.core.config import settings


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """生成 JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=settings.AUTH_ACCESS_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.AUTH_JWT_SECRET, algorithm=settings.AUTH_JWT_ALGORITHM)


def verify_token(token: str) -> Optional[dict]:
    """验证 JWT token 并返回 payload"""
    try:
        return jwt.decode(token, settings.AUTH_JWT_SECRET, algorithms=[settings.AUTH_JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        return None


def hash_password(password: str) -> str:
    """使用 bcrypt 哈希密码"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码与哈希值"""
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())
