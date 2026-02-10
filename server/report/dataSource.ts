/**
 * 银保数据自动化报表 - 数据来源生成
 * 从2026数据文件生成数据来源表
 */
import XLSX from 'xlsx';
import { normalizeName, safeFloat, safeStr, parseDate, getMonth, LookupTables, DataRow } from './utils';

const DIRECT_HEADERS = [
  '二级机构', '三级机构', '销售方式', '银行总行', '十大银行渠道',
  '代理机构代码', '代理机构名称', '标准地市', '推荐人代码', '推荐人名称',
  '推荐人员工工号', '业绩归属网点代码', '业绩归属网点名称',
  '业绩归属客户经理工号', '业绩归属客户经理姓名', '保单号',
  '险种代码', '险种', '缴费间隔', '缴费期间年',
  '保险期间', '保单状态', '终止原因', '回执核销日期',
  '保单签单日期', '签单时间', '回访成功日期', '是否回访成功',
  '险种组合', '是否20万以上', '20万以上是否回收身份证件',
  '20万以上身份证件回收日期', '投保人ID', '被保人ID',
  '是否赠送险', '新约保费', '犹内退', '犹外退',
  '协议退', '续期', '业绩归属二级机构', '保单生效日',
  '保全确认日期', '营业部经理工号', '营业部经理名称',
  '满期金额', '投保日期', '投保时间', '保额',
  '客户签收回执日期', '营业区总监工号', '营业区总监',
  '个人减少保额（犹豫期内）', '个人减少保额（犹豫期外）',
  '个人增加保额缴费', '当前每期保费', '保险止期',
  '银行销售人员代码', '银行销售人员姓名', '投保单号',
];

const SRC_NAME_MAP: Record<string, string> = {
  '缴费间隔': '交费间隔',
  '缴费期间年': '交费期间年',
  '回访成功日期': '最后一次成功回访客户的日期',
  '是否回访成功': '是否回访完成',
  '个人增加保额缴费': '个人增加保额交费',
};

// 预览用的关键列
const PREVIEW_COLS = [
  '保单号', '投保人姓名', '险种', '缴费间隔', '缴费期间年', '新约保费',
  '保单签单日期', '银行总行', '十大银行渠道', '代理机构名称',
  '业绩归属网点名称', '业绩归属客户经理姓名', '营业部经理名称',
  '保单状态', '销售方式',
];

// 关键列（缺失会影响核心统计）
const CRITICAL_COLS = [
  '新约保费', '保单号', '险种', '缴费间隔', '保单签单日期', '保单状态',
  '银行总行', '代理机构名称', '业绩归属网点名称', '业绩归属客户经理姓名',
  '营业部经理名称', '营业区总监',
];

// 别名映射的反向查找
const REVERSE_NAME_MAP: Record<string, string> = {};
for (const [k, v] of Object.entries(SRC_NAME_MAP)) {
  REVERSE_NAME_MAP[v] = k;
}

export interface ColumnValidation {
  missingCritical: string[];  // 缺失的关键列
  missingOptional: string[];  // 缺失的可选列
  extraColumns: string[];     // Excel中多出的列（系统不使用）
  foundColumns: string[];     // 匹配成功的列
}

/**
 * 校验Excel列头，返回缺失和多余的列信息
 */
/**
 * Find the best matching sheet for source data.
 * Tries '数据1' first, then falls back to first sheet.
 */
function findSourceSheet(wb: XLSX.WorkBook): XLSX.WorkSheet | null {
  if (wb.Sheets['数据1']) return wb.Sheets['数据1'];
  for (const name of wb.SheetNames) {
    if (name.includes('数据')) return wb.Sheets[name];
  }
  if (wb.SheetNames.length > 0) {
    console.log(`[Source] Sheet '数据1' not found, using first sheet: '${wb.SheetNames[0]}'`);
    return wb.Sheets[wb.SheetNames[0]];
  }
  return null;
}

/**
 * Auto-detect header row by searching for key column names.
 */
