import { create } from 'zustand';
import type { Account } from '../types';

interface AccountState {
  account: Account | null;
  setAccount: (account: Account) => void;
}

export const useAccountStore = create<AccountState>((set) => ({
  account: null,
  setAccount: (account) => set({ account })
}));
