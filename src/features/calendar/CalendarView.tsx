import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, History, Trash2 } from 'lucide-react';
import type { Transaction } from '../../types';

interface CalendarViewProps {
  dailyStats: Record<string, { net: number; win: number; loss: number; count: number; records: Transaction[] }>;
  onRemoveTransaction: (id: string) => void;
}

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

export function CalendarView({ dailyStats, onRemoveTransaction }: CalendarViewProps) {
  // 自动定位到最新有数据的月份，否则显示当前月份
  const [currentDate, setCurrentDate] = useState(() => {
    const dates = Object.keys(dailyStats).sort();
    if (dates.length > 0) {
      const latest = dates[dates.length - 1];
      const [year, month] = latest.split('-').map(Number);
      return new Date(year, month - 1, 1);
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-16 sm:h-20 md:h-28 bg-slate-50/40 rounded-2xl border border-slate-100/50"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = dailyStats[dateStr];
      const isSelected = selectedDay === dateStr;

      let amountSign = '';
      let amountBadgeClass = '';
      let cellBgClass = 'bg-slate-50/80 border border-slate-100 hover:border-slate-300 hover:bg-slate-100/80';

      if (isSelected) {
        cellBgClass = 'bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-lg shadow-emerald-200/50 scale-105 z-10 border-transparent';
      } else if (dayData) {
        cellBgClass = dayData.net >= 0 
          ? 'bg-emerald-50/80 border border-emerald-100/50 hover:bg-emerald-100/50 hover:border-emerald-200 shadow-sm' 
          : 'bg-rose-50/80 border border-rose-100/50 hover:bg-rose-100/50 hover:border-rose-200 shadow-sm';
      }

      if (dayData && dayData.net !== 0) {
        amountSign = dayData.net > 0 ? '+' : '';
        amountBadgeClass = isSelected
          ? 'text-white'
          : (dayData.net > 0 ? 'text-emerald-600' : 'text-rose-600');
      }

      days.push(
        <div
          key={dateStr}
          onClick={() => setSelectedDay(dateStr)}
          className={`h-16 sm:h-20 md:h-28 relative flex items-center justify-center cursor-pointer rounded-2xl transition-all duration-300 ${cellBgClass}`}
        >
          {dayData ? (
            <>
              {/* 有数据：日期固定在左上角 */}
              <span className={`absolute top-1.5 left-2 md:top-2 md:left-3 text-xs md:text-sm font-bold ${isSelected ? 'text-white/90' : 'text-gray-500'}`}>
                {day}
              </span>
              
              {/* 有数据：金额居中放大显示 */}
              <div className="w-full h-full flex items-center justify-center pt-3 md:pt-4">
                <span className={`text-sm sm:text-base md:text-xl font-black tracking-tight ${amountBadgeClass}`}>
                  {amountSign}{dayData.net.toFixed(1)}
                </span>
              </div>
            </>
          ) : (
            /* 无数据：日期直接居中放大 */
            <span className={`text-base sm:text-lg md:text-2xl font-bold ${isSelected ? 'text-white' : 'text-gray-400'}`}>
              {day}
            </span>
          )}
        </div>
      );
    }
    return days;

  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">战绩日历</h1>
        <p className="text-gray-500 text-sm mt-1">查看每日盈亏与流水明细</p>
      </header>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 md:p-6 lg:p-8">
        {/* 头部控制区 */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 ml-2 tracking-tight">
            {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
          </h2>
          
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-1 flex items-center gap-1 relative">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600">
              <ChevronLeft size={20} />
            </button>
            
            <div className="relative">
              <button onClick={() => { setPickerYear(currentDate.getFullYear()); setIsDatePickerOpen(!isDatePickerOpen); }} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600">
                <CalendarIcon size={20} />
              </button>
              
              {isDatePickerOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDatePickerOpen(false)}></div>
                  <div className="absolute top-full right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-50">
                      <button onClick={() => setPickerYear(y => y - 1)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"><ChevronLeft size={18} /></button>
                      <span className="font-bold text-gray-800">{pickerYear}年</span>
                      <button onClick={() => setPickerYear(y => y + 1)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"><ChevronRight size={18} /></button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 12 }, (_, i) => i).map(m => {
                        const isCurrentMonth = currentDate.getFullYear() === pickerYear && currentDate.getMonth() === m;
                        return (
                          <button key={m} onClick={() => { setCurrentDate(new Date(pickerYear, m, 1)); setIsDatePickerOpen(false); }}
                            className={`py-2 rounded-xl text-sm font-medium transition-all ${isCurrentMonth ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200 scale-105' : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-600'}`}
                          >
                            {m + 1}月
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* 星期表头 */}
        <div className="grid grid-cols-7 gap-2 md:gap-4 text-center mb-2 md:mb-4">
          {['日', '一', '二', '三', '四', '五', '六'].map((day, idx) => (
            <div key={day} className={`text-xs md:text-sm font-black tracking-widest ${idx === 0 || idx === 6 ? 'text-gray-400' : 'text-gray-500'}`}>{day}</div>
          ))}
        </div>
        
        {/* 日历网格 */}
        <div className="grid grid-cols-7 gap-2 md:gap-4">
          {renderCalendar()}
        </div>
      </div>

      {selectedDay && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-800">{selectedDay} 明细</h3>
            <div className="text-sm font-medium">
              当日净盈亏:
              <span className={`ml-2 text-lg font-bold ${dailyStats[selectedDay]?.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {dailyStats[selectedDay] ? (dailyStats[selectedDay].net > 0 ? '+' : '') + dailyStats[selectedDay].net.toFixed(2) : '0.00'}
              </span>
            </div>
          </div>

          {dailyStats[selectedDay]?.records?.length > 0 ? (
            <div className="space-y-3">
              {dailyStats[selectedDay].records.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <img
                      src={`https://api.dicebear.com/7.x/${tx.gender === 'girl' ? 'lorelei' : 'adventurer'}/svg?seed=${encodeURIComponent(tx.displayName || tx.name)}&backgroundColor=transparent`}
                      alt={tx.displayName || tx.name}
                      className={`w-10 h-10 rounded-full flex-shrink-0 shadow-sm ${tx.amount > 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}
                    />
                    <div>
                      <p className="font-bold text-gray-800">{tx.displayName || tx.name}</p>
                      <p className="text-xs text-gray-400">{tx.date.split(' ')[1]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-bold text-lg ${tx.amount > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                    </span>
                    <button onClick={() => onRemoveTransaction(tx.id)} className="text-gray-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <History size={32} className="mx-auto mb-2 opacity-30" />
              <p>这一天没有打麻将哦</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
