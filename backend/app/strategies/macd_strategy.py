from collections import deque
from app.strategies.base import Strategy
from app.strategies.registry import StrategyRegistry
from app.models.schemas import TickData


@StrategyRegistry.register("macd")
class MACDStrategy(Strategy):
    """MACD策略"""
    PARAMS_SCHEMA = {
        "symbol": {"type": "string", "default": "BTC-USDT", "label": "交易标的"},
        "fast_period": {"type": "number", "default": 12, "label": "快线周期"},
        "slow_period": {"type": "number", "default": 26, "label": "慢线周期"},
        "signal_period": {"type": "number", "default": 9, "label": "信号线周期"},
        "quantity": {"type": "number", "default": 0.01, "label": "交易数量"}
    }

    def on_init(self):
        self.symbol = self.params.get("symbol", "BTC-USDT")
        self.fast_period = self.params.get("fast_period", 12)
        self.slow_period = self.params.get("slow_period", 26)
        self.signal_period = self.params.get("signal_period", 9)
        self.quantity = self.params.get("quantity", 0.01)

        self.prices = deque(maxlen=self.slow_period * 2)
        self.macd_values = deque(maxlen=self.signal_period)
        self.position = 0
        self.prev_macd = None
        self.prev_signal = None

        self.ctx.log(f"MACD策略初始化: 快={self.fast_period}, 慢={self.slow_period}, 信号={self.signal_period}")

    def _ema(self, data, period):
        """计算EMA"""
        if len(data) < period:
            return None
        multiplier = 2 / (period + 1)
        ema = sum(list(data)[:period]) / period
        for price in list(data)[period:]:
            ema = (price - ema) * multiplier + ema
        return ema

    async def on_tick(self, data: TickData):
        if data.symbol != self.symbol:
            return

        self.prices.append(data.last_price)

        if len(self.prices) < self.slow_period:
            return

        fast_ema = self._ema(self.prices, self.fast_period)
        slow_ema = self._ema(self.prices, self.slow_period)

        if fast_ema is None or slow_ema is None:
            return

        macd = fast_ema - slow_ema
        self.macd_values.append(macd)

        if len(self.macd_values) < self.signal_period:
            return

        signal = sum(self.macd_values) / len(self.macd_values)

        if self.prev_macd is not None and self.prev_signal is not None:
            # 金叉买入
            if self.prev_macd <= self.prev_signal and macd > signal and self.position == 0:
                await self.ctx.buy(self.symbol, self.quantity, data.last_price)
                self.position = 1
            # 死叉卖出
            elif self.prev_macd >= self.prev_signal and macd < signal and self.position == 1:
                await self.ctx.sell(self.symbol, self.quantity, data.last_price)
                self.position = 0

        self.prev_macd = macd
        self.prev_signal = signal
