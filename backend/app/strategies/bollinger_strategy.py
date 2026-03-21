from collections import deque
from app.strategies.base import Strategy
from app.strategies.registry import StrategyRegistry
from app.models.schemas import TickData


@StrategyRegistry.register("bollinger")
class BollingerStrategy(Strategy):
    """布林带策略"""
    PARAMS_SCHEMA = {
        "symbol": {"type": "string", "default": "BTC-USDT", "label": "交易标的"},
        "period": {"type": "number", "default": 20, "label": "周期"},
        "std_dev": {"type": "number", "default": 2, "label": "标准差倍数"},
        "quantity": {"type": "number", "default": 0.01, "label": "交易数量"}
    }

    def on_init(self):
        self.symbol = self.params.get("symbol", "BTC-USDT")
        self.period = self.params.get("period", 20)
        self.std_dev = self.params.get("std_dev", 2)
        self.quantity = self.params.get("quantity", 0.01)

        self.prices = deque(maxlen=self.period)
        self.position = 0

        self.ctx.log(f"布林带策略初始化: 周期={self.period}, 标准差倍数={self.std_dev}")

    async def on_tick(self, data: TickData):
        if data.symbol != self.symbol:
            return

        self.prices.append(data.last_price)

        if len(self.prices) < self.period:
            return

        middle = sum(self.prices) / self.period
        variance = sum((p - middle) ** 2 for p in self.prices) / self.period
        std = variance ** 0.5

        upper = middle + self.std_dev * std
        lower = middle - self.std_dev * std

        # 触及下轨买入
        if data.last_price <= lower and self.position == 0:
            signal_id = await self.ctx.log_signal("buy", data.last_price, f"价格触及布林下轨{lower:.2f}")
            if signal_id:
                await self.ctx.buy(self.symbol, self.quantity, data.last_price, signal_id=signal_id)
            else:
                await self.ctx.buy(self.symbol, self.quantity, data.last_price)
            self.position = 1
        # 触及上轨卖出
        elif data.last_price >= upper and self.position == 1:
            signal_id = await self.ctx.log_signal("sell", data.last_price, f"价格触及布林上轨{upper:.2f}")
            if signal_id:
                await self.ctx.sell(self.symbol, self.quantity, data.last_price, signal_id=signal_id)
            else:
                await self.ctx.sell(self.symbol, self.quantity, data.last_price)
            self.position = 0
