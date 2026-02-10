import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import { fmt, thCls, tdCls, monoR, rowHover, totalRow } from "@/components/dept/tableStyles";

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function MonthlyTrendTab() {
  const { reportData } = useReport();
  const data = reportData?.channel;
  const [mode, setMode] = useState<"qj" | "dc">("qj");

  if (!data) return <div className="p-4 text-sm text-muted-foreground">请先导入数据</div>;

  const {
    monthlyTrend, monthlyTrendTotals, monthlyGrandTotal,
    monthlyTrendDc, monthlyTrendDcTotals, monthlyGrandTotalDc,
  } = data;

  const rows = mode === "qj" ? monthlyTrend : (monthlyTrendDc || []);
  const totals = mode === "qj" ? monthlyTrendTotals : (monthlyTrendDcTotals || {});
  const grandTotal = mode === "qj" ? monthlyGrandTotal : (monthlyGrandTotalDc || 0);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          各银行渠道按月份的{mode === "qj" ? "年交" : "趸交"}保费趋势
        </p>
        <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs">
          <button
            className={`px-3 py-1.5 transition-colors ${
              mode === "qj"
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
            onClick={() => setMode("qj")}
          >
            年交
          </button>
          <button
            className={`px-3 py-1.5 transition-colors ${
              mode === "dc"
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
            onClick={() => setMode("dc")}
          >
            趸交
          </button>
        </div>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {mode === "qj" ? "年交" : "趸交"}月度趋势
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className={`text-left ${thCls} sticky left-0 bg-background z-10`}>月</th>
                  {MONTHS.map(m => (
                    <th key={m} className={`text-right ${thCls}`}>{m}</th>
                  ))}
                  <th className={`text-right ${thCls}`}>合计</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any) => (
                  <tr key={row.name} className={rowHover}>
                    <td className={`${tdCls} font-medium sticky left-0 bg-background z-10 whitespace-nowrap`}>{row.name}</td>
                    {MONTHS.map(m => {
                      const v = row.months[m] || 0;
                      return (
                        <td key={m} className={`${monoR} ${v > 0 ? "text-amber-600" : "text-muted-foreground/40"}`}>
                          {v > 0 ? fmt(v) : "—"}
                        </td>
                      );
                    })}
                    <td className={`${monoR} font-semibold text-amber-600`}>{fmt(row.total)}</td>
                  </tr>
                ))}
                <tr className={totalRow}>
                  <td className={`${tdCls} font-bold sticky left-0 bg-primary/5 z-10`}>合计</td>
                  {MONTHS.map(m => {
                    const v = totals[m] || 0;
                    return (
                      <td key={m} className={`${monoR} font-bold ${v > 0 ? "text-amber-600" : "text-muted-foreground/40"}`}>
                        {v > 0 ? fmt(v) : "—"}
                      </td>
                    );
                  })}
                  <td className={`${monoR} font-bold text-amber-600`}>{fmt(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
