/**
 * 银保数据自动化报表 - 网点表和人力表生成
 */
import XLSX from 'xlsx';
import { safeFloat, safeStr, LookupTables, DataRow } from './utils';

/**
 * 解析人网文件，返回两个Sheet的原始行数据
 * Sheet1: "代理机构查询" - 详细代理机构信息 (73列)
 * Sheet2: "Sheet1" - 精简网点人员信息 (17列)
 */
export function parseRenwangFile(renwangBuffer: Buffer): { agency: DataRow[]; network: DataRow[] } {
  const wb = XLSX.read(renwangBuffer, { type: 'buffer' });
  console.log('[Renwang] Available sheets:', wb.SheetNames.join(', '));

  // Sheet1: 代理机构查询 (try exact match, then partial match, then first sheet)
  const agencyRows: DataRow[] = [];
  let agencySheet = wb.Sheets['代理机构查询'];
  if (!agencySheet) {
    for (const name of wb.SheetNames) {
      if (name.includes('代理') || name.includes('机构')) {
        agencySheet = wb.Sheets[name];
        console.log(`[Renwang] Using '${name}' as agency sheet`);
        break;
      }
    }
  }
  if (!agencySheet && wb.SheetNames.length > 0) {
    agencySheet = wb.Sheets[wb.SheetNames[0]];
    console.log(`[Renwang] Falling back to first sheet '${wb.SheetNames[0]}' as agency sheet`);
  }
  if (agencySheet) {
    const rawAgency = XLSX.utils.sheet_to_json<any>(agencySheet);
    for (const r of rawAgency) {
      if (r['代理机构名称'] || r['代理机构代码']) {
        agencyRows.push(r);
      }
    }
  }

  // Sheet2: Sheet1 (精简网点) - try exact match, then second sheet
  const networkRows: DataRow[] = [];
  let networkSheet = wb.Sheets['Sheet1'];
  if (!networkSheet && wb.SheetNames.length > 1) {
    networkSheet = wb.Sheets[wb.SheetNames[1]];
    console.log(`[Renwang] Using '${wb.SheetNames[1]}' as network sheet`);
  }
  if (networkSheet) {
    const rawNetwork = XLSX.utils.sheet_to_json<any>(networkSheet);
    for (const r of rawNetwork) {
      if (r['代理机构名称']) {
        networkRows.push(r);
      }
    }
  }

  return { agency: agencyRows, network: networkRows };
}

export function generateNetwork(
  renwangBuffer: Buffer,
  dataRows: DataRow[],
  lookups: LookupTables,
  monthStart: number,
  monthEnd: number
): DataRow[] {
  const wb = XLSX.read(renwangBuffer, { type: 'buffer' });
  let ws = wb.Sheets['Sheet1'];
  if (!ws && wb.SheetNames.length > 1) {
    ws = wb.Sheets[wb.SheetNames[1]];
  }
  if (!ws && wb.SheetNames.length > 0) {
    ws = wb.Sheets[wb.SheetNames[0]];
  }
  const rawData = XLSX.utils.sheet_to_json<any>(ws || {});

  // Pre-compute summaries by network
  const njByWd: Record<string, number> = {};
  const dcByWd: Record<string, number> = {};
  const jsByWd: Record<string, number> = {};
  const njSsByWd: Record<string, number> = {};

  for (const row of dataRows) {
    const m = safeStr(row['业绩归属网点名称']);
    const bo = row['月'];
    if (!m) continue;
    const aj = safeFloat(row['新约保费']);
    const s = safeStr(row['缴费间隔']);
    const bw = row['是否预录'] || 0;
    if (s === '年交') {
      njByWd[m] = (njByWd[m] || 0) + aj;
      if (bw === 0) {
        njSsByWd[m] = (njSsByWd[m] || 0) + aj;
      }
    } else if (s === '趸交') {
      dcByWd[m] = (dcByWd[m] || 0) + aj;
    }
    const t = row['缴费期间年'];
    if (t !== null && t !== undefined) {
      const tNum = Number(t);
      if (!isNaN(tNum) && tNum >= 0) {
        jsByWd[m] = (jsByWd[m] || 0) + 1;
      }
    }
  }

  const netRows: DataRow[] = [];
  for (const rw of rawData) {
    if (!rw['代理机构名称']) continue;
    const wdName = safeStr(rw['代理机构名称']);
    netRows.push({
      '总行名称': rw['总行名称'],
      '归属渠道': rw['归属渠道'],
      '代理机构代码': rw['代理机构代码'],
      '代理机构名称': wdName,
      '代理机构类型': rw['代理机构类型'],
      '银行方网点代码': rw['银行方网点代码'],
      '客户经理工号': rw['客户经理工号'],
      '客户经理姓名': rw['客户经理姓名'],
      '营业部经理工号': rw['营业部经理工号'],
      '营业部经理姓名': rw['营业部经理姓名'],
      '营业区总监工号': rw['营业区总监工号'],
      '营业区总监姓名': rw['营业区总监姓名'],
      '机构': rw['所在市名称'],
      '是否物理合作网点': rw['是否物理合作网点'],
      '铁杆': rw['是否铁杆网点'],
      '年交': njByWd[wdName] || 0,
      '简称': lookups.wdjcB.get(wdName) || '',
      '件数': jsByWd[wdName] || 0,
      '趸交': dcByWd[wdName] || 0,
      '实时保费': njSsByWd[wdName] || 0,
    });
  }

  return netRows;
}

