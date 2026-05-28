import { create } from 'zustand';
import type { Transaction, MergeRule, WhitelistItem } from '../types';
import { DEFAULT_FILTER_OPTIONS, type FilterOptions } from '../lib/pipeline';
import { updateTransactions, updateConfig, verifyPin } from '../lib/api';

interface SpaceState {
  // App state
  spaceId: string | null;
  role: 'admin' | 'guest' | null;
  isInitializing: boolean;
  syncStatus: 'synced' | 'syncing' | 'error';
  errorMsg: string;
  successMsg: string;

  // Data state
  transactions: Transaction[];
  whitelist: WhitelistItem[];
  mergeRules: MergeRule[];
  filterOptions: FilterOptions;

  // Actions - Setters
  setSpaceId: (id: string | null) => void;
  setRole: (role: 'admin' | 'guest' | null) => void;
  setIsInitializing: (init: boolean) => void;
  setErrorMsg: (msg: string) => void;
  setSuccessMsg: (msg: string) => void;

  // Actions - Data & Sync
  syncTransactions: (newTx: Transaction[]) => Promise<void>;
  syncConfig: (cfgData: Partial<{ whitelist: WhitelistItem[], mergeRules: MergeRule[], filterOptions: FilterOptions }>) => Promise<void>;
  
  // Specific Data Modifiers (these will automatically sync to cloud)
  updateWhitelist: (updater: WhitelistItem[] | ((prev: WhitelistItem[]) => WhitelistItem[])) => void;
  updateMergeRules: (updater: MergeRule[] | ((prev: MergeRule[]) => MergeRule[])) => void;
  updateFilterOptions: (updater: FilterOptions | ((prev: FilterOptions) => FilterOptions)) => void;

  // Bulk set (for init or import)
  setBulkData: (data: { transactions?: Transaction[], whitelist?: WhitelistItem[], mergeRules?: MergeRule[], filterOptions?: FilterOptions }) => void;
}

export const useSpaceStore = create<SpaceState>((set, get) => {
  const executeWithAuth = async (action: (pin: string) => Promise<void>) => {
    const { spaceId, role } = get();
    if (!spaceId) return;
    const savedPin = sessionStorage.getItem(`maja_pin_${spaceId}`);
    if (savedPin && role === 'admin') {
      try {
        await action(savedPin);
      } catch (err: any) {
        if (err.message === 'Invalid PIN') {
          sessionStorage.removeItem(`maja_pin_${spaceId}`);
          set({ role: null, errorMsg: '密码已失效，请重新验证' });
        } else {
          throw err;
        }
      }
    } else {
      set({ role: null });
    }
  };

  return {
    spaceId: null,
    role: null,
    isInitializing: true,
    syncStatus: 'synced',
    errorMsg: '',
    successMsg: '',

    transactions: [],
    whitelist: [],
    mergeRules: [],
    filterOptions: DEFAULT_FILTER_OPTIONS,

    setSpaceId: (id) => set({ spaceId: id }),
    setRole: (role) => set({ role }),
    setIsInitializing: (init) => set({ isInitializing: init }),
    setErrorMsg: (msg) => set({ errorMsg: msg }),
    setSuccessMsg: (msg) => set({ successMsg: msg }),

    setBulkData: (data) => set((state) => ({ ...state, ...data })),

    syncTransactions: async (newTx) => {
      const { spaceId } = get();
      if (!spaceId) return;
      set({ transactions: newTx, syncStatus: 'syncing' });
      
      try {
        await executeWithAuth(async (pin) => {
          await updateTransactions(spaceId, pin, newTx);
          set({ syncStatus: 'synced' });
        });
      } catch (e: any) {
        set({ syncStatus: 'error', errorMsg: '同步交易失败: ' + e.message });
      }
    },

    syncConfig: async (cfgData) => {
      const { spaceId, mergeRules, whitelist, filterOptions } = get();
      if (!spaceId) return;
      set({ syncStatus: 'syncing' });
      
      try {
        await executeWithAuth(async (pin) => {
          const fullCfg = { mergeRules, whitelist, filterOptions, ...cfgData };
          await updateConfig(spaceId, pin, fullCfg);
          set({ syncStatus: 'synced' });
        });
      } catch (e: any) {
        set({ syncStatus: 'error', errorMsg: '同步配置失败: ' + e.message });
      }
    },

    updateWhitelist: (updater) => {
      const { whitelist, syncConfig } = get();
      const next = typeof updater === 'function' ? updater(whitelist) : updater;
      set({ whitelist: next });
      syncConfig({ whitelist: next });
    },

    updateMergeRules: (updater) => {
      const { mergeRules, syncConfig } = get();
      const next = typeof updater === 'function' ? updater(mergeRules) : updater;
      set({ mergeRules: next });
      syncConfig({ mergeRules: next });
    },

    updateFilterOptions: (updater) => {
      const { filterOptions, syncConfig } = get();
      const next = typeof updater === 'function' ? updater(filterOptions) : updater;
      set({ filterOptions: next });
      syncConfig({ filterOptions: next });
    }
  };
});
