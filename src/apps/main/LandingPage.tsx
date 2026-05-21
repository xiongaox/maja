import React, { useState, useEffect } from 'react';
import { ArrowRight, Lock, Dices } from 'lucide-react';
import { updateConfig } from '../../lib/api';

const generateRandomName = () => {
  const adjectives = ['lucky', 'rich', 'happy', 'super', 'golden', 'magic'];
  const nouns = ['mahjong', 'club', 'room', 'table', 'dragon', 'tiger'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${adj}-${noun}-${num}`;
};

export function LandingPage() {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(generateRandomName());
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!cleanName) {
      setError('请输入有效的房间名（仅限英文字母、数字和横杠）');
      return;
    }
    if (!pin || pin.length !== 6 || !/^\d+$/.test(pin)) {
      setError('请输入6位纯数字密码');
      return;
    }

    setIsLoading(true);
    try {
      // 尝试初始化房间
      await updateConfig(cleanName, pin, {
        mergeRules: [],
        whitelist: [],
        filterOptions: {},
        pin // 将密码存入云端
      });

      // 保存 PIN 到本地，避免首次进去就要输密码
      sessionStorage.setItem(`maja_pin_${cleanName}`, pin);

      // 跳转
      window.location.href = `/?id=${cleanName}`;
    } catch (err: any) {
      setError(err.message || '创建房间失败，可能是网络问题或该房间已被锁定');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <span className="text-3xl font-black">發</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800">雀神记账本</h1>
          <p className="text-slate-500 mt-2 text-sm">免注册、即开即用的多人打牌战绩共享空间</p>
        </div>

        <form onSubmit={handleCreate} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              1. 设定您的专属链接名称
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例如: wuhu-mahjong-club"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
              />
              <button
                type="button"
                onClick={() => setName(generateRandomName())}
                className="bg-slate-100 text-slate-600 px-4 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center"
                title="随机生成"
              >
                <Dices size={20} />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              建议使用英文和横杠，方便分享。链接将是: <br/>
              <span className="text-emerald-600 font-medium break-all">https://maja.app/?id={name || '...'}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Lock size={16} className="text-amber-500" />
              2. 设置防篡改密码 (6位纯数字)
            </label>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="例如: 888888"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow tracking-[0.5em] font-mono text-lg"
            />
            <p className="text-xs text-slate-400 mt-2">
              <strong className="text-amber-600">必填项。</strong>
              拥有链接的人都可以查看战绩，但只有输入此密码的人才能上传或修改数据。防君子不防小人，请勿使用重要支付密码。
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-600 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !name || !pin}
            className="w-full bg-emerald-500 text-white font-bold rounded-xl py-3.5 hover:bg-emerald-600 active:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-emerald-500/20"
          >
            {isLoading ? '正在创建...' : '创建并进入空间'}
            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
