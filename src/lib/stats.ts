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

  // 1. 按时间间隔分组，将超过 2 分钟的账单视为新的一局
  const rounds: { txs: Transaction[], net: number }[] = [];
  let currentRoundTxs: Transaction[] = [];

  sortedTx.forEach(t => {
    if (currentRoundTxs.length === 0) {
      currentRoundTxs.push(t);
    } else {
      const firstT = currentRoundTxs[0];
      // 兼容 iOS 设备的日期解析
      const tTime = new Date(t.date.replace(/-/g, '/')).getTime();
      const firstTime = new Date(firstT.date.replace(/-/g, '/')).getTime();

      // 如果当前账单与该局第一笔账单时间相差超过 2 分钟 (120,000 毫秒)，则视为新的一局
      if (tTime - firstTime > 2 * 60 * 1000) {
        rounds.push({
          txs: currentRoundTxs,
          net: currentRoundTxs.reduce((sum, tx) => sum + tx.amount, 0)
        });
        currentRoundTxs = [t];
      } else {
        currentRoundTxs.push(t);
      }
    }
  });
  if (currentRoundTxs.length > 0) {
    rounds.push({
      txs: currentRoundTxs,
      net: currentRoundTxs.reduce((sum, tx) => sum + tx.amount, 0)
    });
  }

  // 2. 根据聚合后的局来计算连胜/连败
  let maxWinStreak = { count: 0, amount: 0, startDate: '', endDate: '' };
  let maxLossStreak = { count: 0, amount: 0, startDate: '', endDate: '' };
  let currentWinStreak = { count: 0, amount: 0, startDate: '', endDate: '' };
  let currentLossStreak = { count: 0, amount: 0, startDate: '', endDate: '' };

  rounds.forEach(round => {
    const roundDate = round.txs[0].date.split(' ')[0]; // 取那一局第一笔账单的日期

    if (round.net > 0) {
      if (currentWinStreak.count === 0) currentWinStreak.startDate = roundDate;
      currentWinStreak.count += 1;
      currentWinStreak.amount += round.net;
      currentWinStreak.endDate = roundDate;
      
      currentLossStreak = { count: 0, amount: 0, startDate: '', endDate: '' }; // 重置连跪
      
      if (currentWinStreak.count > maxWinStreak.count || (currentWinStreak.count === maxWinStreak.count && currentWinStreak.amount > maxWinStreak.amount)) {
        maxWinStreak = { ...currentWinStreak };
      }
    } else if (round.net < 0) {
      if (currentLossStreak.count === 0) currentLossStreak.startDate = roundDate;
      currentLossStreak.count += 1;
      currentLossStreak.amount += Math.abs(round.net);
      currentLossStreak.endDate = roundDate;
      
      currentWinStreak = { count: 0, amount: 0, startDate: '', endDate: '' }; // 重置连胜
      
      if (currentLossStreak.count > maxLossStreak.count || (currentLossStreak.count === maxLossStreak.count && currentLossStreak.amount > maxLossStreak.amount)) {
        maxLossStreak = { ...currentLossStreak };
      }
    } else {
      // 净胜负为0，平局，打断连胜连败
      currentWinStreak = { count: 0, amount: 0, startDate: '', endDate: '' };
      currentLossStreak = { count: 0, amount: 0, startDate: '', endDate: '' };
    }
  });

  // 单笔最痛保持不变（查找金额最小的单笔支出）
  let maxSingleLoss: { amount: number; date: string; name: string } | null = null;
  sortedTx.forEach(t => {
    if (t.amount < 0) {
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
