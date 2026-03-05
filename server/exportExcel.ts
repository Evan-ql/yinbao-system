import XLSX from 'xlsx-js-style';
import archiver from 'archiver';
import { PassThrough } from 'stream';

/* ───────────────────── helpers ───────────────────── */

function fmtWan(v: number | undefined | null): number {
  if (v == null) return 0;
  return Math.round(v / 10000 * 10) / 10; // 万，保留1位小数
}

function pct(v: number | undefined | null): string {
  if (v == null || isNaN(v as number)) return '-';
  return Math.round((v as number) * 100) + '%';
}

function safeStr(v: any): string {
  if (v == null) return '';
  return String(v).trim();
}

type AnyRow = Record<string, any>;

/* ───────────────────── 样式定义（与前端保持一致） ───────────────────── */

/** 表头行样式：紫蓝背景 + 白色粗体 + 居中 */
const headerStyle: XLSX.CellStyle = {
  font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "6366F1" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: {
    top: { style: "thin", color: { rgb: "AAAAAA" } },
    bottom: { style: "thin", color: { rgb: "AAAAAA" } },
    left: { style: "thin", color: { rgb: "AAAAAA" } },
    right: { style: "thin", color: { rgb: "AAAAAA" } },
  },
};

/** 数据行样式（偶数行）：白色背景 */
const dataStyleEven: XLSX.CellStyle = {
  font: { sz: 10 },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "CCCCCC" } },
    bottom: { style: "thin", color: { rgb: "CCCCCC" } },
    left: { style: "thin", color: { rgb: "CCCCCC" } },
    right: { style: "thin", color: { rgb: "CCCCCC" } },
  },
};

/** 数据行样式（奇数行）：浅紫背景（斑马纹） */
const dataStyleOdd: XLSX.CellStyle = {
  font: { sz: 10 },
  fill: { fgColor: { rgb: "E8E8FD" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "CCCCCC" } },
    bottom: { style: "thin", color: { rgb: "CCCCCC" } },
    left: { style: "thin", color: { rgb: "CCCCCC" } },
    right: { style: "thin", color: { rgb: "CCCCCC" } },
  },
};

/** 合计行样式：浅橙背景 + 粗体 */
const totalStyle: XLSX.CellStyle = {
  font: { bold: true, sz: 11, color: { rgb: "000000" } },
  fill: { fgColor: { rgb: "FCE4D6" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "medium", color: { rgb: "999999" } },
    bottom: { style: "medium", color: { rgb: "999999" } },
    left: { style: "thin", color: { rgb: "999999" } },
    right: { style: "thin", color: { rgb: "999999" } },
  },
};

/* ───────────────────── 通用样式应用函数 ───────────────────── */

/**
 * 为 json_to_sheet 生成的 worksheet 应用样式
 * @param ws - worksheet
 * @param colCount - 列数
 * @param dataRowCount - 数据行数（不含表头和合计行）
 * @param hasTotalRow - 是否有合计行（最后一行）
 */
function applyStyles(ws: XLSX.WorkSheet, colCount: number, dataRowCount: number, hasTotalRow: boolean): void {
  const headerRowIdx = 0; // json_to_sheet 第一行是表头
  const dataStartRow = 1;
  const totalRowIdx = hasTotalRow ? dataStartRow + dataRowCount : -1;

  // 表头行样式
  for (let c = 0; c < colCount; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRowIdx, c });
    if (ws[addr]) ws[addr].s = headerStyle;
  }

  // 数据行样式（斑马纹）
  for (let r = dataStartRow; r < dataStartRow + dataRowCount; r++) {
    const isOdd = (r - dataStartRow) % 2 === 1;
    const baseStyle = isOdd ? dataStyleOdd : dataStyleEven;
    for (let c = 0; c < colCount; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) ws[addr].s = baseStyle;
    }
  }

  // 合计行样式
  if (totalRowIdx >= 0) {
    for (let c = 0; c < colCount; c++) {
      const addr = XLSX.utils.encode_cell({ r: totalRowIdx, c });
      if (ws[addr]) ws[addr].s = totalStyle;
    }
  }

  // 设置行高
  ws["!rows"] = [];
  ws["!rows"][headerRowIdx] = { hpt: 24 };
}

/**
 * 为 aoa_to_sheet 生成的 worksheet 应用样式
 * @param ws - worksheet
 * @param aoa - 原始数据数组
 * @param hasTotalRow - 最后一行是否为合计行
 */
