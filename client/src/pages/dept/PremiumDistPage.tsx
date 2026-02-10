import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import DeptSubPageWrapper from "@/components/DeptSubPageWrapper";
import { fmt, thCls, tdCls, monoR, rowHover, totalRow } from "@/components/dept/tableStyles";

export default function PremiumDistPage() {
  const { reportData } = useReport();
  const [mode, setMode] = useState<"qj" | "dc">("qj");

  const premiumDist = mode === "qj"
    ? reportData?.dept?.premiumDist
    : reportData?.dept?.premiumDistDc;

  return (
    <DeptSubPageWrapper
      title={`${mode === "qj" ? "年交" : "趸交"}保费分布图`}
      description={`各营业部在各银行渠道的${mode === "qj" ? "年交" : "趸交"}保费金额`}
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
