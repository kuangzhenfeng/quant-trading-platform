from collections import deque
from app.strategies.base import Strategy
from app.strategies.registry import StrategyRegistry
from app.models.schemas import TickData


@StrategyRegistry.register("rsi")
class RSIStrategy(Strategy):
    """RSI策略"""
    PARAMS_SCHEMA = {
        "symbol": {"type": "string", "default": "BTC-USDT", "label": "交易标的"},
        "period": {"type": "number", "default": 14, "label": "RSI周期"},
        "oversold": {"type": "number", "default": 30, "label": "超卖阈值"},
        "overbought": {"type": "number", "default": 70, "label": "超买阈值"},
        "quantity": {"type": "number", "default": 0.01, "label": "交易数量"}
    }

    def on_init(self):
        self.symbol = self.params.get("symbol", "BTC-USDT")
        self.period = self.params.get("period", 14)
        self.oversold = self.params.get("oversold", 30)
        self.overbought = self.params.get("overbought", 70)
        self.quantity = self.params.get("quantity", 0.01)

        self.prices = deque(maxlen=self.period + 1)
        self.position = 0

        self.ctx.log(f"RSI策略初始化: 周期={self.period}, 超卖={self.oversold}, 超买={self.overbought}")

    async def on_tick(self, data: TickData):
        if data.symbol != self.symbol:
            return

        self.prices.append(data.last_price)

        if len(self.prices) < self.period + 1:
            return

        gains = []
        losses = []
        for i in range(1, len(self.prices)):
            change = self.prices[i] - self.prices[i - 1]
            if change > 0:
                gains.append(change)
                losses.append(0)
            else:
                gains.append(0)
                losses.append(abs(change))

        avg_gain = sum(gains) / self.period
        avg_loss = sum(losses) / self.period

        if avg_loss == 0:
            rsi = 100
        else:
            rs = avg_gain / avg_loss
            rsi = 100 - 100 / (1 + rs)

        # RSI < 超卖阈值买入
        if rsi < self.oversold and self.position == 0:
            signal_id = await self.ctx.log_signal("buy", data.last_price, f"RSI={rsi:.1f}低于超卖阈值{self.oversold}")
            if signal_id:
                await self.ctx.buy(self.symbol, self.quantity, data.last_price, signal_id=signal_id)
            else:
                await self.ctx.buy(self.symbol, self.quantity, data.last_price)
            self.position = 1
        # RSI > 超买阈值卖出
        elif rsi > self.overbought and self.position == 1:
            signal_id = await self.ctx.log_signal("sell", data.last_price, f"RSI={rsi:.1f}高于超买阈值{self.overbought}")
            if signal_id:
                await self.ctx.sell(self.symbol, self.quantity, data.last_price, signal_id=signal_id)
            else:
                await self.ctx.sell(self.symbol, self.quantity, data.last_price)
            self.position = 0
