from collections import deque
from app.strategies.base import Strategy
from app.models.schemas import TickData


class MAStrategy(Strategy):
    """均线策略"""
    def on_init(self):
        self.short_period = self.params.get("short_period", 5)
        self.long_period = self.params.get("long_period", 20)
        self.symbol = self.params.get("symbol", "BTC-USDT")
        self.quantity = self.params.get("quantity", 0.01)

        self.prices = deque(maxlen=self.long_period)
        self.position = 0

        self.ctx.log(f"均线策略初始化: 短周期={self.short_period}, 长周期={self.long_period}")

    async def on_tick(self, data: TickData):
        if data.symbol != self.symbol:
            return

        self.prices.append(data.last_price)

        if len(self.prices) < self.long_period:
            return

        short_ma = sum(list(self.prices)[-self.short_period:]) / self.short_period
        long_ma = sum(self.prices) / self.long_period

        # 金叉买入
        if short_ma > long_ma and self.position == 0:
            await self.ctx.buy(self.symbol, self.quantity, data.last_price)
            self.position = 1

        # 死叉卖出
        elif short_ma < long_ma and self.position == 1:
            await self.ctx.sell(self.symbol, self.quantity, data.last_price)
            self.position = 0
