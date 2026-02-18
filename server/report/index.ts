/**
 * 银保数据自动化报表 - 主入口
 */
import { loadLookupTables } from './lookups';
import { generateDataSource } from './dataSource';
import { generateNetwork, generateHr } from './networkAndHr';
import { loadDailyList } from './dailyList';
import { generateDeptData } from './deptSheet';
import { generateChannelData } from './channelSheet';
import { DataRow, safeFloat, safeStr, LookupTables } from './utils';
import { fillMissingAttribution } from '../staffScanner';
import { checkDataIntegrity, IntegrityAlert } from '../dataIntegrity';
import { getSettingsData } from '../settingsApi';

export interface ReportResult {
  summary: {
    dataSourceCount: number;
    networkCount: number;
    hrCount: number;
    dailyCount: number;
    generatedAt: string;
    monthStart: number;
    monthEnd: number;
  };
  dataSource: DataRow[];
  network: DataRow[];
  hr: DataRow[];
  daily: DataRow[];
  dept: Record<string, any>;
  channel: Record<string, any>;
  tracking: Record<string, any>;
  coreNetwork: Record<string, any>;
  integrityAlert?: IntegrityAlert;
}

export function processReport(
  sourceBuffer: Buffer,
  renwangBuffer: Buffer,
  templateBuffer: Buffer,
  monthStart: number = 1,
  monthEnd: number = 1,
  dailyBuffer?: Buffer
): ReportResult {
  console.log('[Report] Loading lookup tables...');
  const lookups = loadLookupTables(templateBuffer);
  // 用 settings 中的 deptTargets 覆盖模板中的（用户可能已修改角色或目标）
  const settingsDeptTargets = getSettingsData().deptTargets;
  if (settingsDeptTargets && settingsDeptTargets.length > 0) {
    lookups.deptTargets.clear();
    for (const t of settingsDeptTargets) {
      lookups.deptTargets.set(t.deptName, { qjTarget: t.qjTarget || 0, dcTarget: t.dcTarget || 0 });
    }
    console.log(`[Report] Overrode deptTargets from settings (${settingsDeptTargets.length} entries)`);
  }

  console.log('[Report] Generating data source...');
  const dataRows = generateDataSource(sourceBuffer, lookups, monthStart, monthEnd);

  // [v1.0.3] 根据组织架构自动补全缺失的归属关系
  fillMissingAttribution(dataRows, monthEnd, renwangBuffer);
  console.log('[Report] Auto-filled missing attribution from org structure');

  console.log('[Report] Checking data integrity...');
  const integrityAlert = checkDataIntegrity(dataRows);
  if (integrityAlert.hasMissing) {
    console.log(`[Report] ⚠️ Data integrity alert: ${integrityAlert.totalMissing} records missing attribution`);
  }

  console.log('[Report] Generating network data...');
  const netRows = generateNetwork(renwangBuffer, dataRows, lookups, monthStart, monthEnd);

  console.log('[Report] Generating HR data...');
  const hrRows = generateHr(netRows, dataRows, lookups, monthStart, monthEnd);

  console.log('[Report] Loading daily list...');
  let dailyRows: DataRow[] = [];
  if (dailyBuffer) {
    dailyRows = loadDailyList(dailyBuffer, lookups);
  }

  console.log('[Report] Generating dept data...');
  const deptData = generateDeptData(hrRows, dataRows, netRows, lookups, monthStart, monthEnd, dailyRows);

  console.log('[Report] Generating channel data...');
  const channelData = generateChannelData(dataRows, netRows, hrRows, lookups, monthStart, monthEnd);

  console.log('[Report] Generating tracking data...');
  const trackingData = generateTrackingData(hrRows, dataRows, netRows, lookups, monthStart, monthEnd);

  console.log('[Report] Generating core network data...');
  const coreNetworkData = generateCoreNetworkData(dataRows, lookups, monthStart, monthEnd);

  console.log('[Report] Done!');

  return {
    summary: {
      dataSourceCount: dataRows.length,
      networkCount: netRows.length,
      hrCount: hrRows.length,
      dailyCount: dailyRows.length,
      generatedAt: new Date().toISOString(),
      monthStart,
      monthEnd,
    },
    dataSource: dataRows,
    network: netRows,
    hr: hrRows,
    daily: dailyRows,
    dept: deptData,
    channel: channelData,
    tracking: trackingData,
    coreNetwork: coreNetworkData,
    integrityAlert,
  };
}

