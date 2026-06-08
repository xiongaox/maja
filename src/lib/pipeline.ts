/**
 * 数据管道纯函数模块
 * 
 * 职责：将原始交易数据经过 合并规则 → 筛选条件 → 白名单 三步处理
 * 特点：纯函数，无副作用，可测试
 */

import type { Transaction, MergeRule, WhitelistItem } from '../types';

// 筛选条件接口
export interface FilterOptions {
  transactionTypes: string[];  // 交易类型筛选
  directionTypes: string[];    // 收支方向筛选
  minAmount: number;           // 最小金额
  maxAmount: number;           // 最大金额
}

// 默认筛选条件
export const DEFAULT_FILTER_OPTIONS: FilterOptions = {
  transactionTypes: ['扫二维码付款', '二维码付款', '商户消费', '二维码收款'],
  directionTypes: ['收入', '支出'],
  minAmount: 1,
  maxAmount: 200,
};

// 管道处理结果
export interface PipelineResult {
  normalized: Transaction[];      // 应用合并规则后的交易
  filteredByOptions: Transaction[]; // 应用筛选条件后的交易
  final: Transaction[];           // 应用白名单后的最终交易
  stats: PipelineStats;
}

// 管道统计
export interface PipelineStats {
  rawCount: number;
  afterMerge: number;
  afterFilter: number;
  afterWhitelist: number;
  mergedNames: string[];  // 合并后的名字列表
  originalNames: string[]; // 原始名字列表
}

/**
 * Step 1: 应用合并规则
 * 将别名映射到目标名字
 */
export function applyMergeRules(
  transactions: Transaction[],
  mergeRules: MergeRule[]
): { normalized: Transaction[]; aliasMap: Record<string, string> } {
  // 构建别名映射表
  const aliasMap: Record<string, { targetName: string, gender?: 'boy' | 'girl' }> = {};
  mergeRules.forEach(rule => {
    rule.aliases.forEach(alias => {
      aliasMap[alias] = { targetName: rule.targetName, gender: rule.gender };
    });
    // 也把 targetName 自己加进去，防止本来就是 targetName 但是没被匹配
    aliasMap[rule.targetName] = { targetName: rule.targetName, gender: rule.gender };
  });

  // 应用映射
  const normalized = transactions.map(t => {
    let matchedName = t.name;
    let gender = undefined;
    
    // 精确匹配
    if (aliasMap[t.name]) {
      matchedName = aliasMap[t.name].targetName;
      gender = aliasMap[t.name].gender;
    }
    
    return { ...t, displayName: matchedName, gender };
  });

  // 返回兼容的 aliasMap
  const compatibleAliasMap = Object.fromEntries(
    Object.entries(aliasMap).map(([k, v]) => [k, v.targetName])
  );

  return { normalized, aliasMap: compatibleAliasMap };
}

/**
 * Step 2: 应用筛选条件
 * 按交易类型、收支方向、金额区间过滤
 */
export function applyFilterOptions(
  transactions: Transaction[],
  filterOptions: FilterOptions
): Transaction[] {
  // 防御性默认值：云端可能返回不完整的 filterOptions
  const types = filterOptions.transactionTypes || [];
  const directions = filterOptions.directionTypes || [];
  const minAmt = filterOptions.minAmount ?? 0;
  const maxAmt = filterOptions.maxAmount ?? Infinity;

  return transactions.filter(t => {
    const absAmount = Math.abs(t.amount);
    
    // 交易类型筛选
    if (types.length > 0 && t.type) {
      const typeMatch = types.some(filterType => 
        t.type!.includes(filterType) || filterType.includes(t.type!)
      );
      if (!typeMatch) return false;
    }

    // 收支方向筛选
    if (directions.length > 0) {
      const direction = t.amount > 0 ? '收入' : '支出';
      if (!directions.includes(direction)) return false;
    }

    // 金额区间筛选
    if (absAmount < minAmt || absAmount > maxAmt) {
      return false;
    }

    return true;
  });
}

