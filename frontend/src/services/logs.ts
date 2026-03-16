import request from './request';

export const logsApi = {
  getLogs: async (level?: string, limit: number = 100) => {
    const params = new URLSearchParams();
    if (level) params.append('level', level);
    params.append('limit', limit.toString());
    const { data } = await request.get(`/logs/?${params}`);
    return data;
  }
};
