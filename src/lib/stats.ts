/**
 * 统计计算纯函数模块
 * 
 * 职责：计算各种统计数据
 * 特点：纯函数，无副作用，可测试
 */

import type { Transaction, Stats, DailyStat } from '../types';

/**
 * 计算总体统计
 */
export function calculateStats(transactions: Transaction[]): Stats {
  let totalWin = 0;
  let totalLoss = 0;
  const playerStats: Record<string, { name: string; net: number; win: number; loss: number }> = {};

  const todayDate = new Date();
  const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

  let latestDateStr = todayStr;
  if (transactions.length > 0) {
    latestDateStr = transactions.reduce((max, t) => {
      const d = t.date.split(' ')[0];
      return d > max ? d : max;
    }, '');
  }
  let latestDayNet = 0;

  transactions.forEach(t => {
    if (t.amount > 0) totalWin += t.amount;
    if (t.amount < 0) totalLoss += Math.abs(t.amount);
    if (t.date.split(' ')[0] === latestDateStr) latestDayNet += t.amount;

    const displayName = t.displayName || t.name;
    if (!playerStats[displayName]) {
      playerStats[displayName] = { name: displayName, net: 0, win: 0, loss: 0 };
    }
    playerStats[displayName].net += t.amount;
    if (t.amount > 0) playerStats[displayName].win += t.amount;
    if (t.amount < 0) playerStats[displayName].loss += Math.abs(t.amount);
  });

  const netProfit = totalWin - totalLoss;
  const isActuallyToday = latestDateStr === todayStr;
  const latestDayLabel = isActuallyToday ? '今日盈亏' : '最近一日盈亏';
  const latestDayDisplayDate = isActuallyToday ? '今天' : latestDateStr;

  let atm: string | null = null;
  let nemesis: string | null = null;
  let maxWinFromPlayer = 0;
  let maxLossToPlayer = 0;

  Object.values(playerStats).forEach(p => {
    if (p.net > maxWinFromPlayer) {
      maxWinFromPlayer = p.net;
      atm = p.name;
    }
    if (p.net < maxLossToPlayer) {
      maxLossToPlayer = p.net;
      nemesis = p.name;
    }
  });

  return {
    totalWin,
    totalLoss,
    netProfit,
    playerStats,
    atm,
    nemesis,
    maxWinFromPlayer,
    maxLossToPlayer,
    latestDayNet,
    latestDayLabel,
    latestDayDisplayDate,
    isActuallyToday,
  };
}

/**
 * 计算每日统计
 */
export function calculateDailyStats(transactions: Transaction[]): Record<string, DailyStat> {
  const stats: Record<string, DailyStat> = {};
  
  transactions.forEach(t => {
    const datePart = t.date.split(' ')[0];
    if (!stats[datePart]) {
      stats[datePart] = { net: 0, win: 0, loss: 0, count: 0, records: [] };
    }
    stats[datePart].net += t.amount;
    if (t.amount > 0) stats[datePart].win += t.amount;
    if (t.amount < 0) stats[datePart].loss += Math.abs(t.amount);
    stats[datePart].count += 1;
    stats[datePart].records.push(t);
  });
  
  return stats;
}
