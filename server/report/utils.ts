/**
 * 银保数据自动化报表 - 工具函数
 */

export function normalizeName(s: any): string {
  if (!s) return '';
  let str = String(s).trim();
  str = str.replace(/\uff08/g, '(').replace(/\uff09/g, ')');
  str = str.replace(/\)$/, '');
  return str;
}

export function safeFloat(v: any, defaultVal: number = 0): number {
  if (v === null || v === undefined || v === '') return defaultVal;
  const n = Number(v);
  return isNaN(n) ? defaultVal : n;
}

export function safeStr(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

export function parseDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  // Excel serial date number
  if (typeof v === 'number') {
    // Excel epoch is 1900-01-01, but Excel incorrectly considers 1900 as leap year
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + v * 86400000);
  }
  const str = String(v).trim();
  // Handle YYYY-MM-DD format explicitly to avoid UTC timezone offset issues
  // new Date('2026-01-01') parses as UTC midnight, getMonth() returns local time → off by 1 day/month
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1]);
    const m = parseInt(isoMatch[2]) - 1; // JS months are 0-indexed
    const day = parseInt(isoMatch[3]);
    return new Date(y, m, day);
  }
  // Handle YYYY/MM/DD format
  const slashMatch = str.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (slashMatch) {
    const y = parseInt(slashMatch[1]);
    const m = parseInt(slashMatch[2]) - 1;
    const day = parseInt(slashMatch[3]);
    return new Date(y, m, day);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function getMonth(v: any): number | null {
  const d = parseDate(v);
  if (!d) return null;
  return d.getMonth() + 1;
}

export interface LookupTables {
  zbTable: Map<string, number>; // (险种名+年限) -> 折标系数
  productShort: Map<string, string>; // 险种名 -> 产品简称
  fangan1: Set<string>;
  fangan05: Set<string>;
  wdjcB: Map<string, string>; // 代理机构名称 -> 简称
  zhijiTable: Map<string, string>; // 姓名 -> 职级
  weichiTable: Map<string, number>; // 职级 -> 维持标保
  deptTargets: Map<string, { qjTarget: number; dcTarget: number }>; // 营业部 -> 目标
  productNames: Record<string, string>; // 产品key -> 全名
  coreNetworks: Array<{
    totalBankName: string;
    networkCode: string;
    agencyName: string;
    customerManager: string;
    deptManager: string;
    areaDirector: string;
    coreNetwork: any;
  }>;
}

export interface DataRow {
  [key: string]: any;
}
