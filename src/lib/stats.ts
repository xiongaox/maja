/**
 * 统计计算纯函数模块
 * 
 * 职责：计算各种统计数据
 * 特点：纯函数，无副作用，可测试
 */

import type { Transaction, Stats, DailyStat, PlayerStat } from '../types';

/**
 * 计算总体统计
 */
export function calculateStats(transactions: Transaction[]): Stats {
  let totalWin = 0;
  let totalLoss = 0;
  const playerStats: Record<string, PlayerStat> = {};

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
      playerStats[displayName] = { name: displayName, net: 0, win: 0, loss: 0, gender: t.gender };
    } else if (t.gender && !playerStats[displayName].gender) {
      playerStats[displayName].gender = t.gender;
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

  // --- 趣味数据计算 (Fun Facts) ---
  const sortedTx = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  let maxWinStreak = { count: 0, amount: 0 };
  let maxLossStreak = { count: 0, amount: 0 };
  let maxSingleLoss: { amount: number; date: string; name: string } | null = null;

  let currentWinStreak = { count: 0, amount: 0 };
  let currentLossStreak = { count: 0, amount: 0 };

  sortedTx.forEach(t => {
    if (t.amount > 0) {
      currentWinStreak.count += 1;
      currentWinStreak.amount += t.amount;
      currentLossStreak = { count: 0, amount: 0 }; // 重置连跪
      if (currentWinStreak.count > maxWinStreak.count || (currentWinStreak.count === maxWinStreak.count && currentWinStreak.amount > maxWinStreak.amount)) {
        maxWinStreak = { ...currentWinStreak };
      }
    } else if (t.amount < 0) {
      currentLossStreak.count += 1;
      currentLossStreak.amount += Math.abs(t.amount);
      currentWinStreak = { count: 0, amount: 0 }; // 重置连胜
      if (currentLossStreak.count > maxLossStreak.count || (currentLossStreak.count === maxLossStreak.count && currentLossStreak.amount > maxLossStreak.amount)) {
        maxLossStreak = { ...currentLossStreak };
      }

      if (!maxSingleLoss || t.amount < maxSingleLoss.amount) {
        maxSingleLoss = { amount: t.amount, date: t.date, name: t.displayName || t.name };
      }
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
    funFacts: { maxWinStreak, maxLossStreak, maxSingleLoss },
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
