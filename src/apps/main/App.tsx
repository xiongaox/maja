/**
 * 麻将记账应用 - 主应用组件
 * 
 * 重构后：使用 Zustand 全局状态管理和分离的数据管道
 */

import React, { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import {
  AlertCircle, CheckCircle2, Loader2, Menu,
  LayoutDashboard, Calendar as CalendarIcon, Settings as SettingsIcon, Swords,
  Cloud, CloudOff, CloudUpload, Share2
} from 'lucide-react';
import { Dashboard } from '../../features/dashboard/Dashboard';
import { PlayerStats } from '../../features/stats/PlayerStats';
import { CalendarView } from '../../features/calendar/CalendarView';
import { DataConfig } from '../../features/config/DataConfig';
import { LandingPage } from './LandingPage';
import { EntryModal } from '../../components/EntryModal';
import { SystemSettingsModal } from '../../components/SystemSettingsModal';
import { getSpaceData, verifyPin } from '../../lib/api';
import { buildPipeline, applyMergeAdjacentDays, DEFAULT_FILTER_OPTIONS } from '../../lib/pipeline';
import { calculateStats, calculateDailyStats } from '../../lib/stats';
import { parseBillFiles } from '../../lib/parser';
import { useSpaceStore } from '../../store/useSpaceStore';

type TabId = 'dashboard' | 'stats' | 'calendar' | 'config';

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
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSystemModalOpen, setIsSystemModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mergeAdjacentDays, setMergeAdjacentDays] = useState(() => {
    return localStorage.getItem('maja_merge_adjacent') === 'true';
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleMergeAdjacent = () => {
    const newState = !mergeAdjacentDays;
    setMergeAdjacentDays(newState);
    localStorage.setItem('maja_merge_adjacent', String(newState));
  };

  // Zustand Store
  const {
    spaceId, role, isInitializing, syncStatus, errorMsg, successMsg,
    transactions, whitelist, mergeRules, filterOptions,
    setSpaceId, setRole, setIsInitializing, setErrorMsg, setSuccessMsg,
    setBulkData, syncTransactions, syncConfig,
    updateWhitelist, updateMergeRules, updateFilterOptions
  } = useSpaceStore();

  // 1. 解析 URL 并加载数据
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    if (id) {
      setSpaceId(id);
      getSpaceData(id)
        .then(async (data) => {
          setBulkData({
            transactions: data.tx || [],
            whitelist: data.cfg?.whitelist || [],
            mergeRules: data.cfg?.mergeRules || [],
            filterOptions: data.cfg?.filterOptions || DEFAULT_FILTER_OPTIONS
          });
          
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
  }, [setSpaceId, setBulkData, setRole, setErrorMsg, setIsInitializing]);

  // 使用数据管道处理交易数据
  const pipelineResult = useMemo(() => {
    return buildPipeline(transactions, mergeRules, filterOptions, whitelist);
  }, [transactions, mergeRules, filterOptions, whitelist]);

  const finalTransactions = useMemo(() => {
    return applyMergeAdjacentDays(pipelineResult.final, mergeAdjacentDays);
  }, [pipelineResult.final, mergeAdjacentDays]);

  // 计算统计信息
  const stats = useMemo(() => {
    return calculateStats(finalTransactions);
  }, [finalTransactions]);

  const dailyStats = useMemo(() => {
    return calculateDailyStats(finalTransactions);
  }, [finalTransactions]);

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
  }, [updateWhitelist]);

  const handleRemoveWhitelist = useCallback((id: string) => {
    updateWhitelist(prev => prev.filter(item => item.id !== id));
  }, [updateWhitelist]);

  const handleToggleWhitelist = useCallback((id: string) => {
    updateWhitelist(prev => prev.map(item =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    ));
  }, [updateWhitelist]);

  const handleClearWhitelist = useCallback(() => {
    updateWhitelist([]);
  }, [updateWhitelist]);

  const handleBatchAddWhitelist = useCallback((names: string[]) => {
    updateWhitelist(prev => {
      const existingNames = new Set(prev.map(item => item.name));
      const newItems = names
        .filter(name => !existingNames.has(name))
        .map(name => ({ id: `wl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, name, enabled: true }));
      return [...prev, ...newItems];
    });
  }, [updateWhitelist]);

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
  }, [updateMergeRules]);

  const handleRemoveMergeRule = useCallback((ruleId: string) => {
    updateMergeRules(prev => prev.filter(rule => rule.id !== ruleId));
  }, [updateMergeRules]);

  const handleRemoveAlias = useCallback((ruleId: string, alias: string) => {
    updateMergeRules(prev => prev.map(rule => {
      if (rule.id !== ruleId) return rule;
      const newAliases = rule.aliases.filter(a => a !== alias);
      return { ...rule, aliases: newAliases };
    }));
  }, [updateMergeRules]);

  const handleEnsureMergeRule = useCallback((targetName: string) => {
    updateMergeRules(prev => {
      const existingIndex = prev.findIndex(rule => rule.targetName === targetName);
      if (existingIndex >= 0) {
        return prev;
      }
      return [...prev, { id: `rule-${Date.now()}`, targetName, aliases: [] }];
    });
  }, [updateMergeRules]);

  // 文件上传与解析
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { newTransactions, totalImported, totalSkipped } = await parseBillFiles(files, transactions);

      if (totalImported > 0 || totalSkipped > 0) {
        if (totalSkipped > 0) {
          setSuccessMsg(`成功导入 ${totalImported} 条记录，跳过 ${totalSkipped} 条重复记录`);
        } else {
          setSuccessMsg(`成功导入 ${totalImported} 条记录！`);
        }
        syncTransactions(newTransactions);
      } else if (files.length > 0) {
        setErrorMsg('未能识别到新的有效账单记录，或所有记录均已存在。');
      }
    } catch (err: any) {
      setErrorMsg('解析文件失败：' + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [transactions, syncTransactions, setErrorMsg, setSuccessMsg]);

  // 导出配置
  const handleExportConfig = useCallback(() => {
    const config = {
      version: '1.0',
      type: 'config_backup',
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
  }, [whitelist, mergeRules, filterOptions, setSuccessMsg]);

  const handleExportUserData = useCallback(() => {
    const backup = {
      version: '1.0',
      type: 'user_data_backup',
      exportDate: new Date().toISOString(),
      transactions: finalTransactions, // 导出过滤和合并后的最终数据
      whitelist,
      mergeRules,
      filterOptions,
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maja-user-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setSuccessMsg('用户数据已导出！');
  }, [pipelineResult.final, whitelist, mergeRules, filterOptions, setSuccessMsg]);

  const handleExportFull = useCallback(() => {
    const backup = {
      version: '1.0',
      type: 'full_backup',
      exportDate: new Date().toISOString(),
      transactions, // 导出最底层的全部记录
      whitelist,
      mergeRules,
      filterOptions,
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
  }, [transactions, whitelist, mergeRules, filterOptions, setSuccessMsg]);

  // 智能导入数据
  const handleSmartImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      
      const isConfigOnly = backup.type === 'config_backup' || (!backup.transactions && backup.whitelist && backup.mergeRules);
      const isDataBackup = ['full_backup', 'user_data_backup'].includes(backup.type);

      if (!backup.version || (!isConfigOnly && !isDataBackup)) {
        setErrorMsg('不是有效的数据备份文件，请检查文件格式。');
        return;
      }

      if (isConfigOnly) {
        const newFilterOptions = backup.filterOptions || DEFAULT_FILTER_OPTIONS;
        setBulkData({
          whitelist: backup.whitelist || [],
          mergeRules: backup.mergeRules || [],
          filterOptions: newFilterOptions
        });
        syncConfig({ whitelist: backup.whitelist || [], mergeRules: backup.mergeRules || [], filterOptions: newFilterOptions });
        setSuccessMsg('配置已成功导入！');
        return;
      }

      if (confirm(`检测到 ${backup.type === 'full_backup' ? '完整备份' : '用户数据备份'}。\n即将恢复 ${backup.transactions.length} 条底层交易记录并覆盖现有配置，确定吗？此操作将清空当前所有数据。`)) {
        const newFilterOptions = backup.filterOptions || DEFAULT_FILTER_OPTIONS;
        setBulkData({
          whitelist: backup.whitelist || [],
          mergeRules: backup.mergeRules || [],
          filterOptions: newFilterOptions
        });
        syncConfig({ whitelist: backup.whitelist || [], mergeRules: backup.mergeRules || [], filterOptions: newFilterOptions });
        syncTransactions(backup.transactions);
        
        setSuccessMsg(backup.type === 'full_backup' ? '完整数据恢复成功！' : '用户数据恢复成功！');
      }
    } catch (err: any) {
      setErrorMsg('恢复失败：' + err.message);
    } finally {
      event.target.value = '';
    }
  }, [syncConfig, syncTransactions, setBulkData, setErrorMsg, setSuccessMsg]);

  // 清空配置
  const handleClearConfig = useCallback(() => {
    if (confirm('确定要清空所有配置（白名单、合并规则、筛选条件）吗？此操作不可撤销。')) {
      setBulkData({ whitelist: [], mergeRules: [], filterOptions: DEFAULT_FILTER_OPTIONS });
      syncConfig({ whitelist: [], mergeRules: [], filterOptions: DEFAULT_FILTER_OPTIONS });
      setSuccessMsg('配置已清空');
    }
  }, [syncConfig, setBulkData, setSuccessMsg]);

  const handleClearData = useCallback(() => {
    if (confirm('警告：此操作将清空所有底层流水数据！不可撤销，您确定吗？')) {
      syncTransactions([]);
      setSuccessMsg('交易流水已清空');
    }
  }, [syncTransactions, setSuccessMsg]);

  const handleForceSync = useCallback(() => {
    syncTransactions(transactions);
    syncConfig({ whitelist, mergeRules, filterOptions });
    setSuccessMsg('已强制将数据上传至云端');
  }, [syncTransactions, syncConfig, transactions, whitelist, mergeRules, filterOptions, setSuccessMsg]);

  // 自动清除消息
  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, errorMsg, setSuccessMsg, setErrorMsg]);

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

      <SystemSettingsModal
        isOpen={isSystemModalOpen}
        onClose={() => setIsSystemModalOpen(false)}
        spaceId={spaceId!}
        transactionsLength={transactions.length}
        onExportConfig={handleExportConfig}
        onExportUserData={handleExportUserData}
        onExportFull={handleExportFull}
        onSmartImport={handleSmartImport}
        onClearConfig={handleClearConfig}
        onClearData={handleClearData}
        onForceSync={handleForceSync}
      />

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
          
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full py-2.5 text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20"
          >
            <Share2 size={16} />
            创建专属记账本
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto w-full relative">
        <div className="max-w-6xl mx-auto p-4 md:p-8 pb-24">
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

          {activeTab === 'dashboard' && (
            <Dashboard
              stats={stats}
              normalizedTransactions={finalTransactions}
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
              normalizedTransactions={finalTransactions}
              mergeAdjacentDays={mergeAdjacentDays}
              onToggleMergeAdjacent={toggleMergeAdjacent}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              dailyStats={dailyStats}
              isAdmin={role === 'admin'}
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
              onUpdateTargetName={(id, name) => updateMergeRules(prev => prev.map(r => r.id === id ? { ...r, targetName: name } : r))}
              onUpdateGender={(id, gender) => updateMergeRules(prev => prev.map(r => r.id === id ? { ...r, gender } : r))}
              onClearMergeRules={() => updateMergeRules([])}
              onFilterChange={updateFilterOptions}
              onEnsureMergeRule={handleEnsureMergeRule}
              suggestedNames={suggestedNames}
              originalNames={originalNames}
            />
          )}
        </div>
      </main>
    </div>
  );
}
