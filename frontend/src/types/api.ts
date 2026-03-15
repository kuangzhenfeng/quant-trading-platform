// API 响应类型定义

import type { Dayjs } from 'dayjs';

export interface ApiError {
  response?: {
    data?: {
      detail?: string;
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
