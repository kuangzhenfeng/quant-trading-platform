from collections import deque
from app.strategies.base import Strategy
from app.strategies.registry import StrategyRegistry
from app.models.schemas import TickData

@StrategyRegistry.register("donchian")
class DonchianStrategy(Strategy):
    PARAMS_SCHEMA = {
        "period": {"type": "number", "default": 20, "label": "周期"},
        "symbol": {"type": "string", "default": "BTC-USDT", "label": "交易标的"},
        "quantity": {"type": "number", "default": 0.01, "label": "数量"},
    }

    def __init__(self, name: str, params: dict):
        super().__init__(name, params)
        self.period = params.get("period", 20)
        self.prices = deque(maxlen=self.period + 1)

    def on_init(self):
        self.position = 0

    async def on_tick(self, data: TickData):
        if data.symbol != self.params.get("symbol"):
            return

        price = data.last_price
        self.prices.append(price)

        if len(self.prices) < self.period:
            return

        highest = max(self.prices)
        lowest = min(self.prices)
        symbol = self.params.get("symbol", "BTC-USDT")
        quantity = self.params.get("quantity", 0.01)

        if price >= highest and self.position == 0:
            signal_id = await self.ctx.log_signal("buy", price, f"突破{highest:.2f}高点")
            if signal_id:
                await self.ctx.buy(symbol, quantity, price, signal_id=signal_id)
            else:
                await self.ctx.buy(symbol, quantity, price)
            self.position = 1
        elif price <= lowest and self.position == 1:
            signal_id = await self.ctx.log_signal("sell", price, f"跌破{lowest:.2f}低点")
            if signal_id:
                await self.ctx.sell(symbol, quantity, price, signal_id=signal_id)
            else:
                await self.ctx.sell(symbol, quantity, price)
            self.position = 0
