import request from './request';
import type { StrategyInfo, BatchResult } from '../types/api';

const API_BASE = '/backtest';

export interface BacktestConfig {
  strategy_id: string;
  symbol: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
}

export const backtestApi = {
  run: async (config: BacktestConfig) => {
    const { data } = await request.post(`${API_BASE}/run`, config);
    return data;
  },

  getResult: async (backtestId: string) => {
    const { data } = await request.get(`${API_BASE}/${backtestId}`);
    return data;
  },

  getStrategies: async () => {
    const { data } = await request.get<{ strategies: StrategyInfo[] }>(`${API_BASE}/strategies`);
    return data;
  },

  runAll: async (config: BacktestConfig) => {
    const { data } = await request.post<{ results: BatchResult[] }>(`${API_BASE}/run-all`, config);
    return data;
  }
};
