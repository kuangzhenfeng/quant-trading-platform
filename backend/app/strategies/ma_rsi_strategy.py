from collections import deque
from app.strategies.base import Strategy
from app.strategies.registry import StrategyRegistry
from app.models.schemas import TickData

@StrategyRegistry.register("ma_rsi")
class MARSIComboStrategy(Strategy):
    PARAMS_SCHEMA = {
        "ma_period": {"type": "number", "default": 20, "label": "MA周期"},
        "rsi_period": {"type": "number", "default": 14, "label": "RSI周期"},
        "rsi_overbought": {"type": "number", "default": 70, "label": "RSI超买"},
        "rsi_oversold": {"type": "number", "default": 30, "label": "RSI超卖"},
        "symbol": {"type": "string", "default": "BTC-USDT", "label": "交易标的"},
        "quantity": {"type": "number", "default": 0.01, "label": "数量"},
    }

    def __init__(self, name: str, params: dict):
        super().__init__(name, params)
        self.ma_period = params.get("ma_period", 20)
        self.rsi_period = params.get("rsi_period", 14)
        self.rsi_overbought = params.get("rsi_overbought", 70)
        self.rsi_oversold = params.get("rsi_oversold", 30)
        self.prices = deque(maxlen=max(self.ma_period, self.rsi_period) + 1)

    def on_init(self):
        self.position = 0

    def _calc_ma(self, prices_list):
        return sum(prices_list) / len(prices_list)

    def _calc_rsi(self, prices_list):
        gains, losses = 0, 0
        for i in range(1, len(prices_list)):
            diff = prices_list[i] - prices_list[i-1]
            if diff > 0:
                gains += diff
            else:
                losses += abs(diff)
        if losses == 0:
            return 100
        rs = gains / losses
        return 100 - 100 / (1 + rs)

    async def on_tick(self, data: TickData):
        if data.symbol != self.params.get("symbol"):
            return

        price = data.last_price
        self.prices.append(price)

        if len(self.prices) < max(self.ma_period, self.rsi_period) + 1:
            return

        plist = list(self.prices)
        ma = self._calc_ma(plist[-self.ma_period:])
        rsi = self._calc_rsi(plist[-self.rsi_period:])
        symbol = self.params.get("symbol", "BTC-USDT")
        quantity = self.params.get("quantity", 0.01)

        if price > ma and rsi < self.rsi_oversold and self.position == 0:
            signal_id = await self.ctx.log_signal("buy", price, f"价格>{ma:.2f}且RSI={rsi:.1f}<{self.rsi_oversold}")
            if signal_id:
                await self.ctx.buy(symbol, quantity, price, signal_id=signal_id)
            else:
                await self.ctx.buy(symbol, quantity, price)
            self.position = 1
        elif price < ma and rsi > self.rsi_overbought and self.position == 1:
            signal_id = await self.ctx.log_signal("sell", price, f"价格<{ma:.2f}且RSI={rsi:.1f}>{self.rsi_overbought}")
            if signal_id:
                await self.ctx.sell(symbol, quantity, price, signal_id=signal_id)
            else:
                await self.ctx.sell(symbol, quantity, price)
            self.position = 0
