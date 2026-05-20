/**
 * 统一数据配置页面
 */

import React, { useState } from 'react';
import { 
  Filter, Users, Shield, ChevronDown, ChevronRight,
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

function CollapsibleSection({ 
  title, icon: Icon, count, children, defaultOpen = false 
}: {
  title: string;
  icon: React.ElementType;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon size={20} className="text-emerald-500" />
          <span className="font-semibold text-gray-800">{title}</span>
          {count !== undefined && (
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
          )}
        </div>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {isOpen && <div className="border-t border-gray-100">{children}</div>}
    </div>
  );
}

function PipelineVisualization({ stats }: { stats: DataConfigProps['stats'] }) {
  const steps = [
    { label: '原始记录', count: stats.rawCount, color: 'bg-gray-100' },
    { label: '筛选后', count: stats.afterFilter, color: 'bg-blue-100' },
    { label: '合并后', count: stats.afterMerge, color: 'bg-purple-100' },
    { label: '最终显示', count: stats.afterWhitelist, color: 'bg-emerald-100' },
  ];
  return (
    <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-4 border border-emerald-100">
      <div className="flex items-center gap-2 mb-3">
        <Zap size={16} className="text-emerald-500" />
        <span className="font-semibold text-gray-800">数据处理流程</span>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {steps.map((step, index) => (
          <React.Fragment key={step.label}>
            <div className={`${step.color} rounded-lg px-3 py-2 min-w-[100px] text-center`}>
              <div className="text-lg font-bold text-gray-800">{step.count}</div>
              <div className="text-xs text-gray-600">{step.label}</div>
            </div>
            {index < steps.length - 1 && <ArrowRight size={16} className="text-gray-400 flex-shrink-0" />}
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

  return (
    <div className="space-y-4 animate-in fade-in">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">数据配置</h1>
        <p className="text-gray-500 text-sm mt-1">统一管理筛选条件、搭子合并和收付款白名单</p>
      </header>

      <PipelineVisualization stats={stats} />

      {/* 筛选条件 */}
      <CollapsibleSection title="筛选条件" icon={Filter} defaultOpen={true}>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">交易类型</label>
            <div className="flex flex-wrap gap-2">
              {['扫二维码付款', '二维码付款', '商户消费', '二维码收款', '转账', '红包', '群收款'].map(type => (
                <button key={type}
                  onClick={() => {
                    const newTypes = filterOptions.transactionTypes.includes(type)
                      ? filterOptions.transactionTypes.filter(t => t !== type)
                      : [...filterOptions.transactionTypes, type];
                    onFilterChange({ ...filterOptions, transactionTypes: newTypes });
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filterOptions.transactionTypes.includes(type)
                      ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:border-gray-300'
                  }`}>
                  {filterOptions.transactionTypes.includes(type) ? '✓ ' : ''}{type}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">收支方向</label>
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
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterOptions.directionTypes.includes(value)
                      ? color === 'emerald'
                        ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                        : 'bg-red-100 text-red-700 border-2 border-red-300'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:border-gray-300'
                  }`}>
                  {filterOptions.directionTypes.includes(value) ? '✓ ' : ''}{label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">金额区间（元）</label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">¥</span>
                <input type="number" value={filterOptions.minAmount}
                  onChange={e => onFilterChange({ ...filterOptions, minAmount: Number(e.target.value) })}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  min="0" step="0.01" />
              </div>
              <span className="text-gray-500">至</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">¥</span>
                <input type="number" value={filterOptions.maxAmount}
                  onChange={e => onFilterChange({ ...filterOptions, maxAmount: Number(e.target.value) })}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  min="0" step="0.01" />
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* 搭子合并 - 内联展开行 */}
      <CollapsibleSection title="搭子合并" icon={Users} count={mergeRules.length}>
        <div className="p-4 space-y-3">
          {/* 添加规则 */}
          <div className="flex gap-2">
            <input value={targetName} onChange={e => setTargetName(e.target.value)}
              placeholder="目标名字 (如: 阿喵)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            <input value={aliasName} onChange={e => setAliasName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddMergeRule()}
              placeholder="原名称 (如: 美味点)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            <button onClick={handleAddMergeRule} disabled={!targetName.trim() || !aliasName.trim()}
              className="px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors">
              <Plus size={16} />
            </button>
          </div>

          {/* 规则列表 */}
          {mergeRules.length > 0 ? (
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              {mergeRules.map(rule => {
                const isExpanded = expandedRule === rule.id;
                const isEditing = editingRuleId === rule.id;
                return (
                  <div key={rule.id} className="bg-white">
                    {/* 规则行头 */}
                    <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors">
                      {/* 展开箭头 */}
                      <button
                        onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                        className="flex-shrink-0 p-0.5 text-gray-400 hover:text-gray-600"
                      >
                        <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>

                      {/* 目标名 */}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input value={editingTargetName}
                              onChange={e => setEditingTargetName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { onUpdateTargetName(rule.id, editingTargetName.trim()); setEditingRuleId(null); }
                                if (e.key === 'Escape') setEditingRuleId(null);
                              }}
                              className="flex-1 bg-white border border-emerald-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-emerald-500"
                              autoFocus />
                            <button onClick={() => { onUpdateTargetName(rule.id, editingTargetName.trim()); setEditingRuleId(null); }}
                              className="text-emerald-600 hover:text-emerald-700 p-0.5"><Check size={14} /></button>
                            <button onClick={() => setEditingRuleId(null)}
                              className="text-gray-400 hover:text-gray-600 p-0.5"><X size={14} /></button>
                          </div>
                        ) : (
                          <button onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                            className="text-left w-full truncate">
                            <span className="font-medium text-gray-800 text-sm">{rule.targetName}</span>
                          </button>
                        )}
                      </div>

                      {/* 别名数量 */}
                      <span className="flex-shrink-0 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {rule.aliases.length}个别名
                      </span>

                      {/* 操作按钮 */}
                      {!isEditing && (
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button onClick={() => { setEditingRuleId(rule.id); setEditingTargetName(rule.targetName); }}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 rounded transition-colors">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => onRemoveMergeRule(rule.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-500 rounded transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 展开的别名区域 */}
                    {isExpanded && !isEditing && (
                      <div className="px-3 pb-3 pt-1 bg-gray-50/50">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {rule.aliases.map(alias => (
                            <span key={alias}
                              className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg text-xs text-gray-700 border border-gray-200 shadow-sm group/a">
                              {alias}
                              <button onClick={() => onRemoveAlias(rule.id, alias)}
                                className="text-gray-300 hover:text-rose-500 ml-0.5">x</button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-1.5">
                          <input placeholder="输入新别名后回车添加..."
                            className="flex-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
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
            <div className="text-center py-6 text-gray-400 text-sm">
              暂无合并规则，使用上方表单添加
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* 收付款白名单 */}
      <CollapsibleSection title="收付款白名单" icon={Shield} count={enabledCount} defaultOpen={true}>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddWhitelist()}
              placeholder="输入名称添加..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            <button onClick={handleAddWhitelist} disabled={!newName.trim()}
              className="px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors">
              <Plus size={16} />
            </button>
            <button onClick={() => onBatchAddWhitelist(suggestedNames)}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
              全部添加
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="搜索白名单..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
          </div>
          <div className="flex flex-wrap gap-2 min-h-[36px]">
            {filteredWhitelist.length > 0 ? (
              filteredWhitelist.map(item => (
                <div key={item.id} onClick={() => onToggleWhitelist(item.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer group transition-all ${
                    item.enabled
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:border-emerald-300'
                      : 'bg-gray-100 text-gray-400 border border-gray-200 hover:border-gray-300'
                  }`}>
                  <span className={`text-xs ${item.enabled ? 'text-emerald-500' : 'text-gray-400'}`}>
                    {item.enabled ? '✓' : '○'}
                  </span>
                  <span className="font-medium">{item.name}</span>
                  <button onClick={e => { e.stopPropagation(); onRemoveWhitelist(item.id); }}
                    className="ml-0.5 text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 -mr-1">×</button>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-400 py-2">{searchTerm ? '未找到匹配项' : '暂无白名单'}</div>
            )}
          </div>
          {suggestedNames.length > 0 && !searchTerm && (
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">📋 账单中发现的其他收付款方</span>
                {suggestedNames.length > 30 && (
                  <button onClick={() => setShowAllSuggestions(!showAllSuggestions)}
                    className="text-xs text-emerald-600 hover:text-emerald-700">
                    {showAllSuggestions ? '收起' : `展开全部 ${suggestedNames.length} 个`}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(showAllSuggestions ? suggestedNames : suggestedNames.slice(0, 30)).map(name => (
                  <button key={name} onClick={() => onAddWhitelist(name)}
                    className="bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-600 px-2.5 py-1 rounded-full text-xs border border-gray-200 hover:border-emerald-200 transition-colors">
                    + {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}