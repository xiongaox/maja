import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => Promise<void>;
}

export function PasswordModal({ isOpen, onClose, onSubmit }: PasswordModalProps) {
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
      await onSubmit(pin);
      // 成功后清空密码，关闭由外部控制（通常外部也会保存 PIN 并关闭）
      setPin('');
    } catch (err: any) {
      setError(err.message || '密码错误或网络异常');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl transform transition-all">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Lock size={18} className="text-amber-500" />
            需要密码验证
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-sm text-slate-500 mb-5">
            您正在尝试修改核心数据（如上传账单、修改规则等），请输入创建该空间时设置的 6 位数字密码进行验证。
          </p>

          <input
            autoFocus
            type="password"
            maxLength={6}
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="输入 6 位密码"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow text-center text-xl mb-2"
          />
          
          {error && (
            <p className="text-rose-500 text-sm font-medium mb-2 text-center animate-pulse">
              {error}
            </p>
          )}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading || pin.length !== 6}
              className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 active:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '验证中...' : '确认解锁'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
