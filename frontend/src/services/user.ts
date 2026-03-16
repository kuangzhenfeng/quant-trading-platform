import request from './request';
import type { User } from '../types/api';

export const userApi = {
  async list(): Promise<User[]> {
    const { data } = await request.get('/users/');
    return data;
  },

  async delete(username: string): Promise<void> {
    await request.delete(`/users/${username}`);
  },
};
