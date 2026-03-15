import { create } from 'zustand';

interface TradingModeState {
  mode: 'live' | 'paper' | 'mock';
  description: string;
  fetchMode: () => Promise<void>;
}

export const useTradingModeStore = create<TradingModeState>((set) => ({
  mode: 'mock',
  description: 'Mock 模式 - 完全模拟',
  fetchMode: async () => {
    try {
      const response = await fetch('http://localhost:8000/api/trading/mode');
      const data = await response.json();
      set({ mode: data.mode, description: data.description });
    } catch (error) {
      console.error('Failed to fetch trading mode:', error);
    }
  },
}));
