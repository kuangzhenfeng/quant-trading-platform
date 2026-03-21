from collections import deque
from app.strategies.base import Strategy
from app.strategies.registry import StrategyRegistry
from app.models.schemas import TickData


@StrategyRegistry.register("ma")
class MAStrategy(Strategy):
    """均线策略"""
    PARAMS_SCHEMA = {
        "symbol": {"type": "string", "default": "BTC-USDT", "label": "交易标的"},
        "short_period": {"type": "number", "default": 5, "label": "短周期"},
        "long_period": {"type": "number", "default": 20, "label": "长周期"},
        "quantity": {"type": "number", "default": 0.01, "label": "交易数量"}
    }
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
            signal_id = await self.ctx.log_signal("buy", data.last_price, f"MA{self.short_period}上穿MA{self.long_period}金叉")
            if signal_id:
                await self.ctx.buy(self.symbol, self.quantity, data.last_price, signal_id=signal_id)
            else:
                await self.ctx.buy(self.symbol, self.quantity, data.last_price)
            self.position = 1

        # 死叉卖出
        elif short_ma < long_ma and self.position == 1:
            signal_id = await self.ctx.log_signal("sell", data.last_price, f"MA{self.short_period}下穿MA{self.long_period}死叉")
            if signal_id:
                await self.ctx.sell(self.symbol, self.quantity, data.last_price, signal_id=signal_id)
            else:
                await self.ctx.sell(self.symbol, self.quantity, data.last_price)
            self.position = 0