function detectHeaderRow(rawData: any[][], keyColumns: string[] = ['保单号', '新约保费', '险种', '银行总行', '保单状态']): number {
  for (let r = 0; r < Math.min(20, rawData.length); r++) {
    const row = rawData[r];
    if (!row) continue;
    const rowStrs = row.map((c: any) => safeStr(c));
    const matchCount = keyColumns.filter(k => rowStrs.includes(k)).length;
    if (matchCount >= 2) {
      console.log(`[Source] Header row detected at row ${r + 1} (0-indexed: ${r})`);
      return r;
    }
  }
  console.log('[Source] Header row not auto-detected, defaulting to row 7 (0-indexed: 6)');
  return 6;
}

export function validateSourceColumns(sourceBuffer: Buffer): ColumnValidation {
  const wb = XLSX.read(sourceBuffer, { type: 'buffer', cellDates: true });
  console.log('[Source] Available sheets:', wb.SheetNames.join(', '));
  const ws = findSourceSheet(wb);
  if (!ws) {
    console.error('[Source] No valid sheet found');
    return {
      missingCritical: CRITICAL_COLS,
      missingOptional: DIRECT_HEADERS.filter(h => !CRITICAL_COLS.includes(h)),
      extraColumns: [],
      foundColumns: [],
    };
  }
  const rawData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: false });
  const headerRowIdx = detectHeaderRow(rawData);
  const headerRow = rawData[headerRowIdx] || [];
  const excelHeaders = new Set<string>();
  for (let c = 0; c < headerRow.length; c++) {
    if (headerRow[c]) excelHeaders.add(safeStr(headerRow[c]));
  }

  // 系统期望的所有列（含别名）
  const expectedHeaders = new Set<string>();
  const expectedToOriginal = new Map<string, string>();
  for (const h of DIRECT_HEADERS) {
    const mapped = SRC_NAME_MAP[h] || h;
    expectedHeaders.add(mapped);
    expectedToOriginal.set(mapped, h);
  }
  // 额外的列：价值规模分类、是否行方预录、是否蓄客、是否潜客、投保人姓名
  for (const extra of ['价值规模分类', '是否行方预录', '是否蓄客', '是否潜客', '投保人姓名']) {
    expectedHeaders.add(extra);
    expectedToOriginal.set(extra, extra);
  }

  const foundColumns: string[] = [];
  const missingCritical: string[] = [];
  const missingOptional: string[] = [];

  for (const [mapped, original] of Array.from(expectedToOriginal.entries())) {
    if (excelHeaders.has(mapped)) {
      foundColumns.push(original);
    } else if (CRITICAL_COLS.includes(original)) {
      // 检查别名
      const alias = SRC_NAME_MAP[original];
      if (alias && excelHeaders.has(alias)) {
        foundColumns.push(original);
      } else {
        missingCritical.push(original);
      }
    } else {
      missingOptional.push(original);
    }
  }

  // 多余的列
  const extraColumns: string[] = [];
  for (const h of Array.from(excelHeaders)) {
    if (!expectedHeaders.has(h) && !REVERSE_NAME_MAP[h]) {
      extraColumns.push(h);
    }
  }

  return { missingCritical, missingOptional, extraColumns, foundColumns };
}

/**
 * 解析2026数据文件，返回原始行数据（用于前端预览和编辑）
 */
