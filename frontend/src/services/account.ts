import request from './request';

export interface BrokerConfig {
  id: string;
  broker: string;
  name: string;
  config: Record<string, unknown>;
  active: boolean;
}

export const accountApi = {
  list: async () => {
    const { data } = await request.get('/account/');
    return data;
  },

  add: async (config: BrokerConfig) => {
    const { data } = await request.post('/account/', config);
    return data;
  },

  remove: async (accountId: string) => {
    const { data } = await request.delete(`/account/${accountId}`);
    return data;
  },

  setActive: async (accountId: string, active: boolean) => {
    const { data } = await request.put(`/account/${accountId}/active`, { active });
    return data;
  },

  batchImport: async (accounts: Array<{ broker: string; name: string; config: Record<string, unknown> }>) => {
    const { data } = await request.post('/account/batch-import', { accounts });
    return data;
  }
};
