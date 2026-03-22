"""认证 API 端点"""
from fastapi import APIRouter, HTTPException, Request, Depends
from app.models.user import UserLogin, UserCreate, Token, UserInfo, User
from app.services.user import authenticate_user, create_user, get_user
from app.core.security import create_access_token, verify_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


async def get_current_user_dep(request: Request) -> User | None:
    """依赖函数：获取当前用户，认证禁用时返回 None"""
    if not hasattr(request.state, "user"):
        raise HTTPException(status_code=401, detail="Not authenticated")

    if request.state.user == "anonymous":
        # 认证禁用时返回 None，由路由函数处理
        return None

    user = await get_user(request.state.user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@router.post("/login", response_model=Token)
async def login(user_login: UserLogin):
    """用户登录端点"""
    user = await authenticate_user(user_login.username, user_login.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    access_token = create_access_token({"sub": user.username})
    return Token(access_token=access_token)


@router.post("/register", response_model=UserInfo)
async def register(user_create: UserCreate):
    """用户注册端点"""
    try:
        user = await create_user(user_create.username, user_create.password)
        return UserInfo(username=user.username, created_at=user.created_at)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me", response_model=UserInfo)
async def get_current_user_info(request: Request, user: User | None = Depends(get_current_user_dep)):
    """获取当前用户信息"""
    # 认证禁用时返回默认用户
    if request.state.user == "anonymous":
        return UserInfo(username="anonymous", created_at=None)
    return UserInfo(username=user.username, created_at=user.created_at)
