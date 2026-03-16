import axios from 'axios';
import { authService } from './auth';

const API_BASE = 'http://localhost:9000/api/trading';

// 添加请求拦截器以附加 token
axios.interceptors.request.use((config) => {
  const token = authService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 添加响应拦截器处理 401
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authService.logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface PlaceOrderRequest {
  broker: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  quantity: number;
  price?: number;
}

export interface OrderData {
  order_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  quantity: number;
  price?: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
}

export interface PositionData {
  symbol: string;
  quantity: number;
  avg_price: number;
  unrealized_pnl: number;
}

export interface AccountData {
  broker: string;
  balance: number;
  available: number;
  frozen: number;
}

export const tradingApi = {
  placeOrder: async (req: PlaceOrderRequest) => {
    const { data } = await axios.post(`${API_BASE}/order`, req);
    return data;
  },

  cancelOrder: async (broker: string, orderId: string) => {
    const { data } = await axios.delete(`${API_BASE}/order/${broker}/${orderId}`);
    return data;
  },

  getOrder: async (broker: string, orderId: string) => {
    const { data } = await axios.get<OrderData>(`${API_BASE}/order/${broker}/${orderId}`);
    return data;
  },

  getPositions: async (broker: string) => {
    const { data } = await axios.get<{ positions: PositionData[] }>(`${API_BASE}/positions/${broker}`);
    return data.positions;
  },

  getAccount: async (broker: string) => {
    const { data } = await axios.get<AccountData>(`${API_BASE}/account/${broker}`);
    return data;
  },
};
