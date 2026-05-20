import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Transaction, Stats, WhitelistItem, MergeRule } from '../types';
import type { FilterOptions } from './useFileUpload';

const WHITELIST_STORAGE_KEY = 'maja_whitelist';
const MERGE_RULES_STORAGE_KEY = 'maja_merge_rules';

export function useTransactions(filterOptions?: FilterOptions) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [whitelist, setWhitelist] = useState<WhitelistItem[]>(() => {
    const saved = localStorage.getItem(WHITELIST_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [mergeRules, setMergeRules] = useState<MergeRule[]>(() => {
    const saved = localStorage.getItem(MERGE_RULES_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    return [
      { id: 'rule-1', targetName: '王哥', aliases: ['*哥'] },
      { id: 'rule-2', targetName: '李四', aliases: ['幸福便利店'] },
    ];
  });

  // 保存白名单到 localStorage
  useEffect(() => {
    localStorage.setItem(WHITELIST_STORAGE_KEY, JSON.stringify(whitelist));
  }, [whitelist]);

  // 保存合并规则到 localStorage
  useEffect(() => {
    localStorage.setItem(MERGE_RULES_STORAGE_KEY, JSON.stringify(mergeRules));
  }, [mergeRules]);

  // 确保合并规则的目标名字都在白名单中
  useEffect(() => {
    if (mergeRules.length === 0) return;
    setWhitelist(prev => {
      const existingNames = new Set(prev.map(item => item.name));
      const newItems = mergeRules
        .filter(rule => !existingNames.has(rule.targetName))
        .map(rule => ({ id: `wl-sync-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, name: rule.targetName, enabled: true }));
      if (newItems.length === 0) return prev;
      return [...prev, ...newItems];
    });
  }, [mergeRules]);

  const addTransactions = useCallback((newTransactions: Transaction[]) => {
    setTransactions(prev => [...prev, ...newTransactions]);
  }, []);

  const removeTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  // 合并规则管理 - 添加时自动加入白名单
  const addMergeRule = useCallback((targetName: string, alias: string) => {
    setMergeRules(prev => {
      const existingIndex = prev.findIndex(rule => rule.targetName === targetName);
      if (existingIndex >= 0) {
        const updated = [...prev];
        if (!updated[existingIndex].aliases.includes(alias)) {
          updated[existingIndex] = {
            ...updated[existingIndex],
            aliases: [...updated[existingIndex].aliases, alias]
          };
        }
        return updated;
      } else {
        return [...prev, { id: `rule-${Date.now()}`, targetName, aliases: [alias] }];
      }
    });

    // 自动将目标名字加入白名单
    setWhitelist(prev => {
      if (prev.some(item => item.name === targetName)) return prev;
      return [...prev, { id: `wl-${Date.now()}`, name: targetName, enabled: true }];
    });
  }, []);

  const removeMergeRule = useCallback((ruleId: string) => {
    setMergeRules(prev => prev.filter(rule => rule.id !== ruleId));
  }, []);

  const removeAliasFromRule = useCallback((ruleId: string, alias: string) => {
    setMergeRules(prev => prev.map(rule => {
      if (rule.id !== ruleId) return rule;
      const newAliases = rule.aliases.filter(a => a !== alias);
      if (newAliases.length === 0) {
        return null;
      }
      return { ...rule, aliases: newAliases };
    }).filter(Boolean) as MergeRule[]);
  }, []);

  const updateRuleTargetName = useCallback((ruleId: string, newTargetName: string) => {
    // 找到旧的目标名字
    const oldRule = mergeRules.find(r => r.id === ruleId);
    const oldTargetName = oldRule?.targetName;

    setMergeRules(prev => prev.map(rule =>
      rule.id === ruleId ? { ...rule, targetName: newTargetName } : rule
    ));

    // 更新白名单中的名字
    if (oldTargetName) {
      setWhitelist(prev => prev.map(item =>
        item.name === oldTargetName ? { ...item, name: newTargetName } : item
      ));
    }
  }, [mergeRules]);

  const clearMergeRules = useCallback(() => {
    setMergeRules([]);
  }, []);

  // 白名单管理
  const addWhitelistItem = useCallback((name: string) => {
    setWhitelist(prev => {
      if (prev.some(item => item.name === name)) return prev;
      return [...prev, { id: `wl-${Date.now()}`, name, enabled: true }];
    });
  }, []);

  const removeWhitelistItem = useCallback((id: string) => {
    setWhitelist(prev => prev.filter(item => item.id !== id));
  }, []);

  const toggleWhitelistItem = useCallback((id: string) => {
    setWhitelist(prev => prev.map(item =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    ));
  }, []);

  const clearWhitelist = useCallback(() => {
    setWhitelist([]);
  }, []);

  const batchAddWhitelist = useCallback((names: string[]) => {
    setWhitelist(prev => {
      const existingNames = new Set(prev.map(item => item.name));
      const newItems = names
        .filter(name => !existingNames.has(name))
        .map(name => ({ id: `wl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, name, enabled: true }));
      return [...prev, ...newItems];
    });
  }, []);

  // 获取白名单中启用的名字集合
  const enabledWhitelistNames = useMemo(() => {
    return new Set(whitelist.filter(item => item.enabled).map(item => item.name));
  }, [whitelist]);

  // 获取所有合并规则的目标名字（用于排除）
  const allTargetNames = useMemo(() => {
    return new Set(mergeRules.map(rule => rule.targetName));
  }, [mergeRules]);

  // 构建别名映射表（从别名到目标名字）
  const aliasMap = useMemo(() => {
    const map: Record<string, string> = {};
    mergeRules.forEach(rule => {
      rule.aliases.forEach(alias => {
        map[alias] = rule.targetName;
      });
    });
    return map;
  }, [mergeRules]);

  // 应用别名映射
  const normalizedTransactions = useMemo(() => {
    return transactions.map(t => {
      let matchedName = t.name;
      for (const [key, value] of Object.entries(aliasMap)) {
        if (!key || !key.trim()) continue;
        // 精确匹配：只有完全相同才映射
        if (t.name === key) {
          matchedName = value;
          break;
        }
      }
      return { ...t, displayName: matchedName };
    });
  }, [transactions, aliasMap]);

  // 应用筛选条件（交易类型、收支方向、金额区间）
  const filteredByFilterOptions = useMemo(() => {
    if (!filterOptions) return normalizedTransactions;
    
    return normalizedTransactions.filter(t => {
      const absAmount = Math.abs(t.amount);
      
      // 交易类型筛选
      if (filterOptions.transactionTypes.length > 0 && t.type) {
        const typeMatch = filterOptions.transactionTypes.some(filterType => 
          t.type!.includes(filterType) || filterType.includes(t.type!)
        );
        if (!typeMatch) return false;
      }

      // 收支方向筛选
      if (filterOptions.directionTypes.length > 0) {
        const direction = t.amount > 0 ? '收入' : '支出';
        if (!filterOptions.directionTypes.includes(direction)) return false;
      }

      // 金额区间筛选
      if (absAmount < filterOptions.minAmount || absAmount > filterOptions.maxAmount) {
        return false;
      }

      return true;
    });
  }, [normalizedTransactions, filterOptions]);

  // 过滤白名单后的交易（如果白名单为空则显示全部）
  const filteredTransactions = useMemo(() => {
    // 如果白名单为空，显示全部
    if (whitelist.length === 0) return filteredByFilterOptions;
    // 如果没有启用的白名单，不显示
    if (enabledWhitelistNames.size === 0) return [];
    // 过滤：只显示白名单中的收付款方
    return filteredByFilterOptions.filter(t => enabledWhitelistNames.has(t.displayName || t.name));
  }, [filteredByFilterOptions, whitelist, enabledWhitelistNames]);

  const stats = useMemo<Stats>(() => {
    let totalWin = 0;
    let totalLoss = 0;
    const playerStats: Record<string, { name: string; net: number; win: number; loss: number }> = {};

    const todayDate = new Date();
    const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

    let latestDateStr = todayStr;
    if (filteredTransactions.length > 0) {
      latestDateStr = filteredTransactions.map(t => t.date.split(' ')[0]).sort().reverse()[0];
    }
    let latestDayNet = 0;

    filteredTransactions.forEach(t => {
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
  }, [filteredTransactions]);

  const dailyStats = useMemo(() => {
    const stats: Record<string, { net: number; win: number; loss: number; count: number; records: Transaction[] }> = {};
    filteredTransactions.forEach(t => {
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
  }, [filteredTransactions]);

  // 获取所有出现过的名字（用于白名单建议）- 排除合并规则的目标名字，并根据筛选条件过滤
  const allPlayerNames = useMemo(() => {
    const names = new Set<string>();
    
    // 先对交易进行筛选
    const filteredForNames = normalizedTransactions.filter(t => {
      const absAmount = Math.abs(t.amount);
      
      // 交易类型筛选
      if (filterOptions && filterOptions.transactionTypes.length > 0 && t.type) {
        const typeMatch = filterOptions.transactionTypes.some(filterType => 
          t.type!.includes(filterType) || filterType.includes(t.type!)
        );
        if (!typeMatch) return false;
      }

      // 收支方向筛选
      if (filterOptions && filterOptions.directionTypes.length > 0) {
        const direction = t.amount > 0 ? '收入' : '支出';
        if (!filterOptions.directionTypes.includes(direction)) return false;
      }

      // 金额区间筛选
      if (filterOptions && (absAmount < filterOptions.minAmount || absAmount > filterOptions.maxAmount)) {
        return false;
      }

      return true;
    });
    
    // 从筛选后的交易中获取名字
    filteredForNames.forEach(t => {
      const displayName = t.displayName || t.name;
      // 排除合并规则的目标名字，只保留Excel中的原始名称
      if (!allTargetNames.has(displayName)) {
        names.add(displayName);
      }
    });
    return Array.from(names).sort();
  }, [normalizedTransactions, allTargetNames, filterOptions]);

  // 过滤后的白名单（排除合并规则的目标名字，但保留Excel中的原始名称）
  const filteredWhitelist = useMemo(() => {
    return whitelist.filter(item => {
      // 如果是Excel中的原始名称，保留
      if (transactions.some(t => t.name === item.name)) {
        return true;
      }
      // 如果是合并规则的目标名字，排除
      if (allTargetNames.has(item.name)) {
        return false;
      }
      // 其他情况保留
      return true;
    });
  }, [whitelist, allTargetNames, transactions]);

  // 获取所有原始名字（用于合并规则建议）
  const allOriginalNames = useMemo(() => {
    const names = new Set<string>();
    transactions.forEach(t => {
      names.add(t.name);
    });
    return Array.from(names).sort();
  }, [transactions]);

  return {
    transactions,
    normalizedTransactions,
    filteredTransactions,
    stats,
    dailyStats,
    mergeRules,
    whitelist: filteredWhitelist,  // 返回过滤后的白名单（排除别名）
    allPlayerNames,
    allOriginalNames,
    addTransactions,
    removeTransaction,
    addMergeRule,
    removeMergeRule,
    removeAliasFromRule,
    updateRuleTargetName,
    clearMergeRules,
    addWhitelistItem,
    removeWhitelistItem,
    toggleWhitelistItem,
    clearWhitelist,
    batchAddWhitelist,
  };
}