function applyAoaStyles(ws: XLSX.WorkSheet, aoa: any[][], hasTotalRow: boolean): void {
  if (aoa.length === 0) return;
  const colCount = aoa[0].length;
  const headerRowIdx = 0;
  const dataStartRow = 1;
  const dataRowCount = hasTotalRow ? aoa.length - 2 : aoa.length - 1;
  const totalRowIdx = hasTotalRow ? aoa.length - 1 : -1;

  // 表头行样式
  for (let c = 0; c < colCount; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRowIdx, c });
    if (ws[addr]) ws[addr].s = headerStyle;
  }

  // 数据行样式
  for (let r = dataStartRow; r < dataStartRow + dataRowCount; r++) {
    const isOdd = (r - dataStartRow) % 2 === 1;
    const baseStyle = isOdd ? dataStyleOdd : dataStyleEven;
    for (let c = 0; c < colCount; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) ws[addr].s = baseStyle;
    }
  }

  // 合计行样式
  if (totalRowIdx >= 0) {
    for (let c = 0; c < colCount; c++) {
      const addr = XLSX.utils.encode_cell({ r: totalRowIdx, c });
      if (ws[addr]) ws[addr].s = totalStyle;
    }
  }

  // 设置列宽（自适应）
  ws["!cols"] = aoa[0].map((_: any, i: number) => {
    let maxLen = 4;
    for (const row of aoa) {
      const val = row[i];
      const len = val != null ? String(val).length : 0;
      if (len > maxLen) maxLen = len;
    }
    return { wch: Math.min(Math.max(maxLen * 1.5 + 2, 8), 40) };
  });

  ws["!rows"] = [];
  ws["!rows"][0] = { hpt: 24 };
}

/**
 * 创建带样式的 json_to_sheet 工作表
 */
function styledJsonSheet(rows: any[], colCount: number, hasTotalRow: boolean): XLSX.WorkSheet {
  const ws = XLSX.utils.json_to_sheet(rows);
  const dataRowCount = hasTotalRow ? rows.length - 1 : rows.length;
  applyStyles(ws, colCount, dataRowCount, hasTotalRow);

  // 自动列宽
  if (rows.length > 0) {
    const keys = Object.keys(rows[0]);
    ws["!cols"] = keys.map((key) => {
      let maxLen = key.length * 2 + 2;
      for (const row of rows) {
        const val = row[key];
        const len = val != null ? String(val).length : 0;
        const charLen = /[\u4e00-\u9fa5]/.test(String(val || '')) ? len * 2 : len;
        if (charLen > maxLen) maxLen = charLen;
      }
      return { wch: Math.min(Math.max(maxLen + 2, 8), 40) };
    });
  }

  return ws;
}

/**
 * 创建带样式的 aoa_to_sheet 工作表
 */
function styledAoaSheet(aoa: any[][], hasTotalRow: boolean): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  applyAoaStyles(ws, aoa, hasTotalRow);
  return ws;
}

/* ───────────────────── individual workbook builders ───────────────────── */

