/**
 * 银保数据自动化报表 - 查找表加载
 * 从模板文件(各数据表格.xlsx)中加载折标系数、产品简称、网点简称等查找表
 */
import XLSX from 'xlsx';
import { normalizeName, safeFloat, safeStr, LookupTables } from './utils';

export function loadLookupTables(templateBuffer: Buffer): LookupTables {
  const wb = XLSX.read(templateBuffer, { type: 'buffer' });

  // ===== 后台数据 Sheet =====
  const wsBackend = wb.Sheets['后台数据'];
  const backendData = XLSX.utils.sheet_to_json<any[]>(wsBackend, { header: 1 });

  // 折标系数表 (N=14, O=15, P=16 列, 0-indexed: 13,14,15)
  const zbTable = new Map<string, number>();
  for (let r = 1; r < backendData.length; r++) {
    const row = backendData[r];
    if (!row) continue;
    const xz = row[13]; // N列: 险种
    const nl = row[14]; // O列: 年限
    const zb = row[15]; // P列: 折标系数
    if (xz && zb !== undefined && zb !== null) {
      const key = `${normalizeName(xz)}|${nl}`;
      zbTable.set(key, safeFloat(zb));
    }
  }

  // 产品简称表 (AA=27, AB=28 列, 0-indexed: 26,27)
  const productShort = new Map<string, string>();
  for (let r = 1; r < backendData.length; r++) {
    const row = backendData[r];
    if (!row) continue;
    const aa = row[26]; // AA列
    const ab = row[27]; // AB列
    if (aa && ab) {
      productShort.set(normalizeName(aa), safeStr(ab));
    }
  }

  // 方案保费产品
  const fangan1 = new Set<string>();
  const fangan05 = new Set<string>();
  for (const r of [3, 4, 6]) { // 0-indexed rows for rows 4,5,7
    const row = backendData[r];
    if (row && row[27]) fangan1.add(safeStr(row[27]));
  }
  const row8 = backendData[7]; // 0-indexed row 7 = row 8
  if (row8 && row8[27]) fangan05.add(safeStr(row8[27]));

  // 职级表 (G=7, H=8 列, 0-indexed: 6,7)
  const zhijiTable = new Map<string, string>();
  for (let r = 1; r < backendData.length; r++) {
    const row = backendData[r];
    if (!row) continue;
    const g = row[6]; // G列
    const h = row[7]; // H列
    if (g && h) {
      zhijiTable.set(safeStr(g), safeStr(h));
    }
  }

  // 维持标保表 (K=11, L=12 列, 0-indexed: 10,11)
  const weichiTable = new Map<string, number>();
  for (let r = 1; r < backendData.length; r++) {
    const row = backendData[r];
    if (!row) continue;
    const k = row[10]; // K列
    const l = row[11]; // L列
    if (k && l !== undefined && l !== null) {
      weichiTable.set(safeStr(k), safeFloat(l));
    }
  }

  // 营业部目标 (W=23, X=24, Y=25 列, 0-indexed: 22,23,24)
  const deptTargets = new Map<string, { qjTarget: number; dcTarget: number }>();
  for (let r = 1; r < backendData.length; r++) {
    const row = backendData[r];
    if (!row) continue;
    const w = row[22]; // W列
    const x = row[23]; // X列
    const y = row[24]; // Y列
    if (w) {
      deptTargets.set(safeStr(w), {
        qjTarget: safeFloat(x),
        dcTarget: safeFloat(y),
      });
    }
  }

  // 产品全名 (用于追踪报表)
  const productNames: Record<string, string> = {
    '福享': safeStr(backendData[37]?.[13]),
    '佑享': safeStr(backendData[44]?.[13]),
    '乐享': safeStr(backendData[45]?.[13]),
    '久盛': safeStr(backendData[15]?.[13]),
  };

  // ===== 网点简称 Sheet =====
  const wsWdjc = wb.Sheets['网点简称'];
  const wdjcData = XLSX.utils.sheet_to_json<any[]>(wsWdjc, { header: 1 });
  const wdjcB = new Map<string, string>();
  for (let r = 1; r < wdjcData.length; r++) {
    const row = wdjcData[r];
    if (!row) continue;
    const a = row[0]; // A列
    const b = row[1]; // B列
    if (a && b) {
      wdjcB.set(safeStr(a), safeStr(b));
    }
  }

  // ===== 核心网点 Sheet =====
  const wsCore = wb.Sheets['核心网点'];
  const coreData = XLSX.utils.sheet_to_json<any[]>(wsCore, { header: 1 });
  const coreNetworks: LookupTables['coreNetworks'] = [];
  for (let r = 1; r < coreData.length; r++) {
    const row = coreData[r];
    if (!row || !row[2]) continue;
    coreNetworks.push({
      totalBankName: safeStr(row[0]),
      networkCode: safeStr(row[1]),
      agencyName: safeStr(row[2]),
      customerManager: safeStr(row[3]),
      deptManager: safeStr(row[4]),
      areaDirector: safeStr(row[5]),
      coreNetwork: row[6],
    });
  }

  return {
    zbTable,
    productShort,
    fangan1,
    fangan05,
    wdjcB,
    zhijiTable,
    weichiTable,
    deptTargets,
    productNames,
    coreNetworks,
  };
}