export function parseSourceFile(sourceBuffer: Buffer): DataRow[] {
  const wb = XLSX.read(sourceBuffer, { type: 'buffer', cellDates: true });
  const ws = findSourceSheet(wb);
  if (!ws) {
    console.error('[Source] No valid sheet found in workbook. Sheets:', wb.SheetNames);
    return [];
  }
  const rawData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });
  console.log(`[Source parseSourceFile] Total rows in sheet: ${rawData.length}`);

  const headerRowIdx = detectHeaderRow(rawData);
  const headerRow = rawData[headerRowIdx] || [];
  const srcHeaders: Record<string, number> = {};
  for (let c = 0; c < headerRow.length; c++) {
    if (headerRow[c]) {
      srcHeaders[safeStr(headerRow[c])] = c;
    }
  }
  console.log(`[Source parseSourceFile] Headers found: ${Object.keys(srcHeaders).length}, keys: ${Object.keys(srcHeaders).slice(0, 5).join(', ')}...`);

  // Re-read with raw values for numeric data
  const rawDataRaw = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

  const allRows: DataRow[] = [];
  const dataStartRow = headerRowIdx + 1;

  for (let r = dataStartRow; r < rawDataRaw.length; r++) {
    const srcRow = rawDataRaw[r];
    if (!srcRow || !srcRow[0]) continue;

    const getVal = (headerName: string): any => {
      // Try original name first, then mapped name
      const col = srcHeaders[headerName];
      if (col !== undefined) return srcRow[col];
      const mapped = SRC_NAME_MAP[headerName];
      if (mapped) {
        const mappedCol = srcHeaders[mapped];
        if (mappedCol !== undefined) return srcRow[mappedCol];
      }
      return undefined;
    };

    const out: DataRow = {};
    // Extract preview columns
    for (const h of PREVIEW_COLS) {
      // Try original name first, then mapped name
      let col = srcHeaders[h];
      if (col === undefined) {
        const mapped = SRC_NAME_MAP[h];
        if (mapped) col = srcHeaders[mapped];
      }
      if (col !== undefined) {
        out[h] = srcRow[col];
      }
    }
    // Also get 投保人姓名 from original header
    const toubaoren = srcHeaders['投保人姓名'];
    if (toubaoren !== undefined) {
      out['投保人姓名'] = srcRow[toubaoren];
    }

    allRows.push(out);
  }

  return allRows;
}

