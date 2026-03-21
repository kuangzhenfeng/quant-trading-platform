import request from './request';

export const logsApi = {
  getLogs: async (options?: {
    level?: string;
    source?: string;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (options?.level) params.append('level', options.level);
    if (options?.source) params.append('source', options.source);
    params.append('limit', (options?.limit ?? 100).toString());
    const { data } = await request.get(`/logs/?${params}`);
    return data;
  }
};
