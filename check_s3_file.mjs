import XLSX from 'xlsx';
import { storageGet } from './server/storage.ts';

async function check() {
  try {
    const { url } = await storageGet('yinbao-data/uploads/source.xlsx');
    console.log('S3 URL:', url);
    const resp = await fetch(url);
    const buf = Buffer.from(await resp.arrayBuffer());
    console.log('File size:', buf.length, 'bytes');
    const wb = XLSX.read(buf, { type: 'buffer' });
    console.log('Sheets:', wb.SheetNames);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    console.log('Total rows:', data.length);
    for (let r = 0; r < Math.min(10, data.length); r++) {
      const row = data[r];
      if (!row) { console.log(`Row ${r}: null`); continue; }
      const strs = row.map(c => String(c || '').trim());
      console.log(`Row ${r} (${strs.length} cols):`, strs.slice(0, 8).join(' | '));
    }
  } catch(e) {
    console.error('Error:', e.message);
  }
}
check();
