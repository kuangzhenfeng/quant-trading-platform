import { create } from 'zustand';
import { systemApi } from '../services/system';

interface TradingModeState {
  mode: 'live' | 'paper' | 'mock';
  description: string;
  /** 正在切换中的目标模式，null 表示未在切换 */
  switchingTo: 'live' | 'paper' | 'mock' | null;
  fetchMode: () => Promise<void>;
  setMode: (mode: 'live' | 'paper' | 'mock') => Promise<void>;
}

export const useTradingModeStore = create<TradingModeState>((set) => ({
  mode: 'mock',
  description: 'Mock 模式 - 完全模拟',
  switchingTo: null,
  fetchMode: async () => {
    try {
      const response = await fetch('/api/trading/mode');
      const data = await response.json();
      set({ mode: data.mode, description: data.description });
    } catch (error) {
      console.error('Failed to fetch trading mode:', error);
    }
  },
  setMode: async (mode: 'live' | 'paper' | 'mock') => {
    set({ switchingTo: mode });
    try {
      await systemApi.updateConfig([{
        key: 'TRADING_MODE',
        value: mode,
        category: 'system',
        is_sensitive: false,
      }]);
      set({ mode, switchingTo: null });
    } catch (error) {
      set({ switchingTo: null });
      throw error;
    }
  },
}));
