import React from 'react';
import { Calendar, DollarSign, TrendingUp, TrendingDown, Award, Frown, PieChart, Shield, LineChart as LineChartIcon, FileText, Upload, Flame, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatMoney } from '../../lib/format';
import type { Stats, Transaction, DailyStat } from '../../types';

function FunFactCard({ title, icon: Icon, iconColor, count, amount, amountLabel, isLoss, dateStr, extraInfo, txs, children }: any) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-1.5 mb-2 text-gray-500 font-medium text-sm whitespace-nowrap">
          <Icon size={16} className={`text-${iconColor}-500`} /> {title}
        </div>
        <div className="flex items-baseline justify-between w-full gap-2">
          {children ? children : (
            <>
              <div className="text-3xl md:text-2xl xl:text-3xl font-bold text-gray-900 tracking-tight">
                {count !== undefined && <>{count} <span className="text-base md:text-sm xl:text-base font-normal text-gray-400">次</span></>}
                {count === undefined && amount !== undefined && (
                  <>{formatMoney(amount, !isLoss)}<span className="text-base md:text-sm xl:text-base font-normal text-gray-400 ml-0.5">元</span></>
                )}
              </div>
              {amount !== undefined && count !== undefined && (
                <div className={`text-xl md:text-base xl:text-xl font-bold text-${iconColor}-500 group relative cursor-help`}>
                  {formatMoney(amount, !isLoss)}<span className="text-sm md:text-xs xl:text-sm font-normal opacity-70 ml-0.5">元</span>
                  {txs && txs.length > 0 && (
                    <div className="hidden group-hover:block absolute right-0 md:left-0 md:right-auto top-full pt-2 w-64 z-50">
                      <div className="bg-gray-900 text-white text-xs p-3 rounded-xl shadow-xl text-left font-normal">
                        <div className="mb-2 font-bold text-gray-300">包含的账单 ({txs.length}笔)：</div>
                        <div className="max-h-56 overflow-y-auto pr-2 space-y-1.5 custom-scrollbar">
                          {txs.map((t: any) => (
                            <div key={t.id} className="flex justify-between items-center">
                              <span className="text-gray-400">{t.date.slice(11, 16)} <span className="text-gray-200 ml-1">{t.displayName || t.name}</span></span>
                              <span className={t.amount > 0 ? "text-emerald-400" : "text-rose-400"}>
                                {formatMoney(t.amount, true)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {extraInfo && (
                <div className="text-base md:text-sm xl:text-base font-medium text-gray-600 truncate max-w-[140px] md:max-w-[80px] lg:max-w-[100px] text-right" title={extraInfo}>
                  {extraInfo}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-50 text-sm md:text-xs text-gray-400">
        {dateStr || '暂无记录'}
      </div>
    </div>
  );
}

interface DashboardProps {
  stats: Stats;
  normalizedTransactions: Transaction[];
  dailyStats: Record<string, DailyStat>;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  whitelistCount: number;
  isAdmin?: boolean;
  mergeAdjacentDays?: boolean;
  onToggleMergeAdjacent?: () => void;
}

export function Dashboard({ stats, normalizedTransactions, dailyStats, onFileUpload, fileInputRef, isUploading, whitelistCount, isAdmin = true, mergeAdjacentDays, onToggleMergeAdjacent }: DashboardProps) {
  const chartData = React.useMemo(() => {
    return Object.entries(dailyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stat]) => ({
        date: date.substring(5), // MM-DD
        net: Math.round(stat.net),
        win: Math.round(stat.win),
        loss: Math.round(stat.loss),
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

        {isAdmin && (
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
        )}
      </header>

      {isEmpty ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-6">
            <FileText size={40} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">暂无交易记录</h3>
          <p className="text-gray-500 max-w-md mb-8 leading-relaxed">
            {isAdmin 
              ? '你还没有导入任何账单。点击右上角的“导入账单文件”按钮，上传微信或支付宝导出的 Excel/CSV 文件，开始你的雀神记账之旅吧！'
              : '这个空间还没有任何账单记录，请等待空间管理员上传数据。'}
          </p>
          {isAdmin && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200/50 flex items-center gap-2"
            >
              <Upload size={18} />
              立即导入
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
              onClick={onToggleMergeAdjacent}
              className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl shadow-sm relative overflow-hidden text-white cursor-pointer active:scale-[0.98] transition-all hover:shadow-md group"
              title="点击切换单日/连打合并统计"
            >
              <div className="absolute top-4 right-4 bg-white/20 p-2 rounded-full text-white transition-transform group-hover:scale-110">
                <Calendar size={24} />
              </div>
              <div className="relative z-10 pr-12">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <p className="text-sm font-medium text-emerald-50">{stats.latestDayLabel}</p>
                  {normalizedTransactions.length > 0 && !stats.isActuallyToday && (
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full text-emerald-50 shrink-0">
                      {stats.latestDayDisplayDate}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">
                    {formatMoney(stats.latestDayNet, true)}
                  </span>
                  <span className="text-emerald-100 font-medium">元</span>
                </div>
              </div>
            </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-gray-50 p-2 rounded-full text-gray-400"><DollarSign size={24} /></div>
          <p className="text-sm font-medium text-gray-500 mb-2">累计总盈亏</p>
          <div className="flex items-baseline gap-1">
            <span className={`text-4xl font-bold tracking-tight ${stats.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatMoney(stats.netProfit, true)}
            </span>
            <span className="text-gray-400 font-medium">元</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-emerald-50 p-2 rounded-full text-emerald-500"><TrendingUp size={24} /></div>
          <p className="text-sm font-medium text-gray-500 mb-2">累计赢取</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900">{formatMoney(stats.totalWin, true)}</span>
            <span className="text-gray-400 font-medium">元</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-rose-50 p-2 rounded-full text-rose-500"><TrendingDown size={24} /></div>
          <p className="text-sm font-medium text-gray-500 mb-2">累计输出</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900">{formatMoney(-stats.totalLoss)}</span>
            <span className="text-gray-400 font-medium">元</span>
          </div>
        </div>
      </div>

      {/* 趣味数据 (Fun Facts) */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-6">
        <FunFactCard 
          title="最长连胜" icon={Flame} iconColor="orange"
          count={stats.funFacts.maxWinStreak.count || undefined}
          amount={stats.funFacts.maxWinStreak.count > 0 ? stats.funFacts.maxWinStreak.amount : undefined}
          isLoss={false}
          txs={stats.funFacts.maxWinStreak.txs}
          dateStr={stats.funFacts.maxWinStreak.count > 0 ? 
            (stats.funFacts.maxWinStreak.startDate === stats.funFacts.maxWinStreak.endDate 
              ? stats.funFacts.maxWinStreak.startDate.substring(5) 
              : `${stats.funFacts.maxWinStreak.startDate.substring(5)} ~ ${stats.funFacts.maxWinStreak.endDate.substring(5)}`) 
            : undefined}
        />
        <FunFactCard 
          title="最惨连败" icon={Frown} iconColor="indigo"
          count={stats.funFacts.maxLossStreak.count || undefined}
          amount={stats.funFacts.maxLossStreak.count > 0 ? -stats.funFacts.maxLossStreak.amount : undefined}
          isLoss={true}
          txs={stats.funFacts.maxLossStreak.txs}
          dateStr={stats.funFacts.maxLossStreak.count > 0 ? 
            (stats.funFacts.maxLossStreak.startDate === stats.funFacts.maxLossStreak.endDate 
              ? stats.funFacts.maxLossStreak.startDate.substring(5) 
              : `${stats.funFacts.maxLossStreak.startDate.substring(5)} ~ ${stats.funFacts.maxLossStreak.endDate.substring(5)}`) 
            : undefined}
        />
        <FunFactCard 
          title="单局最痛" icon={Zap} iconColor="rose"
          amount={stats.funFacts.maxSingleLoss ? -Math.abs(stats.funFacts.maxSingleLoss.amount) : 0}
          isLoss={true}
          extraInfo={stats.funFacts.maxSingleLoss?.name}
          dateStr={stats.funFacts.maxSingleLoss?.date.substring(5, 16)}
        />
        <FunFactCard 
          title="搭子最痛" icon={Zap} iconColor="emerald"
          amount={stats.funFacts.maxSingleWin ? stats.funFacts.maxSingleWin.amount : 0}
          isLoss={false}
          extraInfo={stats.funFacts.maxSingleWin?.name}
          dateStr={stats.funFacts.maxSingleWin?.date.substring(5, 16)}
        />
        <FunFactCard 
          title="单局最高" icon={Award} iconColor="emerald"
          dateStr={stats.funFacts.maxRoundWin?.date.substring(5, 16)}
        >
          <div className="text-3xl md:text-2xl xl:text-3xl font-bold text-gray-900 tracking-tight group relative cursor-help">
            {stats.funFacts.maxRoundWin ? formatMoney(stats.funFacts.maxRoundWin.winAmount, true) : formatMoney(0)}<span className="text-base md:text-sm xl:text-base font-normal text-gray-400 ml-0.5">元</span>
            {stats.funFacts.maxRoundWin && (
              <div className="hidden group-hover:block absolute right-0 sm:left-0 top-full pt-2 w-64 z-50">
                <div className="bg-gray-900 text-white text-xs p-3 rounded-xl shadow-xl text-left font-normal">
                  <div className="mb-2 font-bold text-gray-300">包含的账单 ({stats.funFacts.maxRoundWin.txs.length}笔)：</div>
                  <div className="max-h-56 overflow-y-auto pr-2 space-y-1.5 custom-scrollbar">
                    {stats.funFacts.maxRoundWin.txs.map(t => (
                      <div key={t.id} className="flex justify-between items-center">
                        <span className="text-gray-400"><span className="text-gray-200">{t.displayName || t.name}</span></span>
                        <span className={t.amount > 0 ? "text-emerald-400" : "text-rose-400"}>
                          {formatMoney(t.amount, true)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          {stats.funFacts.maxRoundWin && stats.funFacts.maxRoundWin.lossAmount < 0 && (
            <div className="text-[11px] font-medium text-rose-500">
              带付 {formatMoney(stats.funFacts.maxRoundWin.lossAmount)}
            </div>
          )}
        </FunFactCard>
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
