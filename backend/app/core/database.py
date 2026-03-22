from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings

_connect_args = {}
# SQLite 配置
if settings.DATABASE_URL.startswith("sqlite"):
    _connect_args["check_same_thread"] = False
    _connect_args["timeout"] = 30  # 30秒 busy timeout，减少锁竞争

engine = create_async_engine(settings.DATABASE_URL, echo=False, future=True, connect_args=_connect_args)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    """数据库会话依赖注入"""
    async with AsyncSessionLocal() as session:
        yield session
