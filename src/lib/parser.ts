import * as XLSX from 'xlsx';
import type { Transaction } from '../types';

// 生成交易去重 key
export function txKey(t: { date: string; name: string; amount: number }) {
  return `${t.date}|${t.name}|${t.amount}`;
}

export interface ParseResult {
  newTransactions: Transaction[];
  totalImported: number;
  totalSkipped: number;
}

/**
 * 解析账单文件（支持微信/支付宝导出的 Excel 或 CSV 文件），并进行精确去重
 * 
 * @param files 用户选择的文件列表
 * @param currentTransactions 当前已有的交易记录，用于去重
 * @returns 解析并去重后的结果
 */
export async function parseBillFiles(
  files: FileList | File[],
  currentTransactions: Transaction[]
): Promise<ParseResult> {
  let allNewTransactions = [...currentTransactions];
  let totalImported = 0;
  let totalSkipped = 0;

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

    // 寻找表头行
    for (let r = 0; r < Math.min(jsonData.length, 50); r++) {
      const row = jsonData[r];
      if (!Array.isArray(row)) continue;
      const rowStr = row.join('');

      if (rowStr.includes('交易对方') || rowStr.includes('对方')) {
        headerRowIdx = r;
        timeIdx = row.findIndex(c => typeof c === 'string' && (c.includes('时间') || c.includes('交易时间')));
        typeIdx = row.findIndex(c => typeof c === 'string' && c.includes('交易类型'));
        nameIdx = row.findIndex(c => typeof c === 'string' && (c.includes('交易对方') || c.includes('对方')));
        amountIdx = row.findIndex(c => typeof c === 'string' && c.includes('金额'));
        directionIdx = row.findIndex(c => typeof c === 'string' && (c.includes('收/支') || c.includes('收支')));
        break;
      }
    }

    const fileTransactions: Transaction[] = [];

    if (headerRowIdx !== -1 && nameIdx !== -1 && amountIdx !== -1) {
      for (let r = headerRowIdx + 1; r < jsonData.length; r++) {
        const row = jsonData[r];
        if (!row || row.length === 0) continue;

        let nameVal = String(row[nameIdx] || '').replace(/[\t]/g, '').trim();
        // 兼容微信账单中的特殊表情符号（私有区域字符 PUA）
        nameVal = nameVal.replace(/[\uE000-\uF8FF]/g, (match) => `[表情_${match.charCodeAt(0).toString(16).toUpperCase()}]`);
        
        let amountVal = String(row[amountIdx] || '').replace(/[^\d.-]/g, '');
        let directionVal = directionIdx >= 0 ? String(row[directionIdx] || '').replace(/[\t]/g, '').trim() : '';
        let typeVal = typeIdx >= 0 ? String(row[typeIdx] || '').replace(/[\t]/g, '').trim() : '';

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

        // 处理日期
        let formattedDate = '';
        const timeVal = row[timeIdx];
        
        if (typeof timeVal === 'number') {
          // Excel 日期序列号
          const utc_days = Math.floor(timeVal - 25569);
          const utc_value = utc_days * 86400;
          const fractional = timeVal - Math.floor(timeVal);
          const totalSeconds = Math.round(utc_value + fractional * 86400);
          const date = new Date(totalSeconds * 1000);
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          const hours = String(date.getUTCHours()).padStart(2, '0');
          const minutes = String(date.getUTCMinutes()).padStart(2, '0');
          formattedDate = `${year}-${month}-${day} ${hours}:${minutes}`;
        } else if (typeof timeVal === 'string') {
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

        fileTransactions.push({
          id: `excel-${Math.random().toString(36).substr(2, 9)}`,
          date: formattedDate,
          name: nameVal,
          amount: amountNum,
          type: typeVal,
          direction: directionVal,
        });
      }
    }

    if (fileTransactions.length > 0) {
      // 使用 multiset (计数) 逻辑进行精确去重
      const existingCounts = new Map<string, number>();
      for (const t of allNewTransactions) {
        const key = txKey(t);
        existingCounts.set(key, (existingCounts.get(key) || 0) + 1);
      }

      const uniqueForFile: Transaction[] = [];
      for (const t of fileTransactions) {
        const key = txKey(t);
        const count = existingCounts.get(key) || 0;
        if (count > 0) {
          existingCounts.set(key, count - 1);
          totalSkipped++;
        } else {
          uniqueForFile.push(t);
        }
      }
      allNewTransactions = [...allNewTransactions, ...uniqueForFile];
      totalImported += uniqueForFile.length;
    }
  }

  return {
    newTransactions: allNewTransactions,
    totalImported,
    totalSkipped
  };
}
