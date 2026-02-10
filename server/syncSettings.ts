/**
 * 数据同步模块
 * 上传Excel后自动将组织架构、目标、产品简称、折标系数等数据同步到系统设置
 */
import XLSX from 'xlsx';
import { normalizeName, safeFloat, safeStr } from './report/utils';
import { getSettingsData } from './settingsApi';
import { storagePut } from './storage';

const S3_SETTINGS_KEY = 'yinbao-data/settings.json';

let idCounter = Date.now() + 100000; // offset to avoid collision with settingsApi
function genId(): string {
  return String(++idCounter);
}

function saveSettings(settings: any) {
  const json = JSON.stringify(settings, null, 2);
  storagePut(S3_SETTINGS_KEY, json, 'application/json').catch(e => {
    console.error('[SyncSettings] Failed to save to S3:', e);
  });
}

/**
 * 从模板文件（各数据表格.xlsx）同步配置数据到系统设置
 */
export function syncFromTemplate(templateBuffer: Buffer) {
  const wb = XLSX.read(templateBuffer, { type: 'buffer' });
  const settings = getSettingsData();

  // ===== 后台数据 Sheet =====
  const wsBackend = wb.Sheets['后台数据'];
  if (!wsBackend) return;
  const backendData = XLSX.utils.sheet_to_json<any[]>(wsBackend, { header: 1 });

  // 1. 折标系数 (N=13, O=14, P=15 列)
  if (settings.zhebiaoCofs.length === 0) {
    const zhebiaoCofs: any[] = [];
    for (let r = 1; r < backendData.length; r++) {
      const row = backendData[r];
      if (!row) continue;
      const xz = row[13];
      const nl = row[14];
      const zb = row[15];
      if (xz && zb !== undefined && zb !== null) {
        zhebiaoCofs.push({
          id: genId(),
          xianzhong: safeStr(xz),
          nianxian: safeStr(nl),
          xishu: safeFloat(zb),
        });
      }
    }
    if (zhebiaoCofs.length > 0) settings.zhebiaoCofs = zhebiaoCofs;
  }

  // 2. 产品简称 (AA=26, AB=27 列)
  if (settings.productShorts.length === 0) {
    const productShorts: any[] = [];
    for (let r = 1; r < backendData.length; r++) {
      const row = backendData[r];
      if (!row) continue;
      const aa = row[26];
      const ab = row[27];
      if (aa && ab) {
        // 判断方案分类
        let category = 'normal';
        if ([3, 4, 6].includes(r) && ab) category = 'fangan1';
        if (r === 7 && ab) category = 'fangan05';
        productShorts.push({
          id: genId(),
          fullName: normalizeName(aa),
          shortName: safeStr(ab),
          category,
        });
      }
    }
    if (productShorts.length > 0) settings.productShorts = productShorts;
  }

  // 3. 职级与维持标保
  // 职级表 (G=6, H=7 列)
  if (settings.personTargets.length === 0) {
    const zhijiMap = new Map<string, string>();
    for (let r = 1; r < backendData.length; r++) {
      const row = backendData[r];
      if (!row) continue;
      const g = row[6];
      const h = row[7];
      if (g && h) {
        zhijiMap.set(safeStr(g), safeStr(h));
      }
    }

    // 维持标保表 (K=10, L=11 列)
    const weichiMap = new Map<string, number>();
    for (let r = 1; r < backendData.length; r++) {
      const row = backendData[r];
      if (!row) continue;
      const k = row[10];
      const l = row[11];
      if (k && l !== undefined && l !== null) {
        weichiMap.set(safeStr(k), safeFloat(l));
      }
    }

    const personTargets: any[] = [];
    for (const [name, zhiji] of Array.from(zhijiMap.entries())) {
      personTargets.push({
        id: genId(),
        name,
        zhiji,
        weichi: weichiMap.get(zhiji) || 0,
      });
    }
    if (personTargets.length > 0) settings.personTargets = personTargets;
  }

  // 4. 营业部目标 (W=22, X=23, Y=24 列)
  if (settings.deptTargets.length === 0) {
    const deptTargets: any[] = [];
    for (let r = 1; r < backendData.length; r++) {
      const row = backendData[r];
      if (!row) continue;
      const w = row[22];
      const x = row[23];
      const y = row[24];
      if (w) {
        deptTargets.push({
          id: genId(),
          deptName: safeStr(w),
          month: 0, // 全年
          qjTarget: safeFloat(x),
          dcTarget: safeFloat(y),
        });
      }
    }
    if (deptTargets.length > 0) settings.deptTargets = deptTargets;
  }

  // ===== 网点简称 Sheet =====
  if (settings.networkShorts.length === 0) {
    const wsWdjc = wb.Sheets['网点简称'];
    if (wsWdjc) {
      const wdjcData = XLSX.utils.sheet_to_json<any[]>(wsWdjc, { header: 1 });
      const networkShorts: any[] = [];
      for (let r = 1; r < wdjcData.length; r++) {
        const row = wdjcData[r];
        if (!row) continue;
        const a = row[0];
        const b = row[1];
        if (a && b) {
          networkShorts.push({
            id: genId(),
            fullName: safeStr(a),
            shortName: safeStr(b),
          });
        }
      }
      if (networkShorts.length > 0) settings.networkShorts = networkShorts;
    }
  }

  // ===== 核心网点 Sheet =====
  if (settings.coreNetworks.length === 0) {
    const wsCore = wb.Sheets['核心网点'];
    if (wsCore) {
      const coreData = XLSX.utils.sheet_to_json<any[]>(wsCore, { header: 1 });
      const coreNetworks: any[] = [];
      for (let r = 1; r < coreData.length; r++) {
        const row = coreData[r];
        if (!row || !row[2]) continue;
        coreNetworks.push({
          id: genId(),
          totalBankName: safeStr(row[0]),
          networkCode: safeStr(row[1]),
          agencyName: safeStr(row[2]),
          customerManager: safeStr(row[3]),
          deptManager: safeStr(row[4]),
          areaDirector: safeStr(row[5]),
          coreNetwork: safeStr(row[6]) || '是',
        });
      }
      if (coreNetworks.length > 0) settings.coreNetworks = coreNetworks;
    }
  }

  saveSettings(settings);
  console.log('[Sync] Template data synced to settings');
}

