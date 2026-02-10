/**
 * 银保数据自动化报表 - 渠道Sheet生成
 * 7个小表格：
 * 1. 业务数据—渠道（保费、渠道占比、网点数量、开单网点、网活率、网均产量）
 * 2. 渠道产品分布（各银行渠道×各产品的年交保费矩阵）
 * 3. 年交月度趋势（各银行渠道×1-12月的年交保费矩阵）
 * 4. 业务数据—产品（各产品全名的年交、占比、3年、5年、趸交）
 * 5. 趸交产品数据（趸交产品的月度保费）
 * 6. 网点数据—开单网点（各银行渠道×各营业部经理的网点数和开单网点数）
 * 7. 网点业绩明细（每个网点的业绩、目标、完成情况）
 */
import { safeFloat, safeStr, LookupTables, DataRow } from './utils';

export function generateChannelData(
  dataRows: DataRow[],
  netRows: DataRow[],
  hrRows: DataRow[],
  lookups: LookupTables,
  monthStart: number,
  monthEnd: number
): Record<string, any> {

  // ===== 小表1: 业务数据—渠道 =====
  // 按银行总行汇总：年交、趸交、总保费
  const bankQj: Record<string, number> = {};
  const bankDc: Record<string, number> = {};
  const bankTotal: Record<string, number> = {};

  for (const row of dataRows) {
    const bank = safeStr(row['银行总行']);
    if (!bank) continue;
    const s = safeStr(row['缴费间隔']);
    const aj = safeFloat(row['新约保费']);
    if (s === '年交') {
      bankQj[bank] = (bankQj[bank] || 0) + aj;
    } else if (s === '趸交') {
      bankDc[bank] = (bankDc[bank] || 0) + aj;
    }
    bankTotal[bank] = (bankTotal[bank] || 0) + aj;
  }

  // 网点统计（从 netRows）
  const bankNetTotal: Record<string, number> = {};
  const bankNetActive: Record<string, number> = {};
  for (const nr of netRows) {
    const bank = safeStr(nr['总行名称']);
    if (!bank) continue;
    bankNetTotal[bank] = (bankNetTotal[bank] || 0) + 1;
    if (safeFloat(nr['年交']) > 0) {
      bankNetActive[bank] = (bankNetActive[bank] || 0) + 1;
    }
  }

  // 按总保费排序的银行列表
  const allBanks = new Set([...Object.keys(bankQj), ...Object.keys(bankDc), ...Object.keys(bankNetTotal)]);
  const bankList = Array.from(allBanks).sort((a, b) => (bankTotal[b] || 0) - (bankTotal[a] || 0));
  const grandTotalBf = bankList.reduce((s, b) => s + (bankQj[b] || 0), 0);

  const channelSummary = bankList.map(bank => ({
    name: bank,
    baofei: bankQj[bank] || 0,
    ratio: grandTotalBf > 0 ? (bankQj[bank] || 0) / grandTotalBf : 0,
    netTotal: bankNetTotal[bank] || 0,
    netActive: bankNetActive[bank] || 0,
    netActiveRate: (bankNetTotal[bank] || 0) > 0 ? (bankNetActive[bank] || 0) / (bankNetTotal[bank] || 0) : 0,
    netAvgOutput: (bankNetTotal[bank] || 0) > 0 ? (bankQj[bank] || 0) / (bankNetTotal[bank] || 0) : 0,
  }));

  const channelSummaryTotals = {
    baofei: channelSummary.reduce((s, c) => s + c.baofei, 0),
    netTotal: channelSummary.reduce((s, c) => s + c.netTotal, 0),
    netActive: channelSummary.reduce((s, c) => s + c.netActive, 0),
    netActiveRate: channelSummary.reduce((s, c) => s + c.netTotal, 0) > 0
      ? channelSummary.reduce((s, c) => s + c.netActive, 0) / channelSummary.reduce((s, c) => s + c.netTotal, 0)
      : 0,
    netAvgOutput: channelSummary.reduce((s, c) => s + c.netTotal, 0) > 0
      ? channelSummary.reduce((s, c) => s + c.baofei, 0) / channelSummary.reduce((s, c) => s + c.netTotal, 0)
      : 0,
  };

  // 趸交维度的渠道汇总
  const grandTotalDc = bankList.reduce((s, b) => s + (bankDc[b] || 0), 0);

  // 趸交开单网点统计
  const bankNetActiveDc: Record<string, number> = {};
  for (const nr of netRows) {
    const bank = safeStr(nr['总行名称']);
    if (!bank) continue;
    if (safeFloat(nr['趸交']) > 0) {
      bankNetActiveDc[bank] = (bankNetActiveDc[bank] || 0) + 1;
    }
  }

  const channelSummaryDc = bankList.map(bank => ({
    name: bank,
    baofei: bankDc[bank] || 0,
    ratio: grandTotalDc > 0 ? (bankDc[bank] || 0) / grandTotalDc : 0,
    netTotal: bankNetTotal[bank] || 0,
    netActive: bankNetActiveDc[bank] || 0,
    netActiveRate: (bankNetTotal[bank] || 0) > 0 ? (bankNetActiveDc[bank] || 0) / (bankNetTotal[bank] || 0) : 0,
    netAvgOutput: (bankNetTotal[bank] || 0) > 0 ? (bankDc[bank] || 0) / (bankNetTotal[bank] || 0) : 0,
  }));

  const channelSummaryDcTotals = {
    baofei: channelSummaryDc.reduce((s, c) => s + c.baofei, 0),
    netTotal: channelSummaryDc.reduce((s, c) => s + c.netTotal, 0),
    netActive: channelSummaryDc.reduce((s, c) => s + c.netActive, 0),
    netActiveRate: channelSummaryDc.reduce((s, c) => s + c.netTotal, 0) > 0
      ? channelSummaryDc.reduce((s, c) => s + c.netActive, 0) / channelSummaryDc.reduce((s, c) => s + c.netTotal, 0)
      : 0,
    netAvgOutput: channelSummaryDc.reduce((s, c) => s + c.netTotal, 0) > 0
      ? channelSummaryDc.reduce((s, c) => s + c.baofei, 0) / channelSummaryDc.reduce((s, c) => s + c.netTotal, 0)
      : 0,
  };

  // ===== 小表2: 渠道产品分布（各银行渠道×各产品简称的年交保费） =====
  const bankProdQj: Record<string, Record<string, number>> = {};
  const allProducts = new Set<string>();
  for (const row of dataRows) {
    const bank = safeStr(row['银行总行']);
    const s = safeStr(row['缴费间隔']);
    if (!bank || s !== '年交') continue;
    const prod = safeStr(row['产品简']);
    const aj = safeFloat(row['新约保费']);
    if (!prod) continue;
    allProducts.add(prod);
    if (!bankProdQj[bank]) bankProdQj[bank] = {};
    bankProdQj[bank][prod] = (bankProdQj[bank][prod] || 0) + aj;
  }

  const productList = Array.from(allProducts).sort();
  const channelProductMatrix = bankList.map(bank => {
    const prodValues: Record<string, number> = {};
    for (const prod of productList) {
      prodValues[prod] = bankProdQj[bank]?.[prod] || 0;
    }
    return { name: bank, products: prodValues };
  });

  // 产品合计行
  const channelProductTotals: Record<string, number> = {};
  for (const prod of productList) {
    channelProductTotals[prod] = bankList.reduce((s, bank) => s + (bankProdQj[bank]?.[prod] || 0), 0);
  }

  // ===== 小表3: 年交月度趋势（各银行渠道×1-12月） =====
  const bankMonthQj: Record<string, Record<number, number>> = {};
  for (const row of dataRows) {
    const bank = safeStr(row['银行总行']);
    const s = safeStr(row['缴费间隔']);
    const bo = row['月'];
    if (!bank || s !== '年交' || bo === null || bo === undefined) continue;
    const aj = safeFloat(row['新约保费']);
    if (!bankMonthQj[bank]) bankMonthQj[bank] = {};
    bankMonthQj[bank][bo] = (bankMonthQj[bank][bo] || 0) + aj;
  }

  const monthlyTrend = bankList.map(bank => {
    const months: Record<number, number> = {};
    let total = 0;
    for (let m = 1; m <= 12; m++) {
      const v = bankMonthQj[bank]?.[m] || 0;
      months[m] = v;
      total += v;
    }
    return { name: bank, months, total };
  });

  // 月度合计行
  const monthlyTrendTotals: Record<number, number> = {};
  let monthlyGrandTotal = 0;
  for (let m = 1; m <= 12; m++) {
    monthlyTrendTotals[m] = bankList.reduce((s, bank) => s + (bankMonthQj[bank]?.[m] || 0), 0);
    monthlyGrandTotal += monthlyTrendTotals[m];
  }

  // 趸交月度趋势
  const bankMonthDc: Record<string, Record<number, number>> = {};
  for (const row of dataRows) {
    const bank = safeStr(row['银行总行']);
    const s = safeStr(row['缴费间隔']);
    const bo = row['月'];
    if (!bank || s !== '趸交' || bo === null || bo === undefined) continue;
    const aj = safeFloat(row['新约保费']);
    if (!bankMonthDc[bank]) bankMonthDc[bank] = {};
    bankMonthDc[bank][bo] = (bankMonthDc[bank][bo] || 0) + aj;
  }

  const monthlyTrendDc = bankList.map(bank => {
    const months: Record<number, number> = {};
    let total = 0;
    for (let m = 1; m <= 12; m++) {
      const v = bankMonthDc[bank]?.[m] || 0;
      months[m] = v;
      total += v;
    }
    return { name: bank, months, total };
  });

  const monthlyTrendDcTotals: Record<number, number> = {};
  let monthlyGrandTotalDc = 0;
  for (let m = 1; m <= 12; m++) {
    monthlyTrendDcTotals[m] = bankList.reduce((s, bank) => s + (bankMonthDc[bank]?.[m] || 0), 0);
    monthlyGrandTotalDc += monthlyTrendDcTotals[m];
  }

  // ===== 小表4: 业务数据—产品（按产品全名统计年交、占比、3年、5年、趸交） =====
  const prodFullData: Record<string, { qj: number; y3: number; y5: number; dc: number }> = {};
  for (const row of dataRows) {
    const xz = safeStr(row['险种']);
    if (!xz) continue;
    const s = safeStr(row['缴费间隔']);
    const aj = safeFloat(row['新约保费']);
    const t = safeFloat(row['缴费期间年']);

    if (!prodFullData[xz]) prodFullData[xz] = { qj: 0, y3: 0, y5: 0, dc: 0 };
    if (s === '年交') {
      prodFullData[xz].qj += aj;
      if (t === 3) prodFullData[xz].y3 += aj;
      else if (t === 5) prodFullData[xz].y5 += aj;
    } else if (s === '趸交') {
      prodFullData[xz].dc += aj;
    }
  }

  const totalProdQj = Object.values(prodFullData).reduce((s, d) => s + d.qj, 0);
  const productDetail = Object.entries(prodFullData)
    .filter(([_, d]) => d.qj > 0 || d.dc > 0)
    .sort((a, b) => b[1].qj - a[1].qj)
    .map(([name, d]) => ({
      name,
      qj: d.qj,
      ratio: totalProdQj > 0 ? d.qj / totalProdQj : 0,
      y3: d.y3,
      y5: d.y5,
      dc: d.dc,
    }));

  const productDetailTotals = {
    qj: productDetail.reduce((s, p) => s + p.qj, 0),
    y3: productDetail.reduce((s, p) => s + p.y3, 0),
    y5: productDetail.reduce((s, p) => s + p.y5, 0),
    dc: productDetail.reduce((s, p) => s + p.dc, 0),
  };

  // ===== 小表5: 趸交产品数据 =====
  const dcProdData: Record<string, number> = {};
  for (const row of dataRows) {
    const s = safeStr(row['缴费间隔']);
    if (s !== '趸交') continue;
    const xz = safeStr(row['险种']);
    const aj = safeFloat(row['新约保费']);
    if (!xz) continue;
    dcProdData[xz] = (dcProdData[xz] || 0) + aj;
  }

  const dcProducts = Object.entries(dcProdData)
    .filter(([_, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const dcProductTotal = dcProducts.reduce((s, p) => s + p.value, 0);

  // ===== 小表6: 网点数据—开单网点（各银行渠道×各营业部经理的网点数和开单网点数） =====
  // 获取营业部经理列表（从 hrRows 中去重，按 deptTargets 排序）
  const deptManagerSet = new Set<string>();
  const deptManagerOrder: string[] = [];
  // 优先使用 deptTargets 的顺序
  for (const name of Array.from(lookups.deptTargets.keys())) {
    const target = lookups.deptTargets.get(name)!;
    if ((target.qjTarget > 0 || target.dcTarget > 0) && !deptManagerSet.has(name)) {
      deptManagerOrder.push(name);
      deptManagerSet.add(name);
    }
  }
  // 补充 hrRows 中有但 deptTargets 中没有的
  for (const hr of hrRows) {
    const dept = safeStr(hr['营业部']);
    if (dept && !deptManagerSet.has(dept)) {
      deptManagerOrder.push(dept);
      deptManagerSet.add(dept);
    }
  }

  // 按银行渠道×营业部经理统计网点总数和开单网点数
  const netBankDept: Record<string, Record<string, { total: number; active: number }>> = {};
  for (const nr of netRows) {
    const bank = safeStr(nr['总行名称']);
    const dept = safeStr(nr['营业部经理姓名']);
    if (!bank || !dept) continue;
    if (!netBankDept[bank]) netBankDept[bank] = {};
    if (!netBankDept[bank][dept]) netBankDept[bank][dept] = { total: 0, active: 0 };
    netBankDept[bank][dept].total += 1;
    if (safeFloat(nr['年交']) > 0) {
      netBankDept[bank][dept].active += 1;
    }
  }

  // 获取在网点数据中出现的银行列表（按总网点数排序）
  const netBankList = Object.keys(netBankDept).sort((a, b) => {
    const totalA = Object.values(netBankDept[a]).reduce((s, d) => s + d.total, 0);
    const totalB = Object.values(netBankDept[b]).reduce((s, d) => s + d.total, 0);
    return totalB - totalA;
  });

  const networkData = netBankList.map(bank => {
    const deptData: Record<string, { total: number; active: number }> = {};
    let bankTotalNet = 0;
    let bankActiveNet = 0;
    for (const dept of deptManagerOrder) {
      const d = netBankDept[bank]?.[dept] || { total: 0, active: 0 };
      deptData[dept] = d;
      bankTotalNet += d.total;
      bankActiveNet += d.active;
    }
    return {
      bank,
      depts: deptData,
      totalNet: bankTotalNet,
      activeNet: bankActiveNet,
    };
  });

  // 中支网点总数和开单网点合计
  const networkTotals: Record<string, { total: number; active: number }> = {};
  let grandNetTotal = 0;
  let grandNetActive = 0;
  for (const dept of deptManagerOrder) {
    let dTotal = 0;
    let dActive = 0;
    for (const bank of netBankList) {
      const d = netBankDept[bank]?.[dept] || { total: 0, active: 0 };
      dTotal += d.total;
      dActive += d.active;
    }
    networkTotals[dept] = { total: dTotal, active: dActive };
    grandNetTotal += dTotal;
    grandNetActive += dActive;
  }

  // ===== 小表7: 网点业绩明细 =====
  // 从系统设置中读取网点目标
  let networkTargetMap: Record<string, { qjTarget: number; dcTarget: number }> = {};
  try {
    const { getSettingsData } = require('../settingsApi');
    const settings = getSettingsData();
    if (settings.networkTargets) {
      for (const nt of settings.networkTargets) {
        networkTargetMap[nt.networkName] = { qjTarget: nt.qjTarget || 0, dcTarget: nt.dcTarget || 0 };
      }
    }
  } catch (e) {
    // 系统设置未加载时忽略
  }

  // 按网点汇总业绩数据
  const netPerfQj: Record<string, number> = {};
  const netPerfDc: Record<string, number> = {};
  const netPerfJs: Record<string, number> = {};
  for (const row of dataRows) {
    const wd = safeStr(row['业绩归属网点名称']);
    if (!wd) continue;
    const s = safeStr(row['缴费间隔']);
    const aj = safeFloat(row['新约保费']);
    if (s === '年交') {
      netPerfQj[wd] = (netPerfQj[wd] || 0) + aj;
    } else if (s === '趸交') {
      netPerfDc[wd] = (netPerfDc[wd] || 0) + aj;
    }
    const t = row['缴费期间年'];
    if (t !== null && t !== undefined) {
      const tNum = Number(t);
      if (!isNaN(tNum) && tNum >= 0) {
        netPerfJs[wd] = (netPerfJs[wd] || 0) + 1;
      }
    }
  }

  // 从 netRows 中获取每个网点的基本信息
  const networkPerformance = netRows.map(nr => {
    const wdName = safeStr(nr['代理机构名称']);
    const bank = safeStr(nr['总行名称']);
    const deptMgr = safeStr(nr['营业部经理姓名']);
    const custMgr = safeStr(nr['客户经理姓名']);
    const shortName = safeStr(nr['简称']) || wdName;
    const qj = netPerfQj[wdName] || 0;
    const dc = netPerfDc[wdName] || 0;
    const js = netPerfJs[wdName] || 0;
    const target = networkTargetMap[wdName] || { qjTarget: 0, dcTarget: 0 };
    return {
      name: wdName,
      shortName,
      bank,
      deptManager: deptMgr,
      customerManager: custMgr,
      qj,
      dc,
      js,
      qjTarget: target.qjTarget,
      dcTarget: target.dcTarget,
      qjCompletion: target.qjTarget > 0 ? qj / target.qjTarget : 0,
      dcCompletion: target.dcTarget > 0 ? dc / target.dcTarget : 0,
      qjGap: qj - target.qjTarget,
      dcGap: dc - target.dcTarget,
    };
  });

  // 按年交保费降序排列
  networkPerformance.sort((a, b) => b.qj - a.qj);

  const networkPerfTotals = {
    qj: networkPerformance.reduce((s, n) => s + n.qj, 0),
    dc: networkPerformance.reduce((s, n) => s + n.dc, 0),
    js: networkPerformance.reduce((s, n) => s + n.js, 0),
    qjTarget: networkPerformance.reduce((s, n) => s + n.qjTarget, 0),
    dcTarget: networkPerformance.reduce((s, n) => s + n.dcTarget, 0),
  };

  return {
    // 小表1
    channelSummary,
    channelSummaryTotals,
    channelSummaryDc,
    channelSummaryDcTotals,
    // 小表2
    productList,
    channelProductMatrix,
    channelProductTotals,
    // 小表3
    monthlyTrend,
    monthlyTrendTotals,
    monthlyGrandTotal,
    monthlyTrendDc,
    monthlyTrendDcTotals,
    monthlyGrandTotalDc,
    // 小表4
    productDetail,
    productDetailTotals,
    // 小表5
    dcProducts,
    dcProductTotal,
    // 小表6
    deptManagerOrder,
    networkData,
    networkTotals,
    grandNetTotal,
    grandNetActive,
    // 小表7
    networkPerformance,
    networkPerfTotals,
  };
}
