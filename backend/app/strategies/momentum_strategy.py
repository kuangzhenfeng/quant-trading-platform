from collections import deque
from app.strategies.base import Strategy
from app.strategies.registry import StrategyRegistry
from app.models.schemas import TickData

@StrategyRegistry.register("momentum")
class MomentumStrategy(Strategy):
    """动量策略"""
    PARAMS_SCHEMA = {
        "symbol": {"type": "string", "default": "BTC-USDT", "label": "交易标的"},
        "period": {"type": "number", "default": 10, "label": "动量周期"},
        "threshold": {"type": "number", "default": 0.01, "label": "阈值(%)"},
        "quantity": {"type": "number", "default": 0.01, "label": "数量"},
    }

    def on_init(self):
        self.period = self.params.get("period", 10)
        self.threshold = self.params.get("threshold", 0.01)
        self.prices = deque(maxlen=self.period + 1)
        self.position = 0

        self.ctx.log(f"动量策略初始化: 周期={self.period}, 阈值={self.threshold}%")

    async def on_tick(self, data: TickData):
        if data.symbol != self.params.get("symbol"):
            return

        price = data.last_price
        self.prices.append(price)

        if len(self.prices) < self.period + 1:
            return

        momentum = (price - self.prices[0]) / self.prices[0] * 100
        symbol = self.params.get("symbol", "BTC-USDT")
        quantity = self.params.get("quantity", 0.01)

        if momentum > self.threshold and self.position == 0:
            signal_id = await self.ctx.log_signal("buy", price, f"动量={momentum:+.2f}% > {self.threshold}%")
            if signal_id:
                await self.ctx.buy(symbol, quantity, price, signal_id=signal_id)
            else:
                await self.ctx.buy(symbol, quantity, price)
            self.position = 1
        elif momentum < -self.threshold and self.position == 1:
            signal_id = await self.ctx.log_signal("sell", price, f"动量={momentum:+.2f}% < {-self.threshold}%")
            if signal_id:
                await self.ctx.sell(symbol, quantity, price, signal_id=signal_id)
            else:
                await self.ctx.sell(symbol, quantity, price)
            self.position = 0