/**
 * 从人网数据同步组织架构到系统设置
 */
export function syncFromRenwang(renwangBuffer: Buffer) {
  const wb = XLSX.read(renwangBuffer, { type: 'buffer' });
  const ws = wb.Sheets['Sheet1'];
  if (!ws) return;

  const rawData = XLSX.utils.sheet_to_json<any>(ws);
  const settings = getSettingsData();

  // 只在组织架构为空时同步
  if (settings.staff.length === 0) {
    const directors = new Map<string, { code: string; name: string }>();
    const deptManagers = new Map<string, { code: string; name: string; parent: string }>();
    const customerManagers = new Map<string, { code: string; name: string; parent: string }>();

    for (const rw of rawData) {
      if (!rw['代理机构名称']) continue;

      const dirCode = safeStr(rw['营业区总监工号']);
      const dirName = safeStr(rw['营业区总监姓名']);
      const deptCode = safeStr(rw['营业部经理工号']);
      const deptName = safeStr(rw['营业部经理姓名']);
      const cmCode = safeStr(rw['客户经理工号']);
      const cmName = safeStr(rw['客户经理姓名']);

      if (dirCode && dirName && !directors.has(dirCode)) {
        directors.set(dirCode, { code: dirCode, name: dirName });
      }
      if (deptCode && deptName && !deptManagers.has(deptCode)) {
        deptManagers.set(deptCode, { code: deptCode, name: deptName, parent: dirName });
      }
      if (cmCode && cmName && !customerManagers.has(cmCode)) {
        customerManagers.set(cmCode, { code: cmCode, name: cmName, parent: deptName });
      }
    }

    const staff: any[] = [];

    for (const [, d] of Array.from(directors)) {
      staff.push({
        id: genId(),
        name: d.name,
        code: d.code,
        role: 'director',
        parentId: '',
        status: 'active',
      });
    }

    for (const [, dm] of Array.from(deptManagers)) {
      staff.push({
        id: genId(),
        name: dm.name,
        code: dm.code,
        role: 'deptManager',
        parentId: dm.parent,
        status: 'active',
      });
    }

    for (const [, cm] of Array.from(customerManagers)) {
      staff.push({
        id: genId(),
        name: cm.name,
        code: cm.code,
        role: 'customerManager',
        parentId: cm.parent,
        status: 'active',
      });
    }

    if (staff.length > 0) {
      settings.staff = staff;
      saveSettings(settings);
      console.log(`[Sync] Organization structure synced: ${directors.size} directors, ${deptManagers.size} dept managers, ${customerManagers.size} customer managers`);
    }
  }
}
