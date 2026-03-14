from enum import Enum
from pydantic import BaseModel
from datetime import datetime

class OrderSide(str, Enum):
    BUY = "buy"
    SELL = "sell"

class OrderType(str, Enum):
    MARKET = "market"
    LIMIT = "limit"

class OrderStatus(str, Enum):
    PENDING = "pending"
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
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"

class LogEntry(BaseModel):
    timestamp: datetime
    level: LogLevel
    source: str
    message: str

class BacktestConfig(BaseModel):
    strategy_id: str
    symbol: str
    start_date: str
    end_date: str
    initial_capital: float

class BacktestResult(BaseModel):
    total_return: float
    max_drawdown: float
    win_rate: float
    total_trades: int
