export interface Tick {
  symbol: string;
  price: number;
  volume: number;
  timestamp: string;
}

export interface Order {
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  quantity: number;
  price?: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
}

export interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  unrealizedPnl: number;
}

export interface Account {
  broker: 'guojin' | 'moomoo' | 'okx' | 'mock';
  balance: number;
  available: number;
  frozen?: number;
}

export interface WSMessage {
  type: 'tick' | 'order' | 'position' | 'account';
  broker?: string;
  data: unknown;
  timestamp: string;
}
