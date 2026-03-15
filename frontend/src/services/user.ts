import axios from 'axios';
import type { User } from '../types/api';
import { authService } from './auth';

const API_BASE = 'http://localhost:8000';

const getAuthHeader = () => {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const userApi = {
  async list(): Promise<User[]> {
    const { data } = await axios.get(`${API_BASE}/api/users/`, {
      headers: getAuthHeader(),
    });
    return data;
  },

  async delete(username: string): Promise<void> {
    await axios.delete(`${API_BASE}/api/users/${username}`, {
      headers: getAuthHeader(),
    });
  },
};
