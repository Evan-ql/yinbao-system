/**
 * 人事结构三方交叉对比引擎
 * [v1.0.3] 系统现有组织架构 vs 人网数据 vs 2026数据
 *
 * 上传任一数据时自动触发对比，不限制上传顺序。
 * 对比结果供前端展示，用户确认后才更新组织架构。
 */
import XLSX from 'xlsx';
import { safeStr } from './report/utils';
import { getSettingsData } from './settingsApi';

// ─── 类型定义 ───

const ROLE_LABELS: Record<string, string> = {
  director: '总监',
  deptManager: '营业部经理',
  customerManager: '客户经理',
};

/** 某个人在某个数据源中的信息 */
export interface PersonSource {
  name: string;
  code: string;
  role: string;
  roleLabel: string;
  parent: string;       // 上级姓名
  status: string;       // active / transferred / resigned / ''
  months: number[];     // 涉及月份
  policyCount: number;  // 保单数（仅2026数据）
  totalPremium: number; // 保费（仅2026数据）
}

/** 一条对比记录 */
export interface DiffItem {
  id: string;
  name: string;
  code: string;
  role: string;
  roleLabel: string;
  // 三方数据
  system: PersonSource | null;   // 系统现有
  renwang: PersonSource | null;  // 人网数据
  source: PersonSource | null;   // 2026数据
  // 差异类型
  diffType: 'consistent'   // 三方一致
    | 'conflict'           // 存在冲突（上级不同）
    | 'missing_parent'     // 2026数据中上级为空
    | 'new_person'         // 新增人员（系统中没有）
    | 'inactive'           // 系统中有但数据中未出现
    | 'renwang_only';      // 仅人网中有
  diffDescription: string; // 差异描述
  // 用户操作
  suggestedParent: string; // 建议上级
  confirmedParent: string; // 用户确认的上级（前端回传）
  action: 'accept' | 'reject' | 'modify';
}

export interface DiffResult {
  hasChanges: boolean;
  totalItems: number;
  consistentCount: number;
  conflictCount: number;
  missingCount: number;
  newCount: number;
  inactiveCount: number;
  items: DiffItem[];
}

// ─── 列名映射 ───

const COL_NAME_MAP: Record<string, string> = {
  '营业区总监': '营业区总监',
  '营业区总监姓名': '营业区总监',
  '营业部经理名称': '营业部经理名称',
  '营业部经理姓名': '营业部经理名称',
  '业绩归属客户经理姓名': '业绩归属客户经理姓名',
  '客户经理姓名': '业绩归属客户经理姓名',
  '营业区总监工号': '营业区总监工号',
  '营业部经理工号': '营业部经理工号',
  '业绩归属客户经理工号': '业绩归属客户经理工号',
  '客户经理工号': '业绩归属客户经理工号',
};

// ─── 工具函数 ───

let _diffId = 0;
function genDiffId(): string { return `d${++_diffId}_${Date.now()}`; }

function parseDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const s = String(val).trim();
  const m = s.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  const n = Number(s);
  if (!isNaN(n) && n > 40000 && n < 60000) return new Date((n - 25569) * 86400000);
  return null;
}

function detectHeaderRow(rawData: any[][]): number {
  const kws = ['保单签单日期', '营业部经理', '客户经理', '新约保费'];
  for (let r = 0; r < Math.min(rawData.length, 15); r++) {
    const row = rawData[r];
    if (!row) continue;
    const s = row.map((c: any) => String(c || '')).join('|');
    if (kws.filter(k => s.includes(k)).length >= 2) return r;
  }
  return 0;
}

function emptyPerson(): PersonSource {
  return { name: '', code: '', role: '', roleLabel: '', parent: '', status: '', months: [], policyCount: 0, totalPremium: 0 };
}

// ─── 数据提取 ───

