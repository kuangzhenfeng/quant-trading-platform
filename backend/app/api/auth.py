"""认证 API 端点"""
from fastapi import APIRouter, HTTPException, Request, Depends, Header
from app.models.user import UserLogin, UserCreate, Token, UserInfo, User
from app.services.user import authenticate_user, create_user, get_user
from app.core.security import create_access_token, verify_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


def get_current_user_dep(request: Request) -> User:
    """依赖函数：获取当前用户"""
    if not hasattr(request.state, "user"):
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = get_user(request.state.user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@router.post("/login", response_model=Token)
async def login(user_login: UserLogin):
    """用户登录端点"""
    user = authenticate_user(user_login.username, user_login.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    access_token = create_access_token({"sub": user.username})
    return Token(access_token=access_token)


@router.post("/register", response_model=UserInfo)
async def register(user_create: UserCreate):
    """用户注册端点"""
    try:
        user = create_user(user_create.username, user_create.password)
        return UserInfo(username=user.username, created_at=user.created_at)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me", response_model=UserInfo)
async def get_current_user_info(user: User = Depends(get_current_user_dep)):
    """获取当前用户信息"""
    return UserInfo(username=user.username, created_at=user.created_at)
