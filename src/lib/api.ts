import type { Transaction, MergeRule, WhitelistItem } from '../types';
import type { FilterOptions } from './pipeline';

export interface SpaceData {
  tx: Transaction[];
  cfg: {
    mergeRules: MergeRule[];
    whitelist: WhitelistItem[];
    filterOptions: FilterOptions;
  };
}

const isLocalDev = import.meta.env.DEV;

// A simple mock for local development without Wrangler
const localMock = {
  get: async (id: string): Promise<SpaceData> => {
    const tx = localStorage.getItem(`tx_${id}`);
    const cfg = localStorage.getItem(`cfg_${id}`);
    return {
      tx: tx ? JSON.parse(tx) : [],
      cfg: cfg ? JSON.parse(cfg) : { mergeRules: [], whitelist: [], filterOptions: {} }
    };
  },
  putTx: async (id: string, tx: any) => {
    localStorage.setItem(`tx_${id}`, JSON.stringify(tx));
  },
  putCfg: async (id: string, cfg: any) => {
    localStorage.setItem(`cfg_${id}`, JSON.stringify(cfg));
  }
};

export async function getSpaceData(id: string): Promise<SpaceData> {
  try {
    const res = await fetch(`/api/space/${id}`);
    if (!res.ok) {
      if (res.status === 404) throw new Error("API not found");
      throw new Error("Failed to fetch space data");
    }
    return res.json();
  } catch (e) {
    if (isLocalDev) return localMock.get(id);
    throw e;
  }
}

export async function verifyPin(id: string, pin: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/verify/${id}`, {
      headers: {
        'X-Space-Pin': pin
      }
    });
    if (res.status === 403) return false;
    if (!res.ok) throw new Error("API Error");
    return true;
  } catch (e) {
    if (isLocalDev) {
      // In local mock dev, just assume true since we don't mock auth strictly, 
      // or check localStorage if we want. For simplicity, just return true.
      return true;
    }
    throw e;
  }
}

export async function updateTransactions(id: string, pin: string, tx: Transaction[]): Promise<boolean> {
  try {
    const res = await fetch(`/api/tx/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Space-Pin': pin
      },
      body: JSON.stringify(tx)
    });
    if (res.status === 403) throw new Error("Invalid PIN");
    if (!res.ok) {
      let msg = "API Error";
      try { const data = await res.json(); msg = data.error || msg; } catch(e) {}
      throw new Error(msg);
    }
    return true;
  } catch (e: any) {
    if (e.message === "Invalid PIN") throw e;
    if (isLocalDev) {
      await localMock.putTx(id, tx);
      return true;
    }
    throw e;
  }
}

export async function updateConfig(id: string, pin: string, cfg: any): Promise<boolean> {
  try {
    const res = await fetch(`/api/cfg/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Space-Pin': pin
      },
      body: JSON.stringify(cfg)
    });
    if (res.status === 403) throw new Error("Invalid PIN");
    if (!res.ok) {
      let msg = "API Error";
      try { const data = await res.json(); msg = data.error || msg; } catch(e) {}
      throw new Error(msg);
    }
    return true;
  } catch (e: any) {
    if (e.message === "Invalid PIN") throw e;
    if (isLocalDev) {
      await localMock.putCfg(id, cfg);
      return true;
    }
    throw e;
  }
}
