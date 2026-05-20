import { useState, useCallback, useRef } from 'react';
import type { Transaction } from '../types';

// 筛选条件接口
export interface FilterOptions {
  transactionTypes: string[];  // 交易类型筛选
  directionTypes: string[];    // 收支方向筛选
  minAmount: number;           // 最小金额
  maxAmount: number;           // 最大金额
}

// 默认筛选条件
export const DEFAULT_FILTER_OPTIONS: FilterOptions = {
  transactionTypes: ['扫二维码付款', '二维码付款', '商户消费', '二维码收款'],
  directionTypes: ['收入', '支出'],
  minAmount: 1,
  maxAmount: 20,
};

const loadXLSX = async (): Promise<any> => {
  if ((window as any).XLSX) return (window as any).XLSX;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = () => resolve((window as any).XLSX);
    script.onerror = () => reject(new Error('无法加载 Excel 解析库，请检查网络'));
    document.head.appendChild(script);
  });
};

// Excel 日期序列号转日期字符串
function excelDateToJSDate(serial: number): string {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const fractional = serial - Math.floor(serial);
  const totalSeconds = Math.round(utc_value + fractional * 86400);
  
  const date = new Date(totalSeconds * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function useFileUpload(addTransactions: (transactions: Transaction[]) => void) {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(DEFAULT_FILTER_OPTIONS);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const XLSX = await loadXLSX();
      const newTransactions: Transaction[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const data = await file.arrayBuffer();

        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        // 微信账单格式检测
        let headerRowIdx = -1;
        let timeIdx = -1;
        let typeIdx = -1;
        let nameIdx = -1;
        let amountIdx = -1;
        let directionIdx = -1;
        let statusIdx = -1;
        let accountIdx = -1;

        // 寻找表头行
        for (let r = 0; r < Math.min(jsonData.length, 50); r++) {
          const row = jsonData[r];
          if (!Array.isArray(row)) continue;
          const rowStr = row.join('');

          // 微信账单格式：时间, 交易类型, 交易对方, 金额, 支付方式, 收/支, 交易状态, ...
          if (rowStr.includes('交易对方') || rowStr.includes('对方')) {
            headerRowIdx = r;
            timeIdx = row.findIndex(c => typeof c === 'string' && (c.includes('时间') || c.includes('交易时间')));
            typeIdx = row.findIndex(c => typeof c === 'string' && c.includes('交易类型'));
            nameIdx = row.findIndex(c => typeof c === 'string' && (c.includes('交易对方') || c.includes('对方')));
            amountIdx = row.findIndex(c => typeof c === 'string' && c.includes('金额'));
            directionIdx = row.findIndex(c => typeof c === 'string' && (c.includes('收/支') || c.includes('收支')));
            statusIdx = row.findIndex(c => typeof c === 'string' && c.includes('状态'));
            accountIdx = row.findIndex(c => typeof c === 'string' && (c.includes('支付方式') || c.includes('交易账户')));
            break;
          }

          // 支付宝账单格式
          if (rowStr.includes('交易时间') && (rowStr.includes('金额') || rowStr.includes('金额(元)'))) {
            headerRowIdx = r;
            timeIdx = row.findIndex(c => typeof c === 'string' && c.includes('交易时间'));
            nameIdx = row.findIndex(c => typeof c === 'string' && (c.includes('交易对方') || c.includes('对方')));
            typeIdx = row.findIndex(c => typeof c === 'string' && (c.includes('收/支') || c.includes('资金状态')));
            amountIdx = row.findIndex(c => typeof c === 'string' && c.includes('金额'));
            break;
          }
        }

        if (headerRowIdx !== -1 && nameIdx !== -1 && amountIdx !== -1) {
          for (let r = headerRowIdx + 1; r < jsonData.length; r++) {
            const row = jsonData[r];
            if (!row || row.length === 0) continue;

            let nameVal = String(row[nameIdx] || '').replace(/[\t]/g, '').trim();
            let amountVal = String(row[amountIdx] || '').replace(/[^\d.-]/g, '');
            let directionVal = directionIdx >= 0 ? String(row[directionIdx] || '').replace(/[\t]/g, '').trim() : '';
            let typeVal = typeIdx >= 0 ? String(row[typeIdx] || '').replace(/[\t]/g, '').trim() : '';
            let statusVal = statusIdx >= 0 ? String(row[statusIdx] || '').replace(/[\t]/g, '').trim() : '';
            let accountVal = accountIdx >= 0 ? String(row[accountIdx] || '').replace(/[\t]/g, '').trim() : '';

            if (!nameVal || !amountVal) continue;

            let amountNum = parseFloat(amountVal);
            if (isNaN(amountNum) || amountNum === 0) continue;

            // 判断收支方向
            if (directionVal === '支出' || directionVal === '付款' || typeVal.includes('付款')) {
              amountNum = -Math.abs(amountNum);
            } else if (directionVal === '收入' || directionVal === '收款' || typeVal.includes('收款')) {
              amountNum = Math.abs(amountNum);
            } else {
              if (String(row[amountIdx]).includes('-')) amountNum = -Math.abs(amountNum);
            }

            // 处理日期 - 支持 Excel 日期序列号和字符串格式
            let formattedDate = '';
            const timeVal = row[timeIdx];
            
            if (typeof timeVal === 'number') {
              // Excel 日期序列号（如 46152.918）
              formattedDate = excelDateToJSDate(timeVal);
            } else if (typeof timeVal === 'string') {
              // 字符串格式
              const cleaned = timeVal.replace(/[\t]/g, '').trim();
              const dateMatch = cleaned.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
              if (dateMatch) {
                formattedDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')} ${dateMatch[4].padStart(2, '0')}:${dateMatch[5].padStart(2, '0')}`;
              } else if (cleaned.length > 16) {
                formattedDate = cleaned.substring(0, 16);
              } else {
                formattedDate = cleaned;
              }
            }

            if (!formattedDate) continue;

            newTransactions.push({
              id: `excel-${Math.random().toString(36).substr(2, 9)}`,
              date: formattedDate,
              name: nameVal,
              amount: amountNum,
              type: typeVal,
              account: accountVal,
              direction: directionVal,
              status: statusVal,
            });
          }
        }
      }

      if (newTransactions.length > 0) {
        addTransactions(newTransactions);
        setSuccessMsg(`成功导入 ${newTransactions.length} 条记录！`);
      } else {
        setErrorMsg('未能识别到有效的账单记录，请确保上传的是微信或支付宝导出的账单表格。');
      }
    } catch (err: any) {
      setErrorMsg('解析文件失败：' + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [addTransactions]);

  return {
    isUploading,
    errorMsg,
    successMsg,
    filterOptions,
    setFilterOptions,
    fileInputRef,
    handleFileUpload,
    setErrorMsg,
    setSuccessMsg,
  };
}