export function generateDataSource(
  sourceBuffer: Buffer,
  lookups: LookupTables,
  monthStart: number,
  monthEnd: number
): DataRow[] {
  const wb = XLSX.read(sourceBuffer, { type: 'buffer', cellDates: true });
  const ws = findSourceSheet(wb);
  if (!ws) {
    console.error('[Source generateDataSource] No valid sheet found');
    return [];
  }
  const rawData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });

  const headerRowIdx = detectHeaderRow(rawData);
  const headerRow = rawData[headerRowIdx] || [];
  const srcHeaders: Record<string, number> = {};
  for (let c = 0; c < headerRow.length; c++) {
    if (headerRow[c]) {
      srcHeaders[safeStr(headerRow[c])] = c;
    }
  }

  // Re-read with raw values for numeric data
  const rawDataRaw = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

  const allRows: DataRow[] = [];
  const dataStartRow = headerRowIdx + 1;

  for (let r = dataStartRow; r < rawDataRaw.length; r++) {
    const srcRow = rawDataRaw[r];
    if (!srcRow || !srcRow[0]) continue;

    const getVal = (headerName: string): any => {
      // Try original name first, then mapped name
      const col = srcHeaders[headerName];
      if (col !== undefined) return srcRow[col];
      const mapped = SRC_NAME_MAP[headerName];
      if (mapped) {
        const mappedCol = srcHeaders[mapped];
        if (mappedCol !== undefined) return srcRow[mappedCol];
      }
      return undefined;
    };

    const out: DataRow = {};

    // Direct mapping
    for (const h of DIRECT_HEADERS) {
      out[h] = getVal(h);
    }

    const valE = safeStr(getVal('十大银行渠道'));
    const valD = safeStr(getVal('银行总行'));
    const valG = safeStr(getVal('代理机构名称'));
    const valM = safeStr(getVal('业绩归属网点名称'));
    const valO = safeStr(getVal('业绩归属客户经理姓名'));
    const valR = safeStr(getVal('险种'));
    const valS = safeStr(getVal('缴费间隔') || getVal('交费间隔'));
    const valT = getVal('缴费期间年') || getVal('交费期间年');
    const valY = getVal('保单签单日期');
    const valAJ = safeFloat(getVal('新约保费'));
    const valBP = safeStr(srcRow[srcHeaders['价值规模分类']] ?? '');
    const valBY = safeStr(srcRow[srcHeaders['是否行方预录']] ?? '');
    const valBZ = safeStr(srcRow[srcHeaders['是否蓄客']] ?? '');
    const valCA = safeStr(srcRow[srcHeaders['是否潜客']] ?? '');

    out['类型'] = valBP;
    out['归属人'] = valO;

    // 折标系数
    const xzNorm = normalizeName(valR);
    let bk = 0;
    const key = `${xzNorm}|${valT}`;
    if (lookups.zbTable.has(key)) {
      bk = lookups.zbTable.get(key)!;
    } else {
      // Try numeric match
      const nlNum = valT ? Number(valT) : null;
      if (nlNum !== null && !isNaN(nlNum)) {
        for (const k of Array.from(lookups.zbTable.keys())) {
          const coeff = lookups.zbTable.get(k)!;
          const [xz, nl] = k.split('|');
          if (xz === xzNorm) {
            const nlVal = Number(nl);
            if (!isNaN(nlVal) && nlVal === nlNum) {
              bk = coeff;
              break;
            }
          }
        }
      }
    }
    out['折标系数'] = bk;

    const bm = valE === '邮储渠道' ? 0.3 : 1;
    out['双邮'] = bm;
    out['标保'] = valAJ * bk * bm;

    if (valD === '中国邮政储蓄银行') {
      out['政/行'] = lookups.wdjcB.get(valG) || '';
    } else {
      out['政/行'] = '';
    }

    const bp = parseDate(valY);
    out['日期'] = bp;
    out['月'] = bp ? bp.getMonth() + 1 : null;

    out['期交保费'] = (valBP === '价值类' && valS === '年交') ? valAJ : 0;
    out['简称'] = lookups.wdjcB.get(valM) || '';

    const bs = (valBP === '价值类' && valS === '趸交') ? 0.2 : 1;
    out['规保系数'] = bs;
    out['规保'] = valAJ * bs;

    const bu = lookups.productShort.get(normalizeName(valR)) || '';
    out['产品简'] = bu;

    if (valS === '年交') {
      if (lookups.fangan1.has(bu)) {
        out['方案保费'] = 1;
      } else if (lookups.fangan05.has(bu)) {
        out['方案保费'] = 0.5;
      } else {
        out['方案保费'] = 0;
      }
    } else {
      out['方案保费'] = 0;
    }

    out['是否行方预录'] = valBY || '否';
    out['是否蓄客'] = valBZ || '否';
    out['是否潜客'] = valCA || '否';

    const bw = (out['是否行方预录'] === '是' || out['是否蓄客'] === '是' || out['是否潜客'] === '是') ? 1 : 0;
    out['是否预录'] = bw;
    out['预录保费'] = bw === 1 ? valAJ : 0;

    allRows.push(out);
  }

  console.log(`[DataSource] 总保单数: ${allRows.length}条`);

  // Debug: check key fields
  let nullMonthCount = 0;
  let nullMgrCount = 0;
  let nullIntervalCount = 0;
  const sampleRow = allRows[0];
  if (sampleRow) {
    console.log(`[DataSource DEBUG] Sample row keys: ${Object.keys(sampleRow).filter(k => k.includes('营业部') || k.includes('缴费') || k.includes('交费') || k === '月' || k === '新约保费').join(', ')}`);
    console.log(`[DataSource DEBUG] Sample: 营业部经理名称=${sampleRow['营业部经理名称']}, 缴费间隔=${sampleRow['缴费间隔']}, 月=${sampleRow['月']}, 新约保费=${sampleRow['新约保费']}`);
  }
  for (const row of allRows) {
    if (row['月'] === null || row['月'] === undefined) nullMonthCount++;
    if (!row['营业部经理名称']) nullMgrCount++;
    if (!row['缴费间隔']) nullIntervalCount++;
  }
  console.log(`[DataSource DEBUG] null月: ${nullMonthCount}, null营业部经理: ${nullMgrCount}, null缴费间隔: ${nullIntervalCount}`);

  // 按月份范围过滤
  const filtered = allRows.filter(row => {
    const m = row['月'];
    if (m === null || m === undefined) return false;
    return m >= monthStart && m <= monthEnd;
  });

  console.log(`[DataSource] 过滤后保单数: ${filtered.length}条 (月份范围: ${monthStart}-${monthEnd})`);

  // Debug: check aggregation
  const deptSums: Record<string, number> = {};
  for (const row of filtered) {
    const mgr = row['营业部经理名称'] as string;
    const interval = row['缴费间隔'] as string;
    const premium = row['新约保费'] as number;
    if (mgr && interval === '年交') {
      deptSums[mgr] = (deptSums[mgr] || 0) + (premium || 0);
    }
  }
  console.log(`[DataSource DEBUG] Dept sums:`, JSON.stringify(deptSums));

  return filtered;
}
