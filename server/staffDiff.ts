/**
 * 人事结构三方交叉对比引擎
 * [v2.0.0] 系统现有组织架构 vs 人网数据 vs 2026数据
 *
 * 改进：
 * - 新增 'resigned'（疑似离职）：系统有但人网和2026数据都没有
 * - 新增 'transferred'（调岗）：上级发生变更
 * - inactive 项默认建议标记离职
 * - 更清晰的差异描述
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
    | 'conflict'           // 存在冲突（上级不同，非调岗）
    | 'transferred'        // 调岗（上级发生变更，有明确新上级）
    | 'missing_parent'     // 2026数据中上级为空
    | 'new_person'         // 新增人员（系统中没有）
    | 'resigned'           // 疑似离职（系统有，人网和2026都没有）
    | 'inactive'           // 系统中有但部分数据中未出现（仍在人网或仍有保单）
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
  transferredCount: number;
  missingCount: number;
  newCount: number;
  resignedCount: number;
  inactiveCount: number;
  latestMonth: number;       // 数据中的最新月份
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
    // 只对比在职人员
    if (s.status === 'resigned') continue;
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

  const hasSource = sourceMap.size > 0;
  const hasRenwang = renwangMap.size > 0;

  // 计算2026数据中的最新月份
  let latestMonth = 0;
  for (const p of sourceMap.values()) {
    for (const m of p.months) {
      if (m > latestMonth) latestMonth = m;
    }
  }

  // 收集所有人员 key
  const allKeys = new Set<string>();
  for (const k of systemMap.keys()) allKeys.add(k);
  for (const k of sourceMap.keys()) allKeys.add(k);
  for (const k of renwangMap.keys()) allKeys.add(k);

  const items: DiffItem[] = [];
  let consistentCount = 0;
  let conflictCount = 0;
  let transferredCount = 0;
  let missingCount = 0;
  let newCount = 0;
  let resignedCount = 0;
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
      if (!sys && src && !rw) {
        // 总监仅在2026数据中有，人网没有 → 疑似已离职
        items.push({
          id: genDiffId(), name, code, role, roleLabel,
          system: sys, renwang: rw, source: src,
          diffType: 'resigned',
          diffDescription: `${roleLabel} ${name} 仅在历史保单数据中出现，人网中已不存在，疑似已离职`,
          suggestedParent: '',
          confirmedParent: '',
          action: 'modify',
        });
        resignedCount++;
      } else if (!sys && (src || rw)) {
        // 新增总监（人网中有）
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
      } else if (sys && !src && !rw) {
        // 总监在系统中有但数据中都没有 → 疑似离职
        items.push({
          id: genDiffId(), name, code, role, roleLabel,
          system: sys, renwang: rw, source: src,
          diffType: 'resigned',
          diffDescription: `${roleLabel} ${name} 在人网和业务数据中均未出现，疑似已离职`,
          suggestedParent: sys.parent,
          confirmedParent: '',
          action: 'modify', // 默认建议标记离职
        });
        resignedCount++;
      } else if (sys && !rw && src) {
        // 总监在系统和2026数据中有，但人网没有
        items.push({
          id: genDiffId(), name, code, role, roleLabel,
          system: sys, renwang: rw, source: src,
          diffType: 'inactive',
          diffDescription: `${roleLabel} ${name} 在人网中未出现，但仍有业务数据`,
          suggestedParent: sys.parent,
          confirmedParent: '',
          action: 'accept',
        });
        inactiveCount++;
      } else if (sys && rw && !src) {
        // 总监在系统和人网中有，但2026数据没有 → 正常（可能只是没出单）
        consistentCount++;
      } else {
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
    let defaultAction: DiffItem['action'] = 'accept';

    const inSystem = !!sys;
    const inSource = !!src;
    const inRenwang = !!rw;

    if (!inSystem && !inSource && inRenwang) {
      // 仅人网中有 → 新增人员
      diffType = 'renwang_only';
      desc = `${roleLabel} ${name} 仅在人网数据中存在，上级：${rwParent || '无'}`;
      suggested = rwParent;
      newCount++;
    } else if (!inSystem && inSource && !inRenwang) {
      // 系统没有 + 人网没有 + 仅2026数据有 → 疑似已离职（仅历史保单中存在）
      const srcMonthsR = src?.months || [];
      const monthHintR = srcMonthsR.length > 0 ? `（出单月份：${srcMonthsR.join('、')}月）` : '';
      diffType = 'resigned';
      desc = `${roleLabel} ${name} 仅在历史保单数据中出现${monthHintR}，人网中已不存在，疑似已离职（原上级：${srcParent || '无'}）`;
      suggested = srcParent;
      defaultAction = 'modify'; // 默认建议标记离职
      resignedCount++;
    } else if (!inSystem && inSource && inRenwang) {
      // 人网和2026都有，系统没有 → 新增
      if (srcParent && rwParent && srcParent !== rwParent) {
        diffType = 'conflict';
        desc = `新增${roleLabel} ${name}，人网上级：${rwParent}，数据上级：${srcParent}，两者不一致`;
        suggested = rwParent;
        conflictCount++;
      } else {
        diffType = 'new_person';
        suggested = srcParent || rwParent;
        desc = `新增${roleLabel}：${name}，上级：${suggested}`;
        newCount++;
      }
    } else if (inSystem && !inSource && !inRenwang) {
      // ★ 系统有但两份数据都没有 → 疑似离职
      diffType = 'resigned';
      desc = `${roleLabel} ${name}（现上级：${sysParent}）在人网和业务数据中均未出现，疑似已离职`;
      suggested = sysParent;
      defaultAction = 'modify'; // 默认建议标记离职
      resignedCount++;
    } else if (inSystem && inSource && !inRenwang) {
      // 系统有，2026有，人网没有
      const srcMonths = src?.months || [];
      const notInLatest = latestMonth > 0 && !srcMonths.includes(latestMonth);
      const monthHint = srcMonths.length > 0 ? `（出单月份：${srcMonths.join('、')}月）` : '';

      if (notInLatest) {
        // 人网没有 + 最新月份无数据 → 疑似离职
        diffType = 'resigned';
        desc = `${roleLabel} ${name} 人网中已不存在，且${latestMonth}月无业务数据${monthHint}，疑似已离职（原上级：${sysParent}）`;
        suggested = sysParent;
        defaultAction = 'modify';
        resignedCount++;
      } else if (!srcParent) {
        diffType = 'missing_parent';
        desc = `${roleLabel} ${name} 在2026数据中上级为空，系统现有上级：${sysParent}${monthHint}`;
        suggested = sysParent;
        missingCount++;
      } else if (srcParent !== sysParent && sysParent) {
        // 上级变更 → 调岗
        diffType = 'transferred';
        desc = `${roleLabel} ${name} 疑似调岗 — 原上级：${sysParent} → 新上级：${srcParent}（人网中未出现）${monthHint}`;
        suggested = srcParent;
        transferredCount++;
      } else {
        consistentCount++;
        continue;
      }
    } else if (inSystem && !inSource && inRenwang) {
      // 系统有，人网有，2026没有
      if (rwParent !== sysParent && rwParent && sysParent) {
        // 人网上级与系统不同 → 调岗
        diffType = 'transferred';
        desc = `${roleLabel} ${name} 疑似调岗 — 原上级：${sysParent} → 人网上级：${rwParent}`;
        suggested = rwParent;
        transferredCount++;
      } else {
        consistentCount++;
        continue;
      }
    } else if (inSystem && inSource && inRenwang) {
      // 三方都有
      const srcMonths3 = src?.months || [];
      const notInLatest3 = latestMonth > 0 && !srcMonths3.includes(latestMonth);
      const monthHint3 = srcMonths3.length > 0 ? `（出单月份：${srcMonths3.join('、')}月）` : '';

      if (!srcParent && sysParent) {
        // 2026数据缺失上级
        if (rwParent && rwParent !== sysParent) {
          // 人网上级与系统不同 → 调岗
          diffType = 'transferred';
          desc = `${roleLabel} ${name} 疑似调岗 — 原上级：${sysParent} → 人网上级：${rwParent}（2026数据上级为空）`;
          suggested = rwParent;
          transferredCount++;
        } else {
          diffType = 'missing_parent';
          desc = `${roleLabel} ${name} 在2026数据中上级为空，系统/人网上级：${sysParent || rwParent}`;
          suggested = sysParent || rwParent;
          missingCount++;
        }
      } else if (srcParent && rwParent && srcParent !== rwParent) {
        // 人网和2026冲突
        if (srcParent === sysParent) {
          // 2026和系统一致，人网不同 → 人网调岗
          diffType = 'transferred';
          desc = `${roleLabel} ${name} 疑似调岗 — 系统/数据上级：${sysParent} → 人网上级：${rwParent}`;
          suggested = rwParent; // 建议用人网（最新）
          transferredCount++;
        } else if (rwParent === sysParent) {
          // 人网和系统一致，2026不同 → 2026数据调岗
          diffType = 'transferred';
          desc = `${roleLabel} ${name} 疑似调岗 — 原上级：${sysParent} → 数据上级：${srcParent}`;
          suggested = srcParent;
          transferredCount++;
        } else {
          // 三方都不同
          diffType = 'conflict';
          desc = `${roleLabel} ${name} 上级三方不一致 — 系统：${sysParent}，人网：${rwParent}，数据：${srcParent}`;
          suggested = rwParent; // 默认用人网
          conflictCount++;
        }
      } else if (srcParent && sysParent && srcParent !== sysParent) {
        // 2026数据与系统冲突（人网一致或空）→ 调岗
        diffType = 'transferred';
        desc = `${roleLabel} ${name} 疑似调岗 — 原上级：${sysParent} → 新上级：${srcParent}`;
        suggested = srcParent;
        transferredCount++;
      } else if (rwParent && sysParent && rwParent !== sysParent && !srcParent) {
        // 人网与系统不同 → 调岗
        diffType = 'transferred';
        desc = `${roleLabel} ${name} 疑似调岗 — 原上级：${sysParent} → 人网上级：${rwParent}`;
        suggested = rwParent;
        transferredCount++;
      } else if (notInLatest3) {
        // 三方上级一致，但最新月份无业务数据 → 提示关注
        diffType = 'inactive';
        desc = `${roleLabel} ${name} ${latestMonth}月无业务数据${monthHint3}，人网仍在（上级：${sysParent}）`;
        suggested = sysParent;
        inactiveCount++;
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
      action: defaultAction,
    });
  }

  // 按重要性排序：resigned > transferred > conflict > missing > new > renwang_only > inactive
  const typeOrder: Record<string, number> = {
    resigned: 0, transferred: 1, conflict: 2, missing_parent: 3, new_person: 4, renwang_only: 5, inactive: 6, consistent: 7,
  };
  items.sort((a, b) => (typeOrder[a.diffType] ?? 9) - (typeOrder[b.diffType] ?? 9));

  const totalItems = items.length;
  return {
    hasChanges: resignedCount > 0 || transferredCount > 0 || conflictCount > 0 || missingCount > 0 || newCount > 0 || inactiveCount > 0,
    totalItems,
    consistentCount,
    conflictCount,
    transferredCount,
    missingCount,
    newCount,
    resignedCount,
    inactiveCount,
    latestMonth,
    items,
  };
}
