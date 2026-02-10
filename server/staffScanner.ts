/**
 * 人员扫描引擎
 * 从上传的数据源中按月扫描人员信息，自动检测变动并更新组织架构
 * 
 * 核心逻辑：
 * 1. 按"保单签单日期"提取月份
 * 2. 按月扫描每条保单中的人员归属链：客户经理 → 营业部经理 → 总监
 * 3. 与组织架构中已有记录对比，检测新增、调岗等变动
 * 4. 自动更新组织架构
 */
import XLSX from 'xlsx';
import { safeStr, safeFloat } from './report/utils';
import { getSettingsData, updateSettings } from './settingsApi';

let idCounter = Date.now() + 500000; // offset to avoid collision
function genId(): string {
  return String(++idCounter);
}

interface StaffRecord {
  id: string;
  name: string;
  code: string;
  role: 'director' | 'deptManager' | 'customerManager';
  parentId: string;  // 上级的name（非id）
  status: 'active' | 'resigned' | 'transferred';
  month?: number;    // 生效月份，0=全年默认
}

interface ScannedPerson {
  name: string;
  code: string;
  role: 'director' | 'deptManager' | 'customerManager';
  parentName: string; // 上级姓名
  month: number;
}

interface ScanResult {
  added: { name: string; role: string; parentName: string; month: number }[];
  transferred: { name: string; role: string; oldParent: string; newParent: string; month: number }[];
  unchanged: number;
  totalScanned: number;
}

/**
 * 解析日期，支持多种格式
 */
function parseDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const s = String(val).trim();
  // Try yyyy-mm-dd, yyyy/mm/dd
  const m = s.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  // Try Excel serial number
  const n = Number(s);
  if (!isNaN(n) && n > 40000 && n < 60000) {
    const d = new Date((n - 25569) * 86400000);
    return d;
  }
  return null;
}

/**
 * 查找数据来源sheet
 */
function findSourceSheet(wb: XLSX.WorkBook): XLSX.WorkSheet | null {
  const candidates = ['数据来源', 'Sheet1', '保单明细'];
  for (const name of candidates) {
    if (wb.Sheets[name]) return wb.Sheets[name];
  }
  // 尝试第一个sheet
  if (wb.SheetNames.length > 0) return wb.Sheets[wb.SheetNames[0]];
  return null;
}

/**
 * 检测header行
 */
function detectHeaderRow(rawData: any[][]): number {
  const keywords = ['保单签单日期', '营业部经理', '客户经理', '新约保费'];
  for (let r = 0; r < Math.min(rawData.length, 15); r++) {
    const row = rawData[r];
    if (!row) continue;
    const rowStr = row.map((c: any) => String(c || '')).join('|');
    let matchCount = 0;
    for (const kw of keywords) {
      if (rowStr.includes(kw)) matchCount++;
    }
    if (matchCount >= 2) return r;
  }
  return 0;
}

// 列名映射（与dataSource.ts保持一致）
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

/**
 * 从数据源中按月扫描人员信息
 */
