from collections import deque
from app.strategies.base import Strategy
from app.strategies.registry import StrategyRegistry
from app.models.schemas import TickData


@StrategyRegistry.register("adx")
class ADXStrategy(Strategy):
    """ADX趋势强度策略"""
    PARAMS_SCHEMA = {
        "period": {"type": "number", "default": 14, "label": "ADX周期"},
        "adx_threshold": {"type": "number", "default": 25, "label": "ADX阈值"},
        "symbol": {"type": "string", "default": "BTC-USDT", "label": "交易标的"},
        "quantity": {"type": "number", "default": 0.01, "label": "数量"},
    }

    def __init__(self, name: str, params: dict):
        super().__init__(name, params)
        self.period = params.get("period", 14)
        self.adx_threshold = params.get("adx_threshold", 25)
        self.prices = deque(maxlen=self.period * 2)
        self.plus_dm = deque(maxlen=self.period)
        self.minus_dm = deque(maxlen=self.period)
        self.tr = deque(maxlen=self.period)

    def on_init(self):
        self.position = 0
        self.ctx.log(f"ADX策略初始化: 周期={self.period}, 阈值={self.adx_threshold}")

    def _update_dm_tr(self, high, low, prev_high, prev_low):
        tr = high - low
        up = high - prev_high
        down = prev_low - low
        plus_dm = up if up > down and up > 0 else 0
        minus_dm = down if down > up and down > 0 else 0
        return tr, plus_dm, minus_dm

    async def on_tick(self, data: TickData):
        symbol = self.params.get("symbol")
        quantity = self.params.get("quantity", 0.01)
        if data.symbol != symbol:
            return

        price = data.last_price
        self.prices.append(price)

        if len(self.prices) < 2:
            return

        prev_price = self.prices[-2]
        high, low = price, price
        prev_high = prev_price
        prev_low = prev_price
        tr, pdm, mdm = self._update_dm_tr(high, low, prev_high, prev_low)
        self.tr.append(tr)
        self.plus_dm.append(pdm)
        self.minus_dm.append(mdm)

        if len(self.tr) < self.period:
            return

        avg_tr = sum(self.tr) / self.period
        avg_plus_dm = sum(self.plus_dm) / self.period
        avg_minus_dm = sum(self.minus_dm) / self.period

        if avg_tr == 0:
            return

        plus_di = 100 * avg_plus_dm / avg_tr
        minus_di = 100 * avg_minus_dm / avg_tr
        dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di + 1e-9)
        adx = dx

        if plus_di > minus_di and adx > self.adx_threshold and self.position == 0:
            signal_id = await self.ctx.log_signal("buy", price, f"ADX={adx:.1f}>{self.adx_threshold}, +DI>-DI上升趋势")
            if signal_id:
                await self.ctx.buy(symbol, quantity, price, signal_id=signal_id)
            else:
                await self.ctx.buy(symbol, quantity, price)
            self.position = 1
        elif minus_di > plus_di and self.position == 1:
            signal_id = await self.ctx.log_signal("sell", price, f"ADX={adx:.1f}, -DI>+DI下降趋势")
            if signal_id:
                await self.ctx.sell(symbol, quantity, price, signal_id=signal_id)
            else:
                await self.ctx.sell(symbol, quantity, price)
            self.position = 0
