import React from 'react';
import { Award, Frown, TrendingUp, TrendingDown, Swords, Crown, Ghost, BarChart2 } from 'lucide-react';
import type { Stats, Transaction } from '../../types';
import { UserAvatar } from '../../components/UserAvatar';
import { formatMoney } from '../../lib/format';

interface PlayerStatsProps {
  stats: Stats;
  normalizedTransactions: Transaction[];
}

export function PlayerStats({ stats, normalizedTransactions }: PlayerStatsProps) {
  const players = Object.values(stats.playerStats);
  const winners = players.filter(p => p.net >= 0).sort((a, b) => b.net - a.net);
  const losers = players.filter(p => p.net < 0).sort((a, b) => a.net - b.net); // 最亏的在前面（绝对值大）

  const maxWin = Math.max(...winners.map(p => p.net), 1);
  const maxLoss = Math.max(...losers.map(p => Math.abs(p.net)), 1);

  const renderPlayerCard = (player: any, maxVal: number, isWinner: boolean) => {
    const absNet = Math.abs(player.net);
    const widthPct = (absNet / maxVal) * 100;
    
    // 游戏化血条：收入（绿）和支出（红）的博弈
    // 计算总流水
    const totalFlow = player.win + player.loss || 1;
    const winPct = (player.win / totalFlow) * 100;
    const lossPct = (player.loss / totalFlow) * 100;

    return (
      <div key={player.name} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="flex items-start justify-between mb-3 relative z-10">
          <div className="flex items-center gap-3">
            <UserAvatar 
              name={player.name} 
              gender={player.gender} 
              isWinner={isWinner}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <h4 className="font-bold text-gray-800 leading-tight">{player.name}</h4>
              <p className="text-xs font-medium mt-0.5 flex items-center gap-1.5">
                <span className="text-emerald-500">+{Math.round(player.win)}</span>
                <span className="text-gray-300 text-[10px]">|</span>
                <span className="text-rose-500">-{Math.round(player.loss)}</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-xl font-black block leading-none ${isWinner ? 'text-amber-500' : 'text-gray-600'}`}>
              {formatMoney(player.net, isWinner)}
            </span>
          </div>
        </div>

        {/* 游戏化博弈条 */}
        <div className="relative h-3 w-full bg-gray-100 rounded-full overflow-hidden flex z-10">
          <div className="h-full bg-emerald-400" style={{ width: `${winPct}%` }} title={`赢取: ${player.win}`} />
          <div className="h-full bg-rose-400" style={{ width: `${lossPct}%` }} title={`输出: ${player.loss}`} />
        </div>
        
        {/* 底纹装饰 */}
        <div className={`absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity z-0 pointer-events-none ${isWinner ? 'text-amber-500' : 'text-gray-900'}`}>
          {isWinner ? <Crown size={80} /> : <Ghost size={80} />}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Swords className="text-emerald-500" />
            交锋战绩
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            看看谁是你的专属财神爷，谁又是你的命中宿敌
          </p>
        </div>

        {/* PC 端数据汇总 */}
        <div className="hidden md:flex items-center gap-6 bg-white px-6 py-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
              <BarChart2 size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">总交易笔数</p>
              <p className="text-xl font-black text-gray-800">{normalizedTransactions.length}</p>
            </div>
          </div>
          <div className="h-10 w-px bg-gray-100" />
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">交锋人数</p>
            <p className="text-xl font-black text-gray-800">{Object.keys(stats.playerStats).length}</p>
          </div>
          <div className="h-10 w-px bg-gray-100" />
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">总流水</p>
            <p className="text-xl font-black text-gray-800">{formatMoney(stats.totalWin + stats.totalLoss)}</p>
          </div>
        </div>
      </header>

      {/* 移动端数据汇总 */}
      <div className="md:hidden grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm text-center flex flex-col items-center justify-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">总笔数</p>
          <p className="text-lg font-black text-gray-800">{normalizedTransactions.length}</p>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm text-center flex flex-col items-center justify-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">总人数</p>
          <p className="text-lg font-black text-gray-800">{Object.keys(stats.playerStats).length}</p>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm text-center flex flex-col items-center justify-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">总流水</p>
          <p className="text-lg font-black text-gray-800">{formatMoney(stats.totalWin + stats.totalLoss)}</p>
        </div>
      </div>

      {/* 称号荣誉区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-6 rounded-2xl shadow-lg shadow-orange-200/50 flex items-center gap-6 text-white relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-default">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-sm border border-white/20 shadow-inner z-10">
            <Crown size={32} className="text-amber-100" />
          </div>
          <div className="z-10">
            <p className="text-amber-100 text-sm font-bold tracking-widest mb-1 drop-shadow-sm">专属提款机 (财神爷)</p>
            {stats.atm ? (
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black drop-shadow-md">{stats.atm}</span>
                <span className="text-amber-100 font-bold bg-black/10 px-2 py-0.5 rounded-lg text-sm border border-white/10">{formatMoney(stats.maxWinFromPlayer, true)}</span>
              </div>
            ) : <span className="text-amber-100/70">虚位以待</span>}
          </div>
          <Award size={100} className="absolute -right-4 -bottom-4 text-white opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-500" />
        </div>

        <div className="bg-gradient-to-br from-gray-700 to-gray-900 p-6 rounded-2xl shadow-lg shadow-gray-300/50 flex items-center gap-6 text-white relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-default">
          <div className="absolute right-0 top-0 w-32 h-32 bg-rose-500/20 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 backdrop-blur-sm border border-white/10 shadow-inner z-10">
            <Ghost size={32} className="text-rose-200" />
          </div>
          <div className="z-10">
            <p className="text-gray-300 text-sm font-bold tracking-widest mb-1 drop-shadow-sm">命中宿敌 (散财童子)</p>
            {stats.nemesis ? (
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-rose-100 drop-shadow-md">{stats.nemesis}</span>
                <span className="text-rose-200 font-bold bg-rose-900/40 px-2 py-0.5 rounded-lg text-sm border border-rose-500/30">{formatMoney(-stats.maxLossToPlayer)}</span>
              </div>
            ) : <span className="text-gray-400/70">虚位以待</span>}
          </div>
          <Frown size={100} className="absolute -right-4 -bottom-4 text-white opacity-[0.04] -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        {/* 财神榜 */}
        <div>
          <div className="mb-4 px-2">
            <h3 className="text-lg font-black text-gray-800">👑 财神榜 <span className="text-sm font-medium text-gray-400 font-normal ml-2">盈利玩家</span></h3>
          </div>
          <div className="space-y-3">
            {winners.length > 0 ? (
              winners.map(p => renderPlayerCard(p, maxWin, true))
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400 text-sm">
                还没有在任何人身上盈利，继续努力！
              </div>
            )}
          </div>
        </div>

        {/* 散财榜 */}
        <div>
          <div className="mb-4 px-2">
            <h3 className="text-lg font-black text-gray-800">💀 散财榜 <span className="text-sm font-medium text-gray-400 font-normal ml-2">亏损玩家</span></h3>
          </div>
          <div className="space-y-3">
            {losers.length > 0 ? (
              losers.map(p => renderPlayerCard(p, maxLoss, false))
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400 text-sm">
                竟然没有在任何人身上亏损，雀神本神！
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
