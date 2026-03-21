from collections import deque
from app.strategies.base import Strategy
from app.strategies.registry import StrategyRegistry
from app.models.schemas import TickData


@StrategyRegistry.register("supertrend")
class SupertrendStrategy(Strategy):
    """Supertrend策略"""
    PARAMS_SCHEMA = {
        "period": {"type": "number", "default": 10, "label": "ATR周期"},
        "multiplier": {"type": "number", "default": 3.0, "label": "倍数"},
        "symbol": {"type": "string", "default": "BTC-USDT", "label": "交易标的"},
        "quantity": {"type": "number", "default": 0.01, "label": "数量"},
    }

    def __init__(self, name: str, params: dict):
        super().__init__(name, params)
        self.period = params.get("period", 10)
        self.multiplier = params.get("multiplier", 3.0)
        self.prices = deque(maxlen=self.period * 2)
        self.trues = deque(maxlen=self.period * 2)

    def on_init(self):
        self.position = 0
        self.prev_supertrend = None
        self.current_supertrend = None
        self.ctx.log(f"Supertrend策略初始化: ATR周期={self.period}, 倍数={self.multiplier}")

    def _calculate_tr(self, high, low, prev_close):
        return max(high - low, abs(high - prev_close), abs(low - prev_close))

    async def on_tick(self, data: TickData):
        symbol = self.params.get("symbol")
        quantity = self.params.get("quantity", 0.01)
        if data.symbol != symbol:
            return

        price = data.last_price
        self.prices.append(price)

        if len(self.prices) < 2:
            return

        prev_close = self.prices[-2]
        tr = self._calculate_tr(price, price, prev_close)
        self.trues.append(tr)

        if len(self.trues) < self.period:
            return

        atr = sum(self.trues) / self.period
        hl2 = (price + prev_close) / 2
        upper_band = hl2 + self.multiplier * atr
        lower_band = hl2 - self.multiplier * atr

        if self.current_supertrend is None:
            self.current_supertrend = lower_band
            self.prev_supertrend = lower_band
            return

        if price > upper_band:
            self.current_supertrend = lower_band
        elif price < lower_band:
            self.current_supertrend = upper_band
        else:
            self.current_supertrend = self.prev_supertrend

        if self.current_supertrend < self.prev_supertrend and self.position == 0:
            signal_id = await self.ctx.log_signal("buy", price, "Supertrend上穿买入")
            if signal_id:
                await self.ctx.buy(symbol, quantity, price, signal_id=signal_id)
            else:
                await self.ctx.buy(symbol, quantity, price)
            self.position = 1
        elif self.current_supertrend > self.prev_supertrend and self.position == 1:
            signal_id = await self.ctx.log_signal("sell", price, "Supertrend下穿卖出")
            if signal_id:
                await self.ctx.sell(symbol, quantity, price, signal_id=signal_id)
            else:
                await self.ctx.sell(symbol, quantity, price)
            self.position = 0

        self.prev_supertrend = self.current_supertrend