/** 从2026数据中提取人员信息 key = `${role}|${name}` */
function extractFromSource(buf: Buffer): Map<string, PersonSource> {
  const result = new Map<string, PersonSource>();
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  let ws = wb.Sheets['数据来源'] || wb.Sheets['Sheet1'] || wb.Sheets['保单明细'];
  if (!ws && wb.SheetNames.length > 0) ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return result;

  const raw = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
  const hIdx = detectHeaderRow(raw);
  const hRow = raw[hIdx] || [];
  const ci: Record<string, number> = {};
  for (let c = 0; c < hRow.length; c++) {
    const n = safeStr(hRow[c]);
    if (n) { ci[n] = c; if (COL_NAME_MAP[n]) ci[COL_NAME_MAP[n]] = c; }
  }
  const gc = (row: any[], name: string): any => {
    if (ci[name] !== undefined) return row[ci[name]];
    for (const [a, cn] of Object.entries(COL_NAME_MAP)) {
      if (cn === name && ci[a] !== undefined) return row[ci[a]];
    }
    return undefined;
  };

  for (let r = hIdx + 1; r < raw.length; r++) {
    const row = raw[r];
    if (!row || !row[0]) continue;
    const d = parseDate(gc(row, '保单签单日期'));
    if (!d) continue;
    const month = d.getMonth() + 1;
    const prem = parseFloat(safeStr(gc(row, '新约保费'))) || 0;

    const dirN = safeStr(gc(row, '营业区总监'));
    const dirC = safeStr(gc(row, '营业区总监工号'));
    const mgrN = safeStr(gc(row, '营业部经理名称'));
    const mgrC = safeStr(gc(row, '营业部经理工号'));
    const cmN = safeStr(gc(row, '业绩归属客户经理姓名'));
    const cmC = safeStr(gc(row, '业绩归属客户经理工号'));

    const add = (role: string, name: string, code: string, parent: string) => {
      if (!name) return;
      const key = `${role}|${name}`;
      const ex = result.get(key);
      if (ex) {
        ex.policyCount++;
        ex.totalPremium += prem;
        if (!ex.months.includes(month)) ex.months.push(month);
        if (!ex.parent && parent) ex.parent = parent;
        if (!ex.code && code) ex.code = code;
      } else {
        result.set(key, {
          name, code, role, roleLabel: ROLE_LABELS[role] || role,
          parent, status: '', months: [month],
          policyCount: 1, totalPremium: prem,
        });
      }
    };

    add('director', dirN, dirC, '');
    add('deptManager', mgrN, mgrC, dirN);
    add('customerManager', cmN, cmC, mgrN);
  }
  return result;
}

/** 从人网数据中提取人员信息 key = `${role}|${name}` */
function extractFromRenwang(buf: Buffer): Map<string, PersonSource> {
  const result = new Map<string, PersonSource>();
  const wb = XLSX.read(buf, { type: 'buffer' });
  const ws = wb.Sheets['Sheet1'] || wb.Sheets[wb.SheetNames[0]];
  if (!ws) return result;

  const rows = XLSX.utils.sheet_to_json<any>(ws);
  for (const rw of rows) {
    if (!rw['代理机构名称']) continue;
    const dirC = safeStr(rw['营业区总监工号']);
    const dirN = safeStr(rw['营业区总监姓名']);
    const mgrC = safeStr(rw['营业部经理工号']);
    const mgrN = safeStr(rw['营业部经理姓名']);
    const cmC = safeStr(rw['客户经理工号']);
    const cmN = safeStr(rw['客户经理姓名']);

    const add = (role: string, name: string, code: string, parent: string) => {
      if (!name || name === '#N/A') return;
      const key = `${role}|${name}`;
      if (!result.has(key)) {
        result.set(key, {
          name, code, role, roleLabel: ROLE_LABELS[role] || role,
          parent, status: 'active', months: [],
          policyCount: 0, totalPremium: 0,
        });
      }
    };

    add('director', dirN, dirC, '');
    add('deptManager', mgrN, mgrC, dirN);
    add('customerManager', cmN, cmC, mgrN);
  }
  return result;
}

/** 从系统现有组织架构提取人员信息 key = `${role}|${name}` */
function extractFromSystem(): Map<string, PersonSource> {
  const result = new Map<string, PersonSource>();
  const settings = getSettingsData();
  const staffList: any[] = settings.staff || [];

  // 按人员聚合（同一人可能有多条月份记录）
  for (const s of staffList) {
    const key = `${s.role}|${s.name}`;
    const ex = result.get(key);
    if (ex) {
      // 取最新的active记录的parent
      if (s.status === 'active' && s.parentId) {
        const sm = s.month || 0;
        // 如果当前记录月份更大或者是全年记录，更新parent
        if (!ex.months.length || sm === 0 || sm > Math.max(...ex.months, 0)) {
          ex.parent = s.parentId;
        }
      }
      if (s.month && !ex.months.includes(s.month)) ex.months.push(s.month);
      if (!ex.code && s.code) ex.code = s.code;
      ex.status = s.status;
    } else {
      result.set(key, {
        name: s.name,
        code: s.code || '',
        role: s.role,
        roleLabel: ROLE_LABELS[s.role] || s.role,
        parent: s.parentId || '',
        status: s.status || 'active',
        months: s.month ? [s.month] : [],
        policyCount: 0,
        totalPremium: 0,
      });
    }
  }
  return result;
}

