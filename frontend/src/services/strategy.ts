import request from './request';

export interface CreateStrategyRequest {
  strategy_type: string;
  broker: string;
  params: Record<string, unknown>;
}

export const strategyApi = {
  getTypes: async () => {
    const { data } = await request.get('/strategy/types');
    return data.types;
  },

  create: async (req: CreateStrategyRequest) => {
    const { data } = await request.post('/strategy/create', req);
    return data;
  },

  start: async (strategyId: string) => {
    const { data } = await request.post(`/strategy/${strategyId}/start`);
    return data;
  },

  stop: async (strategyId: string) => {
    const { data } = await request.post(`/strategy/${strategyId}/stop`);
    return data;
  },

  getLogs: async (strategyId: string) => {
    const { data } = await request.get<{ logs: Array<{timestamp: string; level: string; message: string}> }>(`/strategy/${strategyId}/logs`);
    return data;
  },

  getDetail: async (strategyId: string) => {
    const { data } = await request.get(`/strategy/${strategyId}`);
    return data;
  },

  update: async (strategyId: string, req: CreateStrategyRequest) => {
    const { data } = await request.put(`/strategy/${strategyId}`, req);
    return data;
  },
};
