import request from './request';

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
  status: 'pending' | 'partial' | 'filled' | 'cancelled' | 'rejected';
  created_at?: string;
  broker?: string;
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
    const { data } = await request.post('/trading/order', req);
    return data;
  },

  cancelOrder: async (broker: string, orderId: string) => {
    const { data } = await request.delete(`/trading/order/${broker}/${orderId}`);
    return data;
  },

  getOrder: async (broker: string, orderId: string) => {
    const { data } = await request.get<OrderData>(`/trading/order/${broker}/${orderId}`);
    return data;
  },

  getOrders: async (broker: string) => {
    const { data } = await request.get<{ orders: OrderData[] }>(`/trading/orders/${broker}`);
    return data.orders;
  },

  getPositions: async (broker: string) => {
    const { data } = await request.get<{ positions: PositionData[] }>(`/trading/positions/${broker}`);
    return data.positions;
  },

  getAccount: async (broker: string) => {
    const { data } = await request.get<AccountData>(`/trading/account/${broker}`);
    return data;
  },
};
