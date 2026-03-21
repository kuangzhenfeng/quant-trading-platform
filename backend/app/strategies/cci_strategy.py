from collections import deque
from app.strategies.base import Strategy
from app.strategies.registry import StrategyRegistry
from app.models.schemas import TickData

@StrategyRegistry.register("cci")
class CCIStrategy(Strategy):
    """CCI顺势指标策略"""
    PARAMS_SCHEMA = {
        "symbol": {"type": "string", "default": "BTC-USDT", "label": "交易标的"},
        "period": {"type": "number", "default": 20, "label": "CCI周期"},
        "overbought": {"type": "number", "default": 100, "label": "超买"},
        "oversold": {"type": "number", "default": -100, "label": "超卖"},
        "quantity": {"type": "number", "default": 0.01, "label": "数量"},
    }

    def on_init(self):
        self.period = self.params.get("period", 20)
        self.overbought = self.params.get("overbought", 100)
        self.oversold = self.params.get("oversold", -100)
        self.prices = deque(maxlen=self.period)
        self.position = 0

        self.ctx.log(f"CCI策略初始化: 周期={self.period}, 超买={self.overbought}, 超卖={self.oversold}")

    async def on_tick(self, data: TickData):
        if data.symbol != self.params.get("symbol"):
            return

        price = data.last_price
        self.prices.append(price)

        if len(self.prices) < self.period:
            return

        tp = price
        sma = sum(self.prices) / len(self.prices)
        mad = sum(abs(p - sma) for p in self.prices) / len(self.prices)
        cci = (tp - sma) / (mad * 0.015 + 1e-9)
        symbol = self.params.get("symbol", "BTC-USDT")
        quantity = self.params.get("quantity", 0.01)

        if cci < self.oversold and self.position == 0:
            signal_id = await self.ctx.log_signal("buy", price, f"CCI={cci:.1f}<{self.oversold}超卖")
            if signal_id:
                await self.ctx.buy(symbol, quantity, price, signal_id=signal_id)
            else:
                await self.ctx.buy(symbol, quantity, price)
            self.position = 1
        elif cci > self.overbought and self.position == 1:
            signal_id = await self.ctx.log_signal("sell", price, f"CCI={cci:.1f}>{self.overbought}超买")
            if signal_id:
                await self.ctx.sell(symbol, quantity, price, signal_id=signal_id)
            else:
                await self.ctx.sell(symbol, quantity, price)
            self.position = 0
