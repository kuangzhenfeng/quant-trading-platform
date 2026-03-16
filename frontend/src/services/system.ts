import request from './request';

interface ConfigItem {
  key: string;
  value: string;
  category: string;
  is_sensitive: boolean;
}

export const systemApi = {
  async restart(): Promise<void> {
    await request.post('/system/restart', {});
  },
  async updateConfig(configs: ConfigItem[]): Promise<void> {
    await request.put('/system/config', { configs });
  },
};
