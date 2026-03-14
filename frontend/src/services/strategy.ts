import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/strategy';

export interface CreateStrategyRequest {
  strategy_type: string;
  broker: string;
  params: Record<string, unknown>;
}

export const strategyApi = {
  create: async (req: CreateStrategyRequest) => {
    const { data } = await axios.post(`${API_BASE}/create`, req);
    return data;
  },

  start: async (strategyId: string) => {
    const { data } = await axios.post(`${API_BASE}/${strategyId}/start`);
    return data;
  },

  stop: async (strategyId: string) => {
    const { data } = await axios.post(`${API_BASE}/${strategyId}/stop`);
    return data;
  },

  getLogs: async (strategyId: string) => {
    const { data } = await axios.get<{ logs: string[] }>(`${API_BASE}/${strategyId}/logs`);
    return data.logs;
  },
};
