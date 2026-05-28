import React, { useState, useRef, useEffect } from 'react';
import { X, Cloud, Download, Upload, Trash2, Copy, Check, ChevronDown, ChevronUp, FileJson, Database, Shield } from 'lucide-react';

interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  transactionsLength: number;
  onExportConfig: () => void;
  onExportUserData: () => void;
  onExportFull: () => void;
  onSmartImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearConfig: () => void;
  onClearData: () => void;
  onForceSync: () => void;
}

export function SystemSettingsModal({
  isOpen, onClose, spaceId, transactionsLength,
  onExportConfig, onExportUserData, onExportFull, onSmartImport, onClearConfig, onClearData, onForceSync
}: SystemSettingsModalProps) {
  const [copied, setCopied] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/?id=${spaceId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl transform transition-all flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Cloud size={18} className="text-emerald-500" />
            空间同步与设置
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-7">
          {/* 共享链接 */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2">当前空间专属链接</h4>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={`${window.location.origin}/?id=${spaceId}`}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-600 text-sm focus:outline-none"
              />
              <button 
                onClick={handleCopy}
                className="px-4 py-2.5 bg-emerald-50 text-emerald-600 font-bold rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-2 flex-shrink-0"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? '已复制' : '复制分享'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              将此链接发送给群友，他们可以直接查看最新战绩。由于未提供密码，他们只能看不能改。
            </p>
          </div>

          <div className="h-px bg-slate-100 w-full" />

          {/* 手动云端同步 */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-3">强制云端同步</h4>
            <p className="text-xs text-slate-500 mb-4">如果您担心网络问题导致配置未保存，可点击下方按钮强制将当前所有数据上传至云端。</p>
            <button 
              onClick={() => { onForceSync(); onClose(); }} 
              className="w-full py-3 text-sm bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Cloud size={16} /> 确认上传全部数据与配置
            </button>
          </div>

          <div className="h-px bg-slate-100 w-full" />

          {/* 智能备份与恢复 */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-3">数据备份与恢复</h4>
            <p className="text-xs text-slate-500 mb-4">智能识别您上传的文件类型，自动完成配置或数据的恢复。</p>
            
            <div className="grid grid-cols-2 gap-3">
              {/* 导出下拉菜单 */}
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setExportOpen(!exportOpen)}
                  className="w-full py-3 text-sm bg-slate-50 text-slate-700 font-bold rounded-xl hover:bg-slate-100 flex items-center justify-center gap-2 border border-slate-200 transition-colors"
                >
                  <Download size={16} /> 导出备份 <ChevronUp size={14} className={`transition-transform duration-200 ${exportOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {exportOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-full bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-bottom-2">
                    <button 
                      onClick={() => { onExportConfig(); setExportOpen(false); }}
                      className="w-full px-4 py-3 text-sm text-left flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50"
                    >
                      <div className="p-1.5 bg-slate-100 text-slate-500 rounded-lg"><FileJson size={14} /></div>
                      <div>
                        <div className="font-bold text-slate-700">仅导出配置</div>
                        <div className="text-[10px] text-slate-400">白名单、合并规则等设置</div>
                      </div>
                    </button>
                    <button 
                      onClick={() => { onExportUserData(); setExportOpen(false); }}
                      className="w-full px-4 py-3 text-sm text-left flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50"
                    >
                      <div className="p-1.5 bg-blue-100 text-blue-500 rounded-lg"><Shield size={14} /></div>
                      <div>
                        <div className="font-bold text-slate-700">导出用户数据</div>
                        <div className="text-[10px] text-slate-400">含配置及白名单过滤后的数据</div>
                      </div>
                    </button>
                    <button 
                      onClick={() => { onExportFull(); setExportOpen(false); }}
                      className="w-full px-4 py-3 text-sm text-left flex items-center gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="p-1.5 bg-emerald-100 text-emerald-500 rounded-lg"><Database size={14} /></div>
                      <div>
                        <div className="font-bold text-slate-700">导出完整备份</div>
                        <div className="text-[10px] text-slate-400">含底层全部流水与配置</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* 智能导入按钮 */}
              <label className="w-full py-3 text-sm bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors group">
                <Upload size={16} className="group-hover:-translate-y-0.5 transition-transform" /> 
                <span>智能恢复备份</span>
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={(e) => { 
                    onSmartImport(e); 
                    onClose(); 
                  }} 
                  className="hidden" 
                />
              </label>
            </div>
          </div>

          <div className="h-px bg-slate-100 w-full" />

          {/* 危险区 (采用折叠式或幽灵按钮样式降噪) */}
          <div className="pt-2">
            <details className="group">
              <summary className="text-sm font-bold text-slate-400 hover:text-rose-500 cursor-pointer list-none flex items-center justify-between transition-colors">
                <span className="flex items-center gap-2"><Trash2 size={14} /> 危险操作区</span>
                <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
              </summary>
              <div className="pt-4 space-y-3 animate-in fade-in slide-in-from-top-1">
                <button onClick={() => { onClearConfig(); onClose(); }} className="w-full py-2.5 text-sm bg-white text-rose-400 font-medium rounded-xl hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center gap-2 border border-rose-100 transition-colors">
                  <Trash2 size={14} /> 初始化并清空所有配置
                </button>
                {transactionsLength > 0 && (
                  <button onClick={() => { onClearData(); onClose(); }} className="w-full py-2.5 text-sm bg-rose-50 text-rose-500 font-bold rounded-xl hover:bg-rose-600 hover:text-white flex items-center justify-center gap-2 border border-rose-100 hover:border-rose-600 transition-all">
                    <Trash2 size={14} /> 清空所有交易数据 ({transactionsLength} 条)
                  </button>
                )}
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
