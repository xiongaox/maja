const fs = require('fs');
const XLSX = require('xlsx');

function txKey(t) {
  return `${t.date}|${t.name}|${t.amount}`;
}

const file = 'C:\\\\Users\\\\xiongaox\\\\Downloads\\\\账单\\\\微信支付账单流水文件(20250901-20260511).xlsx';
const workbook = XLSX.read(fs.readFileSync(file), { type: 'buffer' });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const headerRowIdx = 17; // '交易时间,交易类型...'

const file1Rows = rows.slice(0, headerRowIdx + 1);
const file2Rows = rows.slice(0, headerRowIdx + 1);

for (let i = headerRowIdx + 1; i < rows.length; i++) {
  const row = rows[i];
  const timeVal = row[0];
  if (!timeVal) continue;
  
  let formattedDate = '';
  if (typeof timeVal === 'number') {
    const utc_days = Math.floor(timeVal - 25569);
    const utc_value = utc_days * 86400;
    const fractional = timeVal - Math.floor(timeVal);
    const totalSeconds = Math.round(utc_value + fractional * 86400);
    const date = new Date(totalSeconds * 1000);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    formattedDate = `${year}-${month}-${day}`;
  } else if (typeof timeVal === 'string') {
    formattedDate = timeVal.substring(0, 10).replace(/\//g, '-');
  }

  if (formattedDate <= '2026-02-22') {
    file1Rows.push(row);
  }
  if (formattedDate >= '2026-02-22') {
    file2Rows.push(row);
  }
}

console.log(`Original full file rows: ${rows.length - headerRowIdx - 1}`);
console.log(`Split File 1 (<= 2026-02-22) rows: ${file1Rows.length - headerRowIdx - 1}`);
console.log(`Split File 2 (>= 2026-02-22) rows: ${file2Rows.length - headerRowIdx - 1}`);

// Now create workbooks and write them to disk so we can parse them just like user uploads
const wb1 = XLSX.utils.book_new();
const ws1 = XLSX.utils.aoa_to_sheet(file1Rows);
XLSX.utils.book_append_sheet(wb1, ws1, "Sheet1");
XLSX.writeFile(wb1, 'C:\\\\Users\\\\xiongaox\\\\Downloads\\\\账单\\\\split_1.xlsx');

const wb2 = XLSX.utils.book_new();
const ws2 = XLSX.utils.aoa_to_sheet(file2Rows);
XLSX.utils.book_append_sheet(wb2, ws2, "Sheet1");
XLSX.writeFile(wb2, 'C:\\\\Users\\\\xiongaox\\\\Downloads\\\\账单\\\\split_2.xlsx');

console.log("Created split_1.xlsx and split_2.xlsx with overlap on 2026-02-22.");

// Now we parse them with the exact app logic
function parseAppFormat(filePath) {
  const data = fs.readFileSync(filePath);
  const workbook = XLSX.read(data, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  let hIdx = -1, timeIdx = -1, typeIdx = -1, nameIdx = -1, amountIdx = -1, directionIdx = -1;

  for (let r = 0; r < Math.min(jsonData.length, 50); r++) {
    const row = jsonData[r];
    if (!Array.isArray(row)) continue;
    const rowStr = row.join('');

    if (rowStr.includes('交易对方') || rowStr.includes('对方')) {
      hIdx = r;
      timeIdx = row.findIndex(c => typeof c === 'string' && (c.includes('时间') || c.includes('交易时间')));
      typeIdx = row.findIndex(c => typeof c === 'string' && c.includes('交易类型'));
      nameIdx = row.findIndex(c => typeof c === 'string' && (c.includes('交易对方') || c.includes('对方')));
      amountIdx = row.findIndex(c => typeof c === 'string' && c.includes('金额'));
      directionIdx = row.findIndex(c => typeof c === 'string' && (c.includes('收/支') || c.includes('收支')));
      break;
    }
  }

  const fileTransactions = [];
  if (hIdx !== -1 && nameIdx !== -1 && amountIdx !== -1) {
    for (let r = hIdx + 1; r < jsonData.length; r++) {
      const row = jsonData[r];
      if (!row || row.length === 0) continue;

      let nameVal = String(row[nameIdx] || '').replace(/[\t]/g, '').trim();
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
        date: formattedDate,
        name: nameVal,
        amount: amountNum
      });
    }
  }
  return fileTransactions;
}

const parsedFull = parseAppFormat('C:\\\\Users\\\\xiongaox\\\\Downloads\\\\账单\\\\微信支付账单流水文件(20250901-20260511).xlsx');
const parsed1 = parseAppFormat('C:\\\\Users\\\\xiongaox\\\\Downloads\\\\账单\\\\split_1.xlsx');
const parsed2 = parseAppFormat('C:\\\\Users\\\\xiongaox\\\\Downloads\\\\账单\\\\split_2.xlsx');

console.log(`\nParsed Full (Original): ${parsedFull.length} valid transactions`);
console.log(`Parsed Split 1: ${parsed1.length} valid transactions`);
console.log(`Parsed Split 2: ${parsed2.length} valid transactions`);
console.log(`Overlap (Split 1 + Split 2 - Full): ${parsed1.length + parsed2.length - parsedFull.length}`);

function dedup(transactions, newTransactions) {
  let currentTransactions = [...transactions];
  let skipped = 0;
  
  const existingCounts = new Map();
  for (const t of currentTransactions) {
    const key = txKey(t);
    existingCounts.set(key, (existingCounts.get(key) || 0) + 1);
  }

  const uniqueForFile = [];
  for (const t of newTransactions) {
    const key = txKey(t);
    const count = existingCounts.get(key) || 0;
    if (count > 0) {
      existingCounts.set(key, count - 1);
      skipped++;
    } else {
      uniqueForFile.push(t);
    }
  }
  
  currentTransactions = [...currentTransactions, ...uniqueForFile];
  return { result: currentTransactions, skipped };
}

console.log(`\n--- Testing Deduplication Logic (Simulating Incremental Update) ---`);
// Step 1: User uploads Split 1
const import1 = dedup([], parsed1);
console.log(`[Import 1] Uploaded split_1.xlsx. Added: ${import1.result.length}, Skipped: ${import1.skipped}`);

// Step 2: User uploads Split 2 (which overlaps with Split 1)
const import2 = dedup(import1.result, parsed2);
console.log(`[Import 2] Uploaded split_2.xlsx. Added: ${import2.result.length - import1.result.length}, Skipped: ${import2.skipped}`);
console.log(`[Result] Total transactions in system: ${import2.result.length}`);
console.log(`[Result] Matches Original Full File exactly: ${import2.result.length === parsedFull.length}`);
