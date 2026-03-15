"""认证中间件"""
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings
from app.core.security import verify_token


class AuthMiddleware(BaseHTTPMiddleware):
    """可选 JWT 验证的认证中间件"""

    async def dispatch(self, request: Request, call_next):
        """处理带可选认证的请求"""
        # 跳过 OPTIONS 预检请求
        if request.method == "OPTIONS":
            return await call_next(request)

        # 跳过公共端点
        if request.url.path.startswith("/api/auth") or request.url.path == "/health":
            return await call_next(request)

        if settings.AUTH_ENABLED:
            # 从 Authorization header 提取 token
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Missing or invalid authorization header"}
                )

            token = auth_header.split(" ")[1]
            payload = verify_token(token)
            if not payload:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Invalid or expired token"}
                )

            # 将用户名附加到 request state
            request.state.user = payload.get("sub")
        else:
            # 认证已禁用：使用默认用户
            request.state.user = settings.AUTH_DEFAULT_USERNAME

        return await call_next(request)
