import React from 'react';
import { Calendar, DollarSign, TrendingUp, TrendingDown, Award, Frown, PieChart, Shield, LineChart as LineChartIcon, FileText, Upload, Flame, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
        win: Number(stat.win.toFixed(2)),
        loss: Number(stat.loss.toFixed(2)),
      }));
  }, [dailyStats]);

  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const displayChartData = isMobile ? chartData.slice(-7) : chartData;

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

      {/* 趣味数据 (Fun Facts) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1 text-gray-500 font-medium text-sm">
              <Flame size={16} className="text-orange-500" /> 最长连赢记录
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.funFacts.maxWinStreak.count} <span className="text-base font-normal text-gray-400">连胜</span></div>
            {stats.funFacts.maxWinStreak.count > 0 && (
              <div className="text-[11px] text-gray-400 mt-1">
                {stats.funFacts.maxWinStreak.startDate === stats.funFacts.maxWinStreak.endDate 
                  ? stats.funFacts.maxWinStreak.startDate 
                  : `${stats.funFacts.maxWinStreak.startDate.substring(5)} ~ ${stats.funFacts.maxWinStreak.endDate.substring(5)}`}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400 mb-1">共赢取</div>
            <div className="text-lg font-bold text-orange-500 group relative cursor-help">
              +{stats.funFacts.maxWinStreak.amount.toFixed(2)}
              <div className="hidden group-hover:block absolute right-0 top-full pt-2 w-64 z-50">
                <div className="bg-gray-900 text-white text-xs p-3 rounded-xl shadow-xl text-left">
                  <div className="mb-2 font-bold text-gray-300">包含的账单 ({stats.funFacts.maxWinStreak.txs.length}笔)：</div>
                  <div className="max-h-56 overflow-y-auto pr-2 space-y-1.5 custom-scrollbar">
                    {stats.funFacts.maxWinStreak.txs.map(t => (
                      <div key={t.id} className="flex justify-between items-center">
                        <span className="text-gray-400">{t.date.slice(11, 16)} <span className="text-gray-200 ml-1">{t.displayName || t.name}</span></span>
                        <span className={t.amount > 0 ? "text-emerald-400" : "text-rose-400"}>
                          {t.amount > 0 ? "+" : ""}{t.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1 text-gray-500 font-medium text-sm">
              <Frown size={16} className="text-indigo-500" /> 最惨连跪记录
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.funFacts.maxLossStreak.count} <span className="text-base font-normal text-gray-400">连败</span></div>
            {stats.funFacts.maxLossStreak.count > 0 && (
              <div className="text-[11px] text-gray-400 mt-1">
                {stats.funFacts.maxLossStreak.startDate === stats.funFacts.maxLossStreak.endDate 
                  ? stats.funFacts.maxLossStreak.startDate 
                  : `${stats.funFacts.maxLossStreak.startDate.substring(5)} ~ ${stats.funFacts.maxLossStreak.endDate.substring(5)}`}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400 mb-1">共输出</div>
            <div className="text-lg font-bold text-indigo-500 group relative cursor-help">
              -{stats.funFacts.maxLossStreak.amount.toFixed(2)}
              <div className="hidden group-hover:block absolute right-0 top-full pt-2 w-64 z-50">
                <div className="bg-gray-900 text-white text-xs p-3 rounded-xl shadow-xl text-left">
                  <div className="mb-2 font-bold text-gray-300">包含的账单 ({stats.funFacts.maxLossStreak.txs.length}笔)：</div>
                  <div className="max-h-56 overflow-y-auto pr-2 space-y-1.5 custom-scrollbar">
                    {stats.funFacts.maxLossStreak.txs.map(t => (
                      <div key={t.id} className="flex justify-between items-center">
                        <span className="text-gray-400">{t.date.slice(11, 16)} <span className="text-gray-200 ml-1">{t.displayName || t.name}</span></span>
                        <span className={t.amount > 0 ? "text-emerald-400" : "text-rose-400"}>
                          {t.amount > 0 ? "+" : ""}{t.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1 text-gray-500 font-medium text-sm">
              <Zap size={16} className="text-rose-500" /> 单局最痛
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.funFacts.maxSingleLoss ? Math.abs(stats.funFacts.maxSingleLoss.amount).toFixed(2) : '0.00'}</div>
          </div>
          {stats.funFacts.maxSingleLoss ? (
            <div className="text-right">
              <div className="text-sm text-gray-900 font-medium truncate max-w-[100px]" title={stats.funFacts.maxSingleLoss.name}>{stats.funFacts.maxSingleLoss.name}</div>
              <div className="text-xs text-gray-400 mt-0.5">{stats.funFacts.maxSingleLoss.date.split(' ')[0]}</div>
            </div>
          ) : (
            <div className="text-right">
              <div className="text-sm text-gray-400">暂无记录</div>
            </div>
          )}
        </div>
      </div>

      {/* 战绩走势图表 */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mt-6 mb-6">
        <div className="flex items-center gap-2 mb-6">
          <LineChartIcon size={20} className="text-emerald-500" />
          <h3 className="text-lg font-bold text-gray-900">战绩走势</h3>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={displayChartData} margin={isMobile ? { top: 10, right: 0, left: 0, bottom: 10 } : { top: 10, right: 10, left: -10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} mirror={isMobile} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any, name: any) => [`${value} 元`, name]}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
              <Line
                name="收入"
                type="monotone"
                dataKey="win"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              <Line
                name="支出"
                type="monotone"
                dataKey="loss"
                stroke="#f43f5e"
                strokeWidth={3}
                dot={{ r: 4, fill: '#f43f5e', strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
