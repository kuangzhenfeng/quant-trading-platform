from collections import deque
from app.strategies.base import Strategy
from app.strategies.registry import StrategyRegistry
from app.models.schemas import TickData

@StrategyRegistry.register("keltner")
class KeltnerStrategy(Strategy):
    """Keltner Channel策略"""
    PARAMS_SCHEMA = {
        "symbol": {"type": "string", "default": "BTC-USDT", "label": "交易标的"},
        "ema_period": {"type": "number", "default": 20, "label": "EMA周期"},
        "atr_period": {"type": "number", "default": 10, "label": "ATR周期"},
        "multiplier": {"type": "number", "default": 2.0, "label": "倍数"},
        "quantity": {"type": "number", "default": 0.01, "label": "数量"},
    }

    def on_init(self):
        self.ema_period = self.params.get("ema_period", 20)
        self.atr_period = self.params.get("atr_period", 10)
        self.multiplier = self.params.get("multiplier", 2.0)
        self.prices = deque(maxlen=self.ema_period + 1)
        self.trs = deque(maxlen=self.atr_period + 1)
        self.ema = None
        self.position = 0

        self.ctx.log(f"Keltner通道策略初始化: EMA周期={self.ema_period}, ATR周期={self.atr_period}, 倍数={self.multiplier}")

    async def on_tick(self, data: TickData):
        if data.symbol != self.params.get("symbol"):
            return

        price = data.last_price
        self.prices.append(price)

        if len(self.prices) >= 2:
            tr = abs(price - self.prices[-2])
            self.trs.append(tr)

        if len(self.prices) < self.ema_period:
            return

        if self.ema is None:
            self.ema = sum(self.prices) / len(self.prices)
        else:
            self.ema = (price - self.ema) * (2 / (self.ema_period + 1)) + self.ema

        if len(self.trs) < self.atr_period:
            return

        atr = sum(self.trs) / len(self.trs)
        upper = self.ema + self.multiplier * atr
        lower = self.ema - self.multiplier * atr
        symbol = self.params.get("symbol", "BTC-USDT")
        quantity = self.params.get("quantity", 0.01)

        if price <= lower and self.position == 0:
            signal_id = await self.ctx.log_signal("buy", price, f"Keltner下轨{lower:.2f}买入")
            if signal_id:
                await self.ctx.buy(symbol, quantity, price, signal_id=signal_id)
            else:
                await self.ctx.buy(symbol, quantity, price)
            self.position = 1
        elif price >= upper and self.position == 1:
            signal_id = await self.ctx.log_signal("sell", price, f"Keltner上轨{upper:.2f}卖出")
            if signal_id:
                await self.ctx.sell(symbol, quantity, price, signal_id=signal_id)
            else:
                await self.ctx.sell(symbol, quantity, price)
            self.position = 0