/**
 * Step 3: 应用白名单
 * 只显示白名单中启用的收付款方
 */
export function applyWhitelist(
  transactions: Transaction[],
  whitelist: WhitelistItem[],
  mergeRules: MergeRule[]
): Transaction[] {
  // 白名单为空 → 显示全部
  if (whitelist.length === 0) return transactions;
  
  // 获取启用的白名单名字
  const enabledNames = new Set(
    whitelist.filter(item => item.enabled).map(item => item.name)
  );
  
  // 没有启用的白名单 → 不显示
  if (enabledNames.size === 0) return [];
  
  // 获取合并规则的目标名字（自动通过，不需要加入白名单）
  const targetNames = new Set(mergeRules.map(r => r.targetName));
  
  return transactions.filter(t => {
    const name = t.displayName || t.name;
    
    // 合并后的目标名自动通过
    if (targetNames.has(name)) return true;
    
    // 其他名字需要在白名单中
    return enabledNames.has(name);
  });
}

/**
 * Step 4: 应用就近合并
 * 将连续天数的交易归入第一天
 */
export function applyMergeAdjacentDays(
  transactions: Transaction[],
  enabled: boolean
): Transaction[] {
  if (!enabled) {
    return transactions.map(t => ({ ...t, sessionDate: t.date.split(' ')[0] }));
  }

  const dates = [...new Set(transactions.map(t => t.date.split(' ')[0]))].sort();
  const dateMap: Record<string, string> = {};
  
  if (dates.length > 0) {
    let streakStart = dates[0];
    dateMap[dates[0]] = streakStart;
    
    for (let i = 1; i < dates.length; i++) {
      const current = dates[i];
      const prev = dates[i - 1];
      
      const prevDate = new Date(prev);
      const currentDate = new Date(current);
      
      const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays <= 1) {
        dateMap[current] = streakStart;
      } else {
        streakStart = current;
        dateMap[current] = streakStart;
      }
    }
  }

  return transactions.map(t => ({
    ...t,
    sessionDate: dateMap[t.date.split(' ')[0]] || t.date.split(' ')[0]
  }));
}

/**
 * 完整数据管道
 */
export function buildPipeline(
  transactions: Transaction[],
  mergeRules: MergeRule[],
  filterOptions: FilterOptions,
  whitelist: WhitelistItem[]
): PipelineResult {
  // Step 1: 应用合并规则
  const { normalized } = applyMergeRules(transactions, mergeRules);
  
  // Step 2: 应用筛选条件
  const filteredByOptions = applyFilterOptions(normalized, filterOptions);
  
  // Step 3: 应用白名单
  const final = applyWhitelist(filteredByOptions, whitelist, mergeRules);
  
  // 统计信息
  const originalNames = [...new Set(transactions.map(t => t.name))].sort();
  const mergedNames = [...new Set(normalized.map(t => t.displayName || t.name))].sort();
  
  return {
    normalized,
    filteredByOptions,
    final,
    stats: {
      rawCount: transactions.length,
      afterMerge: normalized.length,
      afterFilter: filteredByOptions.length,
      afterWhitelist: final.length,
      mergedNames,
      originalNames,
    },
  };
}

/**
 * 获取可用于白名单建议的名字
 * 排除合并规则的目标名字，只保留Excel中的原始名称
 */
export function getSuggestedWhitelistNames(
  transactions: Transaction[],
  mergeRules: MergeRule[],
  filterOptions: FilterOptions
): string[] {
  // 获取合并规则的目标名字
  const targetNames = new Set(mergeRules.map(r => r.targetName));
  
  // 先对交易进行筛选
  const filtered = applyFilterOptions(transactions, filterOptions);
  
  // 从筛选后的交易中获取名字
  const names = new Set<string>();
  filtered.forEach(t => {
    const displayName = t.displayName || t.name;
    // 排除合并规则的目标名字
    if (!targetNames.has(displayName)) {
      names.add(displayName);
    }
  });
  
  return Array.from(names).sort();
}
