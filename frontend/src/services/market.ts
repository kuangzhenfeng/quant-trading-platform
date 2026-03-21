import request from './request';

export interface KlineData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface KlinesResponse {
  symbol: string;
  broker: string;
  interval: string;
  klines: KlineData[];
}

export const marketApi = {
  getKlines: async (symbol: string, broker: string, interval: string, limit: number = 100) => {
    const { data } = await request.get<KlinesResponse>(
      `/market/klines/${symbol}?broker=${broker}&interval=${interval}&limit=${limit}`
    );
    return data;
  },

  getTick: async (symbol: string, broker: string) => {
    const { data } = await request.get(`/market/tick/${symbol}?broker=${broker}`);
    return data;
  }
};
