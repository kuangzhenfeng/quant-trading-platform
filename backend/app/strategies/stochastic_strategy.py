from collections import deque
from app.strategies.base import Strategy
from app.strategies.registry import StrategyRegistry
from app.models.schemas import TickData


@StrategyRegistry.register("stochastic")
class StochasticStrategy(Strategy):
    """Stochastic随机指标策略"""
    PARAMS_SCHEMA = {
        "k_period": {"type": "number", "default": 14, "label": "K周期"},
        "d_period": {"type": "number", "default": 3, "label": "D周期"},
        "overbought": {"type": "number", "default": 80, "label": "超买"},
        "oversold": {"type": "number", "default": 20, "label": "超卖"},
        "symbol": {"type": "string", "default": "BTC-USDT", "label": "交易标的"},
        "quantity": {"type": "number", "default": 0.01, "label": "数量"},
    }

    def __init__(self, name: str, params: dict):
        super().__init__(name, params)
        self.k_period = params.get("k_period", 14)
        self.d_period = params.get("d_period", 3)
        self.overbought = params.get("overbought", 80)
        self.oversold = params.get("oversold", 20)
        self.highs = deque(maxlen=self.k_period)
        self.lows = deque(maxlen=self.k_period)
        self.closes = deque(maxlen=self.k_period)

    def on_init(self):
        self.position = 0
        self.ctx.log(f"Stochastic策略初始化: K周期={self.k_period}, D周期={self.d_period}, 超买={self.overbought}, 超卖={self.oversold}")

    async def on_tick(self, data: TickData):
        symbol = self.params.get("symbol")
        quantity = self.params.get("quantity", 0.01)
        if data.symbol != symbol:
            return

        price = data.last_price
        self.closes.append(price)
        self.highs.append(price)
        self.lows.append(price)

        if len(self.closes) < self.k_period:
            return

        k = 100 * (price - min(self.lows)) / (max(self.highs) - min(self.lows) + 1e-9)

        if k < self.oversold and self.position == 0:
            signal_id = await self.ctx.log_signal("buy", price, f"Stochastic K={k:.1f}<{self.oversold}超卖")
            if signal_id:
                await self.ctx.buy(symbol, quantity, price, signal_id=signal_id)
            else:
                await self.ctx.buy(symbol, quantity, price)
            self.position = 1
        elif k > self.overbought and self.position == 1:
            signal_id = await self.ctx.log_signal("sell", price, f"Stochastic K={k:.1f}>{self.overbought}超买")
            if signal_id:
                await self.ctx.sell(symbol, quantity, price, signal_id=signal_id)
            else:
                await self.ctx.sell(symbol, quantity, price)
            self.position = 0
