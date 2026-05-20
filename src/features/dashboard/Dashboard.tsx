import React from 'react';
import { Calendar, DollarSign, TrendingUp, TrendingDown, Award, Frown, PieChart, Shield, LineChart as LineChartIcon, FileText, Upload } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Stats, Transaction, DailyStat } from '../../types';

interface DashboardProps {
  stats: Stats;
  normalizedTransactions: Transaction[];
  dailyStats: Record<string, DailyStat>;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  whitelistCount: number;
}

export function Dashboard({ stats, normalizedTransactions, dailyStats, onFileUpload, fileInputRef, isUploading, whitelistCount }: DashboardProps) {
  const chartData = React.useMemo(() => {
    return Object.entries(dailyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stat]) => ({
        date: date.substring(5), // MM-DD
        net: Number(stat.net.toFixed(2)),
      }));
  }, [dailyStats]);

  const isEmpty = normalizedTransactions.length === 0;

  return (
    <div className="space-y-6 animate-in fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据概览</h1>
          <p className="text-gray-500 text-sm mt-1">
            你的麻将生涯数据统计分析
            {whitelistCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-emerald-600">
                <Shield size={12} /> 白名单已启用
              </span>
            )}
          </p>
        </div>

        <div className={isEmpty ? "hidden" : "relative group w-full md:w-auto"}>
          <input
            type="file"
            multiple
            accept=".csv, .xlsx, .xls"
            onChange={onFileUpload}
            ref={fileInputRef}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            disabled={isUploading}
          />
          <button className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all shadow-lg shadow-emerald-200
            ${isUploading ? 'bg-emerald-400 cursor-wait' : 'bg-emerald-500 hover:bg-emerald-600 hover:-translate-y-0.5'}`}>
            <TrendingUp size={18} className={isUploading ? 'animate-bounce' : ''} />
            {isUploading ? '解析中...' : '导入账单文件 (Excel/CSV)'}
          </button>
        </div>
      </header>

      {isEmpty ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-6">
            <FileText size={40} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">暂无交易记录</h3>
          <p className="text-gray-500 max-w-md mb-8 leading-relaxed">
            你还没有导入任何账单。点击右上角的“导入账单文件”按钮，上传微信或支付宝导出的 Excel/CSV 文件，开始你的雀神记账之旅吧！
          </p>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-8 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200/50 flex items-center gap-2"
          >
            <Upload size={18} />
            立即导入
          </button>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl shadow-sm relative overflow-hidden text-white">
          <div className="absolute top-4 right-4 bg-white/20 p-2 rounded-full text-white">
            <Calendar size={24} />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-medium text-emerald-50">{stats.latestDayLabel}</p>
            {normalizedTransactions.length > 0 && !stats.isActuallyToday && (
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full text-emerald-50">
                {stats.latestDayDisplayDate}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold tracking-tight">
              {stats.latestDayNet > 0 ? '+' : ''}{stats.latestDayNet.toFixed(2)}
            </span>
            <span className="text-emerald-100 font-medium">元</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-gray-50 p-2 rounded-full text-gray-400"><DollarSign size={24} /></div>
          <p className="text-sm font-medium text-gray-500 mb-2">累计总盈亏</p>
          <div className="flex items-baseline gap-1">
            <span className={`text-4xl font-bold tracking-tight ${stats.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {stats.netProfit > 0 ? '+' : ''}{stats.netProfit.toFixed(2)}
            </span>
            <span className="text-gray-400 font-medium">元</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-emerald-50 p-2 rounded-full text-emerald-500"><TrendingUp size={24} /></div>
          <p className="text-sm font-medium text-gray-500 mb-2">累计赢取</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900">+{stats.totalWin.toFixed(2)}</span>
            <span className="text-gray-400 font-medium">元</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-rose-50 p-2 rounded-full text-rose-500"><TrendingDown size={24} /></div>
          <p className="text-sm font-medium text-gray-500 mb-2">累计输出</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900">-{stats.totalLoss.toFixed(2)}</span>
            <span className="text-gray-400 font-medium">元</span>
          </div>
        </div>
      </div>

      {/* 每日趋势图表 */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mt-6 mb-6">
        <div className="flex items-center gap-2 mb-6">
          <LineChartIcon size={20} className="text-emerald-500" />
          <h3 className="text-lg font-bold text-gray-900">每日盈亏趋势</h3>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => [`${value > 0 ? '+' : ''}${value} 元`, '净盈亏']}
              />
              <Line
                type="monotone"
                dataKey="net"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <PieChart size={20} className="text-emerald-500" />
            <h3 className="text-lg font-bold text-gray-900">各家交锋战绩</h3>
          </div>
          {Object.keys(stats.playerStats).length > 0 ? (
            <div className="space-y-4">
              {Object.values(stats.playerStats).sort((a, b) => b.net - a.net).map(player => {
                const maxAbs = Math.max(...Object.values(stats.playerStats).map(p => Math.abs(p.net)));
                const widthPct = maxAbs === 0 ? 0 : (Math.abs(player.net) / maxAbs) * 100;
                const isPositive = player.net >= 0;
                return (
                  <div key={player.name} className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-gray-800">{player.name}</span>
                      <span className={`font-bold text-lg ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isPositive ? '+' : ''}{player.net.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <TrendingUp size={14} className="text-emerald-400" />
                        <span className="text-gray-500">收入:</span>
                        <span className="font-medium text-emerald-600">+{player.win.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingDown size={14} className="text-rose-400" />
                        <span className="text-gray-500">支出:</span>
                        <span className="font-medium text-rose-600">-{player.loss.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mt-2">
                      <div className={`h-full rounded-full transition-all duration-700 ease-out ${isPositive ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ width: `${widthPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400 text-sm">暂无数据，请先导入账单</div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl border border-amber-100 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-500">
              <Award size={28} />
            </div>
            <div>
              <p className="text-amber-700/70 text-sm font-bold tracking-widest mb-1">你的专属提款机</p>
              {stats.atm ? (
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-amber-700">{stats.atm}</span>
                  <span className="text-amber-600 font-bold mb-1">+{stats.maxWinFromPlayer.toFixed(2)}</span>
                </div>
              ) : <span className="text-amber-800/50">暂无</span>}
            </div>
          </div>

          <div className="bg-gradient-to-br from-rose-50 to-pink-50 p-6 rounded-2xl border border-rose-100 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-500">
              <Frown size={28} />
            </div>
            <div>
              <p className="text-rose-700/70 text-sm font-bold tracking-widest mb-1">你的麻将宿敌</p>
              {stats.nemesis ? (
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-rose-700">{stats.nemesis}</span>
                  <span className="text-rose-600 font-bold mb-1">{stats.maxLossToPlayer.toFixed(2)}</span>
                </div>
              ) : <span className="text-rose-800/50">暂无</span>}
            </div>
          </div>

          {/* 数据汇总卡片 */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h4 className="font-bold text-gray-700 mb-4">📊 数据汇总</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">交易总笔数</span>
                <span className="font-bold text-gray-800">{normalizedTransactions.length} 笔</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">收付款方数量</span>
                <span className="font-bold text-gray-800">{Object.keys(stats.playerStats).length} 人</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">总收入</span>
                <span className="font-bold text-emerald-600">+{stats.totalWin.toFixed(2)} 元</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">总支出</span>
                <span className="font-bold text-rose-600">-{stats.totalLoss.toFixed(2)} 元</span>
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-gray-700 font-medium">净盈亏</span>
                <span className={`font-bold text-lg ${stats.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {stats.netProfit > 0 ? '+' : ''}{stats.netProfit.toFixed(2)} 元
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