/** 1. 目标达成 */
function buildTargetWb(dept: any): Buffer {
  const wb = XLSX.utils.book_new();

  // 总监维度
  const directorRows = (dept.deptRanking || []).map((r: any, i: number) => ({
    '序号': i + 1,
    '总监': r.name,
    '期交目标': fmtWan(r.qjTarget),
    '期交完成': fmtWan(r.monthQj),
    '完成率': r.qjTarget > 0 ? pct(r.monthQj / r.qjTarget) : '-',
    '差距': fmtWan(r.qjGap),
    '趸交目标': fmtWan(r.dcTarget),
    '趸交完成': fmtWan(r.gmdc),
    '趸交完成率': r.dcTarget > 0 ? pct(r.gmdc / r.dcTarget) : '-',
    '趸交差距': fmtWan(r.dcGap),
  }));
  const t = dept.totals || {};
  directorRows.push({
    '序号': '', '总监': '合计',
    '期交目标': fmtWan(t.totalQjTarget), '期交完成': fmtWan(t.totalQj),
    '完成率': t.totalQjTarget > 0 ? pct(t.totalQj / t.totalQjTarget) : '-',
    '差距': fmtWan(t.totalQjGap),
    '趸交目标': fmtWan(t.totalDcTarget), '趸交完成': fmtWan(t.totalGmdc),
    '趸交完成率': t.totalDcTarget > 0 ? pct(t.totalGmdc / t.totalDcTarget) : '-',
    '趸交差距': fmtWan(t.totalDcGap),
  });
  XLSX.utils.book_append_sheet(wb, styledJsonSheet(directorRows, 10, true), '总监');

  // 营业部经理维度
  const mgrRows = (dept.deptRankingAll || []).map((r: any, i: number) => ({
    '序号': i + 1, '营业部经理': r.name,
    '期交目标': fmtWan(r.qjTarget), '期交完成': fmtWan(r.monthQj),
    '完成率': r.qjTarget > 0 ? pct(r.monthQj / r.qjTarget) : '-',
    '差距': fmtWan(r.qjGap),
    '趸交目标': fmtWan(r.dcTarget), '趸交完成': fmtWan(r.gmdc),
    '趸交完成率': r.dcTarget > 0 ? pct(r.gmdc / r.dcTarget) : '-',
    '趸交差距': fmtWan(r.dcGap),
  }));
  const ta = dept.totalsAll || {};
  mgrRows.push({
    '序号': '', '营业部经理': '合计',
    '期交目标': fmtWan(ta.totalQjTarget), '期交完成': fmtWan(ta.totalQj),
    '完成率': ta.totalQjTarget > 0 ? pct(ta.totalQj / ta.totalQjTarget) : '-',
    '差距': fmtWan(ta.totalQjGap),
    '趸交目标': fmtWan(ta.totalDcTarget), '趸交完成': fmtWan(ta.totalGmdc),
    '趸交完成率': ta.totalDcTarget > 0 ? pct(ta.totalGmdc / ta.totalDcTarget) : '-',
    '趸交差距': fmtWan(ta.totalDcGap),
  });
  XLSX.utils.book_append_sheet(wb, styledJsonSheet(mgrRows, 10, true), '营业部经理');

  // 客户经理维度
  if (dept.deptRankingCm) {
    const cmRows = (dept.deptRankingCm || []).map((r: any, i: number) => ({
      '序号': i + 1, '客户经理': r.name,
      '期交目标': fmtWan(r.qjTarget), '期交完成': fmtWan(r.monthQj),
      '完成率': r.qjTarget > 0 ? pct(r.monthQj / r.qjTarget) : '-',
      '差距': fmtWan(r.qjGap),
      '趸交目标': fmtWan(r.dcTarget), '趸交完成': fmtWan(r.gmdc),
      '趸交完成率': r.dcTarget > 0 ? pct(r.gmdc / r.dcTarget) : '-',
      '趸交差距': fmtWan(r.dcGap),
    }));
    XLSX.utils.book_append_sheet(wb, styledJsonSheet(cmRows, 10, false), '客户经理');
  }

  // 营业部维度
  if (dept.deptRankingDept) {
    const deptRows = (dept.deptRankingDept || []).map((r: any, i: number) => ({
      '序号': i + 1, '营业部': r.name,
      '期交目标': fmtWan(r.qjTarget), '期交完成': fmtWan(r.monthQj),
      '完成率': r.qjTarget > 0 ? pct(r.monthQj / r.qjTarget) : '-',
      '差距': fmtWan(r.qjGap),
      '趸交目标': fmtWan(r.dcTarget), '趸交完成': fmtWan(r.gmdc),
      '趸交完成率': r.dcTarget > 0 ? pct(r.gmdc / r.dcTarget) : '-',
      '趸交差距': fmtWan(r.dcGap),
    }));
    XLSX.utils.book_append_sheet(wb, styledJsonSheet(deptRows, 10, false), '营业部');
  }

  // 网点维度
  if (dept.deptRankingNet) {
    const netRows = (dept.deptRankingNet || []).map((r: any, i: number) => ({
      '序号': i + 1, '网点': r.name,
      '期交目标': fmtWan(r.qjTarget), '期交完成': fmtWan(r.monthQj),
      '完成率': r.qjTarget > 0 ? pct(r.monthQj / r.qjTarget) : '-',
      '差距': fmtWan(r.qjGap),
      '趸交目标': fmtWan(r.dcTarget), '趸交完成': fmtWan(r.gmdc),
      '趸交完成率': r.dcTarget > 0 ? pct(r.gmdc / r.dcTarget) : '-',
      '趸交差距': fmtWan(r.dcGap),
    }));
    XLSX.utils.book_append_sheet(wb, styledJsonSheet(netRows, 10, false), '网点');
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** 2. 业务数据 */
function buildBusinessWb(dept: any): Buffer {
  const wb = XLSX.utils.book_new();

  const feiyouRows = (dept.deptRanking || []).map((r: any, i: number) => ({
    '排名': i + 1, '营业部': r.name,
    '月期交': fmtWan(r.monthQj), '期交目标': fmtWan(r.qjTarget), '达成差距': fmtWan(r.qjGap),
    '规模趸': fmtWan(r.gmdc), '趸交目标': fmtWan(r.dcTarget), '达成差距(趸)': fmtWan(r.dcGap),
  }));
  XLSX.utils.book_append_sheet(wb, styledJsonSheet(feiyouRows, 8, false), '非邮');

  const allRows = (dept.deptRankingAll || []).map((r: any, i: number) => ({
    '排名': i + 1, '营业部': r.name,
    '月期交': fmtWan(r.monthQj), '期交目标': fmtWan(r.qjTarget), '达成差距': fmtWan(r.qjGap),
    '规模趸': fmtWan(r.gmdc), '趸交目标': fmtWan(r.dcTarget), '达成差距(趸)': fmtWan(r.dcGap),
  }));
  XLSX.utils.book_append_sheet(wb, styledJsonSheet(allRows, 8, false), '全渠道');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** 3. 日保费数据 */
function buildDailyWb(dept: any): Buffer {
  const wb = XLSX.utils.book_new();
  const rows = (dept.dailyData || []).map((r: any) => ({
    '营业部': r.name,
    '今日期交': fmtWan(r.todayQj), '今日非邮期交': fmtWan(r.todayFeiyouQj),
    '今日趸交': fmtWan(r.todayDc), '日目标': fmtWan(r.target), '达成率': pct(r.rate),
  }));
  XLSX.utils.book_append_sheet(wb, styledJsonSheet(rows, 6, false), '日保费数据');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** 4. 人力数据 */
function buildHrWb(dept: any): Buffer {
  const wb = XLSX.utils.book_new();

  // 营业部汇总
  const summaryRows = (dept.hrStats || []).map((r: any, i: number) => ({
    '序号': i + 1, '营业部': r.name,
    '挂网人力': r.guawang, '破零人力': r.poling,
    '开单率': pct(r.kaidanRate), '归保2万': r.guibao2w,
  }));
  XLSX.utils.book_append_sheet(wb, styledJsonSheet(summaryRows, 6, false), '营业部汇总');

  // 在职经理明细
  const detailRows = (dept.hrManagerDetails || []).map((r: any) => ({
    '营业部': r.dept, '姓名': r.name, '工号': r.code,
    '期交保费(万)': fmtWan(r.qjbf), '件数': r.js,
    '开单': r.kaidan ? '是' : '否', '服务网点数': r.networks,
  }));
  XLSX.utils.book_append_sheet(wb, styledJsonSheet(detailRows, 7, false), '在职经理明细');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** 5. 铁杆网点 */
function buildTieganWb(dept: any): Buffer {
  const wb = XLSX.utils.book_new();

  const summaryRows = (dept.tieganData || []).map((r: any) => ({
    '营业部': r.name, '铁杆网点总数': r.total,
    '开单数': r.kaidan, '开单率': pct(r.kaidanRate), '差距': r.gap,
  }));
  XLSX.utils.book_append_sheet(wb, styledJsonSheet(summaryRows, 5, false), '营业部汇总');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** 6. 部门大单分布 */
function buildDadanWb(dept: any): Buffer {
  const wb = XLSX.utils.book_new();
  const rows = (dept.dadanData || []).map((r: any) => ({
    '营业部': r.name, '5万以上': r.c5w, '10万以上': r.c10w,
    '20万以上': r.c20w, '50万以上': r.c50w, '100万以上': r.c100w,
    '10万以上合计': r.totalAbove10w,
  }));
  XLSX.utils.book_append_sheet(wb, styledJsonSheet(rows, 7, false), '部门大单分布');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** 7. 保费分布 */
function buildPremiumDistWb(dept: any): Buffer {
  const wb = XLSX.utils.book_new();

  // 期交
  const distQj = dept.premiumDist;
  if (distQj && distQj.rows) {
    const hdrs = distQj.headers || [];
    const headers = ['营业部', ...hdrs];
    const aoa: any[][] = [headers];
    for (const row of distQj.rows) {
      const line: any[] = [row.name];
      const vals = Array.isArray(row.values) ? row.values : [];
      for (let i = 0; i < hdrs.length; i++) line.push(fmtWan(vals[i] || 0));
      aoa.push(line);
    }
    if (distQj.bankTotals) {
      const totalLine: any[] = ['合计'];
      const bt = Array.isArray(distQj.bankTotals) ? distQj.bankTotals : [];
      for (let i = 0; i < hdrs.length; i++) totalLine.push(fmtWan(bt[i] || 0));
      aoa.push(totalLine);
    }
    XLSX.utils.book_append_sheet(wb, styledAoaSheet(aoa, !!distQj.bankTotals), '期交');
  }

  // 趸交
  const distDc = dept.premiumDistDc;
  if (distDc && distDc.rows) {
    const hdrs = distDc.headers || [];
    const headers = ['营业部', ...hdrs];
    const aoa: any[][] = [headers];
    for (const row of distDc.rows) {
      const line: any[] = [row.name];
      const vals = Array.isArray(row.values) ? row.values : [];
      for (let i = 0; i < hdrs.length; i++) line.push(fmtWan(vals[i] || 0));
      aoa.push(line);
    }
    if (distDc.bankTotals) {
      const totalLine: any[] = ['合计'];
      const bt = Array.isArray(distDc.bankTotals) ? distDc.bankTotals : [];
      for (let i = 0; i < hdrs.length; i++) totalLine.push(fmtWan(bt[i] || 0));
      aoa.push(totalLine);
    }
    XLSX.utils.book_append_sheet(wb, styledAoaSheet(aoa, !!distDc.bankTotals), '趸交');
  }

  if (!wb.SheetNames.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['暂无数据']]), '保费分布');
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** 8. 个人业绩前10 */
function buildPersonalTopWb(dept: any): Buffer {
  const wb = XLSX.utils.book_new();

  const allRows = (dept.personalTop || []).map((r: any, i: number) => ({
    '排名': i + 1, '姓名': r.name, '营业部': r.dept, '保费(万)': fmtWan(r.premium),
  }));
  XLSX.utils.book_append_sheet(wb, styledJsonSheet(allRows, 4, false), '全渠道');

  const feiyouRows = (dept.personalTopFeiyou || []).map((r: any, i: number) => ({
    '排名': i + 1, '姓名': r.name, '营业部': r.dept, '保费(万)': fmtWan(r.premium),
  }));
  XLSX.utils.book_append_sheet(wb, styledJsonSheet(feiyouRows, 4, false), '非邮');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** 9. 个人件数前10 */
function buildPersonalCountWb(dept: any): Buffer {
  const wb = XLSX.utils.book_new();

  const allRows = (dept.personalCountTop || []).map((r: any, i: number) => ({
    '排名': i + 1, '姓名': r.name, '营业部': r.dept, '件数': r.js,
  }));
  XLSX.utils.book_append_sheet(wb, styledJsonSheet(allRows, 4, false), '全渠道');

  const feiyouRows = (dept.personalCountTopFeiyou || []).map((r: any, i: number) => ({
    '排名': i + 1, '姓名': r.name, '营业部': r.dept, '件数': r.js,
  }));
  XLSX.utils.book_append_sheet(wb, styledJsonSheet(feiyouRows, 4, false), '非邮');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** 10. 全渠道大单 */
function buildBankDadanWb(dept: any): Buffer {
  const wb = XLSX.utils.book_new();
  const rows = (dept.bankDadanList || []).map((r: any) => ({
    '银行渠道': r.name, '5万以上': r.c5w, '10万以上': r.c10w,
    '20万以上': r.c20w, '50万以上': r.c50w, '100万以上': r.c100w,
    '10万以上合计': r.totalAbove10w,
  }));
  XLSX.utils.book_append_sheet(wb, styledJsonSheet(rows, 7, false), '全渠道大单');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** 11. 网点分布 */
function buildNetworkDistWb(dept: any): Buffer {
  const wb = XLSX.utils.book_new();
  const dist = dept.networkDist;
  if (!dist || !dist.rows) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['暂无数据']]), '网点分布');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  const hdrs = dist.headers || [];
  const headers = ['营业部', ...hdrs, '合计'];
  const aoa: any[][] = [headers];
  for (const row of dist.rows) {
    const line: any[] = [row.name];
    const vals = Array.isArray(row.values) ? row.values : [];
    for (let i = 0; i < hdrs.length; i++) line.push(vals[i] || 0);
    line.push(row.total || 0);
    aoa.push(line);
  }
  const hasTotals = !!dist.bankTotals;
  if (hasTotals) {
    const totalLine: any[] = ['合计'];
    const bt = Array.isArray(dist.bankTotals) ? dist.bankTotals : [];
    for (let i = 0; i < hdrs.length; i++) totalLine.push(bt[i] || 0);
    totalLine.push(dist.totalNetworks || 0);
    aoa.push(totalLine);
  }
  XLSX.utils.book_append_sheet(wb, styledAoaSheet(aoa, hasTotals), '网点分布');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** 12. 渠道汇总 */
function buildChannelSummaryWb(channel: any): Buffer {
  const wb = XLSX.utils.book_new();

  // 年交
  const njRows = (channel.channelSummary || []).map((r: any) => ({
    '银行渠道': r.name, '保费(万)': fmtWan(r.baofei), '渠道占比': pct(r.ratio),
    '网点数量': r.netTotal, '开单网点': r.netActive,
    '网活率': pct(r.netActiveRate), '网均产量(万)': fmtWan(r.netAvgOutput),
  }));
  const njTotals = channel.channelSummaryTotals || {};
  njRows.push({
    '银行渠道': '中支合计', '保费(万)': fmtWan(njTotals.baofei), '渠道占比': '100%',
    '网点数量': njTotals.netTotal, '开单网点': njTotals.netActive,
    '网活率': pct(njTotals.netActiveRate), '网均产量(万)': fmtWan(njTotals.netAvgOutput),
  });
  XLSX.utils.book_append_sheet(wb, styledJsonSheet(njRows, 7, true), '年交');

  // 趸交
  const dcRows = (channel.channelSummaryDc || []).map((r: any) => ({
    '银行渠道': r.name, '保费(万)': fmtWan(r.baofei), '渠道占比': pct(r.ratio),
    '网点数量': r.netTotal, '开单网点': r.netActive,
    '网活率': pct(r.netActiveRate), '网均产量(万)': fmtWan(r.netAvgOutput),
  }));
  const dcTotals = channel.channelSummaryDcTotals || {};
  dcRows.push({
    '银行渠道': '中支合计', '保费(万)': fmtWan(dcTotals.baofei), '渠道占比': '100%',
    '网点数量': dcTotals.netTotal, '开单网点': dcTotals.netActive,
    '网活率': pct(dcTotals.netActiveRate), '网均产量(万)': fmtWan(dcTotals.netAvgOutput),
  });
  XLSX.utils.book_append_sheet(wb, styledJsonSheet(dcRows, 7, true), '趸交');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** 13. 渠道产品分布 */
function buildChannelProductWb(channel: any): Buffer {
  const wb = XLSX.utils.book_new();
  const products = channel.productList || [];
  const headers = ['银行渠道', ...products, '合计'];
  const aoa = [headers];

  for (const row of (channel.channelProductMatrix || [])) {
    const line: any[] = [row.name];
    let total = 0;
    for (const p of products) {
      const v = row.products?.[p] || 0;
      line.push(fmtWan(v));
      total += v;
    }
    line.push(fmtWan(total));
    aoa.push(line);
  }

  const totals = channel.channelProductTotals || {};
  const totalLine: any[] = ['合计'];
  let grandTotal = 0;
  for (const p of products) {
    const v = totals[p] || 0;
    totalLine.push(fmtWan(v));
    grandTotal += v;
  }
  totalLine.push(fmtWan(grandTotal));
  aoa.push(totalLine);

  XLSX.utils.book_append_sheet(wb, styledAoaSheet(aoa, true), '渠道产品分布');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** 14. 月度趋势 */
function buildMonthlyTrendWb(channel: any): Buffer {
  const wb = XLSX.utils.book_new();

  // 年交
  const njTotals = channel.monthlyTrendTotals || {};
  const months = Object.keys(njTotals).sort((a, b) => Number(a) - Number(b));
  const njHeaders = ['银行渠道', ...months.map(m => m + '月'), '合计'];
  const njAoa = [njHeaders];
  for (const row of (channel.monthlyTrend || [])) {
    const line: any[] = [row.name];
    for (const m of months) line.push(fmtWan(row.months?.[m] || 0));
    line.push(fmtWan(row.total || 0));
    njAoa.push(line);
  }
  const njTotalLine: any[] = ['合计'];
  for (const m of months) njTotalLine.push(fmtWan(njTotals[m] || 0));
  njTotalLine.push(fmtWan(channel.monthlyGrandTotal || 0));
  njAoa.push(njTotalLine);
  XLSX.utils.book_append_sheet(wb, styledAoaSheet(njAoa, true), '年交');

  // 趸交
  const dcTotals = channel.monthlyTrendDcTotals || {};
  const dcMonths = Object.keys(dcTotals).sort((a, b) => Number(a) - Number(b));
  const dcHeaders = ['银行渠道', ...dcMonths.map(m => m + '月'), '合计'];
  const dcAoa = [dcHeaders];
  for (const row of (channel.monthlyTrendDc || [])) {
    const line: any[] = [row.name];
    for (const m of dcMonths) line.push(fmtWan(row.months?.[m] || 0));
    line.push(fmtWan(row.total || 0));
    dcAoa.push(line);
  }
  const dcTotalLine: any[] = ['合计'];
  for (const m of dcMonths) dcTotalLine.push(fmtWan(dcTotals[m] || 0));
  dcTotalLine.push(fmtWan(channel.monthlyGrandTotalDc || 0));
  dcAoa.push(dcTotalLine);
  XLSX.utils.book_append_sheet(wb, styledAoaSheet(dcAoa, true), '趸交');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** 15. 产品数据 */
function buildProductDetailWb(channel: any): Buffer {
  const wb = XLSX.utils.book_new();
  const rows = (channel.productDetail || []).map((r: any) => ({
    '产品名称': r.name, '期交(万)': fmtWan(r.qj), '占比': pct(r.ratio),
    '3年期(万)': fmtWan(r.y3), '5年期(万)': fmtWan(r.y5), '趸交(万)': fmtWan(r.dc),
  }));
  const t = channel.productDetailTotals || {};
  rows.push({
    '产品名称': '合计', '期交(万)': fmtWan(t.qj), '占比': '100%',
    '3年期(万)': fmtWan(t.y3), '5年期(万)': fmtWan(t.y5), '趸交(万)': fmtWan(t.dc),
  });
  XLSX.utils.book_append_sheet(wb, styledJsonSheet(rows, 6, true), '产品数据');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** 16. 趸交产品 */
function buildDcProductWb(channel: any): Buffer {
  const wb = XLSX.utils.book_new();
  const rows = (channel.dcProducts || []).map((r: any) => ({
    '产品名称': r.name, '保费(万)': fmtWan(r.value),
  }));
  rows.push({ '产品名称': '合计', '保费(万)': fmtWan(channel.dcProductTotal || 0) });
  XLSX.utils.book_append_sheet(wb, styledJsonSheet(rows, 2, true), '趸交产品');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** 17. 网点开单 */
function buildNetworkOpenWb(channel: any): Buffer {
  const wb = XLSX.utils.book_new();
  const deptOrder = channel.deptManagerOrder || [];
  const headerRow1: any[] = ['银行渠道'];
  for (const dept of deptOrder) {
    headerRow1.push(dept + '-网点数');
    headerRow1.push(dept + '-开单');
  }
  headerRow1.push('合计网点', '开单网点');
  const aoa: any[][] = [headerRow1];

  for (const row of (channel.networkData || [])) {
    const line: any[] = [row.bank];
    for (const dept of deptOrder) {
      const d = row.depts?.[dept] || { total: 0, active: 0 };
      line.push(d.total || 0);
      line.push(d.active || 0);
    }
    line.push(row.totalNet || 0);
    line.push(row.activeNet || 0);
    aoa.push(line);
  }

  const totals = channel.networkTotals || {};
  const totalLine: any[] = ['合计'];
  for (const dept of deptOrder) {
    const d = totals[dept] || { total: 0, active: 0 };
    totalLine.push(d.total || 0);
    totalLine.push(d.active || 0);
  }
  totalLine.push(channel.grandNetTotal || 0);
  totalLine.push(channel.grandNetActive || 0);
  aoa.push(totalLine);

  XLSX.utils.book_append_sheet(wb, styledAoaSheet(aoa, true), '网点开单');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** 18. 网点业绩明细 */
function buildNetworkPerfWb(channel: any): Buffer {
  const wb = XLSX.utils.book_new();

  // 期交
  const qjRows = (channel.networkPerformance || []).map((r: any) => ({
    '网点名称': r.name, '简称': r.shortName, '银行渠道': r.bank,
    '营业部经理': r.deptManager, '客户经理': r.customerManager,
    '年交(万)': fmtWan(r.qj), '件数': r.js,
  }));
  const tQj = channel.networkPerfTotals || {};
  qjRows.push({
    '网点名称': '合计', '简称': '', '银行渠道': '',
    '营业部经理': '', '客户经理': '',
    '年交(万)': fmtWan(tQj.qj), '件数': tQj.js,
  });
  XLSX.utils.book_append_sheet(wb, styledJsonSheet(qjRows, 7, true), '期交');

  // 趸交
  const dcRows = (channel.networkPerformanceDc || channel.networkPerformance || []).map((r: any) => ({
    '网点名称': r.name, '简称': r.shortName, '银行渠道': r.bank,
    '营业部经理': r.deptManager, '客户经理': r.customerManager,
    '趸交(万)': fmtWan(r.dc), '件数': r.dcJs || r.js,
  }));
  XLSX.utils.book_append_sheet(wb, styledJsonSheet(dcRows, 7, false), '趸交');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** 19. 人力数据(全量) */
function buildHrFullWb(hr: any[]): Buffer {
  const wb = XLSX.utils.book_new();
  const rows = (hr || []).map((r: any) => ({
    '营业区': r['营业区'], '营业部': r['营业部'],
    '工号': r['工号'], '姓名': r['姓名'],
    '期交保费': r['期交保费'], '规保': r['规保'],
    '预录': r['预录'], '实时': r['实时'],
    '今日保费': r['今日保费'], '非邮期交': r['非邮期交'],
    '价值趸': r['价值趸'], '规模趸': r['规模趸'],
    '期交标保': r['期交标保'], '破零': r['破零'],
    '非邮破零': r['非邮破零'],
  }));
  XLSX.utils.book_append_sheet(wb, styledJsonSheet(rows, 15, false), '人力数据');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** 20. 追踪报表 */
function buildTrackingWb(tracking: any): Buffer {
  const wb = XLSX.utils.book_new();
  const groups = tracking?.groups || [];

  // 每个营业部经理一个sheet
  for (const g of groups) {
    const rows = (g.members || []).map((m: any) => ({
      '姓名': m.name,
      '期交保费(万)': fmtWan(m.qjbf), '非邮期交(万)': fmtWan(m.feiyouQj),
      '归保(万)': fmtWan(m.guibao), '价值趸(万)': fmtWan(m.jzdc),
      '规模趸(万)': fmtWan(m.gmdc), '标保(万)': fmtWan(m.bb),
      '件数': m.js, '非邮件数': m.feiyouJs,
      '网点总数': m.wdTotal, '开单网点': m.wdActive,
    }));
    // Sheet name max 31 chars, sanitize
    let sheetName = (g.deptName || '未知').substring(0, 31).replace(/[\\\/\*\?\[\]:]/g, '_');
    // Avoid duplicate sheet names
    let idx = 1;
    let finalName = sheetName;
    while (wb.SheetNames.includes(finalName)) {
      finalName = sheetName.substring(0, 28) + `(${idx++})`;
    }
    XLSX.utils.book_append_sheet(wb, styledJsonSheet(rows, 11, false), finalName);
  }

  if (!wb.SheetNames.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['暂无数据']]), '追踪报表');
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** 21. 核心网点 */
function buildCoreNetworkWb(coreNetwork: any): Buffer {
  const wb = XLSX.utils.book_new();
  const networks = coreNetwork?.networks || [];
  const rows = networks.map((n: any) => {
    const row: any = {
      '银行渠道': n.totalBankName, '网点代码': n.networkCode,
      '网点名称': n.agencyName, '客户经理': n.customerManager,
      '营业部经理': n.deptManager, '营业区总监': n.areaDirector,
      '核心网点': n.coreNetwork ? '是' : '否',
    };
    const months = n.months || {};
    for (let i = 1; i <= 12; i++) {
      row[i + '月'] = fmtWan(months[String(i)] || 0);
    }
    row['合计(万)'] = fmtWan(n.total || 0);
    row['件数'] = n.js || 0;
    return row;
  });
  // 7 (基本列) + 12 (月份) + 2 (合计+件数) = 21
  XLSX.utils.book_append_sheet(wb, styledJsonSheet(rows, 21, false), '核心网点');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/* ───────────────────── main export: generate ZIP buffer ───────────────────── */

export async function generateZipBuffer(report: any): Promise<Buffer> {
  const dept = report.dept || {};
  const channel = report.channel || {};
  const hr = report.hr || [];
  const tracking = report.tracking || {};
  const coreNetwork = report.coreNetwork || {};

  // Define all report files
  const files: { name: string; buffer: Buffer }[] = [
    { name: '01-目标达成.xlsx', buffer: buildTargetWb(dept) },
    { name: '02-业务数据.xlsx', buffer: buildBusinessWb(dept) },
    { name: '03-日保费数据.xlsx', buffer: buildDailyWb(dept) },
    { name: '04-人力数据.xlsx', buffer: buildHrWb(dept) },
    { name: '05-铁杆网点.xlsx', buffer: buildTieganWb(dept) },
    { name: '06-部门大单分布.xlsx', buffer: buildDadanWb(dept) },
    { name: '07-保费分布.xlsx', buffer: buildPremiumDistWb(dept) },
    { name: '08-个人业绩前10.xlsx', buffer: buildPersonalTopWb(dept) },
    { name: '09-个人件数前10.xlsx', buffer: buildPersonalCountWb(dept) },
    { name: '10-全渠道大单.xlsx', buffer: buildBankDadanWb(dept) },
    { name: '11-网点分布.xlsx', buffer: buildNetworkDistWb(dept) },
    { name: '12-渠道汇总.xlsx', buffer: buildChannelSummaryWb(channel) },
    { name: '13-渠道产品分布.xlsx', buffer: buildChannelProductWb(channel) },
    { name: '14-月度趋势.xlsx', buffer: buildMonthlyTrendWb(channel) },
    { name: '15-产品数据.xlsx', buffer: buildProductDetailWb(channel) },
    { name: '16-趸交产品.xlsx', buffer: buildDcProductWb(channel) },
    { name: '17-网点开单.xlsx', buffer: buildNetworkOpenWb(channel) },
    { name: '18-网点业绩明细.xlsx', buffer: buildNetworkPerfWb(channel) },
    { name: '19-人力数据.xlsx', buffer: buildHrFullWb(hr) },
    { name: '20-追踪报表.xlsx', buffer: buildTrackingWb(tracking) },
    { name: '21-核心网点.xlsx', buffer: buildCoreNetworkWb(coreNetwork) },
  ];

  // Create ZIP using archiver
  return new Promise<Buffer>((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 5 } });
    const chunks: Buffer[] = [];
    const passThrough = new PassThrough();

    passThrough.on('data', (chunk: Buffer) => chunks.push(chunk));
    passThrough.on('end', () => resolve(Buffer.concat(chunks)));
    passThrough.on('error', reject);

    archive.pipe(passThrough);

    for (const file of files) {
      archive.append(file.buffer, { name: file.name });
    }

    archive.finalize();
  });
}

// Keep backward compatibility: single Excel buffer (deprecated but still available)
export function generateExcelBuffer(report: any): Buffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['请使用导出总表功能下载ZIP文件']]), '说明');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
