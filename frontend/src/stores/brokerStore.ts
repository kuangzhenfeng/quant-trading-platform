import { create } from 'zustand';

interface BrokerState {
  broker: string;
  setBroker: (broker: string) => void;
}

export const useBrokerStore = create<BrokerState>((set) => ({
  broker: 'okx',
  setBroker: (broker) => set({ broker }),
}));
