from collections import deque
from app.strategies.base import Strategy
from app.strategies.registry import StrategyRegistry
from app.models.schemas import TickData

@StrategyRegistry.register("ichimoku")
class IchimokuStrategy(Strategy):
    PARAMS_SCHEMA = {
        "conv": {"type": "number", "default": 9, "label": "转换线周期"},
        "base": {"type": "number", "default": 26, "label": "基准线周期"},
        "span_b": {"type": "number", "default": 52, "label": "延期线B周期"},
        "displ": {"type": "number", "default": 26, "label": "前移周期"},
        "symbol": {"type": "string", "default": "BTC-USDT", "label": "交易标的"},
        "quantity": {"type": "number", "default": 0.01, "label": "数量"},
    }

    def __init__(self, name: str, params: dict):
        super().__init__(name, params)
        self.conv_period = params.get("conv", 9)
        self.base_period = params.get("base", 26)
        self.span_b_period = params.get("span_b", 52)
        self.displ = params.get("displ", 26)
        self.prices = deque(maxlen=max(self.conv_period, self.base_period, self.span_b_period) + 1)

    def on_init(self):
        self.position = 0

    async def on_tick(self, data: TickData):
        if data.symbol != self.params.get("symbol"):
            return

        price = data.last_price
        self.prices.append(price)

        min_len = max(self.conv_period, self.base_period, self.span_b_period) + 1
        if len(self.prices) < min_len:
            return

        plist = list(self.prices)
        conv = (max(plist[-self.conv_period:]) + min(plist[-self.conv_period:])) / 2
        base = (max(plist[-self.base_period:]) + min(plist[-self.base_period:])) / 2
        span_b = (max(plist[-self.span_b_period:]) + min(plist[-self.span_b_period:])) / 2

        above_cloud = price > span_b
        below_cloud = price < span_b
        symbol = self.params.get("symbol", "BTC-USDT")
        quantity = self.params.get("quantity", 0.01)

        if above_cloud and conv > base and self.position == 0:
            signal_id = await self.ctx.log_signal("buy", price, "云上+转换线>基准线买入")
            if signal_id:
                await self.ctx.buy(symbol, quantity, price, signal_id=signal_id)
            else:
                await self.ctx.buy(symbol, quantity, price)
            self.position = 1
        elif below_cloud and conv < base and self.position == 1:
            signal_id = await self.ctx.log_signal("sell", price, "云下+转换线<基准线卖出")
            if signal_id:
                await self.ctx.sell(symbol, quantity, price, signal_id=signal_id)
            else:
                await self.ctx.sell(symbol, quantity, price)
            self.position = 0
