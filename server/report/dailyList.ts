/**
 * 银保数据自动化报表 - 日清单加载
 */
import XLSX from 'xlsx';
import { normalizeName, safeStr, LookupTables, DataRow } from './utils';

const COL_MAP: Record<string, string> = {
  '二级机构': '二级机构', '三级机构': '三级机构', '四级机构': '四级机构',
  '签单日期': '签单日期', '签单时间': '签单时间',
  '销售渠道': '销售渠道', '销售方式': '销售方式', '保单来源': '保单来源',
  '银行总行': '银行总行', '代理机构编码': '代理机构编码',
  '代理机构名称': '代理机构名称', '险种编码': '险种编码', '险种': '险种',
  '支行编码': '支行编码', '银行支行': '银行支行',
  '保单号': '保单号', '投保单号': '投保单号',
  '投保人ID': '投保人ID', '投保人姓名': '投保人姓名', '被保人姓名': '被保人姓名',
  '保单状态': '保单状态', '核保状态': '核保状态',
  '交费间隔': '交费间隔', '交费年期': '缴费年期',
  '保费': '保费', '组合代码': '组合代码', '产品组合': '产品组合',
  '推荐人代码': '推荐人代码', '推荐人名称': '姓名',
  '推荐人员工工号': '推荐人员工工号',
  '标准地市': '标准地市', '营业部经理工号': '营业部经理工号',
  '营业部经理姓名': '营业部', '营业部': '营业部',
  '是否物理合作网点': '是否物理合作网点',
  '网点分类': '网点分类',
  '缴费年期': '缴费年期', '姓名': '姓名',
  '渠道简': '渠道简', '产品简': '产品简',
};

// 预览用的关键列
const PREVIEW_COLS = [
  '保单号', '投保人姓名', '被保人姓名', '险种', '交费间隔', '保费',
  '签单日期', '银行总行', '代理机构名称', '保单状态', '营业部经理姓名',
];

/**
 * 解析日清单文件，返回原始行数据（用于前端预览和编辑）
 */
/**
 * Auto-detect header row in daily file by searching for key column names.
 */
function detectDailyHeaderRow(rawData: any[][]): number {
  const keyColumns = ['保单号', '保费', '险种', '银行总行', '保单状态', '代理机构名称'];
  for (let r = 0; r < Math.min(20, rawData.length); r++) {
    const row = rawData[r];
    if (!row) continue;
    const rowStrs = row.map((c: any) => safeStr(c));
    const matchCount = keyColumns.filter(k => rowStrs.includes(k)).length;
    if (matchCount >= 2) {
      console.log(`[Daily] Header row detected at row ${r + 1} (0-indexed: ${r})`);
      return r;
    }
  }
  console.log('[Daily] Header row not auto-detected, defaulting to row 6 (0-indexed: 5)');
  return 5;
}

export function parseDailyFile(dailyBuffer: Buffer): DataRow[] {
  const wb = XLSX.read(dailyBuffer, { type: 'buffer' });
  console.log('[Daily] Available sheets:', wb.SheetNames.join(', '));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
  console.log(`[Daily] Total rows in sheet: ${rawData.length}`);

  const headerRowIdx = detectDailyHeaderRow(rawData);
  const headerRow = rawData[headerRowIdx] || [];
  const srcHeaders: Record<string, number> = {};
  for (let c = 0; c < headerRow.length; c++) {
    if (headerRow[c]) {
      srcHeaders[safeStr(headerRow[c])] = c;
    }
  }
  console.log(`[Daily] Headers found: ${Object.keys(srcHeaders).length}, keys: ${Object.keys(srcHeaders).slice(0, 5).join(', ')}...`);

  const allRows: DataRow[] = [];
  const dataStartRow = headerRowIdx + 1;
  for (let r = dataStartRow; r < rawData.length; r++) {
    const srcRow = rawData[r];
    if (!srcRow || !srcRow[0]) continue;

    const out: DataRow = {};
    for (const h of PREVIEW_COLS) {
      const col = srcHeaders[h];
      if (col !== undefined) {
        out[h] = srcRow[col];
      }
    }
    allRows.push(out);
  }

  return allRows;
}

export function loadDailyList(
  dailyBuffer: Buffer,
  lookups: LookupTables
): DataRow[] {
  const wb = XLSX.read(dailyBuffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

  const headerRowIdx = detectDailyHeaderRow(rawData);
  const headerRow = rawData[headerRowIdx] || [];
  const srcHeaders: Record<string, number> = {};
  for (let c = 0; c < headerRow.length; c++) {
    if (headerRow[c]) {
      srcHeaders[safeStr(headerRow[c])] = c;
    }
  }

  const dailyRows: DataRow[] = [];
  const dataStartRow = headerRowIdx + 1;
  for (let r = dataStartRow; r < rawData.length; r++) {
    const srcRow = rawData[r];
    if (!srcRow || !srcRow[0]) continue;

    const row: DataRow = {};
    for (const [srcName, tgtName] of Object.entries(COL_MAP)) {
      const colIdx = srcHeaders[srcName];
      if (colIdx !== undefined) {
        row[tgtName] = srcRow[colIdx];
      }
    }

    // Computed: 渠道简
    const agencyName = safeStr(row['代理机构名称']);
    row['渠道简'] = lookups.wdjcB.get(agencyName) || '';

    // Computed: 产品简
    const productName = normalizeName(safeStr(row['险种']));
    row['产品简'] = lookups.productShort.get(productName) || '';

    dailyRows.push(row);
  }

  return dailyRows;
}
