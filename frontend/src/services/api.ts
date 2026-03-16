const API_BASE = '/api';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function handleUnauthorized() {
  localStorage.removeItem('token');
  window.location.href = '/login';
}

async function handleResponse(response: Response) {
  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

export const api = {
  async get(path: string) {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async post(path: string, data: unknown) {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async put(path: string, data: unknown) {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async delete(path: string) {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },
};
