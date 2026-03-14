from typing import List
from datetime import datetime, timedelta
import random
from app.models.schemas import TickData, BacktestConfig, BacktestResult
from app.strategies.base import Strategy, StrategyContext


class BacktestEngine:
    """回测引擎"""

    def __init__(self):
        self.results = {}

    def generate_historical_data(self, symbol: str, start_date: str, end_date: str) -> List[TickData]:
        """生成模拟历史数据"""
        data = []
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
        current = start
        price = 50000.0

        while current <= end:
            price = price * (1 + random.uniform(-0.02, 0.02))
            data.append(TickData(
                broker="backtest",
                symbol=symbol,
                last_price=price,
                volume=random.randint(1000, 10000),
                timestamp=current
            ))
            current += timedelta(hours=1)

        return data

    async def run_backtest(self, config: BacktestConfig, strategy: Strategy) -> str:
        """运行回测"""
        backtest_id = f"bt_{int(datetime.now().timestamp())}"

        # 生成历史数据
        historical_data = self.generate_historical_data(
            config.symbol, config.start_date, config.end_date
        )

        # 创建回测上下文
        ctx = BacktestContext(config.initial_capital)
        strategy.init(ctx)

        # 回放历史数据
        for tick in historical_data:
            await strategy.on_tick(tick)

        # 计算绩效
        result = self._calculate_performance(ctx)
        self.results[backtest_id] = result

        return backtest_id

    def _calculate_performance(self, ctx) -> BacktestResult:
        """计算绩效指标"""
        total_return = (ctx.capital - ctx.initial_capital) / ctx.initial_capital
        trades = ctx.trades
        winning_trades = [t for t in trades if t.get('pnl', 0) > 0]
        win_rate = len(winning_trades) / len(trades) if trades else 0

        # 计算最大回撤
        equity_curve = ctx.equity_curve
        max_drawdown = 0
        peak = equity_curve[0] if equity_curve else 0
        for equity in equity_curve:
            if equity > peak:
                peak = equity
            drawdown = (peak - equity) / peak if peak > 0 else 0
            max_drawdown = max(max_drawdown, drawdown)

        return BacktestResult(
            total_return=total_return,
            max_drawdown=max_drawdown,
            win_rate=win_rate,
            total_trades=len(trades)
        )

    def get_result(self, backtest_id: str) -> BacktestResult | None:
        """获取回测结果"""
        return self.results.get(backtest_id)


class BacktestContext:
    """回测上下文"""

    def __init__(self, initial_capital: float):
        self.initial_capital = initial_capital
        self.capital = initial_capital
        self.position = 0
        self.trades = []
        self.equity_curve = [initial_capital]
        self.logs = []

    async def buy(self, symbol: str, quantity: float, price: float):
        """买入"""
        cost = quantity * price
        if cost <= self.capital:
            self.capital -= cost
            self.position += quantity
            self.trades.append({'type': 'buy', 'price': price, 'quantity': quantity})
            self.log(f"买入 {quantity} @ {price}")

    async def sell(self, symbol: str, quantity: float, price: float):
        """卖出"""
        if quantity <= self.position:
            revenue = quantity * price
            self.capital += revenue
            self.position -= quantity
            avg_cost = sum(t['price'] * t['quantity'] for t in self.trades if t['type'] == 'buy') / sum(t['quantity'] for t in self.trades if t['type'] == 'buy')
            pnl = (price - avg_cost) * quantity
            self.trades.append({'type': 'sell', 'price': price, 'quantity': quantity, 'pnl': pnl})
            self.equity_curve.append(self.capital + self.position * price)
            self.log(f"卖出 {quantity} @ {price}, PnL: {pnl:.2f}")

    def get_price(self, symbol: str) -> float:
        """获取当前价格（回测中不需要实现）"""
        return 0

    def log(self, message: str):
        """记录日志"""
        self.logs.append(message)


backtest_engine = BacktestEngine()
