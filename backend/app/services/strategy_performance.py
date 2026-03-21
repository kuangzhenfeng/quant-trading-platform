"""策略绩效计算服务"""

from app.core.database import AsyncSessionLocal
from app.models.db_models import DBStrategyPerformance, DBStrategySignal
from sqlalchemy import select


# 全零字典
ZERO_METRICS = {
    "total_return": 0.0,
    "max_drawdown": 0.0,
    "win_rate": 0.0,
    "profit_loss_ratio": 0.0,
    "total_trades": 0,
    "winning_trades": 0,
    "losing_trades": 0,
    "avg_profit": 0.0,
    "avg_loss": 0.0,
}


class StrategyPerformanceService:
    """策略绩效计算服务"""

    async def calculate_metrics(self, strategy_id: str) -> dict:
        """从 strategy_signals 表计算绩效指标"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(DBStrategySignal)
                .where(DBStrategySignal.strategy_id == strategy_id)
                .order_by(DBStrategySignal.timestamp)
            )
            signals = result.scalars().all()

        if not signals:
            return ZERO_METRICS.copy()

        # 配对交易：buy + sell -> 一笔完整交易
        # buy_stack: list of (price, quantity) for unmatched buys
        trades = []
        buy_stack: list[tuple[float, float]] = []  # (price, quantity)
        total_buy_cost = 0.0
        total_sell_revenue = 0.0

        for sig in signals:
            if sig.side == "buy" and sig.status == "filled":
                buy_stack.append((sig.price, sig.quantity))
            elif sig.side == "sell" and sig.status == "filled" and buy_stack:
                remaining_sell_qty = sig.quantity
                while remaining_sell_qty > 0 and buy_stack:
                    buy_price, buy_qty = buy_stack.pop(0)
                    # 修复 Issue 2: 使用最小数量避免超量计数
                    matched_qty = min(buy_qty, remaining_sell_qty)
                    pnl = (sig.price - buy_price) * matched_qty
                    total_buy_cost += buy_price * matched_qty
                    total_sell_revenue += sig.price * matched_qty
                    trades.append({
                        "buy_price": buy_price,
                        "sell_price": sig.price,
                        "quantity": matched_qty,
                        "pnl": pnl,
                        "buy_timestamp": sig.timestamp,  # approximate; sig is sell signal
                        "sell_timestamp": sig.timestamp,
                    })
                    # 处理部分消耗：如果数量不完全匹配，把剩余放回栈
                    remaining_sell_qty -= matched_qty
                    if remaining_sell_qty > 0:
                        # 卖出的剩余量需要下一个买入来匹配
                        # 当前没有更多买入，跳出
                        break
                    elif buy_qty > matched_qty:
                        # 买入的剩余量放回栈
                        buy_stack.insert(0, (buy_price, buy_qty - matched_qty))
                        break

        if not trades:
            return ZERO_METRICS.copy()

        # 计算总收益率 = (总卖出收入 - 总买入成本) / 总买入成本 * 100
        total_return = (total_sell_revenue - total_buy_cost) / total_buy_cost * 100 if total_buy_cost > 0 else 0.0

        # 统计胜负
        winning_trades = sum(1 for t in trades if t["pnl"] > 0)
        losing_trades = sum(1 for t in trades if t["pnl"] <= 0)
        total_trades = len(trades)

        # 胜率
        win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0.0

        # 平均盈利/亏损
        winning_pnls = [t["pnl"] for t in trades if t["pnl"] > 0]
        losing_pnls = [t["pnl"] for t in trades if t["pnl"] <= 0]
        avg_profit = (sum(winning_pnls) / len(winning_pnls)) if winning_pnls else 0.0
        avg_loss = (sum(losing_pnls) / len(losing_pnls)) if losing_pnls else 0.0

        # 盈亏比
        profit_loss_ratio = abs(avg_profit / avg_loss) if avg_loss != 0 else 0.0

        # 最大回撤：从权益曲线计算
        # 修复 Issue 1: 权益曲线从0开始，累加每笔交易的PnL（累计已实现盈亏）
        equity = 0.0
        peak = 0.0
        max_dd = 0.0
        for trade in trades:
            equity += trade["pnl"]
            if equity > peak:
                peak = equity
            if peak > 0:
                dd = (peak - equity) / peak * 100
            else:
                dd = 0.0
            if dd > max_dd:
                max_dd = dd

        return {
            "total_return": round(total_return, 4),
            "max_drawdown": round(max_dd, 4),
            "win_rate": round(win_rate, 4),
            "profit_loss_ratio": round(profit_loss_ratio, 4),
            "total_trades": total_trades,
            "winning_trades": winning_trades,
            "losing_trades": losing_trades,
            "avg_profit": round(avg_profit, 4),
            "avg_loss": round(avg_loss, 4),
        }

    async def update_snapshot(self, strategy_id: str) -> None:
        """将计算结果写入/更新 strategy_performance 快照表"""
        metrics = await self.calculate_metrics(strategy_id)
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(DBStrategyPerformance)
                .where(DBStrategyPerformance.strategy_id == strategy_id)
            )
            existing = result.scalar_one_or_none()
            if existing:
                for key, value in metrics.items():
                    setattr(existing, key, value)
            else:
                perf = DBStrategyPerformance(strategy_id=strategy_id, **metrics)
                session.add(perf)
            await session.commit()

    async def get_snapshot(self, strategy_id: str) -> dict | None:
        """从快照表读取绩效数据"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(DBStrategyPerformance)
                .where(DBStrategyPerformance.strategy_id == strategy_id)
            )
            row = result.scalar_one_or_none()
            if not row:
                return None
            return {
                "strategy_id": row.strategy_id,
                "total_return": row.total_return,
                "max_drawdown": row.max_drawdown,
                "win_rate": row.win_rate,
                "profit_loss_ratio": row.profit_loss_ratio,
                "total_trades": row.total_trades,
                "winning_trades": row.winning_trades,
                "losing_trades": row.losing_trades,
                "avg_profit": row.avg_profit,
                "avg_loss": row.avg_loss,
                "updated_at": row.updated_at,
            }


performance_service = StrategyPerformanceService()
