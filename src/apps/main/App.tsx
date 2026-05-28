/**
 * 麻将记账应用 - 主应用组件
 * 
 * 重构后：使用统一的数据管道和配置页面
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertCircle, CheckCircle2, Loader2, Menu,
  LayoutDashboard, Calendar as CalendarIcon, Settings as SettingsIcon, Download, Upload, Trash2, Swords
} from 'lucide-react';
import { Dashboard } from '../../features/dashboard/Dashboard';
import { PlayerStats } from '../../features/stats/PlayerStats';
import { CalendarView } from '../../features/calendar/CalendarView';
import { DataConfig } from '../../features/config/DataConfig';
import { LandingPage } from './LandingPage';
import { EntryModal } from '../../components/EntryModal';
import { SystemSettingsModal } from '../../components/SystemSettingsModal';
import { getSpaceData, updateTransactions, updateConfig, verifyPin, type SpaceData } from '../../lib/api';
import { Cloud, CloudOff, CloudUpload, Share2 } from 'lucide-react';
import { buildPipeline, DEFAULT_FILTER_OPTIONS, type FilterOptions } from '../../lib/pipeline';
import { calculateStats, calculateDailyStats } from '../../lib/stats';
import type { Transaction, MergeRule, WhitelistItem } from '../../types';

type TabId = 'dashboard' | 'stats' | 'calendar' | 'config';

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
  // 路由与空间状态
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  
  // 角色和认证
  const [role, setRole] = useState<'admin' | 'guest' | null>(null);
  const [isSystemModalOpen, setIsSystemModalOpen] = useState(false);

  // 核心数据状态
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [whitelist, setWhitelist] = useState<WhitelistItem[]>([]);
  const [mergeRules, setMergeRules] = useState<MergeRule[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(DEFAULT_FILTER_OPTIONS);

  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 1. 解析 URL 并加载数据
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    if (id) {
      setSpaceId(id);
      getSpaceData(id)
        .then(async (data) => {
          setTransactions(data.tx || []);
          if (data.cfg) {
            setWhitelist(data.cfg.whitelist || []);
            setMergeRules(data.cfg.mergeRules || []);
            setFilterOptions(data.cfg.filterOptions || DEFAULT_FILTER_OPTIONS);
          }
          
          // 静默验证本地存储的密码
          const savedPin = sessionStorage.getItem(`maja_pin_${id}`);
          if (savedPin) {
            try {
              const isValid = await verifyPin(id, savedPin);
              if (isValid) {
                setRole('admin');
              } else {
                sessionStorage.removeItem(`maja_pin_${id}`);
              }
            } catch (e) {
              console.error("Failed to verify PIN", e);
            }
          }
        })
        .catch(err => {
          setErrorMsg('拉取空间数据失败: ' + err.message);
        })
        .finally(() => {
          setIsInitializing(false);
        });
    } else {
      setIsInitializing(false);
    }
  }, []);

  // 2. 包装有密码保护的写操作
  const executeWithAuth = useCallback(async (action: (pin: string) => Promise<void>) => {
    if (!spaceId) return;
    const savedPin = sessionStorage.getItem(`maja_pin_${spaceId}`);
    if (savedPin && role === 'admin') {
      try {
        await action(savedPin);
      } catch (err: any) {
        if (err.message === 'Invalid PIN') {
          sessionStorage.removeItem(`maja_pin_${spaceId}`);
          setRole(null);
          setErrorMsg('密码已失效，请重新验证');
        } else {
          throw err;
        }
      }
    } else {
      setRole(null);
    }
  }, [spaceId, role]);

  // 3. 同步状态包装器
  const syncTransactions = useCallback((newTx: Transaction[]) => {
    if (!spaceId) return;
    setTransactions(newTx);
    setSyncStatus('syncing');
    executeWithAuth(async (pin) => {
      await updateTransactions(spaceId, pin, newTx);
      setSyncStatus('synced');
    }).catch(e => {
      setSyncStatus('error');
      setErrorMsg('同步交易失败: ' + e.message);
    });
  }, [spaceId, executeWithAuth]);

  const syncConfig = useCallback((cfgData: Partial<SpaceData['cfg']>) => {
    if (!spaceId) return;
    setSyncStatus('syncing');
    executeWithAuth(async (pin) => {
      const fullCfg = { mergeRules, whitelist, filterOptions, ...cfgData };
      await updateConfig(spaceId, pin, fullCfg);
      setSyncStatus('synced');
    }).catch(e => {
      setSyncStatus('error');
      setErrorMsg('同步配置失败: ' + e.message);
    });
  }, [spaceId, mergeRules, whitelist, filterOptions, executeWithAuth]);

  // 修改所有 set 方法，接入 sync
  const updateWhitelist = useCallback((updater: WhitelistItem[] | ((prev: WhitelistItem[]) => WhitelistItem[])) => {
    setWhitelist(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncConfig({ whitelist: next });
      return next;
    });
  }, [syncConfig]);

  const updateMergeRules = useCallback((updater: MergeRule[] | ((prev: MergeRule[]) => MergeRule[])) => {
    setMergeRules(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncConfig({ mergeRules: next });
      return next;
    });
  }, [syncConfig]);

  const updateFilterOptions = useCallback((updater: FilterOptions | ((prev: FilterOptions) => FilterOptions)) => {
    setFilterOptions(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncConfig({ filterOptions: next });
      return next;
    });
  }, [syncConfig]);

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
    updateWhitelist(prev => {
      if (prev.some(item => item.name === name)) return prev;
      return [...prev, { id: `wl-${Date.now()}`, name, enabled: true }];
    });
  }, []);

  const handleRemoveWhitelist = useCallback((id: string) => {
    updateWhitelist(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleToggleWhitelist = useCallback((id: string) => {
    updateWhitelist(prev => prev.map(item =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    ));
  }, []);

  const handleClearWhitelist = useCallback(() => {
    updateWhitelist([]);
  }, []);

  const handleBatchAddWhitelist = useCallback((names: string[]) => {
    updateWhitelist(prev => {
      const existingNames = new Set(prev.map(item => item.name));
      const newItems = names
        .filter(name => !existingNames.has(name))
        .map(name => ({ id: `wl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, name, enabled: true }));
      return [...prev, ...newItems];
    });
  }, []);

  // 合并规则操作
  const handleAddMergeRule = useCallback((targetName: string, alias: string) => {
    updateMergeRules(prev => {
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

  // 确保指定名字有合并规则条目（没有则自动创建空的）
  const handleEnsureMergeRule = useCallback((targetName: string) => {
    updateMergeRules(prev => {
      const existing = prev.find(r => r.targetName === targetName);
      if (existing) return prev;
      return [...prev, { id: `rule-${Date.now()}`, targetName, aliases: [] }];
    });
  }, []);

  const handleRemoveMergeRule = useCallback((ruleId: string) => {
    updateMergeRules(prev => prev.filter(rule => rule.id !== ruleId));
  }, []);

  const handleRemoveAlias = useCallback((ruleId: string, alias: string) => {
    updateMergeRules(prev => prev.map(rule => {
      if (rule.id !== ruleId) return rule;
      const newAliases = rule.aliases.filter(a => a !== alias);
      if (newAliases.length === 0) {
        return null;
      }
      return { ...rule, aliases: newAliases };
    }).filter(Boolean) as MergeRule[]);
  }, []);

  const handleUpdateTargetName = useCallback((ruleId: string, newTargetName: string) => {
    updateMergeRules(prev => prev.map(rule =>
      rule.id === ruleId ? { ...rule, targetName: newTargetName } : rule
    ));
  }, []);

  const handleUpdateGender = useCallback((ruleId: string, gender: 'boy' | 'girl' | undefined) => {
    updateMergeRules(prev => prev.map(rule =>
      rule.id === ruleId ? { ...rule, gender } : rule
    ));
  }, []);

  const handleClearMergeRules = useCallback(() => {
    updateMergeRules([]);
  }, []);

  // 文件上传
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let currentTransactions = [...transactions];
      let totalImported = 0;
      let totalSkipped = 0;

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

        const fileTransactions: Transaction[] = [];

        if (headerRowIdx !== -1 && nameIdx !== -1 && amountIdx !== -1) {
          for (let r = headerRowIdx + 1; r < jsonData.length; r++) {
            const row = jsonData[r];
            if (!row || row.length === 0) continue;

            let nameVal = String(row[nameIdx] || '').replace(/[\t]/g, '').trim();
            // 兼容微信账单中的特殊表情符号（私有区域字符 PUA）
            // 将其转换为带有具体编码的字符串，以保证不同 emoji 的昵称不会全部变成相同的 "[表情]"
            nameVal = nameVal.replace(/[\uE000-\uF8FF]/g, (match) => `[表情_${match.charCodeAt(0).toString(16).toUpperCase()}]`);
            
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

            fileTransactions.push({
              id: `excel-${Math.random().toString(36).substr(2, 9)}`,
              date: formattedDate,
              name: nameVal,
              amount: amountNum,
              type: typeVal,
              direction: directionVal,
            });
          }
        }

        if (fileTransactions.length > 0) {
          // 使用 multiset (计数) 逻辑进行精确去重
          // 这样既能防止同一文件内合法重复的记录被吞，也能完美过滤跨文件/多次导入的重叠重复记录
          const existingCounts = new Map<string, number>();
          for (const t of currentTransactions) {
            const key = txKey(t);
            existingCounts.set(key, (existingCounts.get(key) || 0) + 1);
          }

          const uniqueForFile: Transaction[] = [];
          for (const t of fileTransactions) {
            const key = txKey(t);
            const count = existingCounts.get(key) || 0;
            if (count > 0) {
              existingCounts.set(key, count - 1);
              totalSkipped++;
            } else {
              uniqueForFile.push(t);
            }
          }
          currentTransactions = [...currentTransactions, ...uniqueForFile];
          totalImported += uniqueForFile.length;
        }
      }

      if (totalImported > 0 || totalSkipped > 0) {
        if (totalSkipped > 0) {
          setSuccessMsg(`成功导入 ${totalImported} 条记录，跳过 ${totalSkipped} 条重复记录`);
        } else {
          setSuccessMsg(`成功导入 ${totalImported} 条记录！`);
        }
        syncTransactions(currentTransactions);
      } else if (files.length > 0) {
        setErrorMsg('未能识别到新的有效账单记录，或所有记录均已存在。');
      }
    } catch (err: any) {
      setErrorMsg('解析文件失败：' + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [transactions, syncTransactions]);

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

      if (config.filterOptions) {
        setFilterOptions(config.filterOptions);
      }
      setWhitelist(config.whitelist);
      setMergeRules(config.mergeRules);
      
      const newFilterOptions = config.filterOptions || DEFAULT_FILTER_OPTIONS;
      syncConfig({ whitelist: config.whitelist, mergeRules: config.mergeRules, filterOptions: newFilterOptions });

      setSuccessMsg('配置已导入！');
    } catch (err: any) {
      setErrorMsg('导入失败：' + err.message);
    } finally {
      event.target.value = '';
    }
  }, []);

  // 清空配置
  const handleClearConfig = useCallback(() => {
    if (confirm('确定要清空所有配置（白名单、合并规则、筛选条件）吗？此操作不可撤销。')) {
      setWhitelist([]);
      setMergeRules([]);
      setFilterOptions(DEFAULT_FILTER_OPTIONS);
      syncConfig({ whitelist: [], mergeRules: [], filterOptions: DEFAULT_FILTER_OPTIONS });
      setSuccessMsg('配置已清空');
    }
  }, []);

  // 导出用户数据 (白名单过滤后的纯净数据)
  const handleExportUserData = useCallback(() => {
    const backup = {
      version: '1.0',
      type: 'user_data_backup',
      exportDate: new Date().toISOString(),
      whitelist,
      mergeRules,
      filterOptions,
      transactions: pipelineResult.final, // 导出经过白名单清洗和别名合并后的最终数据
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maja-userdata-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setSuccessMsg('用户数据已导出！');
  }, [whitelist, mergeRules, filterOptions, pipelineResult.final]);

  // 导出完整备份 (包含原始未清洗的Excel底层数据)
  const handleExportFull = useCallback(() => {
    const backup = {
      version: '1.0',
      type: 'full_backup',
      exportDate: new Date().toISOString(),
      whitelist,
      mergeRules,
      filterOptions,
      transactions: transactions, // 导出底层全部原始数据
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maja-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setSuccessMsg('完整备份已导出！');
  }, [whitelist, mergeRules, filterOptions, transactions]);

  // 导入数据备份 (支持完整备份与用户数据备份)
  const handleImportBackup = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      
      if (!backup.version || !['full_backup', 'user_data_backup'].includes(backup.type) || !backup.transactions) {
        setErrorMsg('不是有效的数据备份文件，请检查文件格式。');
        return;
      }

      if (confirm(`即将恢复 ${backup.transactions.length} 条底层交易记录并覆盖现有配置，确定吗？此操作将清空当前所有数据。`)) {
        setWhitelist(backup.whitelist || []);
        setMergeRules(backup.mergeRules || []);
        if (backup.filterOptions) {
          setFilterOptions(backup.filterOptions);
        }
        
        const newFilterOptions = backup.filterOptions || DEFAULT_FILTER_OPTIONS;
        syncConfig({ whitelist: backup.whitelist || [], mergeRules: backup.mergeRules || [], filterOptions: newFilterOptions });
        syncTransactions(backup.transactions);
        
        const msg = backup.type === 'full_backup' ? '完整数据恢复成功！' : '用户数据恢复成功！';
        setSuccessMsg(msg);
      }
    } catch (err: any) {
      setErrorMsg('恢复失败：' + err.message);
    } finally {
      event.target.value = '';
    }
  }, []);

  // 自动清除消息
  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, errorMsg]);

  const handleTabClick = (id: TabId) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  if (isInitializing) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-emerald-500" size={48} /></div>;
  }
  
  if (!spaceId) {
    return <LandingPage />;
  }

  return (
    <div className="h-screen w-full bg-slate-50 font-sans flex flex-col md:flex-row text-gray-800 overflow-hidden relative">
      <EntryModal 
        isOpen={role === null}
        onUnlock={async (pin) => {
          const isValid = await verifyPin(spaceId, pin);
          if (isValid) {
            sessionStorage.setItem(`maja_pin_${spaceId}`, pin);
            setRole('admin');
          } else {
            throw new Error("密码错误");
          }
        }}
        onGuest={() => setRole('guest')}
      />

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

      {/* 移动端侧边栏遮罩 */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

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
          <SidebarItem icon={LayoutDashboard} label="首页仪表盘" id="dashboard" activeTab={activeTab} onClick={handleTabClick} />
          <SidebarItem icon={Swords} label="交锋战绩" id="stats" activeTab={activeTab} onClick={handleTabClick} />
          <SidebarItem icon={CalendarIcon} label="历史流水" id="calendar" activeTab={activeTab} onClick={handleTabClick} />
          {role === 'admin' && (
            <SidebarItem icon={SettingsIcon} label="数据配置" id="config" activeTab={activeTab} onClick={handleTabClick} />
          )}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-3">
          {/* 系统同步与设置 */}
          {role === 'admin' && (
            <button 
              onClick={() => setIsSystemModalOpen(true)}
              className="w-full py-2.5 text-sm bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
              {syncStatus === 'syncing' ? <CloudUpload size={16} className="animate-bounce text-emerald-500" /> :
               syncStatus === 'synced' ? <Cloud size={16} className="text-emerald-500" /> : 
               <CloudOff size={16} className="text-rose-500" />}
              空间同步与备份
            </button>
          )}
          
          {/* 创建专属记账本 */}
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full py-2.5 text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20"
          >
            <Share2 size={16} />
            创建专属记账本
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto w-full relative">
        <div className="max-w-6xl mx-auto p-4 md:p-8 pb-24">
          {/* 全局提示 (Toast) */}
          <div className="fixed top-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto min-w-[300px]">
                <AlertCircle size={20} className="flex-shrink-0" /> <p className="text-sm font-medium">{errorMsg}</p>
              </div>
            )}
            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto min-w-[300px]">
                <CheckCircle2 size={20} className="flex-shrink-0" /> <p className="text-sm font-medium">{successMsg}</p>
              </div>
            )}
          </div>

          {/* 页面内容 */}
          {activeTab === 'dashboard' && (
            <Dashboard
              stats={stats}
              normalizedTransactions={pipelineResult.final}
              dailyStats={dailyStats}
              onFileUpload={handleFileUpload}
              fileInputRef={fileInputRef}
              isUploading={isUploading}
              whitelistCount={whitelist.length}
              isAdmin={role === 'admin'}
            />
          )}

          {activeTab === 'stats' && (
            <PlayerStats
              stats={stats}
              normalizedTransactions={pipelineResult.final}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              dailyStats={dailyStats}
              onRemoveTransaction={(id) => {
                syncTransactions(transactions.filter(t => t.id !== id));
              }}
            />
          )}

          {activeTab === 'config' && role === 'admin' && (
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
              onUpdateGender={handleUpdateGender}
              onClearMergeRules={handleClearMergeRules}
              onEnsureMergeRule={handleEnsureMergeRule}
              onFilterChange={setFilterOptions}
              suggestedNames={suggestedNames}
              originalNames={originalNames}
            />
          )}
        </div>
      </main>
    
      <SystemSettingsModal
        isOpen={isSystemModalOpen}
        onClose={() => setIsSystemModalOpen(false)}
        spaceId={spaceId || ''}
        transactionsLength={transactions.length}
        onExportConfig={handleExportConfig}
        onImportConfig={handleImportConfig}
        onExportUserData={handleExportUserData}
        onExportFull={handleExportFull}
        onImportBackup={handleImportBackup}
        onClearConfig={handleClearConfig}
        onClearData={() => {
          if (confirm(`确定要清空所有 ${transactions.length} 条交易数据吗？此操作不可撤销。`)) {
            syncTransactions([]);
            setSuccessMsg('所有交易数据已清空');
          }
        }}
        onForceSync={() => {
          syncConfig({ whitelist, mergeRules, filterOptions });
          syncTransactions(transactions);
          setSuccessMsg('配置与数据已成功同步至云端！');
        }}
      />
    </div>
  );
}
