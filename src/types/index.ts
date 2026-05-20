export interface Transaction {
  id: string;
  date: string;
  name: string;
  amount: number;
  displayName?: string;
  type?: string;
  account?: string;
  direction?: string;
  status?: string;
}

export interface DailyStat {
  net: number;
  win: number;
  loss: number;
  count: number;
  records: Transaction[];
}

export interface PlayerStat {
  name: string;
  net: number;
  win: number;
  loss: number;
}

export interface Stats {
  totalWin: number;
  totalLoss: number;
  netProfit: number;
  playerStats: Record<string, PlayerStat>;
  atm: string | null;
  nemesis: string | null;
  maxWinFromPlayer: number;
  maxLossToPlayer: number;
  latestDayNet: number;
  latestDayLabel: string;
  latestDayDisplayDate: string;
  isActuallyToday: boolean;
}

export interface WhitelistItem {
  id: string;
  name: string;
  enabled: boolean;
}

export interface MergeRule {
  id: string;
  targetName: string;  // 目标名字（合并后的名字）
  aliases: string[];   // 原名称列表（多个别名）
}
