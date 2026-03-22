import request from './request';

export const logsApi = {
  getLogs: async (options?: {
    level?: string;
    source?: string;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (options?.level) params.append('level', options.level.toUpperCase());
    if (options?.source) params.append('source', options.source);
    params.append('limit', (options?.limit ?? 100).toString());
    const { data } = await request.get(`/logs/?${params}`);
    return data;
  },

  /** 直接传入 URLSearchParams 的原始方法，用于日志页面 */
  getLogsRaw: async (params: URLSearchParams) => {
    const { data } = await request.get(`/logs/?${params}`);
    return data;
  }
};
