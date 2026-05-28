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
  let maxWinStreak = { count: 0, amount: 0, startDate: '', endDate: '', txs: [] as Transaction[] };
  let maxLossStreak = { count: 0, amount: 0, startDate: '', endDate: '', txs: [] as Transaction[] };
  let currentWinStreak = { count: 0, amount: 0, startDate: '', endDate: '', txs: [] as Transaction[] };
  let currentLossStreak = { count: 0, amount: 0, startDate: '', endDate: '', txs: [] as Transaction[] };

  rounds.forEach(round => {
    const roundDate = round.txs[0].date.substring(0, 16); // 取那一局第一笔账单的日期，精确到分钟

    if (round.net > 0) {
      if (currentWinStreak.count === 0) currentWinStreak.startDate = roundDate;
      currentWinStreak.count += 1;
      
      // 只累加收入，剔除支出（如给别人的杠钱）
      const winTxs = round.txs.filter(t => t.amount > 0);
      currentWinStreak.amount += winTxs.reduce((sum, t) => sum + t.amount, 0);
      currentWinStreak.endDate = roundDate;
      currentWinStreak.txs.push(...winTxs);
      
      currentLossStreak = { count: 0, amount: 0, startDate: '', endDate: '', txs: [] }; // 重置连跪
      
      if (currentWinStreak.count > maxWinStreak.count || (currentWinStreak.count === maxWinStreak.count && currentWinStreak.amount > maxWinStreak.amount)) {
        maxWinStreak = { ...currentWinStreak };
      }
    } else if (round.net < 0) {
      if (currentLossStreak.count === 0) currentLossStreak.startDate = roundDate;
      currentLossStreak.count += 1;
      
      // 只累加支出，剔除收入（如收别人的杠钱）
      const lossTxs = round.txs.filter(t => t.amount < 0);
      currentLossStreak.amount += lossTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      currentLossStreak.endDate = roundDate;
      currentLossStreak.txs.push(...lossTxs);
      
      currentWinStreak = { count: 0, amount: 0, startDate: '', endDate: '', txs: [] }; // 重置连胜
      
      if (currentLossStreak.count > maxLossStreak.count || (currentLossStreak.count === maxLossStreak.count && currentLossStreak.amount > maxLossStreak.amount)) {
        maxLossStreak = { ...currentLossStreak };
      }
    } else {
      // 净胜负为0，平局，打断连胜连败
      currentWinStreak = { count: 0, amount: 0, startDate: '', endDate: '', txs: [] };
      currentLossStreak = { count: 0, amount: 0, startDate: '', endDate: '', txs: [] };
    }
  });

  // 单笔最痛、单笔最大赢取
  let maxSingleLoss: { amount: number; date: string; name: string } | null = null;
  let maxSingleWin: { amount: number; date: string; name: string } | null = null;
  
  sortedTx.forEach(t => {
    if (t.amount < 0) {
      if (!maxSingleLoss || t.amount < maxSingleLoss.amount) {
        maxSingleLoss = { amount: t.amount, date: t.date.substring(0, 16), name: t.displayName || t.name };
      }
    } else if (t.amount > 0) {
      if (!maxSingleWin || t.amount > maxSingleWin.amount) {
        maxSingleWin = { amount: t.amount, date: t.date.substring(0, 16), name: t.displayName || t.name };
      }
    }
  });

  // 赢得最多的一局 (maxRoundWin)
  let maxRoundWin: { winAmount: number; lossAmount: number; date: string; txs: Transaction[] } | null = null;
  rounds.forEach(round => {
    const winTxs = round.txs.filter(t => t.amount > 0);
    const lossTxs = round.txs.filter(t => t.amount < 0);
    
    const winAmount = winTxs.reduce((sum, t) => sum + t.amount, 0);
    const lossAmount = lossTxs.reduce((sum, t) => sum + t.amount, 0); // 负数
    
    if (winAmount > 0) {
      if (!maxRoundWin || winAmount > maxRoundWin.winAmount) {
        maxRoundWin = {
          winAmount,
          lossAmount,
          date: round.txs[0].date.substring(0, 16),
          txs: round.txs
        };
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
    funFacts: { maxWinStreak, maxLossStreak, maxSingleLoss, maxSingleWin, maxRoundWin },
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
