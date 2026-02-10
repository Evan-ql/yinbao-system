/**
 * 银保数据自动化报表 - 部门Sheet生成
 * 包含10个子表格的数据计算：
 * 1. 业务数据（支持全渠道/非邮）
 * 2. 日保费数据
 * 3. 人力数据（挂网/破零/开单率/规保2万）
 * 4. 铁杆网点（总数/开单/开单率/差距）
 * 5. 部门大单分布（5万/10万/20万/50万/100万）
 * 6. 年交保费分布图（营业部×银行渠道金额矩阵）
 * 7. 个人业绩前10
 * 8. 个人件数前10
 * 9. 全渠道大单分布（按银行渠道）
 * 10. 网点分布（营业部×银行渠道网点数矩阵）
 */
import { safeFloat, safeStr, LookupTables, DataRow } from './utils';

export function generateDeptData(
  hrRows: DataRow[],
  dataRows: DataRow[],
  netRows: DataRow[],
  lookups: LookupTables,
  monthStart: number,
  monthEnd: number,
  dailyRows: DataRow[] = []
): Record<string, any> {
  // Get dept list from targets
  const deptNames: string[] = [];
  const deptSet = new Set<string>();
  for (const [name, target] of Array.from(lookups.deptTargets.entries())) {
    if (target.qjTarget > 0 || target.dcTarget > 0) {
      deptNames.push(name);
      deptSet.add(name);
    }
  }
  // Also add depts from HR that may not be in targets
  for (const hr of hrRows) {
    const d = safeStr(hr['营业部']);
    if (d && !deptSet.has(d)) {
      deptNames.push(d);
      deptSet.add(d);
    }
  }

  // ===== 1. 业务数据 =====
  // Compute premiums by dept manager from data source (both 全渠道 and 非邮)
  const deptAllQj: Record<string, number> = {};   // 全渠道年交
  const deptFeiyouQj: Record<string, number> = {}; // 非邮年交
  const deptGmdc: Record<string, number> = {};     // 规模趸
  for (const row of dataRows) {
    const mgr = safeStr(row['营业部经理名称']);
    if (!mgr) continue;
    const s = safeStr(row['缴费间隔']);
    const d = safeStr(row['银行总行']);
    const aj = safeFloat(row['新约保费']);
    const bi = safeStr(row['类型']);
    if (s === '年交') {
      deptAllQj[mgr] = (deptAllQj[mgr] || 0) + aj;
      if (d !== '中国邮政储蓄银行') {
        deptFeiyouQj[mgr] = (deptFeiyouQj[mgr] || 0) + aj;
      }
    }
    if (bi === '规模类' && s === '趸交') {
      deptGmdc[mgr] = (deptGmdc[mgr] || 0) + aj;
    }
  }

  // Daily list premium additions
  const dailyDeptAllQj: Record<string, number> = {};
  const dailyDeptFeiyouQj: Record<string, number> = {};
  const dailyDeptDc: Record<string, number> = {};
  for (const dr of dailyRows) {
    const mgr = safeStr(dr['营业部']);
    const jj = safeStr(dr['交费间隔']);
    const bf = safeFloat(dr['保费']);
    const bank = safeStr(dr['银行总行']);
    if (mgr && jj === '年交') {
      dailyDeptAllQj[mgr] = (dailyDeptAllQj[mgr] || 0) + bf;
      if (bank !== '中国邮政储蓄银行') {
        dailyDeptFeiyouQj[mgr] = (dailyDeptFeiyouQj[mgr] || 0) + bf;
      }
    }
    if (mgr && jj === '趸交') {
      dailyDeptDc[mgr] = (dailyDeptDc[mgr] || 0) + bf;
    }
  }

  // Get scale趸 from HR table (sumif)
  const deptHrGmdc: Record<string, number> = {};
  for (const hr of hrRows) {
    const dept = safeStr(hr['营业部']);
    if (dept) {
      deptHrGmdc[dept] = (deptHrGmdc[dept] || 0) + safeFloat(hr['规模趸']);
    }
  }

  // Build dept ranking for 非邮 mode
  const deptRankingFeiyou = deptNames.map(name => {
    const target = lookups.deptTargets.get(name) || { qjTarget: 0, dcTarget: 0 };
    const monthQj = (deptFeiyouQj[name] || 0) + (dailyDeptFeiyouQj[name] || 0);
    const gmdc = deptHrGmdc[name] || 0;
    return {
      name,
      monthQj,
      qjTarget: target.qjTarget,
      qjGap: target.qjTarget - monthQj,
      gmdc,
      dcTarget: target.dcTarget,
      dcGap: target.dcTarget - gmdc,
    };
  });
  deptRankingFeiyou.sort((a, b) => b.monthQj - a.monthQj);

  // Build dept ranking for 全渠道 mode
  const deptRankingAll = deptNames.map(name => {
    const target = lookups.deptTargets.get(name) || { qjTarget: 0, dcTarget: 0 };
    const monthQj = (deptAllQj[name] || 0) + (dailyDeptAllQj[name] || 0);
    const gmdc = deptHrGmdc[name] || 0;
    return {
      name,
      monthQj,
      qjTarget: target.qjTarget,
      qjGap: target.qjTarget - monthQj,
      gmdc,
      dcTarget: target.dcTarget,
      dcGap: target.dcTarget - gmdc,
    };
  });
  deptRankingAll.sort((a, b) => b.monthQj - a.monthQj);

  // Use 非邮 sorted order as default
  const sortedDepts = deptRankingFeiyou.map(d => d.name);

  // ===== 2. 日保费数据 =====
  // Daily premium by dept from dailyRows
  const dailyData = deptNames.map(name => {
    let todayQj = 0;
    let todayFeiyouQj = 0;
    let todayDc = 0;
    for (const dr of dailyRows) {
      const mgr = safeStr(dr['营业部']);
      if (mgr !== name) continue;
      const jj = safeStr(dr['交费间隔']);
      const bf = safeFloat(dr['保费']);
      const bank = safeStr(dr['银行总行']);
      if (jj === '年交') {
        todayQj += bf;
        if (bank !== '中国邮政储蓄银行') {
          todayFeiyouQj += bf;
        }
      }
      if (jj === '趸交') {
        todayDc += bf;
      }
    }
    return {
      name,
      todayQj,
      todayFeiyouQj,
      todayDc,
      target: 100000, // 底线目标 10万
      rate: todayQj > 0 ? todayQj / 100000 : 0,
    };
  });

  // ===== 3. 人力数据（挂网/破零/开单率/规保2万） =====
  const deptHrDetail: Record<string, {
    guawang: number; poling: number; kaidan: number;
    guibao2w: number;
  }> = {};
  for (const hr of hrRows) {
    const dept = safeStr(hr['营业部']);
    if (!dept) continue;
    if (!deptHrDetail[dept]) {
      deptHrDetail[dept] = { guawang: 0, poling: 0, kaidan: 0, guibao2w: 0 };
    }
    deptHrDetail[dept].guawang += 1;
    const qjbf = safeFloat(hr['期交保费']);
    if (qjbf > 0) {
      deptHrDetail[dept].poling += 1;
    }
    // 开单 = 有期交保费的人
    if (qjbf > 0) {
      deptHrDetail[dept].kaidan += 1;
    }
    // 规保2万 = 规保 >= 20000 的人数
    const guibao = safeFloat(hr['规保']);
    if (guibao >= 20000) {
      deptHrDetail[dept].guibao2w += 1;
    }
  }

  const hrStatsDetailed = sortedDepts.map(name => {
    const h = deptHrDetail[name] || { guawang: 0, poling: 0, kaidan: 0, guibao2w: 0 };
    return {
      name,
      guawang: h.guawang,
      poling: h.poling,
      kaidanRate: h.guawang > 0 ? h.poling / h.guawang : 0,
      guibao2w: h.guibao2w,
    };
  });
  // Sort by 开单率 descending
  const hrStatsSorted = [...hrStatsDetailed].sort((a, b) => b.kaidanRate - a.kaidanRate);

  // ===== 3.5 在职经理开单明细（含网点件数和金额） =====
  // 从 dataRows 中统计每个归属人在各网点的开单件数和金额
  const mgrNetworkStats: Record<string, Record<string, { js: number; amount: number }>> = {};
  for (const row of dataRows) {
    const person = safeStr(row['归属人']);
    const wdName = safeStr(row['业绩归属网点名称']);
    const s = safeStr(row['缴费间隔']);
    if (!person || !wdName || s !== '年交') continue;
    const aj = safeFloat(row['新约保费']);
    if (aj <= 0) continue;
    if (!mgrNetworkStats[person]) mgrNetworkStats[person] = {};
    if (!mgrNetworkStats[person][wdName]) mgrNetworkStats[person][wdName] = { js: 0, amount: 0 };
    mgrNetworkStats[person][wdName].js += 1;
    mgrNetworkStats[person][wdName].amount += aj;
  }

  const hrManagerDetails: Array<{
    dept: string; name: string; code: string;
    qjbf: number; js: number; kaidan: boolean;
    networks: Array<{ wdName: string; js: number; amount: number }>;
  }> = [];
  for (const hr of hrRows) {
    const dept = safeStr(hr['营业部']);
    const name = safeStr(hr['姓名']);
    const code = safeStr(hr['工号']);
    const qjbf = safeFloat(hr['期交保费']);
    const jsCount = safeFloat(hr['件数']);
    // 获取该经理各网点的开单明细
    const netStats = mgrNetworkStats[name] || {};
    const networks = Object.entries(netStats)
      .map(([wdName, stat]) => ({ wdName, js: stat.js, amount: stat.amount }))
      .sort((a, b) => b.amount - a.amount);
    hrManagerDetails.push({
      dept,
      name,
      code,
      qjbf,
      js: jsCount,
      kaidan: qjbf > 0,
      networks,
    });
  }

  // ===== 4. 铁杆网点 =====
  const deptTieganStats: Record<string, { total: number; kaidan: number }> = {};
  // 收集铁杆网点明细（含客户经理信息）
  const tieganDetails: Array<{
    dept: string; customerManager: string; agencyName: string;
    bankName: string; nj: number; kaidan: boolean;
  }> = [];
  for (const nr of netRows) {
    const mgr = safeStr(nr['营业部经理姓名']);
    const isTiegan = safeStr(nr['铁杆']);
    if (!mgr || isTiegan !== '是') continue;
    if (!deptTieganStats[mgr]) deptTieganStats[mgr] = { total: 0, kaidan: 0 };
    deptTieganStats[mgr].total += 1;
    const nj = safeFloat(nr['年交']);
    if (nj > 0) deptTieganStats[mgr].kaidan += 1;
    tieganDetails.push({
      dept: mgr,
      customerManager: safeStr(nr['客户经理姓名']),
      agencyName: safeStr(nr['代理机构名称']),
      bankName: safeStr(nr['总行名称']),
      nj,
      kaidan: nj > 0,
    });
  }

  const tieganData = sortedDepts.map(name => {
    const t = deptTieganStats[name] || { total: 0, kaidan: 0 };
    return {
      name,
      total: t.total,
      kaidan: t.kaidan,
      kaidanRate: t.total > 0 ? t.kaidan / t.total : 0,
      gap: t.total - t.kaidan,
    };
  });

  // ===== 5. 部门大单分布 =====
  const thresholds = [50000, 100000, 200000, 500000, 1000000];
  const deptDadan: Record<string, { counts: number[]; totalAbove10w: number }> = {};
  for (const row of dataRows) {
    const s = safeStr(row['缴费间隔']);
    if (s !== '年交') continue;
    const mgr = safeStr(row['营业部经理名称']);
    const aj = safeFloat(row['新约保费']);
    if (!mgr) continue;
    if (!deptDadan[mgr]) deptDadan[mgr] = { counts: [0, 0, 0, 0, 0], totalAbove10w: 0 };
    for (let i = 0; i < thresholds.length; i++) {
      if (aj >= thresholds[i]) {
        deptDadan[mgr].counts[i] += 1;
      }
    }
    if (aj >= 100000) {
      deptDadan[mgr].totalAbove10w += aj;
    }
  }

  const dadanData = sortedDepts.map(name => {
    const d = deptDadan[name] || { counts: [0, 0, 0, 0, 0], totalAbove10w: 0 };
    return {
      name,
      c5w: d.counts[0],
      c10w: d.counts[1],
      c20w: d.counts[2],
      c50w: d.counts[3],
      c100w: d.counts[4],
      totalAbove10w: d.totalAbove10w,
    };
  });

  // ===== 6. 年交保费分布图（营业部×银行渠道） =====
  // Get all bank names from data
  const bankSet = new Set<string>();
  for (const row of dataRows) {
    const s = safeStr(row['缴费间隔']);
    if (s !== '年交') continue;
    const bank = safeStr(row['银行总行']);
    if (bank) bankSet.add(bank);
  }
  // Also get bank short names for display
  const bankShortMap: Record<string, string> = {
    '中国工商银行': '工行', '中国建设银行': '建行', '中国农业银行': '农行',
    '中国银行': '中行', '中国民生银行': '民生', '中信银行': '中信',
    '浦发银行': '浦发', '华夏银行': '华夏', '中国光大银行': '光大',
    '河北银行': '河行', '沧州银行': '沧州', '张家口银行': '张家口',
    '交通银行': '交行', '中国邮政储蓄银行': '邮政',
  };
  // Ordered bank list
  const bankOrder = [
    '中国工商银行', '中国建设银行', '中国农业银行', '中国银行',
    '中国民生银行', '中信银行', '浦发银行', '华夏银行',
    '中国光大银行', '河北银行', '沧州银行', '张家口银行',
    '交通银行', '中国邮政储蓄银行',
  ];
  const bankList = bankOrder.filter(b => bankSet.has(b));
  // Add any banks not in the predefined order
  for (const b of Array.from(bankSet)) {
    if (!bankList.includes(b)) bankList.push(b);
  }

  // Build dept × bank premium matrix
  const deptBankQj: Record<string, Record<string, number>> = {};
  for (const row of dataRows) {
    const s = safeStr(row['缴费间隔']);
    if (s !== '年交') continue;
    const mgr = safeStr(row['营业部经理名称']);
    const bank = safeStr(row['银行总行']);
    const aj = safeFloat(row['新约保费']);
    if (mgr && bank) {
      if (!deptBankQj[mgr]) deptBankQj[mgr] = {};
      deptBankQj[mgr][bank] = (deptBankQj[mgr][bank] || 0) + aj;
    }
  }

  // Also compute 邮行 (邮政储蓄中简称为邮行的) and 非邮 totals
  // 邮行 = 邮政储蓄银行中简称为"邮行"的网点保费
  const deptYouhangQj: Record<string, number> = {};
  const deptYouzhengQj: Record<string, number> = {};
  for (const row of dataRows) {
    const s = safeStr(row['缴费间隔']);
    if (s !== '年交') continue;
    const mgr = safeStr(row['营业部经理名称']);
    const bank = safeStr(row['银行总行']);
    const jc = safeStr(row['简称']);
    const aj = safeFloat(row['新约保费']);
    if (mgr && bank === '中国邮政储蓄银行') {
      if (jc === '邮行') {
        deptYouhangQj[mgr] = (deptYouhangQj[mgr] || 0) + aj;
      } else {
        deptYouzhengQj[mgr] = (deptYouzhengQj[mgr] || 0) + aj;
      }
    }
  }

  const bankShortList = bankList.map(b => bankShortMap[b] || b);
  // Add 邮行 and 非邮 columns
  const premiumDistHeaders = [...bankShortList, '邮行', '非邮'];

  const premiumDist = sortedDepts.map(name => {
    const bankValues: number[] = bankList.map(bank => {
      return deptBankQj[name]?.[bank] || 0;
    });
    const youhang = deptYouhangQj[name] || 0;
    // 非邮 = total excluding 邮政储蓄
    const feiyouTotal = bankList.reduce((sum, bank) => {
      if (bank === '中国邮政储蓄银行') return sum;
      return sum + (deptBankQj[name]?.[bank] || 0);
    }, 0);
    return {
      name,
      values: [...bankValues, youhang, feiyouTotal],
    };
  });

  // ===== 6b. 趸交保费分布图 =====
  const deptBankDc: Record<string, Record<string, number>> = {};
  for (const row of dataRows) {
    const s = safeStr(row['缴费间隔']);
    if (s !== '趸交') continue;
    const mgr = safeStr(row['营业部经理名称']);
    const bank = safeStr(row['银行总行']);
    const aj = safeFloat(row['新约保费']);
    if (mgr && bank) {
      if (!deptBankDc[mgr]) deptBankDc[mgr] = {};
      deptBankDc[mgr][bank] = (deptBankDc[mgr][bank] || 0) + aj;
    }
  }

  const premiumDistDc = sortedDepts.map(name => {
    const bankValues: number[] = bankList.map(bank => {
      return deptBankDc[name]?.[bank] || 0;
    });
    const feiyouTotal = bankList.reduce((sum, bank) => {
      if (bank === '中国邮政储蓄银行') return sum;
      return sum + (deptBankDc[name]?.[bank] || 0);
    }, 0);
    return {
      name,
      values: [...bankValues, 0, feiyouTotal],
    };
  });

  // ===== 7. 个人业绩前10（全渠道 + 非邮） =====
  const personQjAll: { name: string; dept: string; premium: number }[] = [];
  const personQjFeiyou: { name: string; dept: string; premium: number }[] = [];
  for (const hr of hrRows) {
    const xm = safeStr(hr['姓名']);
    const dept = safeStr(hr['营业部']);
    const qj = safeFloat(hr['期交保费']);
    const feiyouQj = safeFloat(hr['非邮期交']);
    if (xm && qj > 0) {
      personQjAll.push({ name: xm, dept, premium: qj });
    }
    if (xm && feiyouQj > 0) {
      personQjFeiyou.push({ name: xm, dept, premium: feiyouQj });
    }
  }
  const personalTop = personQjAll.sort((a, b) => b.premium - a.premium).slice(0, 15);
  const personalTopFeiyou = personQjFeiyou.sort((a, b) => b.premium - a.premium).slice(0, 15);

  // ===== 8. 个人件数前10（全渠道 + 非邮） =====
  const personJsAll: { name: string; dept: string; js: number }[] = [];
  const personJsFeiyou: { name: string; dept: string; js: number }[] = [];
  for (const hr of hrRows) {
    const xm = safeStr(hr['姓名']);
    const dept = safeStr(hr['营业部']);
    const j = safeFloat(hr['件数']);
    const feiyouJ = safeFloat(hr['非邮件数']);
    if (xm && j > 0) {
      personJsAll.push({ name: xm, dept, js: j });
    }
    if (xm && feiyouJ > 0) {
      personJsFeiyou.push({ name: xm, dept, js: feiyouJ });
    }
  }
  const personalCountTop = personJsAll.sort((a, b) => b.js - a.js).slice(0, 15);
  const personalCountTopFeiyou = personJsFeiyou.sort((a, b) => b.js - a.js).slice(0, 15);

  // ===== 9. 全渠道大单分布（按银行渠道） =====
  // Count policies >= each threshold by bank short name
  const bankDadan: Record<string, { counts: number[]; totalAbove10w: number }> = {};
  for (const row of dataRows) {
    const s = safeStr(row['缴费间隔']);
    if (s !== '年交') continue;
    const jc = safeStr(row['简称']);
    const aj = safeFloat(row['新约保费']);
    if (!jc) continue;
    if (!bankDadan[jc]) bankDadan[jc] = { counts: [0, 0, 0, 0, 0], totalAbove10w: 0 };
    for (let i = 0; i < thresholds.length; i++) {
      if (aj >= thresholds[i]) {
        bankDadan[jc].counts[i] += 1;
      }
    }
    if (aj >= 100000) {
      bankDadan[jc].totalAbove10w += aj;
    }
  }

  const bankDadanList = Object.entries(bankDadan)
    .sort((a, b) => b[1].totalAbove10w - a[1].totalAbove10w)
    .map(([name, d]) => ({
      name,
      c5w: d.counts[0],
      c10w: d.counts[1],
      c20w: d.counts[2],
      c50w: d.counts[3],
      c100w: d.counts[4],
      totalAbove10w: d.totalAbove10w,
    }));

  // ===== 10. 网点分布（营业部×银行渠道网点数矩阵） =====
  // Get bank names from netRows
  const netBankSet = new Set<string>();
  for (const nr of netRows) {
    const bank = safeStr(nr['总行名称']);
    if (bank) netBankSet.add(bank);
  }
  const netBankList = bankOrder.filter(b => netBankSet.has(b));
  for (const b of Array.from(netBankSet)) {
    if (!netBankList.includes(b)) netBankList.push(b);
  }
  const netBankShortList = netBankList.map(b => bankShortMap[b] || b);

  // Count networks per dept × bank
  const deptBankWd: Record<string, Record<string, number>> = {};
  // Also count 开单网点 (active networks)
  const deptBankWdActive: Record<string, Record<string, number>> = {};
  for (const nr of netRows) {
    const mgr = safeStr(nr['营业部经理姓名']);
    const bank = safeStr(nr['总行名称']);
    if (!mgr || !bank) continue;
    if (!deptBankWd[mgr]) deptBankWd[mgr] = {};
    deptBankWd[mgr][bank] = (deptBankWd[mgr][bank] || 0) + 1;
    const nj = safeFloat(nr['年交']);
    if (nj > 0) {
      if (!deptBankWdActive[mgr]) deptBankWdActive[mgr] = {};
      deptBankWdActive[mgr][bank] = (deptBankWdActive[mgr][bank] || 0) + 1;
    }
  }

  const networkDist = sortedDepts.map(name => {
    const values: number[] = netBankList.map(bank => deptBankWd[name]?.[bank] || 0);
    const total = values.reduce((s, v) => s + v, 0);
    return { name, values, total };
  });

  // Bank total network counts (中支 row)
  const bankTotalWd = netBankList.map(bank => {
    let count = 0;
    for (const nr of netRows) {
      if (safeStr(nr['总行名称']) === bank) count++;
    }
    return count;
  });

  // ===== Totals for 业务数据 =====
  const makeTotals = (ranking: typeof deptRankingFeiyou) => {
    const totalQj = ranking.reduce((s, d) => s + d.monthQj, 0);
    const totalQjTarget = ranking.reduce((s, d) => s + d.qjTarget, 0);
    const totalGmdc = ranking.reduce((s, d) => s + d.gmdc, 0);
    const totalDcTarget = ranking.reduce((s, d) => s + d.dcTarget, 0);
    return {
      totalQj, totalQjTarget, totalQjGap: totalQjTarget - totalQj,
      totalGmdc, totalDcTarget, totalDcGap: totalDcTarget - totalGmdc,
    };
  };

  return {
    // 1. 业务数据 - 两种模式
    deptRanking: deptRankingFeiyou.map((d, i) => ({
      rank: i + 1, ...d,
    })),
    deptRankingAll: deptRankingAll.map((d, i) => ({
      rank: i + 1, ...d,
    })),
    totals: makeTotals(deptRankingFeiyou),
    totalsAll: makeTotals(deptRankingAll),

    // 2. 日保费数据
    dailyData,

    // 3. 人力数据
    hrStats: hrStatsSorted.map((h, i) => ({ rank: i + 1, ...h })),
    hrManagerDetails,

    // 4. 铁杆网点
    tieganData,
    tieganDetails,

    // 5. 部门大单分布
    dadanData,

    // 6. 保费分布图（年交+趸交）
    premiumDist: {
      headers: premiumDistHeaders,
      rows: premiumDist,
    },
    premiumDistDc: {
      headers: premiumDistHeaders,
      rows: premiumDistDc,
    },

    // 7. 个人业绩前10（全渠道+非邮）
    personalTop,
    personalTopFeiyou,

    // 8. 个人件数前10（全渠道+非邮）
    personalCountTop,
    personalCountTopFeiyou,

    // 9. 全渠道大单分布
    bankDadanList,

    // 10. 网点分布
    networkDist: {
      headers: netBankShortList,
      rows: networkDist,
      bankTotals: bankTotalWd,
      totalNetworks: netRows.length,
    },
  };
}
