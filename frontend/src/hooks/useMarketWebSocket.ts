import { useEffect, useRef } from 'react';

interface TickData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: string;
}

interface MarketMessage {
  type: string;
  data?: TickData;
  broker?: string;
  symbols?: string[];
}

export const useMarketWebSocket = (
  clientId: string,
  onTick: (tick: TickData) => void
) => {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    ws.current = new WebSocket(`ws://localhost:9000/ws/market/${clientId}`);

    ws.current.onmessage = (event) => {
      const message: MarketMessage = JSON.parse(event.data);
      if (message.type === 'tick' && message.data) {
        onTick(message.data);
      }
    };

    return () => {
      ws.current?.close();
    };
  }, [clientId, onTick]);

  const subscribe = (broker: string, symbols: string[]) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        action: 'subscribe',
        broker,
        symbols
      }));
    }
  };

  return { subscribe };
};
