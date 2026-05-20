import React, { useState, useMemo } from 'react';
import { Shield, Plus, Trash2, Search, Users, ToggleLeft, ToggleRight } from 'lucide-react';
import type { WhitelistItem } from '../../types';

interface WhitelistProps {
  whitelist: WhitelistItem[];
  allPlayerNames: string[];
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  onClear: () => void;
  onBatchAdd: (names: string[]) => void;
}

export function Whitelist({
  whitelist,
  allPlayerNames,
  onAdd,
  onRemove,
  onToggle,
  onClear,
  onBatchAdd,
}: WhitelistProps) {
  const [newName, setNewName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  const whitelistNames = useMemo(() => new Set(whitelist.map(item => item.name)), [whitelist]);

  const suggestions = useMemo(() => {
    return allPlayerNames
      .filter(name => !whitelistNames.has(name))
      .filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [allPlayerNames, whitelistNames, searchTerm]);

  const filteredWhitelist = useMemo(() => {
    if (!searchTerm) return whitelist;
    return whitelist.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [whitelist, searchTerm]);

  const handleAdd = () => {
    if (newName.trim()) {
      onAdd(newName.trim());
      setNewName('');
    }
  };

  const enabledCount = whitelist.filter(item => item.enabled).length;
  const displaySuggestions = showAllSuggestions ? suggestions : suggestions.slice(0, 30);

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Shield className="text-emerald-500" size={20} />
          <h2 className="text-base font-bold text-gray-800">收付款方白名单</h2>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {enabledCount}/{whitelist.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onBatchAdd(allPlayerNames)}
            className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Users size={12} className="inline mr-1" /> 全部添加
          </button>
          {whitelist.length > 0 && (
            <button
              onClick={onClear}
              className="text-xs text-gray-400 hover:text-rose-500 transition-colors"
            >
              清空
            </button>
          )}
        </div>
      </div>

      {/* 添加 + 搜索 同一行 */}
      <div className="flex gap-2 mb-3">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="输入名称添加..."
          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim()}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
        </button>
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="搜索..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* 白名单 - 紧凑标签布局 */}
      <div className="flex flex-wrap gap-2 mb-3 min-h-[40px]">
        {filteredWhitelist.length > 0 ? (
          filteredWhitelist.map(item => (
            <div
              key={item.id}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm group transition-all cursor-pointer ${
                item.enabled
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:border-emerald-300'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onToggle(item.id)}
            >
              {item.enabled ? (
                <span className="text-emerald-500 text-xs">✓</span>
              ) : (
                <span className="text-gray-400 text-xs">○</span>
              )}
              <span className="font-medium">{item.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.id);
                }}
                className="ml-0.5 text-gray-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 -mr-1"
              >
                ×
              </button>
            </div>
          ))
        ) : (
          <div className="text-xs text-gray-400 py-2">
            {searchTerm ? '未找到匹配项' : '暂无白名单，导入账单后可添加'}
          </div>
        )}
      </div>

      {/* 分隔线 */}
      {suggestions.length > 0 && !searchTerm && (
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">📋 账单中发现的其他收付款方</span>
            {suggestions.length > 30 && (
              <button
                onClick={() => setShowAllSuggestions(!showAllSuggestions)}
                className="text-xs text-emerald-600 hover:text-emerald-700"
              >
                {showAllSuggestions ? '收起' : `展开全部 ${suggestions.length} 个`}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {displaySuggestions.map(name => (
              <button
                key={name}
                onClick={() => onAdd(name)}
                className="bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-600 px-2.5 py-1 rounded-full text-xs border border-gray-200 hover:border-emerald-200 transition-colors"
              >
                + {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}