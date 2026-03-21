from collections import deque
from app.strategies.base import Strategy
from app.strategies.registry import StrategyRegistry
from app.models.schemas import TickData

@StrategyRegistry.register("atr_channel")
class ATRChannelStrategy(Strategy):
    """ATR通道策略"""
    PARAMS_SCHEMA = {
        "symbol": {"type": "string", "default": "BTC-USDT", "label": "交易标的"},
        "period": {"type": "number", "default": 20, "label": "ATR周期"},
        "multiplier": {"type": "number", "default": 2.0, "label": "ATR倍数"},
        "quantity": {"type": "number", "default": 0.01, "label": "数量"},
    }

    def on_init(self):
        self.period = self.params.get("period", 20)
        self.multiplier = self.params.get("multiplier", 2.0)
        self.prices = deque(maxlen=self.period + 1)
        self.trs = deque(maxlen=self.period)
        self.position = 0

        self.ctx.log(f"ATR通道策略初始化: 周期={self.period}, 倍数={self.multiplier}")

    async def on_tick(self, data: TickData):
        if data.symbol != self.params.get("symbol"):
            return

        price = data.last_price
        self.prices.append(price)

        if len(self.prices) < 2:
            return

        tr = max(price - self.prices[-2], abs(price - self.prices[-2]))
        self.trs.append(tr)

        if len(self.trs) < self.period:
            return

        atr = sum(self.trs) / self.period
        middle = sum(self.prices) / len(self.prices)
        upper = middle + self.multiplier * atr
        lower = middle - self.multiplier * atr
        symbol = self.params.get("symbol", "BTC-USDT")
        quantity = self.params.get("quantity", 0.01)

        if price <= lower and self.position == 0:
            signal_id = await self.ctx.log_signal("buy", price, f"ATR通道下轨{lower:.2f}买入")
            if signal_id:
                await self.ctx.buy(symbol, quantity, price, signal_id=signal_id)
            else:
                await self.ctx.buy(symbol, quantity, price)
            self.position = 1
        elif price >= upper and self.position == 1:
            signal_id = await self.ctx.log_signal("sell", price, f"ATR通道上轨{upper:.2f}卖出")
            if signal_id:
                await self.ctx.sell(symbol, quantity, price, signal_id=signal_id)
            else:
                await self.ctx.sell(symbol, quantity, price)
            self.position = 0
