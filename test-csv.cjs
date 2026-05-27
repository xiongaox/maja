const fs = require('fs');
const XLSX = require('xlsx');
const crypto = require('crypto');

// Create a mock CSV with emojis
const csvUtf8 = '\uFEFF交易时间,交易类型,交易对方,商品,收/支,金额(元),支付方式,当前状态,交易单号,商户单号,备注\n' +
'2026-05-10 18:23:00,扫二维码付款,阿通🍔,,支出,2,零钱,已转账,,,,';

fs.writeFileSync('test_utf8.csv', csvUtf8);

// Test reading with XLSX
const data = fs.readFileSync('test_utf8.csv');
const wb = XLSX.read(data, { type: 'buffer' });
const ws = wb.Sheets[wb.SheetNames[0]];
const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
console.log('UTF-8 parse result:', json[1]);