function generateTrackingData(
  hrRows: DataRow[],
  dataRows: DataRow[],
  netRows: DataRow[],
  lookups: LookupTables,
  monthStart: number,
  monthEnd: number
): Record<string, any> {
  // Group HR by dept
  const deptHr: Record<string, DataRow[]> = {};
  for (const hr of hrRows) {
    const dept = safeStr(hr['营业部']);
    if (!dept) continue;
    if (!deptHr[dept]) deptHr[dept] = [];
    deptHr[dept].push(hr);
  }

  // Sort each dept by 期交保费 desc
  for (const dept of Object.keys(deptHr)) {
    deptHr[dept].sort((a, b) => safeFloat(b['期交保费']) - safeFloat(a['期交保费']));
  }

  // Get dept order from targets
  const deptOrder: string[] = [];
  for (const name of Array.from(lookups.deptTargets.keys())) {
    const target = lookups.deptTargets.get(name)!;
    if (target.qjTarget > 0 || target.dcTarget > 0) {
      deptOrder.push(name);
    }
  }

  const groups = deptOrder.map(dept => ({
    deptName: dept,
    members: (deptHr[dept] || []).map(hr => ({
      name: safeStr(hr['姓名']),
      qjbf: safeFloat(hr['期交保费']),
      feiyouQj: safeFloat(hr['非邮期交']),
      guibao: safeFloat(hr['规保']),
      jzdc: safeFloat(hr['价值趸']),
      gmdc: safeFloat(hr['规模趸']),
      bb: safeFloat(hr['期交标保']),
      js: safeFloat(hr['件数']),
      feiyouJs: safeFloat(hr['非邮件数']),
      wdTotal: safeFloat(hr['网点总数']),
      feiyouWd: safeFloat(hr['非邮政网点']),
      activeWd: safeFloat(hr['活动网点']),
      wuliWd: safeFloat(hr['物理网点']),
      wuliActive: safeFloat(hr['活动物理']),
    })),
  }));

  return { groups };
}

function generateCoreNetworkData(
  dataRows: DataRow[],
  lookups: LookupTables,
  monthStart: number,
  monthEnd: number
): Record<string, any> {
  // Monthly premium by network
  const wdMonth: Record<string, Record<number, number>> = {};
  const wdJs: Record<string, number> = {};

  for (const row of dataRows) {
    const m = safeStr(row['业绩归属网点名称']);
    const bo = row['月'];
    const s = safeStr(row['缴费间隔']);
    if (m && bo && s === '年交') {
      const bq = safeFloat(row['期交保费']);
      if (!wdMonth[m]) wdMonth[m] = {};
      wdMonth[m][bo] = (wdMonth[m][bo] || 0) + bq;
      wdJs[m] = (wdJs[m] || 0) + 1;
    }
  }

  const networks = lookups.coreNetworks.map((cn: any) => {
    const wdName = cn.agencyName;
    const months: Record<number, number> = {};
    let total = 0;
    let monthsActive = 0;
    for (let m = 1; m <= 12; m++) {
      const v = wdMonth[wdName]?.[m] || 0;
      months[m] = v;
      total += v;
      if (v > 0) monthsActive++;
    }
    return {
      totalBankName: cn.totalBankName,
      networkCode: cn.networkCode,
      agencyName: wdName,
      customerManager: cn.customerManager,
      deptManager: cn.deptManager,
      areaDirector: cn.areaDirector,
      coreNetwork: cn.coreNetwork,
      months,
      total,
      js: wdJs[wdName] || 0,
      monthsActive,
    };
  });

  return { networks };
}