export function scanStaffFromSource(sourceBuffer: Buffer): ScanResult {
  const wb = XLSX.read(sourceBuffer, { type: 'buffer', cellDates: true });
  const ws = findSourceSheet(wb);
  if (!ws) {
    console.error('[StaffScanner] No valid sheet found');
    return { added: [], transferred: [], unchanged: 0, totalScanned: 0 };
  }

  const rawData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
  const headerRowIdx = detectHeaderRow(rawData);
  const headerRow = rawData[headerRowIdx] || [];

  // 构建列索引映射
  const colIndex: Record<string, number> = {};
  for (let c = 0; c < headerRow.length; c++) {
    const name = safeStr(headerRow[c]);
    if (name) {
      colIndex[name] = c;
      // 同时注册映射名
      if (COL_NAME_MAP[name]) {
        colIndex[COL_NAME_MAP[name]] = c;
      }
    }
  }

  // 重新读取原始数据（非日期模式）
  const rawDataRaw = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

  // 按月收集人员信息
  // key: `${month}|${role}|${name}` → ScannedPerson
  const monthlyStaff = new Map<string, ScannedPerson>();

  const getCol = (row: any[], name: string): any => {
    // 先尝试直接列名
    if (colIndex[name] !== undefined) return row[colIndex[name]];
    // 再尝试映射名
    for (const [alias, canonical] of Object.entries(COL_NAME_MAP)) {
      if (canonical === name && colIndex[alias] !== undefined) {
        return row[colIndex[alias]];
      }
    }
    return undefined;
  };

  const dataStartRow = headerRowIdx + 1;
  let totalScanned = 0;

  for (let r = dataStartRow; r < rawDataRaw.length; r++) {
    const row = rawDataRaw[r];
    if (!row || !row[0]) continue;

    // 获取保单签单日期 → 月份
    const dateVal = getCol(row, '保单签单日期');
    const date = parseDate(dateVal);
    if (!date) continue;
    const month = date.getMonth() + 1;

    // 提取人员信息
    const directorName = safeStr(getCol(row, '营业区总监'));
    const directorCode = safeStr(getCol(row, '营业区总监工号'));
    const mgrName = safeStr(getCol(row, '营业部经理名称'));
    const mgrCode = safeStr(getCol(row, '营业部经理工号'));
    const cmName = safeStr(getCol(row, '业绩归属客户经理姓名'));
    const cmCode = safeStr(getCol(row, '业绩归属客户经理工号'));

    totalScanned++;

    // 记录总监
    if (directorName) {
      const key = `${month}|director|${directorName}`;
      if (!monthlyStaff.has(key)) {
        monthlyStaff.set(key, {
          name: directorName,
          code: directorCode || '',
          role: 'director',
          parentName: '',
          month,
        });
      }
    }

    // 记录营业部经理
    if (mgrName) {
      const key = `${month}|deptManager|${mgrName}`;
      if (!monthlyStaff.has(key)) {
        monthlyStaff.set(key, {
          name: mgrName,
          code: mgrCode || '',
          role: 'deptManager',
          parentName: directorName || '',
          month,
        });
      }
    }

    // 记录客户经理
    if (cmName) {
      const key = `${month}|customerManager|${cmName}`;
      const existing = monthlyStaff.get(key);
      if (!existing) {
        monthlyStaff.set(key, {
          name: cmName,
          code: cmCode || '',
          role: 'customerManager',
          parentName: mgrName || '',
          month,
        });
      }
    }
  }

  console.log(`[StaffScanner] Scanned ${totalScanned} records, found ${monthlyStaff.size} unique person-month entries`);

  // 获取当前组织架构
  const settings = getSettingsData();
  const existingStaff: StaffRecord[] = settings.staff || [];

  // 构建现有人员的查找映射
  // key: `${role}|${name}` → 最新的记录（考虑月份）
  const existingByRoleName = new Map<string, StaffRecord[]>();
  for (const s of existingStaff) {
    const key = `${s.role}|${s.name}`;
    if (!existingByRoleName.has(key)) {
      existingByRoleName.set(key, []);
    }
    existingByRoleName.get(key)!.push(s);
  }

  const result: ScanResult = {
    added: [],
    transferred: [],
    unchanged: 0,
    totalScanned,
  };

  const newStaffEntries: StaffRecord[] = [];

  // 按月份排序处理
  const sortedEntries = Array.from(monthlyStaff.values()).sort((a, b) => a.month - b.month);

  for (const scanned of sortedEntries) {
    const key = `${scanned.role}|${scanned.name}`;
    const existingRecords = existingByRoleName.get(key);

    if (!existingRecords || existingRecords.length === 0) {
      // 新增人员
      const newEntry: StaffRecord = {
        id: genId(),
        name: scanned.name,
        code: scanned.code,
        role: scanned.role,
        parentId: scanned.parentName, // 存上级姓名
        status: 'active',
        month: scanned.month,
      };
      newStaffEntries.push(newEntry);
      
      // 更新查找映射
      existingByRoleName.set(key, [newEntry]);

      result.added.push({
        name: scanned.name,
        role: scanned.role,
        parentName: scanned.parentName,
        month: scanned.month,
      });
    } else {
      // 已存在的人员，检查上级是否变化
      // 找到该月或之前最近的有效记录
      const getEffectiveRecord = (records: StaffRecord[], month: number): StaffRecord | null => {
        // 先找该月的记录
        const monthRecord = records.find(r => (r.month || 0) === month);
        if (monthRecord) return monthRecord;
        // 找之前最近的记录
        let best: StaffRecord | null = null;
        for (const r of records) {
          const rm = r.month || 0;
          if (rm <= month) {
            if (!best || rm > (best.month || 0)) {
              best = r;
            }
          }
        }
        return best || records[0];
      };

      const effectiveRecord = getEffectiveRecord(existingRecords, scanned.month);
      
      if (effectiveRecord && scanned.parentName && effectiveRecord.parentId !== scanned.parentName) {
        // 上级变了 → 调岗
        // 检查是否已经有该月份的调岗记录
        const hasMonthRecord = existingRecords.some(r => (r.month || 0) === scanned.month);
        if (!hasMonthRecord) {
          // 在原部门添加"调出"记录
          const transferOutEntry: StaffRecord = {
            id: genId(),
            name: scanned.name,
            code: scanned.code || effectiveRecord.code,
            role: scanned.role,
            parentId: effectiveRecord.parentId,
            status: 'transferred',
            month: scanned.month,
          };
          newStaffEntries.push(transferOutEntry);

          // 在新部门添加"在职"记录
          const transferInEntry: StaffRecord = {
            id: genId(),
            name: scanned.name,
            code: scanned.code || effectiveRecord.code,
            role: scanned.role,
            parentId: scanned.parentName,
            status: 'active',
            month: scanned.month,
          };
          newStaffEntries.push(transferInEntry);

          // 更新查找映射
          existingRecords.push(transferOutEntry, transferInEntry);

          result.transferred.push({
            name: scanned.name,
            role: scanned.role,
            oldParent: effectiveRecord.parentId,
            newParent: scanned.parentName,
            month: scanned.month,
          });
        } else {
          result.unchanged++;
        }
      } else {
        // 上级没变或无上级信息
        // 如果现有记录缺少上级信息且扫描到了上级，补全
        if (effectiveRecord && !effectiveRecord.parentId && scanned.parentName) {
          effectiveRecord.parentId = scanned.parentName;
        }
        // 如果现有记录缺少工号且扫描到了工号，补全
        if (effectiveRecord && !effectiveRecord.code && scanned.code) {
          effectiveRecord.code = scanned.code;
        }
        result.unchanged++;
      }
    }
  }

  // 合并新记录到settings（通过updateSettings更新内存缓存并异步持久化）
  if (newStaffEntries.length > 0) {
    updateSettings(s => {
      s.staff = [...(s.staff || []), ...newStaffEntries];
    });
    console.log(`[StaffScanner] Updated organization: +${result.added.length} added, ${result.transferred.length} transferred, ${result.unchanged} unchanged`);
  } else {
    // 即使没有新增，也可能有补全的修改（如补全上级信息）
    updateSettings(s => {
      s.staff = existingStaff; // 写回可能被补全的记录
    });
    console.log(`[StaffScanner] No new staff changes, ${result.unchanged} unchanged`);
  }

  return result;
}

