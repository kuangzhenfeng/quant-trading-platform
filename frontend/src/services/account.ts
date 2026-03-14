import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/account';

export interface BrokerConfig {
  id: string;
  broker: string;
  name: string;
  config: Record<string, any>;
  active: boolean;
}

export const accountApi = {
  list: async () => {
    const { data } = await axios.get(`${API_BASE}/`);
    return data;
  },

  add: async (config: BrokerConfig) => {
    const { data } = await axios.post(`${API_BASE}/`, config);
    return data;
  },

  remove: async (accountId: string) => {
    const { data } = await axios.delete(`${API_BASE}/${accountId}`);
    return data;
  },

  setActive: async (accountId: string, active: boolean) => {
    const { data } = await axios.put(`${API_BASE}/${accountId}/active?active=${active}`);
    return data;
  }
};
