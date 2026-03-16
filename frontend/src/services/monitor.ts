import request from './request';

export const monitorApi = {
  getPnL: async () => {
    const { data } = await request.get('/monitor/pnl');
    return data;
  },

  getStats: async () => {
    const { data } = await request.get('/monitor/stats');
    return data;
  },

  getStrategies: async () => {
    const { data } = await request.get('/monitor/strategies');
    return data;
  }
};
