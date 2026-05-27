const fs = require('fs');
const XLSX = require('xlsx');

function txKey(t) {
  return `${t.date}|${t.name}|${t.amount}`;
}

function parseFile(filePath) {
  const data = fs.readFileSync(filePath);
  const workbook = XLSX.read(data, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

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

  const fileTransactions = [];

  if (headerRowIdx !== -1 && nameIdx !== -1 && amountIdx !== -1) {
    for (let r = headerRowIdx + 1; r < jsonData.length; r++) {
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
        amount: amountNum,
        type: typeVal,
        direction: directionVal,
        _rawTime: timeVal
      });
    }
  }

  return fileTransactions;
}

const dir = 'C:\\Users\\xiongaox\\Downloads\\账单';
const fileA = dir + '\\微信支付账单流水文件(20250901-20260222)——【解压密码可在微信支付公众号查看】.xlsx';
const fileB = dir + '\\微信支付账单流水文件(20260222-20260522)_20260522082204.xlsx';
const fileC = dir + '\\微信支付账单流水文件(20250901-20260511).xlsx';

const a = parseFile(fileA);
const b = parseFile(fileB);
const c = parseFile(fileC);

console.log(`Parsed A: ${a.length}`);
console.log(`Parsed B: ${b.length}`);
console.log(`Parsed C: ${c.length}`);

// Test deduplication logic
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

const resA = dedup([], a);
const resAB = dedup(resA.result, b);
const resC = dedup([], c);

console.log(`\nImporting A then B: ${resAB.result.length} (Skipped in B: ${resAB.skipped})`);
console.log(`Importing C alone: ${resC.result.length} (Skipped in C: ${resC.skipped})`);

// Compare A+B vs C
const countsAB = new Map();
for (const t of resAB.result) {
  const k = txKey(t);
  countsAB.set(k, (countsAB.get(k) || 0) + 1);
}

const countsC = new Map();
for (const t of resC.result) {
  const k = txKey(t);
  countsC.set(k, (countsC.get(k) || 0) + 1);
}

let abMissing = 0;
let cMissing = 0;

for (const [k, v] of countsC.entries()) {
  const abV = countsAB.get(k) || 0;
  if (abV < v) {
    console.log(`C has ${v} but AB has ${abV} of ${k}`);
    cMissing += (v - abV);
  }
}
for (const [k, v] of countsAB.entries()) {
  const cV = countsC.get(k) || 0;
  if (cV < v) {
    console.log(`AB has ${v} but C has ${cV} of ${k}`);
    abMissing += (v - cV);
  }
}
