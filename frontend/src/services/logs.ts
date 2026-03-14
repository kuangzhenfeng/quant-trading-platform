import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/logs';

export const logsApi = {
  getLogs: async (level?: string, limit: number = 100) => {
    const params = new URLSearchParams();
    if (level) params.append('level', level);
    params.append('limit', limit.toString());
    const { data } = await axios.get(`${API_BASE}/?${params}`);
    return data;
  }
};
