from collections import deque
from app.strategies.base import Strategy
from app.strategies.registry import StrategyRegistry
from app.models.schemas import TickData

@StrategyRegistry.register("dual_rsi")
class DualRSIStrategy(Strategy):
    PARAMS_SCHEMA = {
        "short_period": {"type": "number", "default": 6, "label": "短RSI周期"},
        "long_period": {"type": "number", "default": 20, "label": "长RSI周期"},
        "symbol": {"type": "string", "default": "BTC-USDT", "label": "交易标的"},
        "quantity": {"type": "number", "default": 0.01, "label": "数量"},
    }

    def __init__(self, name: str, params: dict):
        super().__init__(name, params)
        self.short_period = params.get("short_period", 6)
        self.long_period = params.get("long_period", 20)
        self.short_prices = deque(maxlen=self.short_period + 1)
        self.long_prices = deque(maxlen=self.long_period + 1)

    def on_init(self):
        self.position = 0

    def _calc_rsi(self, prices):
        if len(prices) < self.short_period:
            return None
        gains, losses = 0, 0
        for i in range(1, len(prices)):
            diff = prices[i] - prices[i-1]
            if diff > 0:
                gains += diff
            else:
                losses += abs(diff)
        if losses == 0:
            return 100
        rs = gains / losses
        return 100 - 100 / (1 + rs)

    async def on_tick(self, data: TickData):
        if data.symbol != self.params.get("symbol"):
            return

        price = data.last_price
        self.short_prices.append(price)
        self.long_prices.append(price)

        if len(self.short_prices) < self.short_period + 1 or len(self.long_prices) < self.long_period + 1:
            return

        short_rsi = self._calc_rsi(self.short_prices)
        long_rsi = self._calc_rsi(self.long_prices)

        if short_rsi is None or long_rsi is None:
            return

        symbol = self.params.get("symbol", "BTC-USDT")
        quantity = self.params.get("quantity", 0.01)

        if short_rsi < 30 and long_rsi < 40 and self.position == 0:
            signal_id = await self.ctx.log_signal("buy", price, f"短RSI={short_rsi:.1f}长RSI={long_rsi:.1f}超卖")
            if signal_id:
                await self.ctx.buy(symbol, quantity, price, signal_id=signal_id)
            else:
                await self.ctx.buy(symbol, quantity, price)
            self.position = 1
        elif short_rsi > 70 and long_rsi > 60 and self.position == 1:
            signal_id = await self.ctx.log_signal("sell", price, f"短RSI={short_rsi:.1f}长RSI={long_rsi:.1f}超买")
            if signal_id:
                await self.ctx.sell(symbol, quantity, price, signal_id=signal_id)
            else:
                await self.ctx.sell(symbol, quantity, price)
            self.position = 0
