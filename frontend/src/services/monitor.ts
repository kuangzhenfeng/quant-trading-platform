import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/monitor';

export const monitorApi = {
  getPnL: async () => {
    const { data } = await axios.get(`${API_BASE}/pnl`);
    return data;
  },

  getStats: async () => {
    const { data } = await axios.get(`${API_BASE}/stats`);
    return data;
  },

  getStrategies: async () => {
    const { data } = await axios.get(`${API_BASE}/strategies`);
    return data;
  }
};
