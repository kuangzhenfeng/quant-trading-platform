// API 响应类型定义

import type { Dayjs } from 'dayjs';

export interface ApiError {
  response?: {
    data?: {
      /** 后端统一错误响应的 message 字段 */
      message?: string;
      /** 原始 HTTP 异常的 detail 字段 */
      detail?: string;
      /** 错误码 */
      error_code?: string;
    };
  };
}

export interface LogEntry {
  timestamp: string;
  level: string;
  source: string;
  message: string;
}

export interface LogsResponse {
  logs: LogEntry[];
}

export interface Strategy {
  id: string;
  broker: string;
  running: boolean;
  log_count: number;
  unrealized_pnl: number;
  total_trades: number;
  total_return: number | null;
  win_rate: number | null;
}

export interface StrategySignal {
  id: number;
  strategy_id: string;
  timestamp: string;
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  reason: string;
  status: 'pending' | 'filled' | 'failed';
}

export interface StrategyPerformance {
  total_return: number;
  max_drawdown: number;
  win_rate: number;
  profit_loss_ratio: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  avg_profit: number;
  avg_loss: number;
}

export interface SignalsResponse {
  signals: StrategySignal[];
}

export interface StrategiesResponse {
  strategies: Strategy[];
}

export interface Position {
  symbol: string;
  quantity: number;
  avg_price: number;
  unrealized_pnl: number;
}

export interface PnLData {
  total_pnl: number;
  position_count: number;
  positions: Position[];
}

export interface StatsData {
  total_orders: number;
  filled_orders: number;
}

export interface BacktestResult {
  total_return: number;
  max_drawdown: number;
  win_rate: number;
  total_trades: number;
}

export interface StrategyInfo {
  type: string;
  strategy_id: string;
  name: string;
  description: string;
  category: string;
}

export interface BatchResult {
  strategy_id: string;
  name: string;
  category: string;
  result: BacktestResult | null;
  error: string | null;
}

// 表单类型定义
export interface BacktestFormValues {
  strategy_id: string;
  symbol: string;
  date_range: [Dayjs, Dayjs];
  initial_capital: number;
}

export interface AccountFormValues {
  broker: string;
  name: string;
  config?: string;
}

export interface User {
  username: string;
  created_at: string;
}
