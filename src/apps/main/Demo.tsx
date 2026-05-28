import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import type { Transaction } from '../../types';
import { Upload, ArrowLeft } from 'lucide-react';

export default function Demo() {
  const [data, setData] = useState<Transaction[] | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      const fileTransactions: Transaction[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const arrayBuffer = await file.arrayBuffer();

        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        let headerRowIdx = -1;
        let timeIdx = -1;
        let typeIdx = -1;
        let nameIdx = -1;
        let amountIdx = -1;
        let directionIdx = -1;

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

        if (headerRowIdx !== -1 && nameIdx !== -1 && amountIdx !== -1) {
          for (let r = headerRowIdx + 1; r < jsonData.length; r++) {
            const row = jsonData[r];
            if (!row || row.length === 0) continue;

            let nameVal = String(row[nameIdx] || '').replace(/[\t]/g, '').trim();
            nameVal = nameVal.replace(/[\uE000-\uF8FF]/g, (match) => `[表情_${match.charCodeAt(0).toString(16).toUpperCase()}]`);
            
            let amountVal = String(row[amountIdx] || '').replace(/[^\d.-]/g, '');
            let directionVal = directionIdx >= 0 ? String(row[directionIdx] || '').replace(/[\t]/g, '').trim() : '';
            let typeVal = typeIdx >= 0 ? String(row[typeIdx] || '').replace(/[\t]/g, '').trim() : '';

            if (!nameVal || !amountVal) continue;

            let amountNum = parseFloat(amountVal);
            if (isNaN(amountNum) || amountNum === 0) continue;

            if (directionVal === '支出' || directionVal === '付款' || typeVal.includes('付款')) {
              amountNum = -Math.abs(amountNum);
            } else if (directionVal === '收入' || directionVal === '收款' || typeVal.includes('收款')) {
              amountNum = Math.abs(amountNum);
            } else {
              if (String(row[amountIdx]).includes('-')) amountNum = -Math.abs(amountNum);
            }

            let formattedDate = '';
            const timeVal = row[timeIdx];
            
            if (typeof timeVal === 'number') {
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
      }

      setData(fileTransactions);
    } catch (err: any) {
      alert('解析失败: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => window.location.href = '/'} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm bg-white border border-gray-100">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">账单解析测试演示</h1>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
          <p className="text-gray-500 mb-6">你可以上传任何微信/支付宝账单，这里只会解析并在下方显示出提取到的交易数据，不会保存到系统中，也不会扰乱你的实际数据。</p>
          <label className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium cursor-pointer transition-colors">
            <Upload size={20} />
            上传账单测试
            <input
              type="file"
              multiple
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {data && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="font-bold text-gray-700">解析结果 ({data.length} 条)</h2>
            </div>
            <div className="p-6 overflow-auto max-h-[60vh] custom-scrollbar">
              <pre className="text-xs text-gray-600 font-mono">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
