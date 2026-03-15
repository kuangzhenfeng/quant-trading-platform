from sqlalchemy import String, Float, Boolean, DateTime, JSON, Text, Enum as SQLEnum
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from datetime import datetime
import enum

class Base(DeclarativeBase):
    pass

class OrderSideEnum(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"

class OrderTypeEnum(str, enum.Enum):
    MARKET = "market"
    LIMIT = "limit"

class OrderStatusEnum(str, enum.Enum):
    PENDING = "pending"
    PARTIAL = "partial"
    FILLED = "filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"

class LogLevelEnum(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"

class DBUser(Base):
    __tablename__ = "users"
    username: Mapped[str] = mapped_column(String(50), primary_key=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class DBBrokerAccount(Base):
    __tablename__ = "broker_accounts"
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    broker: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(100))
    config: Mapped[dict] = mapped_column(JSON)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

class DBOrder(Base):
    __tablename__ = "orders"
    order_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    broker: Mapped[str] = mapped_column(String(50))
    symbol: Mapped[str] = mapped_column(String(50))
    side: Mapped[str] = mapped_column(SQLEnum(OrderSideEnum))
    type: Mapped[str] = mapped_column(SQLEnum(OrderTypeEnum))
    quantity: Mapped[float] = mapped_column(Float)
    price: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(SQLEnum(OrderStatusEnum))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class DBPosition(Base):
    __tablename__ = "positions"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    broker: Mapped[str] = mapped_column(String(50))
    symbol: Mapped[str] = mapped_column(String(50))
    quantity: Mapped[float] = mapped_column(Float)
    avg_price: Mapped[float] = mapped_column(Float)
    unrealized_pnl: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class DBStrategyConfig(Base):
    __tablename__ = "strategy_configs"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    strategy_id: Mapped[str] = mapped_column(String(100))
    broker: Mapped[str] = mapped_column(String(50))
    symbol: Mapped[str] = mapped_column(String(50))
    params: Mapped[dict] = mapped_column(JSON)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class DBStrategyLog(Base):
    __tablename__ = "strategy_logs"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    strategy_id: Mapped[str] = mapped_column(String(100))
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    level: Mapped[str] = mapped_column(SQLEnum(LogLevelEnum))
    message: Mapped[str] = mapped_column(Text)

class DBSystemLog(Base):
    __tablename__ = "system_logs"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    level: Mapped[str] = mapped_column(SQLEnum(LogLevelEnum))
    source: Mapped[str] = mapped_column(String(100))
    message: Mapped[str] = mapped_column(Text)
