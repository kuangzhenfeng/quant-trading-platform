import axios from 'axios';
import { authService } from './auth';

const API_BASE = 'http://localhost:8000';

const getAuthHeader = () => {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const systemApi = {
  async restart(): Promise<void> {
    await axios.post(`${API_BASE}/api/system/restart`, {}, {
      headers: getAuthHeader(),
    });
  },
};
