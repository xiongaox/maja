/**
 * 麻将记账应用 - 主应用组件
 * 
 * 重构后：使用统一的数据管道和配置页面
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertCircle, CheckCircle2, Loader2, Menu,
  LayoutDashboard, Calendar as CalendarIcon, Settings as SettingsIcon, Download, Upload, Trash2
} from 'lucide-react';
import { Dashboard } from '../../features/dashboard/Dashboard';
import { CalendarView } from '../../features/calendar/CalendarView';
import { DataConfig } from '../../features/config/DataConfig';
import { buildPipeline, DEFAULT_FILTER_OPTIONS, type FilterOptions } from '../../lib/pipeline';
import { calculateStats, calculateDailyStats } from '../../lib/stats';
import type { Transaction, MergeRule, WhitelistItem } from '../../types';

type TabId = 'dashboard' | 'calendar' | 'config';

const STORAGE_KEYS = {
  WHITELIST: 'maja_whitelist',
  MERGE_RULES: 'maja_merge_rules',
  FILTER_OPTIONS: 'maja_filter_options',
  TRANSACTIONS: 'maja_transactions',
};

// 生成交易去重 key
function txKey(t: { date: string; name: string; amount: number }) {
  return `${t.date}|${t.name}|${t.amount}`;
}

// 侧边栏菜单项
const SidebarItem = ({ icon: Icon, label, id, activeTab, onClick }: {
  icon: React.ElementType;
  label: string;
  id: TabId;
  activeTab: TabId;
  onClick: (id: TabId) => void;
}) => (
  <button
    onClick={() => onClick(id)}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium
      ${activeTab === id
        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
        : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-600'}`}
  >
    <Icon size={20} />
    <span>{label}</span>
  </button>
);

export default function MahjongTracker() {
  // 状态
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return saved ? JSON.parse(saved) : [];
  });
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 从 localStorage 加载配置
  const [whitelist, setWhitelist] = useState<WhitelistItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.WHITELIST);
    return saved ? JSON.parse(saved) : [];
  });

  const [mergeRules, setMergeRules] = useState<MergeRule[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MERGE_RULES);
    return saved ? JSON.parse(saved) : [];
  });

  const [filterOptions, setFilterOptions] = useState<FilterOptions>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FILTER_OPTIONS);
    return saved ? JSON.parse(saved) : DEFAULT_FILTER_OPTIONS;
  });

  // 保存配置到 localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WHITELIST, JSON.stringify(whitelist));
  }, [whitelist]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MERGE_RULES, JSON.stringify(mergeRules));
  }, [mergeRules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FILTER_OPTIONS, JSON.stringify(filterOptions));
  }, [filterOptions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  // 使用数据管道处理交易数据
  const pipelineResult = useMemo(() => {
    return buildPipeline(transactions, mergeRules, filterOptions, whitelist);
  }, [transactions, mergeRules, filterOptions, whitelist]);

  // 计算统计信息
  const stats = useMemo(() => {
    return calculateStats(pipelineResult.final);
  }, [pipelineResult.final]);

  const dailyStats = useMemo(() => {
    return calculateDailyStats(pipelineResult.final);
  }, [pipelineResult.final]);

  // 获取建议的白名单名字（基于筛选后的数据）
  const suggestedNames = useMemo(() => {
    const targetNames = new Set(mergeRules.map(r => r.targetName));
    const whitelistNames = new Set(whitelist.map(w => w.name));
    
    // 从筛选后的交易中提取名字，而不是原始数据
    const filteredNames = [...new Set(pipelineResult.filteredByOptions.map(t => t.name))].sort();
    return filteredNames.filter(name => 
      !targetNames.has(name) && !whitelistNames.has(name)
    );
  }, [pipelineResult.filteredByOptions, mergeRules, whitelist]);

  // 获取所有原始名字
  const originalNames = useMemo(() => {
    return pipelineResult.stats.originalNames;
  }, [pipelineResult.stats.originalNames]);

  // 白名单操作
  const handleAddWhitelist = useCallback((name: string) => {
    setWhitelist(prev => {
      if (prev.some(item => item.name === name)) return prev;
      return [...prev, { id: `wl-${Date.now()}`, name, enabled: true }];
    });
  }, []);

  const handleRemoveWhitelist = useCallback((id: string) => {
    setWhitelist(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleToggleWhitelist = useCallback((id: string) => {
    setWhitelist(prev => prev.map(item =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    ));
  }, []);

  const handleClearWhitelist = useCallback(() => {
    setWhitelist([]);
  }, []);

  const handleBatchAddWhitelist = useCallback((names: string[]) => {
    setWhitelist(prev => {
      const existingNames = new Set(prev.map(item => item.name));
      const newItems = names
        .filter(name => !existingNames.has(name))
        .map(name => ({ id: `wl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, name, enabled: true }));
      return [...prev, ...newItems];
    });
  }, []);

  // 合并规则操作
  const handleAddMergeRule = useCallback((targetName: string, alias: string) => {
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
  }, []);

  const handleRemoveMergeRule = useCallback((ruleId: string) => {
    setMergeRules(prev => prev.filter(rule => rule.id !== ruleId));
  }, []);

  const handleRemoveAlias = useCallback((ruleId: string, alias: string) => {
    setMergeRules(prev => prev.map(rule => {
      if (rule.id !== ruleId) return rule;
      const newAliases = rule.aliases.filter(a => a !== alias);
      if (newAliases.length === 0) {
        return null;
      }
      return { ...rule, aliases: newAliases };
    }).filter(Boolean) as MergeRule[]);
  }, []);

  const handleUpdateTargetName = useCallback((ruleId: string, newTargetName: string) => {
    setMergeRules(prev => prev.map(rule =>
      rule.id === ruleId ? { ...rule, targetName: newTargetName } : rule
    ));
  }, []);

  const handleClearMergeRules = useCallback(() => {
    setMergeRules([]);
  }, []);

  // 文件上传
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {

      const newTransactions: Transaction[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const data = await file.arrayBuffer();

        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        // 微信账单格式检测
        let headerRowIdx = -1;
        let timeIdx = -1;
        let typeIdx = -1;
        let nameIdx = -1;
        let amountIdx = -1;
        let directionIdx = -1;

        // 寻找表头行
        for (let r = 0; r < Math.min(jsonData.length, 50); r++) {
          const row = jsonData[r];
          if (!Array.isArray(row)) continue;
          const rowStr = row.join('');

          if (rowStr.includes('交易对方') || rowStr.includes('对方')) {
            headerRowIdx = r;
            timeIdx = row.findIndex(c => typeof c === 'string' && (c.includes('时间') || c.includes('交易时间')));
            typeIdx = row.findIndex(c => typeof c === 'string' && c.includes('交易类型'));
            nameIdx = row.findIndex(c => typeof c === 'string' && (c.includes('交易对方') || c.includes('对方')));
            amountIdx = row.findIndex(c => typeof c === 'string' && c.includes('金额'));
            directionIdx = row.findIndex(c => typeof c === 'string' && (c.includes('收/支') || c.includes('收支')));
            break;
          }
        }

        if (headerRowIdx !== -1 && nameIdx !== -1 && amountIdx !== -1) {
          for (let r = headerRowIdx + 1; r < jsonData.length; r++) {
            const row = jsonData[r];
            if (!row || row.length === 0) continue;

            let nameVal = String(row[nameIdx] || '').replace(/[\t]/g, '').trim();
            let amountVal = String(row[amountIdx] || '').replace(/[^\d.-]/g, '');
            let directionVal = directionIdx >= 0 ? String(row[directionIdx] || '').replace(/[\t]/g, '').trim() : '';
            let typeVal = typeIdx >= 0 ? String(row[typeIdx] || '').replace(/[\t]/g, '').trim() : '';

            if (!nameVal || !amountVal) continue;

            let amountNum = parseFloat(amountVal);
            if (isNaN(amountNum) || amountNum === 0) continue;

            // 判断收支方向
            if (directionVal === '支出' || directionVal === '付款' || typeVal.includes('付款')) {
              amountNum = -Math.abs(amountNum);
            } else if (directionVal === '收入' || directionVal === '收款' || typeVal.includes('收款')) {
              amountNum = Math.abs(amountNum);
            } else {
              if (String(row[amountIdx]).includes('-')) amountNum = -Math.abs(amountNum);
            }

            // 处理日期
            let formattedDate = '';
            const timeVal = row[timeIdx];
            
            if (typeof timeVal === 'number') {
              // Excel 日期序列号
              const utc_days = Math.floor(timeVal - 25569);
              const utc_value = utc_days * 86400;
              const fractional = timeVal - Math.floor(timeVal);
              const totalSeconds = Math.round(utc_value + fractional * 86400);
              const date = new Date(totalSeconds * 1000);
              const year = date.getUTCFullYear();
              const month = String(date.getUTCMonth() + 1).padStart(2, '0');
              const day = String(date.getUTCDate()).padStart(2, '0');
              const hours = String(date.getUTCHours()).padStart(2, '0');
              const minutes = String(date.getUTCMinutes()).padStart(2, '0');
              formattedDate = `${year}-${month}-${day} ${hours}:${minutes}`;
            } else if (typeof timeVal === 'string') {
              const cleaned = timeVal.replace(/[\t]/g, '').trim();
              const dateMatch = cleaned.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
              if (dateMatch) {
                formattedDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')} ${dateMatch[4].padStart(2, '0')}:${dateMatch[5].padStart(2, '0')}`;
              } else if (cleaned.length > 16) {
                formattedDate = cleaned.substring(0, 16);
              } else {
                formattedDate = cleaned;
              }
            }

            if (!formattedDate) continue;

            newTransactions.push({
              id: `excel-${Math.random().toString(36).substr(2, 9)}`,
              date: formattedDate,
              name: nameVal,
              amount: amountNum,
              type: typeVal,
              direction: directionVal,
            });
          }
        }
      }

      if (newTransactions.length > 0) {
        // 去重：基于 日期+名称+金额 三元组
        setTransactions(prev => {
          const existingKeys = new Set(prev.map(t => txKey(t)));
          const unique = newTransactions.filter(t => !existingKeys.has(txKey(t)));
          const skipped = newTransactions.length - unique.length;
          if (skipped > 0) {
            setSuccessMsg(`成功导入 ${unique.length} 条记录，跳过 ${skipped} 条重复记录`);
          } else {
            setSuccessMsg(`成功导入 ${unique.length} 条记录！`);
          }
          return [...prev, ...unique];
        });
      } else {
        setErrorMsg('未能识别到有效的账单记录，请确保上传的是微信或支付宝导出的账单表格。');
      }
    } catch (err: any) {
      setErrorMsg('解析文件失败：' + err.message);
    } finally {
      setIsUploading(false);
      // 清除文件输入
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  // 导出配置
  const handleExportConfig = useCallback(() => {
    const config = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      whitelist,
      mergeRules,
      filterOptions,
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maja-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setSuccessMsg('配置已导出！');
  }, [whitelist, mergeRules, filterOptions]);

  // 导入配置
  const handleImportConfig = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const config = JSON.parse(text);
      
      if (!config.version || !config.whitelist || !config.mergeRules) {
        setErrorMsg('配置文件格式不正确');
        return;
      }

      setWhitelist(config.whitelist);
      setMergeRules(config.mergeRules);
      if (config.filterOptions) {
        setFilterOptions(config.filterOptions);
      }

      setSuccessMsg('配置已导入！');
    } catch (err: any) {
      setErrorMsg('导入失败：' + err.message);
    }
  }, []);

  // 自动清除消息
  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, errorMsg]);

  const handleTabClick = (id: TabId) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="h-screen w-full bg-slate-50 font-sans flex flex-col md:flex-row text-gray-800 overflow-hidden">
      {/* 全局加载遮罩 */}
      {isUploading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
          <p className="text-xl font-bold text-gray-800">正在飞速解析账单文件...</p>
          <p className="text-sm text-gray-500 mt-2">请稍候，正在提取每一笔交易记录</p>
        </div>
      )}

      {/* 移动端头部 */}
      <div className="md:hidden bg-white border-b border-gray-100 p-4 flex items-center justify-between flex-shrink-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold">發</span>
          </div>
          <span className="font-bold text-gray-800">雀神记账本</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-500">
          <Menu size={24} />
        </button>
      </div>

      {/* 侧边栏 */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} md:translate-x-0 md:static md:flex-shrink-0 flex flex-col h-full
      `}>
        <div className="p-6 hidden md:flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <span className="text-white font-bold text-xl">發</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-800">雀神记账本</span>
        </div>

        <nav className="flex-1 px-4 py-4 md:py-0 space-y-2 mt-4 md:mt-0">
          <SidebarItem icon={LayoutDashboard} label="数据概览" id="dashboard" activeTab={activeTab} onClick={handleTabClick} />
          <SidebarItem icon={CalendarIcon} label="战绩日历" id="calendar" activeTab={activeTab} onClick={handleTabClick} />
          <SidebarItem icon={SettingsIcon} label="数据配置" id="config" activeTab={activeTab} onClick={handleTabClick} />
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-2">
          {/* 导出配置按钮 */}
          <button 
            onClick={handleExportConfig}
            className="w-full py-2.5 text-sm bg-emerald-50 text-emerald-600 font-medium rounded-xl hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
          >
            <Download size={16} />
            导出配置
          </button>
          
          {/* 导入配置按钮 */}
          <label className="w-full py-2.5 text-sm bg-blue-50 text-blue-600 font-medium rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 cursor-pointer">
            <Upload size={16} />
            导入配置
            <input
              type="file"
              accept=".json"
              onChange={handleImportConfig}
              className="hidden"
            />
          </label>

          {/* 清空数据按钮 */}
          {transactions.length > 0 && (
            <button
              onClick={() => {
                if (confirm(`确定要清空所有 ${transactions.length} 条交易数据吗？此操作不可撤销。`)) {
                  setTransactions([]);
                  setSuccessMsg('所有交易数据已清空');
                }
              }}
              className="w-full py-2.5 text-sm bg-rose-50 text-rose-600 font-medium rounded-xl hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              清空数据 ({transactions.length})
            </button>
          )}
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto w-full relative">
        <div className="max-w-6xl mx-auto p-4 md:p-8 pb-24">
          {/* 全局提示 */}
          <div className="mb-6 space-y-2">
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl flex items-center gap-3 shadow-sm">
                <AlertCircle size={20} className="flex-shrink-0" /> <p className="text-sm">{errorMsg}</p>
              </div>
            )}
            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 p-4 rounded-xl flex items-center gap-3 shadow-sm">
                <CheckCircle2 size={20} className="flex-shrink-0" /> <p className="text-sm">{successMsg}</p>
              </div>
            )}
          </div>

          {/* 页面内容 */}
          {activeTab === 'dashboard' && (
            <Dashboard
              stats={stats}
              normalizedTransactions={pipelineResult.final}
              onFileUpload={handleFileUpload}
              fileInputRef={fileInputRef}
              isUploading={isUploading}
              whitelistCount={whitelist.length}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              dailyStats={dailyStats}
              onRemoveTransaction={(id) => {
                setTransactions(prev => prev.filter(t => t.id !== id));
              }}
            />
          )}

          {activeTab === 'config' && (
            <DataConfig
              transactions={transactions}
              mergeRules={mergeRules}
              whitelist={whitelist}
              filterOptions={filterOptions}
              stats={pipelineResult.stats}
              onAddWhitelist={handleAddWhitelist}
              onRemoveWhitelist={handleRemoveWhitelist}
              onToggleWhitelist={handleToggleWhitelist}
              onClearWhitelist={handleClearWhitelist}
              onBatchAddWhitelist={handleBatchAddWhitelist}
              onAddMergeRule={handleAddMergeRule}
              onRemoveMergeRule={handleRemoveMergeRule}
              onRemoveAlias={handleRemoveAlias}
              onUpdateTargetName={handleUpdateTargetName}
              onClearMergeRules={handleClearMergeRules}
              onFilterChange={setFilterOptions}
              suggestedNames={suggestedNames}
              originalNames={originalNames}
            />
          )}
        </div>
      </main>
    </div>
  );
}
