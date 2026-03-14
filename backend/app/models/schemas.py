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
    symbol: str
    price: float
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
