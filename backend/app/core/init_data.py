"""从环境变量初始化数据"""
import secrets
from pathlib import Path
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.db_models import DBSystemConfig
from sqlalchemy import select


def ensure_jwt_secret():
    """确保 JWT_SECRET 已设置，如果是默认值则自动生成"""
    env_file = Path(__file__).parent.parent.parent / ".env"

    # 如果是默认值或为空，生成新密钥
    if settings.AUTH_JWT_SECRET in ("your-secret-key-change-in-production", ""):
        new_secret = secrets.token_urlsafe(32)

        if env_file.exists():
            # 读取现有内容
            content = env_file.read_text()

            # 替换 JWT_SECRET
            if "AUTH_JWT_SECRET=" in content:
                lines = content.split("\n")
                for i, line in enumerate(lines):
                    if line.startswith("AUTH_JWT_SECRET="):
                        lines[i] = f"AUTH_JWT_SECRET={new_secret}"
                        break
                env_file.write_text("\n".join(lines))
            else:
                # 追加新配置
                env_file.write_text(content + f"\nAUTH_JWT_SECRET={new_secret}\n")

            print(f"[INIT] 已自动生成 JWT_SECRET 并保存到 .env")
            settings.AUTH_JWT_SECRET = new_secret
        else:
            print(f"[WARN] .env 文件不存在，使用默认 JWT_SECRET（不安全）")


async def init_system_config(force: bool = False):
    """初始化系统配置到数据库"""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(DBSystemConfig))
        existing = result.scalars().all()
        if existing and not force:
            return

        configs = [
            DBSystemConfig(key="TRADING_MODE", value=settings.trading_mode.value, category="trading_mode", is_sensitive=False),
            DBSystemConfig(key="CURRENT_BROKER", value=settings.current_broker.value, category="broker", is_sensitive=False),
        ]
        session.add_all(configs)
        await session.commit()
        print("[INIT] 系统配置已初始化到数据库")


async def init_mock_data():
    """初始化 Mock 模式测试数据"""
    from app.repositories.order_repo import OrderRepository
    from app.repositories.position_repo import PositionRepository
    from app.models.schemas import OrderData, PositionData, OrderStatus, OrderSide, OrderType

    async with AsyncSessionLocal() as session:
        # 检查是否已有数据
        order_repo = OrderRepository(session)
        existing_orders = await order_repo.get_all()
        if existing_orders:
            return  # 已有数据，跳过初始化

        pos_repo = PositionRepository(session)

        # 创建测试订单
        test_orders = [
            OrderData(
                order_id="MOCK001",
                symbol="AAPL",
                side=OrderSide.BUY,
                type=OrderType.LIMIT,
                quantity=100,
                price=150.0,
                status=OrderStatus.FILLED
            ),
            OrderData(
                order_id="MOCK002",
                symbol="TSLA",
                side=OrderSide.BUY,
                type=OrderType.LIMIT,
                quantity=50,
                price=200.0,
                status=OrderStatus.FILLED
            ),
        ]

        for order in test_orders:
            await order_repo.create(order, "mock")

        # 创建测试持仓
        test_positions = [
            PositionData(
                symbol="AAPL",
                quantity=100,
                avg_price=150.0,
                current_price=155.0,
                unrealized_pnl=500.0
            ),
            PositionData(
                symbol="TSLA",
                quantity=50,
                avg_price=200.0,
                current_price=195.0,
                unrealized_pnl=-250.0
            ),
        ]

        for pos in test_positions:
            await pos_repo.upsert(pos, "mock")

        print("[INIT] Mock 测试数据已初始化")


async def init_data_from_env():
    """从环境变量初始化所有数据"""
    ensure_jwt_secret()
    await init_system_config()

    # 如果是 MOCK 模式，初始化测试数据
    from app.core.config import TradingMode
    if settings.trading_mode == TradingMode.MOCK:
        await init_mock_data()
