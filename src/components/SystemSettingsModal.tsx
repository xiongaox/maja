import React from 'react';
import { X, Cloud, Download, Upload, Trash2, Copy, Check } from 'lucide-react';

interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  transactionsLength: number;
  onExportConfig: () => void;
  onImportConfig: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportFull: () => void;
  onImportFull: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearConfig: () => void;
  onClearData: () => void;
}

export function SystemSettingsModal({
  isOpen, onClose, spaceId, transactionsLength,
  onExportConfig, onImportConfig, onExportFull, onImportFull, onClearConfig, onClearData
}: SystemSettingsModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://maja.app/?id=${spaceId}`);
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
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* 共享链接 */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2">当前空间专属链接</h4>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={`https://maja.app/?id=${spaceId}`}
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

          {/* 手动备份区 */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-3">本地手动备份 (可选)</h4>
            <p className="text-xs text-slate-500 mb-4">您的数据已实时同步至云端，通常无需手动备份。若需转移或保存快照，可使用以下功能。</p>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button onClick={onExportConfig} className="py-2.5 text-sm bg-slate-50 text-slate-600 font-medium rounded-xl hover:bg-slate-100 flex items-center justify-center gap-2 border border-slate-100">
                <Download size={14} /> 导出配置
              </button>
              <label className="py-2.5 text-sm bg-slate-50 text-slate-600 font-medium rounded-xl hover:bg-slate-100 flex items-center justify-center gap-2 cursor-pointer border border-slate-100">
                <Upload size={14} /> 导入配置
                <input type="file" accept=".json" onChange={(e) => { onImportConfig(e); onClose(); }} className="hidden" />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={onExportFull} className="py-2.5 text-sm bg-emerald-50 text-emerald-600 font-medium rounded-xl hover:bg-emerald-100 flex items-center justify-center gap-2 border border-emerald-100">
                <Download size={14} /> 导出完整备份
              </button>
              <label className="py-2.5 text-sm bg-blue-50 text-blue-600 font-medium rounded-xl hover:bg-blue-100 flex items-center justify-center gap-2 cursor-pointer border border-blue-100">
                <Upload size={14} /> 恢复完整备份
                <input type="file" accept=".json" onChange={(e) => { onImportFull(e); onClose(); }} className="hidden" />
              </label>
            </div>
          </div>

          <div className="h-px bg-slate-100 w-full" />

          {/* 危险区 */}
          <div>
            <h4 className="text-sm font-bold text-rose-600 mb-3">危险操作区</h4>
            <div className="space-y-3">
              <button onClick={() => { onClearConfig(); onClose(); }} className="w-full py-2.5 text-sm bg-rose-50 text-rose-600 font-medium rounded-xl hover:bg-rose-100 flex items-center justify-center gap-2 border border-rose-100">
                <Trash2 size={14} /> 初始化并清空所有配置
              </button>
              {transactionsLength > 0 && (
                <button onClick={() => { onClearData(); onClose(); }} className="w-full py-2.5 text-sm bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 flex items-center justify-center gap-2 border border-rose-100">
                  <Trash2 size={14} /> 清空所有交易数据 ({transactionsLength} 条)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
