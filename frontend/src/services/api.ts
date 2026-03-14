const API_BASE = '/api';

export const api = {
  async get(path: string) {
    const response = await fetch(`${API_BASE}${path}`);
    return response.json();
  },

  async post(path: string, data: unknown) {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};
