import React, { useState, useMemo } from 'react';
import { Users, Plus, Trash2, Edit2, Check, X, ChevronRight } from 'lucide-react';
import type { MergeRule } from '../../types';

interface SettingsProps {
  mergeRules: MergeRule[];
  allOriginalNames: string[];
  onAddRule: (targetName: string, alias: string) => void;
  onRemoveRule: (ruleId: string) => void;
  onRemoveAlias: (ruleId: string, alias: string) => void;
  onUpdateTargetName: (ruleId: string, newTargetName: string) => void;
  onClearRules: () => void;
}

export function Settings({
  mergeRules, allOriginalNames, onAddRule, onRemoveRule, onRemoveAlias, onUpdateTargetName, onClearRules,
}: SettingsProps) {
  const [newTargetName, setNewTargetName] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingTargetName, setEditingTargetName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllUnused, setShowAllUnused] = useState(false);
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  const toggleExpanded = (ruleId: string) => {
    setExpandedRules(prev => {
      const next = new Set(prev);
      next.has(ruleId) ? next.delete(ruleId) : next.add(ruleId);
      return next;
    });
  };

  const usedAliases = useMemo(() => {
    const used = new Set<string>();
    mergeRules.forEach(rule => rule.aliases.forEach(alias => used.add(alias)));
    return used;
  }, [mergeRules]);

  const unusedNames = useMemo(() => {
    return allOriginalNames
      .filter(name => !usedAliases.has(name))
      .filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [allOriginalNames, usedAliases, searchTerm]);

  const handleAddRule = () => {
    if (newTargetName.trim() && newAlias.trim()) {
      onAddRule(newTargetName.trim(), newAlias.trim());
      setNewAlias('');
    }
  };

  const displayUnused = showAllUnused ? unusedNames : unusedNames.slice(0, 30);

  return (
    <div className="space-y-4 animate-in fade-in max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
        <p className="text-gray-500 text-sm mt-1">管理马甲与收款商户名合并规则</p>
      </header>

      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users className="text-emerald-500" size={20} />
            <h2 className="text-base font-bold text-gray-800">搭子合并规则</h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{mergeRules.length}</span>
          </div>
          {mergeRules.length > 0 && (
            <button onClick={onClearRules} className="text-xs text-gray-400 hover:text-rose-500 transition-colors">清空全部</button>
          )}
        </div>

        {/* 提示 */}
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl mb-4">
          <p className="text-xs text-amber-800">
            💡 <strong>多对一合并：</strong>当搭子使用多个不同的微信名或商户收款码时，可以将它们全部合并为同一个名字。
          </p>
        </div>

        {/* 添加规则 */}
        <div className="flex gap-2 mb-3">
          <input value={newTargetName} onChange={e => setNewTargetName(e.target.value)}
            placeholder="目标名字 (如: 老王)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
          <input value={newAlias} onChange={e => setNewAlias(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddRule()}
            placeholder="原名称 (如: 王记早餐)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
          <button onClick={handleAddRule} disabled={!newTargetName.trim() || !newAlias.trim()}
            className="px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors">
            <Plus size={16} />
          </button>
        </div>

        {/* 搜索 */}
        <div className="relative mb-3">
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="搜索规则或名称..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
        </div>

        {/* 规则列表 - 内联展开 */}
        {mergeRules.length > 0 ? (
          <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 mb-4">
            {mergeRules.map(rule => {
              const isExpanded = expandedRules.has(rule.id);
              const isEditing = editingRuleId === rule.id;
              return (
                <div key={rule.id} className="bg-white">
                  {/* 规则行头 */}
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    {/* 展开箭头 */}
                    <button
                      onClick={() => toggleExpanded(rule.id)}
                      className="flex-shrink-0 p-0.5 text-gray-400 hover:text-gray-600"
                    >
                      <ChevronRight size={16} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>

                    {/* 目标名 */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input value={editingTargetName}
                            onChange={e => setEditingTargetName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { onUpdateTargetName(rule.id, editingTargetName.trim()); setEditingRuleId(null); }
                              if (e.key === 'Escape') setEditingRuleId(null);
                            }}
                            className="flex-1 bg-white border border-emerald-300 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-emerald-500"
                            autoFocus />
                          <button onClick={() => { onUpdateTargetName(rule.id, editingTargetName.trim()); setEditingRuleId(null); }}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700"><Check size={16} /></button>
                          <button onClick={() => setEditingRuleId(null)}
                            className="p-1.5 text-gray-400 hover:text-gray-600"><X size={16} /></button>
                        </div>
                      ) : (
                        <button onClick={() => toggleExpanded(rule.id)}
                          className="text-left w-full truncate">
                          <span className="font-semibold text-gray-800">{rule.targetName}</span>
                        </button>
                      )}
                    </div>

                    {/* 别名数量 */}
                    <span className="flex-shrink-0 text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                      {rule.aliases.length}个别名
                    </span>

                    {/* 操作按钮 */}
                    {!isEditing && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => { setEditingRuleId(rule.id); setEditingTargetName(rule.targetName); }}
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="编辑目标名">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => onRemoveRule(rule.id)}
                          className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="删除规则">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 展开的别名区域 */}
                  {isExpanded && !isEditing && (
                    <div className="px-4 pb-4 pt-1 bg-gray-50/50 border-t border-gray-100">
                      <div className="text-xs text-gray-500 mb-2">
                        以下名称将合并为 <strong className="text-gray-700">{rule.targetName}</strong>：
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {rule.aliases.map(alias => (
                          <span key={alias}
                            className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg text-sm text-gray-700 border border-gray-200 shadow-sm group/a">
                            {alias}
                            <button onClick={() => onRemoveAlias(rule.id, alias)}
                              className="text-gray-300 hover:text-rose-500 ml-0.5 font-bold">x</button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input placeholder="输入新别名后回车添加..."
                          className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const input = e.target as HTMLInputElement;
                              if (input.value.trim()) { onAddRule(rule.targetName, input.value.trim()); input.value = ''; }
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
          <div className="text-center py-8 text-gray-400 text-sm mb-4">
            暂无合并规则，使用上方表单添加
          </div>
        )}

        {/* 未使用的原始名称建议 */}
        {unusedNames.length > 0 && !searchTerm && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">📋 从账单中发现的其他名称</span>
              {unusedNames.length > 30 && (
                <button onClick={() => setShowAllUnused(!showAllUnused)}
                  className="text-xs text-emerald-600 hover:text-emerald-700">
                  {showAllUnused ? '收起' : `展开全部 ${unusedNames.length} 个`}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {displayUnused.map(name => (
                <button key={name}
                  onClick={() => { setNewAlias(name); setNewTargetName(''); }}
                  className="bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-600 px-2.5 py-1 rounded-full text-xs border border-gray-200 hover:border-emerald-200 transition-colors">
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}