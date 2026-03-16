import { create } from 'zustand';
import { systemApi } from '../services/system';

interface TradingModeState {
  mode: 'live' | 'paper' | 'mock';
  description: string;
  fetchMode: () => Promise<void>;
  setMode: (mode: 'live' | 'paper' | 'mock') => Promise<void>;
}

export const useTradingModeStore = create<TradingModeState>((set) => ({
  mode: 'mock',
  description: 'Mock 模式 - 完全模拟',
  fetchMode: async () => {
    try {
      const response = await fetch('http://localhost:9000/api/trading/mode');
      const data = await response.json();
      set({ mode: data.mode, description: data.description });
    } catch (error) {
      console.error('Failed to fetch trading mode:', error);
    }
  },
  setMode: async (mode: 'live' | 'paper' | 'mock') => {
    await systemApi.updateConfig([{
      key: 'TRADING_MODE',
      value: mode,
      category: 'system',
      is_sensitive: false,
    }]);
    set({ mode });
  },
}));
