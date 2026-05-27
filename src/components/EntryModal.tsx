import React, { useState } from 'react';
import { Lock, Eye, CheckCircle2 } from 'lucide-react';

interface EntryModalProps {
  isOpen: boolean;
  onUnlock: (pin: string) => Promise<void>;
  onGuest: () => void;
}

export function EntryModal({ isOpen, onUnlock, onGuest }: EntryModalProps) {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setError('请输入6位纯数字密码');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await onUnlock(pin);
    } catch (err: any) {
      setError(err.message || '密码错误或网络异常');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl transform transition-all animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center justify-center p-8 border-b border-slate-100 bg-emerald-50/30">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <span className="text-3xl font-black">發</span>
          </div>
          <h3 className="text-xl font-black text-slate-800">欢迎来到雀神记账本</h3>
          <p className="text-slate-500 mt-2 text-sm text-center">
            输入空间密码解锁上传账单与配置修改权限
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <input
            autoFocus
            type="password"
            maxLength={6}
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="输入 6 位密码"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-center text-xl mb-2"
          />
          
          {error && (
            <p className="text-rose-500 text-sm font-medium mb-2 text-center animate-pulse">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 mt-6">
            <button
              type="submit"
              disabled={isLoading || pin.length !== 6}
              className="w-full py-3.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 active:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20"
            >
              {isLoading ? '验证中...' : '解锁完整权限'}
            </button>
            
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium">或</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              type="button"
              onClick={onGuest}
              className="w-full py-3.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <Eye size={18} />
              以访客身份浏览
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
