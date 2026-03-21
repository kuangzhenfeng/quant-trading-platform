from app.strategies.base import Strategy
from app.strategies.registry import StrategyRegistry
from app.models.schemas import TickData


@StrategyRegistry.register("parabolic")
class ParabolicSARStrategy(Strategy):
    """Parabolic SAR策略"""
    PARAMS_SCHEMA = {
        "start": {"type": "number", "default": 0.02, "label": "初始AF"},
        "increment": {"type": "number", "default": 0.02, "label": "AF增量"},
        "max": {"type": "number", "default": 0.2, "label": "AF最大值"},
        "symbol": {"type": "string", "default": "BTC-USDT", "label": "交易标的"},
        "quantity": {"type": "number", "default": 0.01, "label": "数量"},
    }

    def __init__(self, name: str, params: dict):
        super().__init__(name, params)
        self.af = params.get("start", 0.02)
        self.inc = params.get("increment", 0.02)
        self.max_af = params.get("max", 0.2)

    def on_init(self):
        self.position = 0
        self.ep = 0.0
        self.prev_sar = 0.0
        self.highest_high = 0.0
        self.lowest_low = float('inf')
        self.ctx.log(f"Parabolic SAR策略初始化: AF={self.af}, 增量={self.inc}, 最大={self.max_af}")

    async def on_tick(self, data: TickData):
        symbol = self.params.get("symbol")
        quantity = self.params.get("quantity", 0.01)
        if data.symbol != symbol:
            return

        price = data.last_price

        if self.position == 0:
            self.highest_high = price
            self.lowest_low = price
            self.ep = price
            self.position = 1
            self.ctx.log(f"初始做多, EP={self.ep}, AF={self.af:.4f}")
        else:
            if price > self.highest_high:
                self.highest_high = price
                self.af = min(self.af + self.inc, self.max_af)
                self.ep = self.highest_high
            elif price < self.lowest_low:
                self.lowest_low = price

            sar = self.prev_sar + self.af * (self.ep - self.prev_sar)

            if self.position == 1:
                if price < sar:
                    signal_id = await self.ctx.log_signal("sell", price, f"SAR反转卖出, SAR={sar:.2f}")
                    if signal_id:
                        await self.ctx.sell(symbol, quantity, price, signal_id=signal_id)
                    else:
                        await self.ctx.sell(symbol, quantity, price)
                    self.position = -1
                    self.ep = price
                    self.lowest_low = price
                    self.af = self.params.get("start", 0.02)
                    self.prev_sar = self.highest_high
                else:
                    sar = min(sar, self.lowest_low, price)
                    self.prev_sar = sar
            elif self.position == -1:
                if price > sar:
                    signal_id = await self.ctx.log_signal("buy", price, f"SAR反转买入, SAR={sar:.2f}")
                    if signal_id:
                        await self.ctx.buy(symbol, quantity, price, signal_id=signal_id)
                    else:
                        await self.ctx.buy(symbol, quantity, price)
                    self.position = 1
                    self.ep = price
                    self.highest_high = price
                    self.af = self.params.get("start", 0.02)
                    self.prev_sar = self.lowest_low
                else:
                    sar = max(sar, self.highest_high, price)
                    self.prev_sar = sar
