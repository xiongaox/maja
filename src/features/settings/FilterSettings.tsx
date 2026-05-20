import { useState } from 'react';
import type { FilterOptions } from '../../hooks/useFileUpload';

interface FilterSettingsProps {
  filterOptions: FilterOptions;
  onFilterChange: (options: FilterOptions) => void;
}

// 可选的交易类型
const AVAILABLE_TRANSACTION_TYPES = [
  '扫二维码付款',
  '二维码付款',
  '二维码收款',
  '商户消费',
  '转账',
  '红包',
  '群收款',
];

export function FilterSettings({ filterOptions, onFilterChange }: FilterSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleTypeToggle = (type: string) => {
    const newTypes = filterOptions.transactionTypes.includes(type)
      ? filterOptions.transactionTypes.filter((t: string) => t !== type)
      : [...filterOptions.transactionTypes, type];
    onFilterChange({ ...filterOptions, transactionTypes: newTypes });
  };

  const handleDirectionToggle = (direction: string) => {
    const newDirections = filterOptions.directionTypes.includes(direction)
      ? filterOptions.directionTypes.filter((d: string) => d !== direction)
      : [...filterOptions.directionTypes, direction];
    onFilterChange({ ...filterOptions, directionTypes: newDirections });
  };

  const handleMinAmountChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      onFilterChange({ ...filterOptions, minAmount: num });
    }
  };

  const handleMaxAmountChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      onFilterChange({ ...filterOptions, maxAmount: num });
    }
  };

  const resetToDefault = () => {
    onFilterChange({
      transactionTypes: ['扫二维码付款', '二维码付款', '商户消费', '二维码收款'],
      directionTypes: ['收入', '支出'],
      minAmount: 1,
      maxAmount: 20,
    });
  };

  return (
    <div style={{
      background: '#f8fafc',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '20px',
      border: '1px solid #e2e8f0',
    }}>
      {/* 标题栏 */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          marginBottom: isExpanded ? '16px' : '0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>⚙️</span>
          <span style={{ fontWeight: '600', color: '#1e293b' }}>导入筛选条件</span>
          <span style={{ 
            fontSize: '12px', 
            color: '#64748b',
            background: '#e2e8f0',
            padding: '2px 8px',
            borderRadius: '10px',
          }}>
            {filterOptions.transactionTypes.length} 种类型 · 
            {filterOptions.directionTypes.length === 2 ? '收支' : filterOptions.directionTypes.length === 1 ? filterOptions.directionTypes[0] : '无'} · 
            ¥{filterOptions.minAmount}-{filterOptions.maxAmount}
          </span>
        </div>
        <span style={{ 
          fontSize: '12px', 
          color: '#64748b',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }}>
          ▼
        </span>
      </div>

      {/* 展开的设置内容 */}
      {isExpanded && (
        <div>
          {/* 交易类型筛选 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#374151',
              marginBottom: '8px',
            }}>
              交易类型
            </label>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '8px',
            }}>
              {AVAILABLE_TRANSACTION_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => handleTypeToggle(type)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: filterOptions.transactionTypes.includes(type) 
                      ? '2px solid #10b981' 
                      : '2px solid #d1d5db',
                    background: filterOptions.transactionTypes.includes(type) 
                      ? '#ecfdf5' 
                      : '#ffffff',
                    color: filterOptions.transactionTypes.includes(type) 
                      ? '#059669' 
                      : '#6b7280',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {filterOptions.transactionTypes.includes(type) ? '✓ ' : ''}{type}
                </button>
              ))}
            </div>
          </div>

          {/* 收支方向筛选 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#374151',
              marginBottom: '8px',
            }}>
              收支方向
            </label>
            <div style={{ 
              display: 'flex', 
              gap: '12px',
            }}>
              {['收入', '支出'].map(direction => (
                <button
                  key={direction}
                  onClick={() => handleDirectionToggle(direction)}
                  style={{
                    padding: '8px 24px',
                    borderRadius: '20px',
                    border: filterOptions.directionTypes.includes(direction) 
                      ? direction === '收入' 
                        ? '2px solid #10b981' 
                        : '2px solid #ef4444'
                      : '2px solid #d1d5db',
                    background: filterOptions.directionTypes.includes(direction) 
                      ? direction === '收入' 
                        ? '#ecfdf5' 
                        : '#fef2f2'
                      : '#ffffff',
                    color: filterOptions.directionTypes.includes(direction) 
                      ? direction === '收入' 
                        ? '#059669' 
                        : '#dc2626'
                      : '#6b7280',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minWidth: '80px',
                  }}
                >
                  {filterOptions.directionTypes.includes(direction) ? '✓ ' : ''}
                  {direction === '收入' ? '📈 ' : '📉 '}{direction}
                </button>
              ))}
            </div>
          </div>

          {/* 金额区间筛选 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#374151',
              marginBottom: '8px',
            }}>
              金额区间（元）
            </label>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>¥</span>
                <input
                  type="number"
                  value={filterOptions.minAmount}
                  onChange={(e) => handleMinAmountChange(e.target.value)}
                  min="0"
                  step="0.01"
                  style={{
                    width: '80px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '2px solid #d1d5db',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#10b981'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>至</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>¥</span>
                <input
                  type="number"
                  value={filterOptions.maxAmount}
                  onChange={(e) => handleMaxAmountChange(e.target.value)}
                  min="0"
                  step="0.01"
                  style={{
                    width: '80px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '2px solid #d1d5db',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#10b981'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>
            </div>
          </div>

          {/* 重置按钮 */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end',
            paddingTop: '12px',
            borderTop: '1px solid #e5e7eb',
          }}>
            <button
              onClick={resetToDefault}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                background: '#ffffff',
                color: '#6b7280',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.borderColor = '#9ca3af';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
            >
              恢复默认
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
