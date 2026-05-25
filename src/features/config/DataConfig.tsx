/**
 * 统一数据配置页面
 */

import React, { useState } from 'react';
import {
  Filter, Users, Shield,
  Plus, Trash2, Search, ArrowRight, Zap, Edit2, Check, X,
  TrendingUp, TrendingDown, User
} from 'lucide-react';
import type { Transaction, MergeRule, WhitelistItem } from '../../types';
import type { FilterOptions } from '../../lib/pipeline';

interface DataConfigProps {
  transactions: Transaction[];
  mergeRules: MergeRule[];
  whitelist: WhitelistItem[];
  filterOptions: FilterOptions;
  stats: {
    rawCount: number;
    afterFilter: number;
    afterMerge: number;
    afterWhitelist: number;
  };
  onAddWhitelist: (name: string) => void;
  onRemoveWhitelist: (id: string) => void;
  onToggleWhitelist: (id: string) => void;
  onClearWhitelist: () => void;
  onBatchAddWhitelist: (names: string[]) => void;
  onAddMergeRule: (targetName: string, alias: string) => void;
  onRemoveMergeRule: (ruleId: string) => void;
  onRemoveAlias: (ruleId: string, alias: string) => void;
  onUpdateTargetName: (ruleId: string, newTargetName: string) => void;
  onUpdateGender: (ruleId: string, gender: 'boy' | 'girl' | undefined) => void;
  onClearMergeRules: () => void;
  onEnsureMergeRule: (targetName: string) => void;
  onFilterChange: (options: FilterOptions) => void;
  suggestedNames: string[];
  originalNames: string[];
}