export function generateHr(
  netRows: DataRow[],
  dataRows: DataRow[],
  lookups: LookupTables,
  monthStart: number,
  monthEnd: number
): DataRow[] {
  // Deduplicate by customer manager
  const khjlDict = new Map<string, { area: string; dept: string; code: string; name: string }>();
  for (const nr of netRows) {
    const gh = safeStr(nr['客户经理工号']);
    const xm = safeStr(nr['客户经理姓名']);
    const yybm = safeStr(nr['营业部经理姓名']);
    const yyqzj = safeStr(nr['营业区总监姓名']);
    if (gh && xm && !khjlDict.has(gh)) {
      khjlDict.set(gh, { area: yyqzj, dept: yybm, code: gh, name: xm });
    }
  }

  // Pre-compute summaries by person
  const qjbf: Record<string, number> = {};
  const guibao: Record<string, number> = {};
  const yulu: Record<string, number> = {};
  const feiyouQj: Record<string, number> = {};
  const jzdc: Record<string, number> = {};
  const gmdc: Record<string, number> = {};
  const qjbb: Record<string, number> = {};
  const js: Record<string, number> = {};
  const feiyouJs: Record<string, number> = {};

  for (const row of dataRows) {
    const person = safeStr(row['归属人']);
    const bo = row['月'];
    if (!person) continue;

    const aj = safeFloat(row['新约保费']);
    const s = safeStr(row['缴费间隔']);
    const bi = safeStr(row['类型']);
    const d = safeStr(row['银行总行']);
    const bw = row['是否预录'] || 0;
    const bt = safeFloat(row['规保']);
    const bl = safeFloat(row['标保']);
    const bq = safeFloat(row['期交保费']);

    if (s === '年交') {
      qjbf[person] = (qjbf[person] || 0) + aj;
      guibao[person] = (guibao[person] || 0) + bt;
    }
    if (bw === 1) {
      yulu[person] = (yulu[person] || 0) + bq;
    }
    if (s === '年交' && d !== '中国邮政储蓄银行') {
      feiyouQj[person] = (feiyouQj[person] || 0) + aj;
    }
    if (bi === '价值类' && s === '趸交') {
      jzdc[person] = (jzdc[person] || 0) + aj;
    }
    if (bi === '规模类' && s === '趸交') {
      gmdc[person] = (gmdc[person] || 0) + aj;
    }
    qjbb[person] = (qjbb[person] || 0) + bl;

    const t = row['缴费期间年'];
    if (t !== null && t !== undefined) {
      const tNum = Number(t);
      if (!isNaN(tNum) && tNum >= 0) {
        js[person] = (js[person] || 0) + 1;
        if (d !== '中国邮政储蓄银行') {
          feiyouJs[person] = (feiyouJs[person] || 0) + 1;
        }
      }
    }
  }

  // Network stats by person
  const wdTotal: Record<string, number> = {};
  const wdFeiyou: Record<string, number> = {};
  const wdActive: Record<string, number> = {};
  const wdWuli: Record<string, number> = {};
  const wdWuliActive: Record<string, number> = {};

  for (const nr of netRows) {
    const xm = safeStr(nr['客户经理姓名']);
    if (!xm) continue;
    wdTotal[xm] = (wdTotal[xm] || 0) + 1;
    const jc = safeStr(nr['简称']);
    if (jc !== '邮政') {
      wdFeiyou[xm] = (wdFeiyou[xm] || 0) + 1;
    }
    const nj = safeFloat(nr['年交']);
    if (nj > 0) {
      wdActive[xm] = (wdActive[xm] || 0) + 1;
    }
    const wuli = safeStr(nr['是否物理合作网点']);
    if (wuli === '是') {
      wdWuli[xm] = (wdWuli[xm] || 0) + 1;
      if (nj > 0) {
        wdWuliActive[xm] = (wdWuliActive[xm] || 0) + 1;
      }
    }
  }

  const hrRows: DataRow[] = [];
  for (const [gh, info] of Array.from(khjlDict.entries())) {
    const xm = info.name;
    const e = qjbf[xm] || 0;
    const g = yulu[xm] || 0;
    const zj = lookups.zhijiTable.get(xm) || '';
    const wc = lookups.weichiTable.get(zj) || 0;
    const dc = qjbb[xm] || 0;

    hrRows.push({
      '营业区': info.area, '营业部': info.dept,
      '工号': info.code, '姓名': xm,
      '期交保费': e, '规保': guibao[xm] || 0,
      '预录': g, '实时': e - g, '今日保费': 0,
      '非邮期交': feiyouQj[xm] || 0,
      '价值趸': jzdc[xm] || 0, '规模趸': gmdc[xm] || 0,
      '期交标保': dc,
      '破零': e > 0 ? 1 : 0,
      '非邮破零': (feiyouQj[xm] || 0) > 0 ? 1 : 0,
      '件数': js[xm] || 0, '非邮件数': feiyouJs[xm] || 0,
      '网点总数': wdTotal[xm] || 0,
      '非邮政网点': wdFeiyou[xm] || 0,
      '活动网点': wdActive[xm] || 0,
      '物理网点': wdWuli[xm] || 0,
      '活动物理': wdWuliActive[xm] || 0,
      '实时破零': (e - g) > 0 ? 1 : 0,
      '职级': zj, '维持': wc, '达成': dc,
      '差距': dc >= wc ? 0 : dc - wc,
    });
  }

  return hrRows;
}