/**
 * 根据组织架构补全数据行中缺失的归属字段
 * 在processReport阶段调用，只补全空缺不覆盖已有值
 */
export function fillMissingAttribution(dataRows: any[], month?: number, renwangBuffer?: Buffer): void {
  const settings = getSettingsData();
  const staffList: StaffRecord[] = settings.staff || [];

  // 构建网点代码→营业部经理映射（从renwang数据）
  const networkToManager = new Map<string, string>();
  const networkToDirector = new Map<string, string>();
  if (renwangBuffer) {
    try {
      const wb = XLSX.read(renwangBuffer, { type: 'buffer' });
      // 尝试找到网点sheet
      let ws = wb.Sheets['网点'];
      if (!ws) {
        for (const name of wb.SheetNames) {
          if (name.includes('网点') || name.includes('代理')) {
            ws = wb.Sheets[name];
            break;
          }
        }
      }
      if (!ws && wb.SheetNames.length > 0) {
        ws = wb.Sheets[wb.SheetNames[0]];
      }
      if (ws) {
        const rows = XLSX.utils.sheet_to_json<any>(ws);
        for (const r of rows) {
          const code = safeStr(r['代理机构代码']);
          const mgr = safeStr(r['营业部经理姓名']);
          const dir = safeStr(r['营业区总监姓名']);
          if (code && mgr && mgr !== '#N/A') {
            networkToManager.set(code, mgr);
          }
          if (code && dir && dir !== '#N/A') {
            networkToDirector.set(code, dir);
          }
        }
        console.log(`[StaffScanner] Built network mapping: ${networkToManager.size} code→manager, ${networkToDirector.size} code→director`);
      }
    } catch (e) {
      console.error('[StaffScanner] Failed to parse renwang for network mapping:', e);
    }
  }

  // 构建有效人员映射（考虑月份）
  // 客户经理 → 营业部经理
  const cmToManager = new Map<string, string>();
  // 营业部经理 → 总监
  const mgrToDirector = new Map<string, string>();

  // 按角色和月份获取有效记录
  const getEffective = (name: string, role: string, targetMonth: number): StaffRecord | null => {
    const records = staffList.filter(s => s.name === name && s.role === role && s.status === 'active');
    if (records.length === 0) return null;
    
    // 找该月或之前最近的有效记录
    let best: StaffRecord | null = null;
    for (const r of records) {
      const rm = r.month || 0;
      if (rm === 0 || rm <= targetMonth) {
        if (!best || (r.month || 0) > (best.month || 0)) {
          best = r;
        }
      }
    }
    return best || records[0];
  };

  // 收集所有客户经理和营业部经理的有效归属
  const targetMonth = month || 12;
  
  for (const s of staffList) {
    if (s.status !== 'active') continue;
    if (s.role === 'customerManager' && s.parentId) {
      // 只设置最新的（或指定月份的）
      const sm = s.month || 0;
      if (sm === 0 || sm <= targetMonth) {
        const existing = cmToManager.get(s.name);
        if (!existing) {
          cmToManager.set(s.name, s.parentId);
        } else {
          // 如果有更具体月份的记录，使用更具体的
          const existingRecords = staffList.filter(r => r.name === s.name && r.role === 'customerManager' && r.status === 'active');
          const bestRecord = getEffective(s.name, 'customerManager', targetMonth);
          if (bestRecord) {
            cmToManager.set(s.name, bestRecord.parentId);
          }
        }
      }
    }
    if (s.role === 'deptManager' && s.parentId) {
      const sm = s.month || 0;
      if (sm === 0 || sm <= targetMonth) {
        mgrToDirector.set(s.name, s.parentId);
      }
    }
  }

  let filledMgr = 0;
  let filledDir = 0;

  for (const row of dataRows) {
    const cm = safeStr(row['业绩归属客户经理姓名']);
    const mgr = safeStr(row['营业部经理名称']);
    const director = safeStr(row['营业区总监']);
    const rowMonth = row['月'] || targetMonth;

    // 如果缺少营业部经理名称，通过客户经理查找
    if (!mgr && cm) {
      // 第1级：按该保单的月份查找有效归属
      const effectiveCm = getEffective(cm, 'customerManager', rowMonth);
      if (effectiveCm && effectiveCm.parentId) {
        row['营业部经理名称'] = effectiveCm.parentId;
        filledMgr++;
      } else if (cmToManager.has(cm)) {
        // 第2级：通过全局客户经理映射
        row['营业部经理名称'] = cmToManager.get(cm);
        filledMgr++;
      } else {
        // 第3级：通过网点代码映射（从renwang数据）
        const networkCode = safeStr(row['业绩归属网点代码']) || safeStr(row['代理机构代码']);
        if (networkCode && networkToManager.has(networkCode)) {
          row['营业部经理名称'] = networkToManager.get(networkCode);
          filledMgr++;
        }
      }
    }

    // 如果缺少营业区总监，通过营业部经理查找
    const finalMgr = safeStr(row['营业部经理名称']);
    if (!director && finalMgr) {
      const effectiveMgr = getEffective(finalMgr, 'deptManager', rowMonth);
      if (effectiveMgr && effectiveMgr.parentId) {
        row['营业区总监'] = effectiveMgr.parentId;
        filledDir++;
      } else if (mgrToDirector.has(finalMgr)) {
        row['营业区总监'] = mgrToDirector.get(finalMgr);
        filledDir++;
      }
    }
    // 如果仍然缺少总监，通过网点代码映射
    if (!safeStr(row['营业区总监'])) {
      const networkCode = safeStr(row['业绩归属网点代码']) || safeStr(row['代理机构代码']);
      if (networkCode && networkToDirector.has(networkCode)) {
        row['营业区总监'] = networkToDirector.get(networkCode);
        filledDir++;
      }
    }
  }

  if (filledMgr > 0 || filledDir > 0) {
    console.log(`[StaffScanner] Filled missing attribution: ${filledMgr} manager fields, ${filledDir} director fields`);
  }
}
