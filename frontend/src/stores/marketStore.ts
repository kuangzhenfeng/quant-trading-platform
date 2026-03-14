import { create } from 'zustand';
import type { Tick } from '../types';

interface MarketState {
  ticks: Record<string, Tick>;
  updateTick: (tick: Tick) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  ticks: {},
  updateTick: (tick) => set((state) => ({
    ticks: { ...state.ticks, [tick.symbol]: tick }
  }))
}));
