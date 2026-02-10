import XLSX from 'xlsx';

/* ───────────────────── helpers ───────────────────── */

function fmt(v: number | undefined | null): string {
  if (v == null || v === 0) return '0';
  return (v / 10000).toFixed(1) + '万';
}

function fmtRaw(v: number | undefined | null): number {
  if (v == null) return 0;
  return Math.round(v / 100) / 100; // 保留两位小数（元→万）
}

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

function safeNum(v: any): number {
  if (v == null) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

type AnyRow = Record<string, any>;

/* ───────────────────── sheet builders ───────────────────── */

function buildDeptTargetSheet(dept: any): XLSX.WorkSheet[] {
  const sheets: XLSX.WorkSheet[] = [];

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
  // 合计行
  const t = dept.totals || {};
  directorRows.push({
    '序号': '',
    '总监': '合计',
    '期交目标': fmtWan(t.totalQjTarget),
    '期交完成': fmtWan(t.totalQj),
    '完成率': t.totalQjTarget > 0 ? pct(t.totalQj / t.totalQjTarget) : '-',
    '差距': fmtWan(t.totalQjGap),
    '趸交目标': fmtWan(t.totalDcTarget),
    '趸交完成': fmtWan(t.totalGmdc),
    '趸交完成率': t.totalDcTarget > 0 ? pct(t.totalGmdc / t.totalDcTarget) : '-',
    '趸交差距': fmtWan(t.totalDcGap),
  });
  sheets.push(XLSX.utils.json_to_sheet(directorRows));

  // 营业部经理维度
  const mgrRows = (dept.deptRankingAll || []).map((r: any, i: number) => ({
    '序号': i + 1,
    '营业部经理': r.name,
    '期交目标': fmtWan(r.qjTarget),
    '期交完成': fmtWan(r.monthQj),
    '完成率': r.qjTarget > 0 ? pct(r.monthQj / r.qjTarget) : '-',
    '差距': fmtWan(r.qjGap),
    '趸交目标': fmtWan(r.dcTarget),
    '趸交完成': fmtWan(r.gmdc),
    '趸交完成率': r.dcTarget > 0 ? pct(r.gmdc / r.dcTarget) : '-',
    '趸交差距': fmtWan(r.dcGap),
  }));
  const ta = dept.totalsAll || {};
  mgrRows.push({
    '序号': '',
    '营业部经理': '合计',
    '期交目标': fmtWan(ta.totalQjTarget),
    '期交完成': fmtWan(ta.totalQj),
    '完成率': ta.totalQjTarget > 0 ? pct(ta.totalQj / ta.totalQjTarget) : '-',
    '差距': fmtWan(ta.totalQjGap),
    '趸交目标': fmtWan(ta.totalDcTarget),
    '趸交完成': fmtWan(ta.totalGmdc),
    '趸交完成率': ta.totalDcTarget > 0 ? pct(ta.totalGmdc / ta.totalDcTarget) : '-',
    '趸交差距': fmtWan(ta.totalDcGap),
  });
  sheets.push(XLSX.utils.json_to_sheet(mgrRows));

  return sheets;
}

function buildDeptBusinessSheet(dept: any): XLSX.WorkSheet[] {
  const sheets: XLSX.WorkSheet[] = [];

  // 非邮
  const feiyouRows = (dept.deptRanking || []).map((r: any, i: number) => ({
    '排名': i + 1,
    '营业部': r.name,
    '月期交': fmtWan(r.monthQj),
    '期交目标': fmtWan(r.qjTarget),
    '达成差距': fmtWan(r.qjGap),
    '规模趸': fmtWan(r.gmdc),
    '趸交目标': fmtWan(r.dcTarget),
    '达成差距(趸)': fmtWan(r.dcGap),
  }));
  sheets.push(XLSX.utils.json_to_sheet(feiyouRows));

  // 全渠道
  const allRows = (dept.deptRankingAll || []).map((r: any, i: number) => ({
    '排名': i + 1,
    '营业部': r.name,
    '月期交': fmtWan(r.monthQj),
    '期交目标': fmtWan(r.qjTarget),
    '达成差距': fmtWan(r.qjGap),
    '规模趸': fmtWan(r.gmdc),
    '趸交目标': fmtWan(r.dcTarget),
    '达成差距(趸)': fmtWan(r.dcGap),
  }));
  sheets.push(XLSX.utils.json_to_sheet(allRows));

  return sheets;
}

function buildDeptDailySheet(dept: any): XLSX.WorkSheet {
  const rows = (dept.dailyData || []).map((r: any) => ({
    '营业部': r.name,
    '今日期交': fmtWan(r.todayQj),
    '今日非邮期交': fmtWan(r.todayFeiyouQj),
    '今日趸交': fmtWan(r.todayDc),
    '日目标': fmtWan(r.target),
    '达成率': pct(r.rate),
  }));
  return XLSX.utils.json_to_sheet(rows);
}

function buildDeptHrSheet(dept: any): XLSX.WorkSheet {
  const rows = (dept.hrStats || []).map((r: any, i: number) => ({
    '序号': i + 1,
    '营业部': r.name,
    '挂网人力': r.guawang,
    '破零人力': r.poling,
    '开单率': pct(r.kaidanRate),
    '归保2万': r.guibao2w,
  }));
  return XLSX.utils.json_to_sheet(rows);
}

function buildDeptHrDetailSheet(dept: any): XLSX.WorkSheet {
  const rows = (dept.hrManagerDetails || []).map((r: any) => ({
    '营业部': r.dept,
    '姓名': r.name,
    '工号': r.code,
    '期交保费(万)': fmtWan(r.qjbf),
    '件数': r.js,
    '开单': r.kaidan ? '是' : '否',
    '服务网点数': r.networks,
  }));
  return XLSX.utils.json_to_sheet(rows);
}

function buildDeptTieganSheet(dept: any): XLSX.WorkSheet {
  const rows = (dept.tieganData || []).map((r: any) => ({
    '营业部': r.name,
    '铁杆网点总数': r.total,
    '开单数': r.kaidan,
    '开单率': pct(r.kaidanRate),
    '差距': r.gap,
  }));
  return XLSX.utils.json_to_sheet(rows);
}

function buildDeptDadanSheet(dept: any): XLSX.WorkSheet {
  const rows = (dept.dadanData || []).map((r: any) => ({
    '营业部': r.name,
    '5万以上': r.c5w,
    '10万以上': r.c10w,
    '20万以上': r.c20w,
    '50万以上': r.c50w,
    '100万以上': r.c100w,
    '10万以上合计': r.totalAbove10w,
  }));
  return XLSX.utils.json_to_sheet(rows);
}

function buildPremiumDistSheet(dept: any): XLSX.WorkSheet {
  const dist = dept.premiumDist;
  if (!dist || !dist.rows) return XLSX.utils.aoa_to_sheet([['暂无数据']]);

  const hdrs = dist.headers || [];
  const headers = ['营业部', ...hdrs];
  const aoa: any[][] = [headers];
  for (const row of dist.rows) {
    const line: any[] = [row.name];
    const vals = Array.isArray(row.values) ? row.values : [];
    for (let i = 0; i < hdrs.length; i++) {
      line.push(fmtWan(vals[i] || 0));
    }
    aoa.push(line);
  }
  // bankTotals
  if (dist.bankTotals) {
    const totalLine: any[] = ['合计'];
    const bt = Array.isArray(dist.bankTotals) ? dist.bankTotals : [];
    for (let i = 0; i < hdrs.length; i++) {
      totalLine.push(fmtWan(bt[i] || 0));
    }
    aoa.push(totalLine);
  }
  return XLSX.utils.aoa_to_sheet(aoa);
}

function buildPersonalTopSheet(dept: any): XLSX.WorkSheet {
  // 全渠道 + 非邮
  const allRows = (dept.personalTop || []).map((r: any, i: number) => ({
    '排名': i + 1,
    '姓名': r.name,
    '营业部': r.dept,
    '保费(万)': fmtWan(r.premium),
    '类型': '全渠道',
  }));
  const feiyouRows = (dept.personalTopFeiyou || []).map((r: any, i: number) => ({
    '排名': i + 1,
    '姓名': r.name,
    '营业部': r.dept,
    '保费(万)': fmtWan(r.premium),
    '类型': '非邮',
  }));
  return XLSX.utils.json_to_sheet([...allRows, { '排名': '', '姓名': '', '营业部': '', '保费(万)': '', '类型': '' }, ...feiyouRows]);
}

function buildPersonalCountSheet(dept: any): XLSX.WorkSheet {
  const allRows = (dept.personalCountTop || []).map((r: any, i: number) => ({
    '排名': i + 1,
    '姓名': r.name,
    '营业部': r.dept,
    '件数': r.js,
    '类型': '全渠道',
  }));
  const feiyouRows = (dept.personalCountTopFeiyou || []).map((r: any, i: number) => ({
    '排名': i + 1,
    '姓名': r.name,
    '营业部': r.dept,
    '件数': r.js,
    '类型': '非邮',
  }));
  return XLSX.utils.json_to_sheet([...allRows, { '排名': '', '姓名': '', '营业部': '', '件数': '', '类型': '' }, ...feiyouRows]);
}

function buildBankDadanSheet(dept: any): XLSX.WorkSheet {
  const rows = (dept.bankDadanList || []).map((r: any) => ({
    '银行渠道': r.name,
    '5万以上': r.c5w,
    '10万以上': r.c10w,
    '20万以上': r.c20w,
    '50万以上': r.c50w,
    '100万以上': r.c100w,
    '10万以上合计': r.totalAbove10w,
  }));
  return XLSX.utils.json_to_sheet(rows);
}

function buildNetworkDistSheet(dept: any): XLSX.WorkSheet {
  const dist = dept.networkDist;
  if (!dist || !dist.rows) return XLSX.utils.aoa_to_sheet([['暂无数据']]);

  const hdrs = dist.headers || [];
  const headers = ['营业部', ...hdrs, '合计'];
  const aoa: any[][] = [headers];
  for (const row of dist.rows) {
    const line: any[] = [row.name];
    const vals = Array.isArray(row.values) ? row.values : [];
    for (let i = 0; i < hdrs.length; i++) {
      line.push(vals[i] || 0);
    }
    line.push(row.total || 0);
    aoa.push(line);
  }
  if (dist.bankTotals) {
    const totalLine: any[] = ['合计'];
    const bt = Array.isArray(dist.bankTotals) ? dist.bankTotals : [];
    for (let i = 0; i < hdrs.length; i++) {
      totalLine.push(bt[i] || 0);
    }
    totalLine.push(dist.totalNetworks || 0);
    aoa.push(totalLine);
  }
  return XLSX.utils.aoa_to_sheet(aoa);
}

/* ── Channel sheets ── */

function buildChannelSummarySheet(channel: any): XLSX.WorkSheet[] {
  const sheets: XLSX.WorkSheet[] = [];

  // 年交
  const njRows = (channel.channelSummary || []).map((r: any) => ({
    '银行渠道': r.name,
    '保费(万)': fmtWan(r.baofei),
    '渠道占比': pct(r.ratio),
    '网点数量': r.netTotal,
    '开单网点': r.netActive,
    '网活率': pct(r.netActiveRate),
    '网均产量(万)': fmtWan(r.netAvgOutput),
  }));
  const njTotals = channel.channelSummaryTotals || {};
  njRows.push({
    '银行渠道': '中支合计',
    '保费(万)': fmtWan(njTotals.baofei),
    '渠道占比': '100%',
    '网点数量': njTotals.netTotal,
    '开单网点': njTotals.netActive,
    '网活率': pct(njTotals.netActiveRate),
    '网均产量(万)': fmtWan(njTotals.netAvgOutput),
  });
  sheets.push(XLSX.utils.json_to_sheet(njRows));

  // 趸交
  const dcRows = (channel.channelSummaryDc || []).map((r: any) => ({
    '银行渠道': r.name,
    '保费(万)': fmtWan(r.baofei),
    '渠道占比': pct(r.ratio),
    '网点数量': r.netTotal,
    '开单网点': r.netActive,
    '网活率': pct(r.netActiveRate),
    '网均产量(万)': fmtWan(r.netAvgOutput),
  }));
  const dcTotals = channel.channelSummaryDcTotals || {};
  dcRows.push({
    '银行渠道': '中支合计',
    '保费(万)': fmtWan(dcTotals.baofei),
    '渠道占比': '100%',
    '网点数量': dcTotals.netTotal,
    '开单网点': dcTotals.netActive,
    '网活率': pct(dcTotals.netActiveRate),
    '网均产量(万)': fmtWan(dcTotals.netAvgOutput),
  });
  sheets.push(XLSX.utils.json_to_sheet(dcRows));

  return sheets;
}

function buildChannelProductSheet(channel: any): XLSX.WorkSheet {
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

  // totals
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

  return XLSX.utils.aoa_to_sheet(aoa);
}

function buildMonthlyTrendSheet(channel: any): XLSX.WorkSheet[] {
  const sheets: XLSX.WorkSheet[] = [];

  // 年交月度趋势
  const njTotals = channel.monthlyTrendTotals || {};
  const months = Object.keys(njTotals).sort((a, b) => Number(a) - Number(b));
  const njHeaders = ['银行渠道', ...months.map(m => m + '月'), '合计'];
  const njAoa = [njHeaders];
  for (const row of (channel.monthlyTrend || [])) {
    const line: any[] = [row.name];
    for (const m of months) {
      line.push(fmtWan(row.months?.[m] || 0));
    }
    line.push(fmtWan(row.total || 0));
    njAoa.push(line);
  }
  const njTotalLine: any[] = ['合计'];
  for (const m of months) {
    njTotalLine.push(fmtWan(njTotals[m] || 0));
  }
  njTotalLine.push(fmtWan(channel.monthlyGrandTotal || 0));
  njAoa.push(njTotalLine);
  sheets.push(XLSX.utils.aoa_to_sheet(njAoa));

  // 趸交月度趋势
  const dcTotals = channel.monthlyTrendDcTotals || {};
  const dcMonths = Object.keys(dcTotals).sort((a, b) => Number(a) - Number(b));
  const dcHeaders = ['银行渠道', ...dcMonths.map(m => m + '月'), '合计'];
  const dcAoa = [dcHeaders];
  for (const row of (channel.monthlyTrendDc || [])) {
    const line: any[] = [row.name];
    for (const m of dcMonths) {
      line.push(fmtWan(row.months?.[m] || 0));
    }
    line.push(fmtWan(row.total || 0));
    dcAoa.push(line);
  }
  const dcTotalLine: any[] = ['合计'];
  for (const m of dcMonths) {
    dcTotalLine.push(fmtWan(dcTotals[m] || 0));
  }
  dcTotalLine.push(fmtWan(channel.monthlyGrandTotalDc || 0));
  dcAoa.push(dcTotalLine);
  sheets.push(XLSX.utils.aoa_to_sheet(dcAoa));

  return sheets;
}

function buildProductDetailSheet(channel: any): XLSX.WorkSheet {
  const rows = (channel.productDetail || []).map((r: any) => ({
    '产品名称': r.name,
    '期交(万)': fmtWan(r.qj),
    '占比': pct(r.ratio),
    '3年期(万)': fmtWan(r.y3),
    '5年期(万)': fmtWan(r.y5),
    '趸交(万)': fmtWan(r.dc),
  }));
  const t = channel.productDetailTotals || {};
  rows.push({
    '产品名称': '合计',
    '期交(万)': fmtWan(t.qj),
    '占比': '100%',
    '3年期(万)': fmtWan(t.y3),
    '5年期(万)': fmtWan(t.y5),
    '趸交(万)': fmtWan(t.dc),
  });
  return XLSX.utils.json_to_sheet(rows);
}

function buildDcProductSheet(channel: any): XLSX.WorkSheet {
  const rows = (channel.dcProducts || []).map((r: any) => ({
    '产品名称': r.name,
    '保费(万)': fmtWan(r.value),
  }));
  rows.push({
    '产品名称': '合计',
    '保费(万)': fmtWan(channel.dcProductTotal || 0),
  });
  return XLSX.utils.json_to_sheet(rows);
}

function buildNetworkOpenSheet(channel: any): XLSX.WorkSheet {
  const deptOrder = channel.deptManagerOrder || [];
  // Each dept has two sub-columns: total and active
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

  // totals
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

  return XLSX.utils.aoa_to_sheet(aoa);
}

function buildNetworkPerfSheet(channel: any): XLSX.WorkSheet {
  const rows = (channel.networkPerformance || []).map((r: any) => ({
    '网点名称': r.name,
    '简称': r.shortName,
    '银行渠道': r.bank,
    '营业部经理': r.deptManager,
    '客户经理': r.customerManager,
    '年交(万)': fmtWan(r.qj),
    '趸交(万)': fmtWan(r.dc),
    '件数': r.js,
  }));
  const t = channel.networkPerfTotals || {};
  rows.push({
    '网点名称': '合计',
    '简称': '',
    '银行渠道': '',
    '营业部经理': '',
    '客户经理': '',
    '年交(万)': fmtWan(t.qj),
    '趸交(万)': fmtWan(t.dc),
    '件数': t.js,
  });
  return XLSX.utils.json_to_sheet(rows);
}

/* ── HR sheet ── */

function buildHrSheet(hr: any[]): XLSX.WorkSheet {
  const rows = (hr || []).map((r: any) => ({
    '营业区': r['营业区'],
    '营业部': r['营业部'],
    '工号': r['工号'],
    '姓名': r['姓名'],
    '期交保费': r['期交保费'],
    '规保': r['规保'],
    '预录': r['预录'],
    '实时': r['实时'],
    '今日保费': r['今日保费'],
    '非邮期交': r['非邮期交'],
    '价值趸': r['价值趸'],
    '规模趸': r['规模趸'],
    '期交标保': r['期交标保'],
    '破零': r['破零'],
    '非邮破零': r['非邮破零'],
  }));
  return XLSX.utils.json_to_sheet(rows);
}

/* ── Tracking sheet ── */

function buildTrackingSheet(tracking: any): XLSX.WorkSheet {
  const groups = tracking?.groups || [];
  const rows: any[] = [];
  for (const g of groups) {
    for (const m of (g.members || [])) {
      rows.push({
        '营业部': g.deptName,
        '姓名': m.name,
        '期交保费(万)': fmtWan(m.qjbf),
        '非邮期交(万)': fmtWan(m.feiyouQj),
        '归保(万)': fmtWan(m.guibao),
        '价值趸(万)': fmtWan(m.jzdc),
        '规模趸(万)': fmtWan(m.gmdc),
        '标保(万)': fmtWan(m.bb),
        '件数': m.js,
        '非邮件数': m.feiyouJs,
        '网点总数': m.wdTotal,
        '开单网点': m.wdActive,
      });
    }
  }
  return XLSX.utils.json_to_sheet(rows);
}

/* ── Core Network sheet ── */

function buildCoreNetworkSheet(coreNetwork: any): XLSX.WorkSheet {
  const networks = coreNetwork?.networks || [];
  const rows = networks.map((n: any) => {
    const row: any = {
      '银行渠道': n.totalBankName,
      '网点代码': n.networkCode,
      '网点名称': n.agencyName,
      '客户经理': n.customerManager,
      '营业部经理': n.deptManager,
      '营业区总监': n.areaDirector,
      '核心网点': n.coreNetwork ? '是' : '否',
    };
    // months
    const months = n.months || {};
    for (let i = 1; i <= 12; i++) {
      row[i + '月'] = fmtWan(months[String(i)] || 0);
    }
    row['合计(万)'] = fmtWan(n.total || 0);
    row['件数'] = n.js || 0;
    return row;
  });
  return XLSX.utils.json_to_sheet(rows);
}

/* ───────────────────── main export function ───────────────────── */

export function generateExcelBuffer(report: any): Buffer {
  const wb = XLSX.utils.book_new();

  const dept = report.dept || {};
  const channel = report.channel || {};
  const hr = report.hr || [];
  const tracking = report.tracking || {};
  const coreNetwork = report.coreNetwork || {};

  // 1. 部门-目标达成 (总监)
  const targetSheets = buildDeptTargetSheet(dept);
  XLSX.utils.book_append_sheet(wb, targetSheets[0], '目标达成-总监');
  if (targetSheets[1]) {
    XLSX.utils.book_append_sheet(wb, targetSheets[1], '目标达成-营业部经理');
  }

  // 2. 部门-业务数据
  const bizSheets = buildDeptBusinessSheet(dept);
  XLSX.utils.book_append_sheet(wb, bizSheets[0], '业务数据-非邮');
  if (bizSheets[1]) {
    XLSX.utils.book_append_sheet(wb, bizSheets[1], '业务数据-全渠道');
  }

  // 3. 部门-日保费数据
  XLSX.utils.book_append_sheet(wb, buildDeptDailySheet(dept), '日保费数据');

  // 4. 部门-人力数据
  XLSX.utils.book_append_sheet(wb, buildDeptHrSheet(dept), '人力汇总');
  XLSX.utils.book_append_sheet(wb, buildDeptHrDetailSheet(dept), '人力明细');

  // 5. 铁杆网点
  XLSX.utils.book_append_sheet(wb, buildDeptTieganSheet(dept), '铁杆网点');

  // 6. 部门大单分布
  XLSX.utils.book_append_sheet(wb, buildDeptDadanSheet(dept), '部门大单分布');

  // 7. 保费分布
  XLSX.utils.book_append_sheet(wb, buildPremiumDistSheet(dept), '保费分布');

  // 8. 个人业绩前10
  XLSX.utils.book_append_sheet(wb, buildPersonalTopSheet(dept), '个人业绩前10');

  // 9. 个人件数前10
  XLSX.utils.book_append_sheet(wb, buildPersonalCountSheet(dept), '个人件数前10');

  // 10. 全渠道大单
  XLSX.utils.book_append_sheet(wb, buildBankDadanSheet(dept), '全渠道大单');

  // 11. 网点分布
  XLSX.utils.book_append_sheet(wb, buildNetworkDistSheet(dept), '网点分布');

  // 12. 渠道-业务数据
  const chSummary = buildChannelSummarySheet(channel);
  XLSX.utils.book_append_sheet(wb, chSummary[0], '渠道-年交');
  if (chSummary[1]) {
    XLSX.utils.book_append_sheet(wb, chSummary[1], '渠道-趸交');
  }

  // 13. 渠道产品分布
  XLSX.utils.book_append_sheet(wb, buildChannelProductSheet(channel), '渠道产品分布');

  // 14. 月度趋势
  const trendSheets = buildMonthlyTrendSheet(channel);
  XLSX.utils.book_append_sheet(wb, trendSheets[0], '月度趋势-年交');
  if (trendSheets[1]) {
    XLSX.utils.book_append_sheet(wb, trendSheets[1], '月度趋势-趸交');
  }

  // 15. 产品数据
  XLSX.utils.book_append_sheet(wb, buildProductDetailSheet(channel), '产品数据');

  // 16. 趸交产品
  XLSX.utils.book_append_sheet(wb, buildDcProductSheet(channel), '趸交产品');

  // 17. 网点开单
  XLSX.utils.book_append_sheet(wb, buildNetworkOpenSheet(channel), '网点开单');

  // 18. 网点业绩明细
  XLSX.utils.book_append_sheet(wb, buildNetworkPerfSheet(channel), '网点业绩明细');

  // 19. 人力数据
  XLSX.utils.book_append_sheet(wb, buildHrSheet(hr), '人力数据');

  // 20. 追踪报表
  XLSX.utils.book_append_sheet(wb, buildTrackingSheet(tracking), '追踪报表');

  // 21. 核心网点
  XLSX.utils.book_append_sheet(wb, buildCoreNetworkSheet(coreNetwork), '核心网点');

  // Generate buffer
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return buf;
}
