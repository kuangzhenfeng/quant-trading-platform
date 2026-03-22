import request from './request';
import type { SignalsResponse, StrategyPerformance, StrategySignal } from '../types/api';

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

  getSignals: async (id: string) => {
    const { data } = await request.get(`/strategy/${id}/signals`);
    return data as SignalsResponse;
  },

  /** 批量获取信号（用于K线图信号叠加） */
  getSignalsBySymbol: async (symbol: string, strategyIds: string[]) => {
    const { data } = await request.get('/strategy/signals', {
      params: { symbol, strategy_ids: strategyIds.join(',') },
    });
    return data as { signals: Record<string, StrategySignal[]> };
  },

  getPerformance: async (id: string) => {
    const { data } = await request.get(`/strategy/${id}/performance`);
    return data as StrategyPerformance;
  },

  deleteStrategy: async (id: string) => {
    const { data } = await request.delete(`/strategy/${id}`);
    return data;
  },

  createAndStartAll: async (broker: string) => {
    const { data } = await request.post('/strategy/create-and-start-all', { broker });
    return data;
  },

  deleteAll: async () => {
    const { data } = await request.post('/strategy/delete-all');
    return data;
  },
};
