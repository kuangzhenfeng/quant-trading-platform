"""用户数据模型"""
from datetime import datetime
from pydantic import BaseModel


class User(BaseModel):
    """用户模型"""
    username: str
    hashed_password: str
    created_at: datetime


class UserCreate(BaseModel):
    """用户创建请求"""
    username: str
    password: str


class UserLogin(BaseModel):
    """用户登录请求"""
    username: str
    password: str


class Token(BaseModel):
    """JWT token 响应"""
    access_token: str
    token_type: str = "bearer"


class UserInfo(BaseModel):
    """用户信息响应"""
    username: str
    created_at: datetime