function PipelineVisualization({ stats }: { stats: DataConfigProps['stats'] }) {
  const steps = [
    { label: '原始记录', count: stats.rawCount, color: 'bg-slate-50 border-slate-100', textCol: 'text-slate-800' },
    { label: '筛选后', count: stats.afterFilter, color: 'bg-slate-50 border-slate-100', textCol: 'text-slate-800' },
    { label: '合并后', count: stats.afterMerge, color: 'bg-slate-50 border-slate-100', textCol: 'text-slate-800' },
    { label: '最终显示', count: stats.afterWhitelist, color: 'bg-emerald-50 border-emerald-100 ring-1 ring-emerald-500/10', textCol: 'text-emerald-700' },
  ];
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={18} className="text-emerald-500 drop-shadow-sm" />
        <span className="font-bold text-slate-800 text-lg">数据处理流程</span>
      </div>
      <div className="grid grid-cols-2 md:flex md:items-center md:justify-between gap-2 md:gap-3">
        {steps.map((step, index) => (
          <React.Fragment key={step.label}>
            <div className={`flex-1 ${step.color} rounded-xl px-3 py-2 md:px-4 md:py-3 text-center border transition-all hover:-translate-y-0.5 hover:shadow-md`}>
              <div className={`text-xl md:text-2xl font-black drop-shadow-sm ${step.textCol}`}>{step.count}</div>
              <div className="text-xs md:text-sm font-medium text-slate-500 mt-0.5">{step.label}</div>
            </div>
            {index < steps.length - 1 && <ArrowRight size={20} className="hidden md:block text-slate-300 flex-shrink-0" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export function DataConfig({
  transactions, mergeRules, whitelist, filterOptions, stats,
  onAddWhitelist, onRemoveWhitelist, onToggleWhitelist, onClearWhitelist, onBatchAddWhitelist,
  onAddMergeRule, onRemoveMergeRule, onRemoveAlias, onUpdateTargetName, onUpdateGender, onClearMergeRules,
  onFilterChange, suggestedNames, originalNames, onEnsureMergeRule,
}: DataConfigProps) {
  const [activeTab, setActiveTab] = useState<'filter' | 'merge' | 'whitelist'>('filter');
  
  // Mobile merge selector state
  const [selectedItemForMerge, setSelectedItemForMerge] = useState<string | null>(null);

  // 白名单 tab 状态
  const [newName, setNewName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  // 搭子合并 tab 状态
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingTargetName, setEditingTargetName] = useState('');
  // 新建空组
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  
  // 拖拽相关状态
  const [draggedItemName, setDraggedItemName] = useState<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);

  const enabledCount = whitelist.filter(item => item.enabled).length;
  const filteredWhitelist = searchTerm
    ? whitelist.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : whitelist;

  const handleAddWhitelist = () => {
    const nameToAdd = newName.trim();
    if (nameToAdd) {
      if (!suggestedNames.includes(nameToAdd)) {
        alert('只能添加下方“账单中发现的常用收付款方推荐”中存在的名称');
        return;
      }
      onAddWhitelist(nameToAdd);
      setNewName('');
    }
  };

  // 确认创建新备注组
  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    onEnsureMergeRule(newGroupName.trim());
    setIsCreatingGroup(false);
    setNewGroupName('');
  };

  const tabs: Array<{ id: string; label: string; icon: React.ElementType; count?: number }> = [
    { id: 'filter', label: '筛选条件', icon: Filter },
    { id: 'merge', label: '搭子合并', icon: Users, count: mergeRules.length },
    { id: 'whitelist', label: '收付款白名单', icon: Shield, count: enabledCount },
  ];

  return (
    <div className="space-y-4 animate-in fade-in">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">数据配置</h1>
        <p className="text-gray-500 text-sm mt-1">统一管理筛选条件、搭子合并和收付款白名单</p>
      </header>

      <PipelineVisualization stats={stats} />

      {/* Tab 导航 */}
      <div className="grid grid-cols-3 md:flex bg-slate-100/80 rounded-2xl p-1 md:p-1.5 shadow-inner border border-slate-200/50 gap-1 md:gap-0">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-1 py-2 md:px-5 md:py-2.5 rounded-xl transition-all flex-1 ${
                isActive
                  ? 'bg-white text-emerald-700 shadow-sm border border-black/5'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 border border-transparent'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-emerald-500 drop-shadow-sm' : 'opacity-70'} />
              <div className="flex items-center gap-1">
                <span className="text-xs sm:text-[13px] md:text-sm font-medium whitespace-nowrap">{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`hidden md:inline-block text-xs px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200/70 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab 内容区 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm min-h-[400px]">

        {/* ── 筛选条件 ── */}
        {activeTab === 'filter' && (
          <div className="p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">交易类型</label>
              <div className="flex flex-wrap gap-2">
                {['扫二维码付款', '二维码付款', '商户消费', '二维码收款', '转账', '红包', '群收款'].map(type => {
                  const types = filterOptions.transactionTypes || [];
                  const isSelected = types.includes(type);
                  return (
                    <button key={type}
                      onClick={() => {
                        const newTypes = isSelected
                          ? types.filter(t => t !== type)
                          : [...types, type];
                        onFilterChange({ ...filterOptions, transactionTypes: newTypes });
                      }}
                      className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm ${
                        isSelected
                          ? 'bg-slate-800 text-white border-2 border-transparent scale-[1.02]'
                          : 'bg-white text-slate-600 border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                      }`}>
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            <hr className="border-gray-100" />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">收支方向</label>
              <div className="flex gap-3">
                {[
                  { value: '收入', label: '收入', icon: <TrendingUp size={16} />, color: 'emerald' },
                  { value: '支出', label: '支出', icon: <TrendingDown size={16} />, color: 'red' },
                ].map(({ value, label, icon, color }) => {
                  const dirs = filterOptions.directionTypes || [];
                  const isSelected = dirs.includes(value);
                  return (
                    <button key={value}
                      onClick={() => {
                        const newDirs = isSelected
                          ? dirs.filter(d => d !== value)
                          : [...dirs, value];
                        onFilterChange({ ...filterOptions, directionTypes: newDirs });
                      }}
                      className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm ${
                        isSelected
                          ? color === 'emerald'
                            ? 'bg-emerald-500 text-white border-2 border-transparent scale-[1.02]'
                            : 'bg-rose-500 text-white border-2 border-transparent scale-[1.02]'
                          : 'bg-white text-slate-600 border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                      }`}>
                      {icon}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <hr className="border-gray-100" />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">金额区间（元）</label>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-white border-2 border-slate-100 rounded-xl overflow-hidden focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all shadow-sm">
                  <div className="px-3 py-2.5 bg-slate-50 text-slate-500 font-medium border-r border-slate-100">¥</div>
                  <input type="number" value={filterOptions.minAmount ?? 0}
                    onChange={e => onFilterChange({ ...filterOptions, minAmount: Number(e.target.value) })}
                    className="w-24 px-3 py-2.5 outline-none font-medium text-slate-700"
                    min="0" step="0.01" />
                </div>
                <span className="text-slate-400 font-medium">至</span>
                <div className="flex items-center bg-white border-2 border-slate-100 rounded-xl overflow-hidden focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all shadow-sm">
                  <div className="px-3 py-2.5 bg-slate-50 text-slate-500 font-medium border-r border-slate-100">¥</div>
                  <input type="number" value={filterOptions.maxAmount ?? Infinity}
                    onChange={e => onFilterChange({ ...filterOptions, maxAmount: Number(e.target.value) })}
                    className="w-24 px-3 py-2.5 outline-none font-medium text-slate-700"
                    min="0" step="0.01" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 搭子合并 ── */}
        {activeTab === 'merge' && (
          <div className="flex flex-col min-h-[400px] animate-in fade-in slide-in-from-bottom-2">

            <div className="flex items-center justify-between px-4 pt-4 md:px-6">
              <h2 className="font-semibold text-gray-800">所有备注组</h2>
              {!isCreatingGroup && (
                <button
                  onClick={() => setIsCreatingGroup(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors">
                  <Plus size={16} />
                  新建空组
                </button>
              )}
            </div>

            <div className="flex-1 px-4 pb-4 md:px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start content-start mt-4">
              
              {isCreatingGroup && (
                <div className="bg-emerald-50/50 border-2 border-emerald-200 rounded-2xl flex flex-col p-4 shadow-inner">
                  <div className="text-sm font-bold text-emerald-800 mb-2">新建备注组</div>
                  <input
                    autoFocus
                    placeholder="输入组名，如：阿喵"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleCreateGroup();
                      if (e.key === 'Escape') { setIsCreatingGroup(false); setNewGroupName(''); }
                    }}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/30 text-gray-800 text-sm font-medium mb-3"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleCreateGroup} disabled={!newGroupName.trim()}
                      className="flex-1 py-1.5 bg-emerald-500 text-white text-sm font-medium rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                      创建
                    </button>
                    <button onClick={() => { setIsCreatingGroup(false); setNewGroupName(''); }}
                      className="px-3 py-1.5 text-gray-400 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium">
                      取消
                    </button>
                  </div>
                </div>
              )}

              {mergeRules.length > 0 ? mergeRules.map(rule => {
                const isEditing = editingRuleId === rule.id;
                return (
                  <div
                    key={rule.id}
                    className={`bg-white border rounded-2xl shadow-sm transition-all ${
                      dragOverGroup === rule.id
                        ? 'border-emerald-400 ring-2 ring-emerald-400/20 bg-emerald-50/30'
                        : 'border-gray-100 hover:shadow-md'
                    }`}
                    onDragOver={e => {
                      e.preventDefault(); // 必须阻止默认行为才能接收 drop
                      if (draggedItemName) setDragOverGroup(rule.id);
                    }}
                    onDragLeave={() => setDragOverGroup(null)}
                    onDrop={e => {
                      e.preventDefault();
                      setDragOverGroup(null);
                      if (draggedItemName) {
                        onAddMergeRule(rule.targetName, draggedItemName);
                        setDraggedItemName(null);
                      }
                    }}
                  >

                    <div className="flex items-center p-3 md:p-4 border-b border-gray-100 gap-2">
                      {isEditing ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            autoFocus
                            value={editingTargetName}
                            onChange={(e) => setEditingTargetName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { onUpdateTargetName(rule.id, editingTargetName.trim()); setEditingRuleId(null); }
                              if (e.key === 'Escape') setEditingRuleId(null);
                            }}
                            className="flex-1 text-lg font-bold bg-transparent border-b-2 border-emerald-400 outline-none text-gray-900 pb-0.5 min-w-0"
                          />
                          <button onClick={() => { onUpdateTargetName(rule.id, editingTargetName.trim()); setEditingRuleId(null); }}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg shrink-0"><Check size={16} /></button>
                          <button onClick={() => setEditingRuleId(null)}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg shrink-0"><X size={16} /></button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1 text-lg font-bold text-gray-900 truncate">{rule.targetName}</span>
                          
                          <div className="flex items-center shrink-0">
                            <button onClick={() => { setEditingRuleId(rule.id); setEditingTargetName(rule.targetName); }}
                              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                              <Edit2 size={15} />
                            </button>
                            <button onClick={() => onRemoveMergeRule(rule.id)}
                              className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </>
                      )}

                      {/* 性别选择永远显示在最右侧 */}
                      <div className="flex bg-slate-50 rounded-lg p-0.5 border border-slate-100 shrink-0 ml-1">
                        <button onClick={() => onUpdateGender(rule.id, rule.gender === 'boy' ? undefined : 'boy')}
                          className={`p-1 rounded transition-colors ${rule.gender === 'boy' ? 'bg-blue-100 text-blue-500 shadow-sm' : 'text-slate-300 hover:text-blue-400'}`}
                          title="设置为男生头像"
                        >
                          <User size={14} strokeWidth={3} />
                        </button>
                        <button onClick={() => onUpdateGender(rule.id, rule.gender === 'girl' ? undefined : 'girl')}
                          className={`p-1 rounded transition-colors ${rule.gender === 'girl' ? 'bg-pink-100 text-pink-500 shadow-sm' : 'text-slate-300 hover:text-pink-400'}`}
                          title="设置为女生头像"
                        >
                          <User size={14} strokeWidth={3} />
                        </button>
                      </div>
                    </div>

                    {/* 收付款方名 —— 小 chip 行 */}
                    {!isEditing && (
                      <div className="flex flex-wrap gap-1.5 items-center px-4 pt-3 pb-4">
                        {rule.aliases.map(alias => (
                          <span key={alias}
                            className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 text-xs px-2.5 py-1 rounded-lg border border-slate-200">
                            {alias}
                            <button onClick={() => onRemoveAlias(rule.id, alias)}
                              className="text-slate-300 hover:text-rose-400 transition-colors ml-0.5">
                              <X size={11} />
                            </button>
                          </span>
                        ))}
                        {rule.aliases.length === 0 && (
                          <span className="text-xs text-gray-400 italic py-1 px-1">拖拽下方成员到此处...</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              }) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Users size={44} className="text-gray-200 mb-4" />
                  <p className="text-gray-400 font-medium text-base">还没有备注组</p>
                  <p className="text-sm text-gray-300 mt-1.5">从下方点击收付款方，给他起一个备注名</p>
                </div>
              )}
            </div>

            {/* 底部区域 —— 白名单成员（未分组） */}
            {(() => {
              const assigned = new Set(mergeRules.flatMap(r => r.aliases));
              const unassigned = whitelist.filter(w => w.enabled && !assigned.has(w.name));

              if (whitelist.filter(w => w.enabled).length > 0 && unassigned.length === 0) {
                return (
                  <div className="px-4 py-3 border-t border-gray-100 text-xs text-center text-gray-400">
                    所有白名单成员已全部分配备注组 ✓
                  </div>
                );
              }
              if (unassigned.length === 0) return null;

              return (
                <div className="border-t border-gray-100 bg-slate-50/80 rounded-b-xl px-4 py-4">
                  <p className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
                    <Shield size={12} className="text-slate-300" />
                    点击收付款方，为他起备注名；也可以直接拖拽到上方已有的备注组中
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {unassigned.map(item => (
                      <div key={item.id}>
                        <button
                          draggable
                          onClick={() => setSelectedItemForMerge(item.name)}
                          onDragStart={() => setDraggedItemName(item.name)}
                          onDragEnd={() => setDraggedItemName(null)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl bg-white text-slate-600 border border-slate-200 shadow-sm hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 hover:shadow-md transition-all cursor-grab active:cursor-grabbing">
                          <Plus size={13} />
                          {item.name}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── 收付款白名单 ── */}
        {activeTab === 'whitelist' && (
          <div className="p-4 md:p-6 space-y-5 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-col sm:flex-row gap-3">
              <input value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddWhitelist()}
                placeholder="输入名称添加..."
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow" />
              <div className="flex gap-2">
                <button onClick={handleAddWhitelist} disabled={!newName.trim()}
                  className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center justify-center font-medium">
                  添加
                </button>
                {whitelist.length > 0 && (
                  <button onClick={() => { if (window.confirm('确定要清空所有白名单吗？')) onClearWhitelist(); }}
                    className="px-4 py-2.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors text-sm font-medium whitespace-nowrap flex items-center gap-1.5">
                    <Trash2 size={16} />
                    清空
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="搜索已添加的白名单..."
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" />
            </div>

            <div className="flex flex-wrap gap-2.5 min-h-[60px] p-4 bg-gray-50/50 rounded-xl border border-gray-100">
              {filteredWhitelist.length > 0 ? (
                filteredWhitelist.map(item => (
                  <div key={item.id} onClick={() => onToggleWhitelist(item.id)}
                    className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-xl text-sm cursor-pointer group transition-all ${
                      item.enabled
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-sm hover:bg-emerald-100 hover:border-emerald-300'
                        : 'bg-slate-50 text-slate-400 border border-slate-200 opacity-70 hover:opacity-100 hover:bg-slate-100'
                    }`}>
                    <span className="font-medium">{item.name}</span>
                    <button onClick={e => { e.stopPropagation(); onRemoveWhitelist(item.id); }}
                      className={`ml-1 p-1 rounded-md transition-colors ${
                        item.enabled
                          ? 'text-emerald-400 hover:bg-emerald-200/50 hover:text-emerald-700'
                          : 'text-slate-300 hover:bg-slate-200/50 hover:text-rose-500'
                      }`}>
                      <X size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="w-full text-center py-4 text-gray-400 text-sm">
                  {searchTerm ? '未找到匹配项' : '暂无白名单，请添加你需要统计的搭子'}
                </div>
              )}
            </div>

            {suggestedNames.length > 0 && !searchTerm && (
              <div className="pt-5 mt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <span className="text-emerald-500">✨</span> 账单中发现的常用收付款方推荐
                  </span>
                  {suggestedNames.length > 20 && (
                    <button onClick={() => setShowAllSuggestions(!showAllSuggestions)}
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                      {showAllSuggestions ? '收起' : `展开全部 ${suggestedNames.length} 个`}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(showAllSuggestions ? suggestedNames : suggestedNames.slice(0, 20)).map(name => (
                    <button key={name} onClick={() => onAddWhitelist(name)}
                      className="bg-white hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg text-sm border border-gray-200 hover:border-emerald-300 transition-all shadow-sm">
                      + {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile merge selector modal */}
      {selectedItemForMerge && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedItemForMerge(null)}>
          <div className="bg-white w-full sm:w-[400px] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50 rounded-t-2xl sm:rounded-t-2xl">
              <div>
                <h3 className="font-bold text-gray-900">分配到备注组</h3>
                <p className="text-xs text-gray-500 mt-0.5">将「{selectedItemForMerge}」加入：</p>
              </div>
              <button onClick={() => setSelectedItemForMerge(null)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-2">
              {mergeRules.length > 0 ? (
                <div className="space-y-1">
                  {mergeRules.map(rule => (
                    <button
                      key={rule.id}
                      onClick={() => {
                        onAddMergeRule(rule.targetName, selectedItemForMerge);
                        setSelectedItemForMerge(null);
                      }}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-emerald-50 flex items-center justify-between group transition-colors"
                    >
                      <span className="font-medium text-gray-900 group-hover:text-emerald-700">{rule.targetName}</span>
                      <Plus size={16} className="text-gray-300 group-hover:text-emerald-500" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400 text-sm">暂无备注组，请先在上方创建一个</div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100">
              <button 
                onClick={() => {
                  setNewGroupName(selectedItemForMerge);
                  setIsCreatingGroup(true);
                  setSelectedItemForMerge(null);
                }}
                className="w-full py-3 bg-emerald-50 text-emerald-600 font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-emerald-100 transition-colors"
              >
                <Plus size={16} />
                创建名为「{selectedItemForMerge}」的新组
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}