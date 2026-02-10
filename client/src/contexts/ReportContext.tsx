import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

export interface ReportData {
  summary: {
    dataSourceCount: number;
    networkCount: number;
    hrCount: number;
    dailyCount: number;
    generatedAt: string;
    monthStart: number;
    monthEnd: number;
  };
  dataSource: any[];
  network: any[];
  hr: any[];
  daily: any[];
  dept: any;
  channel: any;
  tracking: any;
  coreNetwork: any;
}

export interface SourceRawData {
  rows: any[];
  totalCount: number;
  fileName?: string;
}

export interface RenwangRawData {
  agency: any[];
  network: any[];
  agencyTotalCount: number;
  networkTotalCount: number;
  fileName?: string;
}

export interface DailyRawData {
  rows: any[];
  totalCount: number;
  fileName?: string;
}

interface ReportContextType {
  reportData: ReportData | null;
  setReportData: (data: ReportData | null) => void;
  sourceRaw: SourceRawData | null;
  setSourceRaw: (data: SourceRawData | null) => void;
  renwangRaw: RenwangRawData | null;
  setRenwangRaw: (data: RenwangRawData | null) => void;
  dailyRaw: DailyRawData | null;
  setDailyRaw: (data: DailyRawData | null) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
  // Month selection
  monthStart: number;
  monthEnd: number;
  setMonthStart: (m: number) => void;
  setMonthEnd: (m: number) => void;
  regenerateReport: (ms?: number, me?: number) => Promise<void>;
  // Data status
  dataStatus: DataStatus | null;
  // Legacy compatibility
  rawData: any;
  setRawData: (data: any) => void;
}

interface DataStatus {
  hasSource: boolean;
  hasRenwang: boolean;
  hasDaily: boolean;
  hasReport: boolean;
  sourceFileName: string | null;
  renwangFileName: string | null;
  dailyFileName: string | null;
}

const ReportContext = createContext<ReportContextType | null>(null);

export function ReportProvider({ children }: { children: ReactNode }) {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [sourceRaw, setSourceRaw] = useState<SourceRawData | null>(null);
  const [renwangRaw, setRenwangRaw] = useState<RenwangRawData | null>(null);
  const [dailyRaw, setDailyRaw] = useState<DailyRawData | null>(null);
  const [loading, setLoading] = useState(false);
  const [monthStart, setMonthStart] = useState(1);
  const [monthEnd, setMonthEnd] = useState(1);
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null);

  // 页面加载时自动从后端恢复报表数据
  useEffect(() => {
    let cancelled = false;

    async function restoreData() {
      try {
        // 1. 先检查后端是否有数据
        const statusRes = await fetch("/api/report/status");
        if (!statusRes.ok) return;
        const status = await statusRes.json();
        
        if (!cancelled) {
          setDataStatus(status);
        }

        // 2. 如果有已生成的报表，恢复报表数据
        if (status.hasReport) {
          const reportRes = await fetch("/api/report/current");
          if (!reportRes.ok) return;
          const data = await reportRes.json();
          
          if (!cancelled && data.report) {
            setReportData(data.report);
            setMonthStart(data.monthStart || 1);
            setMonthEnd(data.monthEnd || 1);
            console.log(`[Restore] Report data restored (months ${data.monthStart}-${data.monthEnd})`);
          }
        }

        // 3. 如果有已上传的文件，恢复文件名和数据条数信息
        if (status.hasSource && status.sourceFileName) {
          if (!cancelled) {
            setSourceRaw({ rows: [], totalCount: status.sourceTotalCount || 0, fileName: status.sourceFileName });
            console.log(`[Restore] Source file restored: ${status.sourceFileName} (${status.sourceTotalCount} rows)`);
          }
        }
        if (status.hasRenwang && status.renwangFileName) {
          if (!cancelled) {
            setRenwangRaw({ agency: [], network: [], agencyTotalCount: status.renwangAgencyCount || 0, networkTotalCount: status.renwangNetworkCount || 0, fileName: status.renwangFileName });
            console.log(`[Restore] Renwang file restored: ${status.renwangFileName} (agency: ${status.renwangAgencyCount}, network: ${status.renwangNetworkCount})`);
          }
        }
        if (status.hasDaily && status.dailyFileName) {
          if (!cancelled) {
            setDailyRaw({ rows: [], totalCount: status.dailyTotalCount || 0, fileName: status.dailyFileName });
            console.log(`[Restore] Daily file restored: ${status.dailyFileName} (${status.dailyTotalCount} rows)`);
          }
        }
      } catch (error) {
        console.error("[Restore] Failed to restore data:", error);
      }
    }

    restoreData();

    return () => { cancelled = true; };
  }, []);

  // When report data is set, sync month range
  const setReportDataWithSync = useCallback((data: ReportData | null) => {
    setReportData(data);
    if (data) {
      setMonthStart(data.summary.monthStart);
      setMonthEnd(data.summary.monthEnd);
    }
  }, []);

  // Regenerate report with new month range
  const regenerateReport = useCallback(async (ms?: number, me?: number) => {
    const newMs = ms ?? monthStart;
    const newMe = me ?? monthEnd;
    setLoading(true);
    try {
      const res = await fetch("/api/report/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthStart: newMs, monthEnd: newMe }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "重新生成失败");
      }
      const data = await res.json();
      if (data.report) {
        setReportData(data.report);
        setMonthStart(newMs);
        setMonthEnd(newMe);
      }
    } catch (error) {
      console.error("Regenerate error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [monthStart, monthEnd]);

  // Legacy compatibility
  const rawData = sourceRaw || renwangRaw || dailyRaw ? { source: sourceRaw?.rows, renwang: renwangRaw?.network, daily: dailyRaw?.rows } : null;
  const setRawData = useCallback((_data: any) => {}, []);

  return (
    <ReportContext.Provider value={{
      reportData, setReportData: setReportDataWithSync,
      sourceRaw, setSourceRaw,
      renwangRaw, setRenwangRaw,
      dailyRaw, setDailyRaw,
      loading, setLoading,
      monthStart, monthEnd, setMonthStart, setMonthEnd,
      regenerateReport,
      dataStatus,
      rawData, setRawData,
    }}>
      {children}
    </ReportContext.Provider>
  );
}

export function useReport() {
  const ctx = useContext(ReportContext);
  if (!ctx) throw new Error("useReport must be used within ReportProvider");
  return ctx;
}
