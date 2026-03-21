from enum import Enum
from pydantic import BaseModel, field_serializer
from datetime import datetime, timezone

class OrderSide(str, Enum):
    BUY = "buy"
    SELL = "sell"

class OrderType(str, Enum):
    MARKET = "market"
    LIMIT = "limit"

class OrderStatus(str, Enum):
    PENDING = "pending"
    PARTIAL = "partial"
    FILLED = "filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"

class TickData(BaseModel):
    broker: str
    symbol: str
    last_price: float
    volume: int
    timestamp: datetime

class OrderData(BaseModel):
    order_id: str
    symbol: str
    side: OrderSide
    type: OrderType
    quantity: float
    price: float | None = None
    status: OrderStatus
    created_at: str | None = None
    broker: str | None = None

class PositionData(BaseModel):
    symbol: str
    quantity: float
    avg_price: float
    unrealized_pnl: float

class AccountData(BaseModel):
    broker: str
    balance: float
    available: float
    frozen: float = 0.0

class BrokerConfig(BaseModel):
    id: str
    broker: str
    name: str
    config: dict
    active: bool = True

class LogLevel(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"

class LogEntry(BaseModel):
    timestamp: datetime
    level: LogLevel
    source: str
    message: str

    @field_serializer('timestamp')
    def serialize_timestamp(self, dt: datetime) -> str:
        """统一序列化为 UTC ISO 格式带 Z 后缀，前端可正确转为本地时间"""
        if dt.tzinfo is None:
            return dt.isoformat() + "Z"
        return dt.isoformat()

class KlineInterval(str, Enum):
    """K线周期"""
    MIN_1 = "1m"
    MIN_5 = "5m"
    MIN_15 = "15m"
    HOUR_1 = "1H"
    DAY_1 = "1D"

class KlineData(BaseModel):
    """K线数据（OHLCV）"""
    broker: str
    symbol: str
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float

class BacktestConfig(BaseModel):
    strategy_id: str
    symbol: str
    start_date: str
    end_date: str
    initial_capital: float
    data_source: str = "mock"
    interval: str = "1H"

class BacktestResult(BaseModel):
    total_return: float
    max_drawdown: float
    win_rate: float
    total_trades: int
