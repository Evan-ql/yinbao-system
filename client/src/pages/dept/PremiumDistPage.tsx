import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import DeptSubPageWrapper from "@/components/DeptSubPageWrapper";
import { fmt, thCls, tdCls, monoR, rowHover, totalRow } from "@/components/dept/tableStyles";
import { exportToExcel, ExportColumn, ExportSheet } from "@/lib/exportExcel";
import ExportButton from "@/components/ExportButton";

export default function PremiumDistPage() {
  const { reportData } = useReport();
  const [mode, setMode] = useState<"qj" | "dc">("qj");

  const premiumDist = mode === "qj"
    ? reportData?.dept?.premiumDist
    : reportData?.dept?.premiumDistDc;

  const premiumDistQj = reportData?.dept?.premiumDist;
  const premiumDistDc = reportData?.dept?.premiumDistDc;

  // 构建某个维度的sheet数据
  const buildSheetData = (dist: any) => {
    if (!dist) return { columns: [] as ExportColumn[], data: [] as any[], total: undefined as any };
    const columns: ExportColumn[] = [
      { header: "营业部", key: "name", width: 14 },
      ...dist.headers.map((h: string) => ({ header: h, key: h, type: "number" as const, width: 14 })),
    ];
    const data = dist.rows.map((r: any) => {
      const rowData: any = { name: r.name };
      dist.headers.forEach((h: string, i: number) => { rowData[h] = r.values[i] || 0; });
      return rowData;
    });
    // 合计行
    const totalRowData: any = { name: "中支合计" };
    dist.headers.forEach((h: string, i: number) => {
      totalRowData[h] = dist.rows.reduce((s: number, r: any) => s + (r.values?.[i] || 0), 0);
    });
    return { columns, data, total: totalRowData };
  };

  const handleExport = () => {
    const sheets: ExportSheet[] = [];

    if (premiumDistQj) {
      const { columns, data, total } = buildSheetData(premiumDistQj);
      sheets.push({
        sheetName: "期交",
        title: "保费分布图-期交",
        columns,
        data,
        totalRow: total,
        totalLabel: "中支合计",
      });
    }

    if (premiumDistDc) {
      const { columns, data, total } = buildSheetData(premiumDistDc);
      sheets.push({
        sheetName: "趸交",
        title: "保费分布图-趸交",
        columns,
        data,
        totalRow: total,
        totalLabel: "中支合计",
      });
    }

    if (sheets.length === 0) return;

    exportToExcel({
      columns: [],
      fileName: "保费分布图",
      sheets,
    });
  };

  return (
    <DeptSubPageWrapper
      title={`${mode === "qj" ? "期交" : "趸交"}保费分布图`}
      description={`各营业部在各银行渠道的${mode === "qj" ? "期交" : "趸交"}保费金额`}
      extraControls={<ExportButton onClick={handleExport} />}
    >
      <div className="flex justify-end mb-3">
        <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs">
          <button
            className={`px-3 py-1.5 transition-colors ${
              mode === "qj"
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
            onClick={() => setMode("qj")}
          >
            期交
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
        <CardContent className="pt-4">
          {premiumDist ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className={`text-left ${thCls} sticky left-0 bg-card z-10`}>营业部</th>
                    {premiumDist.headers?.map((h: string) => (
                      <th key={h} className={`text-right ${thCls}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {premiumDist.rows?.map((r: any) => (
                    <tr key={r.name} className={rowHover}>
                      <td className={`${tdCls} font-medium sticky left-0 bg-card z-10`}>{r.name}</td>
                      {r.values?.map((v: number, i: number) => {
                        const isLast = i === r.values.length - 1;
                        return (
                          <td key={i} className={`${monoR} ${isLast ? "text-amber-600 font-semibold" : v > 0 ? "" : "text-muted-foreground"}`}>
                            {fmt(v)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {premiumDist.rows && premiumDist.rows.length > 0 && (
                    <tr className={totalRow}>
                      <td className={`${tdCls} sticky left-0 bg-card z-10`}>中支合计</td>
                      {premiumDist.headers?.map((_: string, i: number) => {
                        const total = premiumDist.rows.reduce((s: number, r: any) => s + (r.values?.[i] || 0), 0);
                        const isLast = i === premiumDist.headers.length - 1;
                        return (
                          <td key={i} className={`${monoR} ${isLast ? "text-amber-600 font-semibold" : ""}`}>
                            {fmt(total)}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">暂无数据</p>
          )}
        </CardContent>
      </Card>
    </DeptSubPageWrapper>
  );
}
