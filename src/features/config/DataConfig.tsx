/**
 * 统一数据配置页面
 */

import React, { useState } from 'react';
import { 
  Filter, Users, Shield, ChevronRight,
  Plus, Trash2, Search, ArrowRight, Zap, Edit2, Check, X
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
  onClearMergeRules: () => void;
  onFilterChange: (options: FilterOptions) => void;
  suggestedNames: string[];
  originalNames: string[];
}

function PipelineVisualization({ stats }: { stats: DataConfigProps['stats'] }) {
  const steps = [
    { label: '原始记录', count: stats.rawCount, color: 'bg-gray-100' },
    { label: '筛选后', count: stats.afterFilter, color: 'bg-blue-100' },
    { label: '合并后', count: stats.afterMerge, color: 'bg-purple-100' },
    { label: '最终显示', count: stats.afterWhitelist, color: 'bg-emerald-100' },
  ];
  return (
    <div className="bg-gradient-to-r from-emerald-50/50 to-blue-50/50 rounded-2xl p-5 border border-emerald-100/50 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-blue-400 opacity-50"></div>
      <div className="flex items-center gap-2 mb-4">
        <Zap size={18} className="text-emerald-500 drop-shadow-sm" />
        <span className="font-bold text-gray-800 text-lg">数据处理流程</span>
      </div>
      <div className="flex items-center justify-between overflow-x-auto pb-1 gap-2">
        {steps.map((step, index) => (
          <React.Fragment key={step.label}>
            <div className={`flex-1 ${step.color} rounded-xl px-4 py-3 min-w-[110px] text-center shadow-sm border border-white/50 backdrop-blur-sm transition-transform hover:scale-105`}>
              <div className="text-2xl font-black text-gray-800 drop-shadow-sm">{step.count}</div>
              <div className="text-sm font-medium text-gray-600 mt-0.5">{step.label}</div>
            </div>
            {index < steps.length - 1 && <ArrowRight size={20} className="text-gray-300 flex-shrink-0" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export function DataConfig({
  transactions, mergeRules, whitelist, filterOptions, stats,
  onAddWhitelist, onRemoveWhitelist, onToggleWhitelist, onClearWhitelist, onBatchAddWhitelist,
  onAddMergeRule, onRemoveMergeRule, onRemoveAlias, onUpdateTargetName, onClearMergeRules,
  onFilterChange, suggestedNames, originalNames,
}: DataConfigProps) {
  const [activeTab, setActiveTab] = useState<'filter' | 'merge' | 'whitelist'>('filter');
  
  const [newName, setNewName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [targetName, setTargetName] = useState('');
  const [aliasName, setAliasName] = useState('');
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingTargetName, setEditingTargetName] = useState('');

  const enabledCount = whitelist.filter(item => item.enabled).length;
  const filteredWhitelist = searchTerm
    ? whitelist.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : whitelist;

  const handleAddWhitelist = () => {
    if (newName.trim()) { onAddWhitelist(newName.trim()); setNewName(''); }
  };
  const handleAddMergeRule = () => {
    if (targetName.trim() && aliasName.trim()) {
      onAddMergeRule(targetName.trim(), aliasName.trim());
      setTargetName(''); setAliasName('');
    }
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
      <div className="flex bg-slate-100/80 rounded-2xl p-1.5 overflow-x-auto hide-scrollbar shadow-inner border border-slate-200/50">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all flex-shrink-0 flex-1 whitespace-nowrap ${
                isActive
                  ? 'bg-white text-emerald-700 shadow-sm border border-black/5 scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-emerald-500 drop-shadow-sm' : 'opacity-70'} />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-xs px-2 py-0.5 rounded-full ml-1 font-bold ${
                  isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200/70 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 内容区 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm min-h-[400px]">
        {/* 筛选条件 */}
        {activeTab === 'filter' && (
          <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">交易类型</label>
              <div className="flex flex-wrap gap-2">
                {['扫二维码付款', '二维码付款', '商户消费', '二维码收款', '转账', '红包', '群收款'].map(type => (
                  <button key={type}
                    onClick={() => {
                      const newTypes = filterOptions.transactionTypes.includes(type)
                        ? filterOptions.transactionTypes.filter(t => t !== type)
                        : [...filterOptions.transactionTypes, type];
                      onFilterChange({ ...filterOptions, transactionTypes: newTypes });
                    }}
                    className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm ${
                      filterOptions.transactionTypes.includes(type)
                        ? 'bg-slate-800 text-white border-2 border-transparent scale-[1.02]'
                        : 'bg-white text-slate-600 border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                    }`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>
            
            <hr className="border-gray-100" />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">收支方向</label>
              <div className="flex gap-3">
                {[
                  { value: '收入', label: '📈 收入', color: 'emerald' },
                  { value: '支出', label: '📉 支出', color: 'red' },
                ].map(({ value, label, color }) => (
                  <button key={value}
                    onClick={() => {
                      const newDirs = filterOptions.directionTypes.includes(value)
                        ? filterOptions.directionTypes.filter(d => d !== value)
                        : [...filterOptions.directionTypes, value];
                      onFilterChange({ ...filterOptions, directionTypes: newDirs });
                    }}
                    className={`px-6 py-3 rounded-xl font-medium transition-all shadow-sm ${
                      filterOptions.directionTypes.includes(value)
                        ? color === 'emerald'
                          ? 'bg-emerald-500 text-white border-2 border-transparent scale-[1.02]'
                          : 'bg-rose-500 text-white border-2 border-transparent scale-[1.02]'
                        : 'bg-white text-slate-600 border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            
            <hr className="border-gray-100" />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">金额区间（元）</label>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-white border-2 border-slate-100 rounded-xl overflow-hidden focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all shadow-sm">
                  <div className="px-3 py-2.5 bg-slate-50 text-slate-500 font-medium border-r border-slate-100">¥</div>
                  <input type="number" value={filterOptions.minAmount}
                    onChange={e => onFilterChange({ ...filterOptions, minAmount: Number(e.target.value) })}
                    className="w-24 px-3 py-2.5 outline-none font-medium text-slate-700"
                    min="0" step="0.01" />
                </div>
                <span className="text-slate-400 font-medium">至</span>
                <div className="flex items-center bg-white border-2 border-slate-100 rounded-xl overflow-hidden focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all shadow-sm">
                  <div className="px-3 py-2.5 bg-slate-50 text-slate-500 font-medium border-r border-slate-100">¥</div>
                  <input type="number" value={filterOptions.maxAmount}
                    onChange={e => onFilterChange({ ...filterOptions, maxAmount: Number(e.target.value) })}
                    className="w-24 px-3 py-2.5 outline-none font-medium text-slate-700"
                    min="0" step="0.01" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 搭子合并 */}
        {activeTab === 'merge' && (
          <div className="p-6 space-y-5 animate-in fade-in slide-in-from-bottom-2">
            {/* 添加规则 */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input value={targetName} onChange={e => setTargetName(e.target.value)}
                placeholder="目标名字 (如: 阿喵)"
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow" />
              <input value={aliasName} onChange={e => setAliasName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddMergeRule()}
                placeholder="原名称 (如: 美味点)"
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow" />
              <button onClick={handleAddMergeRule} disabled={!targetName.trim() || !aliasName.trim()}
                className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 font-medium">
                <Plus size={18} />
                <span>添加合并</span>
              </button>
            </div>

            {/* 规则列表 */}
            {mergeRules.length > 0 ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 shadow-sm">
                {mergeRules.map(rule => {
                  const isExpanded = expandedRule === rule.id;
                  const isEditing = editingRuleId === rule.id;
                  return (
                    <div key={rule.id} className="bg-white">
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                        <button
                          onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                          className="flex-shrink-0 p-1 text-gray-400 hover:text-emerald-500 bg-white border border-gray-200 rounded-full shadow-sm"
                        >
                          <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>

                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input value={editingTargetName}
                                onChange={e => setEditingTargetName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') { onUpdateTargetName(rule.id, editingTargetName.trim()); setEditingRuleId(null); }
                                  if (e.key === 'Escape') setEditingRuleId(null);
                                }}
                                className="flex-1 bg-white border border-emerald-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                autoFocus />
                              <button onClick={() => { onUpdateTargetName(rule.id, editingTargetName.trim()); setEditingRuleId(null); }}
                                className="text-emerald-600 hover:text-emerald-700 p-1 bg-emerald-50 rounded"><Check size={16} /></button>
                              <button onClick={() => setEditingRuleId(null)}
                                className="text-gray-500 hover:text-gray-700 p-1 bg-gray-100 rounded"><X size={16} /></button>
                            </div>
                          ) : (
                            <button onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                              className="text-left w-full truncate text-gray-800 font-medium">
                              {rule.targetName}
                            </button>
                          )}
                        </div>

                        <span className="flex-shrink-0 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-medium">
                          {rule.aliases.length}个别名
                        </span>

                        {!isEditing && (
                          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                            <button onClick={() => { setEditingRuleId(rule.id); setEditingTargetName(rule.targetName); }}
                              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => onRemoveMergeRule(rule.id)}
                              className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>

                      {isExpanded && !isEditing && (
                        <div className="px-4 pb-4 pt-1 bg-gray-50/50">
                          <div className="flex flex-wrap gap-2 mb-3">
                            {rule.aliases.map(alias => (
                              <span key={alias}
                                className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg text-sm text-gray-700 border border-gray-200 shadow-sm group">
                                {alias}
                                <button onClick={() => onRemoveAlias(rule.id, alias)}
                                  className="text-gray-300 hover:text-rose-500 transition-colors">
                                  <X size={14} />
                                </button>
                              </span>
                            ))}
                          </div>
                          <div className="flex max-w-sm">
                            <input placeholder="输入新别名后回车添加..."
                              className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const input = e.target as HTMLInputElement;
                                  if (input.value.trim()) { onAddMergeRule(rule.targetName, input.value.trim()); input.value = ''; }
                                }
                              }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Users size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">暂无合并规则</p>
                <p className="text-sm text-gray-400 mt-1">使用上方表单添加，可以将多个不同的账单名称合并为同一个搭子</p>
              </div>
            )}
          </div>
        )}

        {/* 收付款白名单 */}
        {activeTab === 'whitelist' && (
          <div className="p-6 space-y-5 animate-in fade-in slide-in-from-bottom-2">
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
                <button onClick={() => onBatchAddWhitelist(suggestedNames)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium whitespace-nowrap">
                  全部添加智能推荐
                </button>
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
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer group transition-all shadow-sm ${
                      item.enabled
                        ? 'bg-white text-gray-800 border-2 border-emerald-400 hover:border-emerald-500'
                        : 'bg-white text-gray-400 border-2 border-transparent hover:border-gray-200 opacity-60 hover:opacity-100'
                    }`}>
                    <span className={`flex items-center justify-center w-4 h-4 rounded-full ${item.enabled ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-transparent'}`}>
                      <Check size={10} strokeWidth={3} />
                    </span>
                    <span className="font-medium">{item.name}</span>
                    <button onClick={e => { e.stopPropagation(); onRemoveWhitelist(item.id); }}
                      className="ml-1 text-gray-300 hover:text-rose-500 transition-colors p-1 rounded-md hover:bg-rose-50">
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
    </div>
  );
}