import axios from 'axios';
import { authService } from './auth';

const API_BASE = 'http://localhost:9000/api/account';

const getAuthHeaders = () => {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface BrokerConfig {
  id: string;
  broker: string;
  name: string;
  config: Record<string, unknown>;
  active: boolean;
}

export const accountApi = {
  list: async () => {
    const { data } = await axios.get(`${API_BASE}/`, { headers: getAuthHeaders() });
    return data;
  },

  add: async (config: BrokerConfig) => {
    const { data } = await axios.post(`${API_BASE}/`, config, { headers: getAuthHeaders() });
    return data;
  },

  remove: async (accountId: string) => {
    const { data } = await axios.delete(`${API_BASE}/${accountId}`, { headers: getAuthHeaders() });
    return data;
  },

  setActive: async (accountId: string, active: boolean) => {
    const { data } = await axios.put(`${API_BASE}/${accountId}/active?active=${active}`, {}, { headers: getAuthHeaders() });
    return data;
  }
};