// ─── 三方对比核心逻辑 ───

/**
 * 执行三方交叉对比
 * @param sourceBuffer 2026数据（可选）
 * @param renwangBuffer 人网数据（可选）
 */
export function compareThreeWay(
  sourceBuffer: Buffer | null,
  renwangBuffer: Buffer | null,
): DiffResult {
  const systemMap = extractFromSystem();
  const sourceMap = sourceBuffer ? extractFromSource(sourceBuffer) : new Map<string, PersonSource>();
  const renwangMap = renwangBuffer ? extractFromRenwang(renwangBuffer) : new Map<string, PersonSource>();

  // 收集所有人员 key
  const allKeys = new Set<string>();
  for (const k of systemMap.keys()) allKeys.add(k);
  for (const k of sourceMap.keys()) allKeys.add(k);
  for (const k of renwangMap.keys()) allKeys.add(k);

  const items: DiffItem[] = [];
  let consistentCount = 0;
  let conflictCount = 0;
  let missingCount = 0;
  let newCount = 0;
  let inactiveCount = 0;

  for (const key of allKeys) {
    const sys = systemMap.get(key) || null;
    const src = sourceMap.get(key) || null;
    const rw = renwangMap.get(key) || null;

    const [role, name] = key.split('|');
    const code = sys?.code || src?.code || rw?.code || '';
    const roleLabel = ROLE_LABELS[role] || role;

    // 总监没有上级，跳过上级对比
    if (role === 'director') {
      // 总监只检查是否新增或消失
      if (!sys && (src || rw)) {
        items.push({
          id: genDiffId(), name, code, role, roleLabel,
          system: sys, renwang: rw, source: src,
          diffType: 'new_person',
          diffDescription: `新增${roleLabel}：${name}`,
          suggestedParent: '',
          confirmedParent: '',
          action: 'accept',
        });
        newCount++;
      }
      // 总监在系统中有但数据中都没有
      else if (sys && !src && !rw) {
        items.push({
          id: genDiffId(), name, code, role, roleLabel,
          system: sys, renwang: rw, source: src,
          diffType: 'inactive',
          diffDescription: `${roleLabel} ${name} 在上传数据中未出现`,
          suggestedParent: sys.parent,
          confirmedParent: '',
          action: 'accept',
        });
        inactiveCount++;
      }
      // 一致
      else {
        consistentCount++;
      }
      continue;
    }

    const sysParent = sys?.parent || '';
    const srcParent = src?.parent || '';
    const rwParent = rw?.parent || '';

    // 判断差异类型
    let diffType: DiffItem['diffType'] = 'consistent';
    let desc = '';
    let suggested = '';

    const inSystem = !!sys;
    const inSource = !!src;
    const inRenwang = !!rw;

    if (!inSystem && !inSource && inRenwang) {
      // 仅人网中有
      diffType = 'renwang_only';
      desc = `${roleLabel} ${name} 仅在人网数据中存在，上级：${rwParent || '无'}`;
      suggested = rwParent;
      newCount++;
    } else if (!inSystem && inSource && !inRenwang) {
      // 仅2026数据中有
      diffType = 'new_person';
      desc = `新增${roleLabel}：${name}，数据中上级：${srcParent || '空'}`;
      suggested = srcParent;
      newCount++;
    } else if (!inSystem && inSource && inRenwang) {
      // 人网和2026都有，系统没有
      if (srcParent && rwParent && srcParent !== rwParent) {
        diffType = 'conflict';
        desc = `新增${roleLabel} ${name}，人网上级：${rwParent}，数据上级：${srcParent}，两者不一致`;
        suggested = rwParent; // 默认建议用人网
        conflictCount++;
      } else {
        diffType = 'new_person';
        suggested = srcParent || rwParent;
        desc = `新增${roleLabel}：${name}，上级：${suggested}`;
        newCount++;
      }
    } else if (inSystem && !inSource && !inRenwang) {
      // 系统有但两份数据都没有
      diffType = 'inactive';
      desc = `${roleLabel} ${name}（上级：${sysParent}）在上传数据中均未出现`;
      suggested = sysParent;
      inactiveCount++;
    } else if (inSystem && inSource && !inRenwang) {
      // 系统有，2026有，人网没有
      if (!srcParent) {
        diffType = 'missing_parent';
        desc = `${roleLabel} ${name} 在2026数据中上级为空，系统现有上级：${sysParent}`;
        suggested = sysParent;
        missingCount++;
      } else if (srcParent !== sysParent && sysParent) {
        diffType = 'conflict';
        desc = `${roleLabel} ${name} 上级不一致 — 系统：${sysParent}，2026数据：${srcParent}`;
        suggested = srcParent; // 默认建议用最新数据
        conflictCount++;
      } else {
        consistentCount++;
        continue; // 一致，不加入列表
      }
    } else if (inSystem && !inSource && inRenwang) {
      // 系统有，人网有，2026没有
      if (rwParent !== sysParent && rwParent && sysParent) {
        diffType = 'conflict';
        desc = `${roleLabel} ${name} 上级不一致 — 系统：${sysParent}，人网：${rwParent}`;
        suggested = rwParent;
        conflictCount++;
      } else {
        consistentCount++;
        continue;
      }
    } else if (inSystem && inSource && inRenwang) {
      // 三方都有
      const allSame = (!sysParent && !srcParent && !rwParent)
        || (sysParent === srcParent && sysParent === rwParent)
        || (sysParent === srcParent && !rwParent)
        || (sysParent === rwParent && !srcParent)
        || (!sysParent && srcParent === rwParent);

      if (!srcParent && sysParent) {
        // 2026数据缺失上级
        if (rwParent && rwParent !== sysParent) {
          diffType = 'conflict';
          desc = `${roleLabel} ${name} 2026数据上级为空，系统：${sysParent}，人网：${rwParent}`;
          suggested = rwParent;
          conflictCount++;
        } else {
          diffType = 'missing_parent';
          desc = `${roleLabel} ${name} 在2026数据中上级为空，系统/人网上级：${sysParent || rwParent}`;
          suggested = sysParent || rwParent;
          missingCount++;
        }
      } else if (srcParent && rwParent && srcParent !== rwParent) {
        // 人网和2026冲突
        diffType = 'conflict';
        desc = `${roleLabel} ${name} 人网上级：${rwParent}，2026数据上级：${srcParent}` +
          (sysParent && sysParent !== srcParent && sysParent !== rwParent ? `，系统现有：${sysParent}` : '');
        suggested = srcParent; // 默认用最新保单数据
        conflictCount++;
      } else if (srcParent && sysParent && srcParent !== sysParent) {
        // 2026数据与系统冲突（人网一致或空）
        diffType = 'conflict';
        desc = `${roleLabel} ${name} 上级变动 — 系统：${sysParent} → 2026数据：${srcParent}`;
        suggested = srcParent;
        conflictCount++;
      } else if (rwParent && sysParent && rwParent !== sysParent && !srcParent) {
        diffType = 'conflict';
        desc = `${roleLabel} ${name} 上级不一致 — 系统：${sysParent}，人网：${rwParent}`;
        suggested = rwParent;
        conflictCount++;
      } else {
        // 一致
        consistentCount++;
        continue;
      }
    } else {
      // 不应该到这里
      continue;
    }

    items.push({
      id: genDiffId(), name, code, role, roleLabel,
      system: sys, renwang: rw, source: src,
      diffType, diffDescription: desc,
      suggestedParent: suggested,
      confirmedParent: '',
      action: 'accept',
    });
  }

  // 按重要性排序：conflict > missing > new > inactive > renwang_only
  const typeOrder: Record<string, number> = {
    conflict: 0, missing_parent: 1, new_person: 2, renwang_only: 3, inactive: 4, consistent: 5,
  };
  items.sort((a, b) => (typeOrder[a.diffType] ?? 9) - (typeOrder[b.diffType] ?? 9));

  const totalItems = items.length;
  return {
    hasChanges: conflictCount > 0 || missingCount > 0 || newCount > 0 || inactiveCount > 0,
    totalItems,
    consistentCount,
    conflictCount,
    missingCount,
    newCount,
    inactiveCount,
    items,
  };
}
