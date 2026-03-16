import axios from 'axios';

const API_BASE = 'http://localhost:9000/api/backtest';

export interface BacktestConfig {
  strategy_id: string;
  symbol: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
}

export const backtestApi = {
  run: async (config: BacktestConfig) => {
    const { data } = await axios.post(`${API_BASE}/run`, config);
    return data;
  },

  getResult: async (backtestId: string) => {
    const { data } = await axios.get(`${API_BASE}/${backtestId}`);
    return data;
  }
};
