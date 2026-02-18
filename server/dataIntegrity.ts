/**
 * 数据完整性检测模块
 * 检测数据源中缺失人员归属的保单，返回报警信息
 * [v1.0.3] 取消自动补全后，改为人工维护 + 缺失提醒
 */
import { safeStr, safeFloat } from './report/utils';

export interface MissingRecord {
  policyNo: string;       // 保单号
  customerManager: string; // 客户经理
  networkName: string;     // 网点名称
  bank: string;            // 银行
  premium: number;         // 保费
  month: number;           // 月份
  missingField: 'manager' | 'director' | 'both'; // 缺失字段
}

export interface IntegrityAlert {
  hasMissing: boolean;
  totalMissing: number;
  missingManagerCount: number;   // 缺少营业部经理的保单数
  missingDirectorCount: number;  // 缺少总监的保单数
  missingBothCount: number;      // 两者都缺的保单数
  // 按客户经理分组的缺失统计
  missingByPerson: {
    name: string;
    role: 'customerManager' | 'deptManager';
    missingField: string;
    count: number;
    totalPremium: number;
    months: number[];
  }[];
  // 缺失明细（最多100条）
  details: MissingRecord[];
}

/**
 * 检测数据源中缺失人员归属的记录
 */
export function checkDataIntegrity(dataRows: any[]): IntegrityAlert {
  const details: MissingRecord[] = [];
  let missingManagerCount = 0;
  let missingDirectorCount = 0;
  let missingBothCount = 0;

  // 按人员分组统计
  const personMissing = new Map<string, {
    name: string;
    role: 'customerManager' | 'deptManager';
    missingField: string;
    count: number;
    totalPremium: number;
    months: Set<number>;
  }>();

  for (const row of dataRows) {
    const mgr = safeStr(row['营业部经理名称']);
    const director = safeStr(row['营业区总监']);
    const cm = safeStr(row['业绩归属客户经理姓名']);
    const policyNo = safeStr(row['保单号']);
    const networkName = safeStr(row['业绩归属网点名称']);
    const bank = safeStr(row['银行总行']);
    const premium = safeFloat(row['期交保费']) || safeFloat(row['新约保费']) || 0;
    const month = row['月'] || 0;

    const noMgr = !mgr;
    const noDir = !director;

    if (!noMgr && !noDir) continue; // 数据完整，跳过

    let missingField: 'manager' | 'director' | 'both';
    if (noMgr && noDir) {
      missingField = 'both';
      missingBothCount++;
    } else if (noMgr) {
      missingField = 'manager';
      missingManagerCount++;
    } else {
      missingField = 'director';
      missingDirectorCount++;
    }

    if (details.length < 100) {
      details.push({
        policyNo,
        customerManager: cm,
        networkName,
        bank,
        premium,
        month,
        missingField,
      });
    }

    // 按客户经理分组（缺营业部经理的情况）
    if (noMgr && cm) {
      const key = `cm|${cm}|manager`;
      const existing = personMissing.get(key);
      if (existing) {
        existing.count++;
        existing.totalPremium += premium;
        if (month) existing.months.add(month);
      } else {
        personMissing.set(key, {
          name: cm,
          role: 'customerManager',
          missingField: '营业部经理',
          count: 1,
          totalPremium: premium,
          months: new Set(month ? [month] : []),
        });
      }
    }

    // 按营业部经理分组（缺总监的情况）
    if (noDir && mgr) {
      const key = `mgr|${mgr}|director`;
      const existing = personMissing.get(key);
      if (existing) {
        existing.count++;
        existing.totalPremium += premium;
        if (month) existing.months.add(month);
      } else {
        personMissing.set(key, {
          name: mgr,
          role: 'deptManager',
          missingField: '营业区总监',
          count: 1,
          totalPremium: premium,
          months: new Set(month ? [month] : []),
        });
      }
    }
  }

  const totalMissing = missingManagerCount + missingDirectorCount + missingBothCount;

  const missingByPerson = Array.from(personMissing.values())
    .map(p => ({
      ...p,
      months: Array.from(p.months).sort((a, b) => a - b),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    hasMissing: totalMissing > 0,
    totalMissing,
    missingManagerCount,
    missingDirectorCount,
    missingBothCount,
    missingByPerson,
    details,
  };
}
