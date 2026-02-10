import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import DeptSubPageWrapper from "@/components/DeptSubPageWrapper";
import { fmt, thCls, tdCls, monoR, rowHover, totalRow } from "@/components/dept/tableStyles";

export default function BusinessDataPage() {
  const { reportData } = useReport();
  const [mode, setMode] = useState<"feiyou" | "all">("feiyou");

  const data = reportData?.dept;
  if (!data) return null;

  const { deptRanking, deptRankingAll, totals, totalsAll } = data;
  const ranking = mode === "feiyou" ? deptRanking : deptRankingAll;
  const curTotals = mode === "feiyou" ? totals : totalsAll;

  const modeToggle = (
    <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
      <button
        onClick={() => setMode("feiyou")}
        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
          mode === "feiyou" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        非邮
      </button>
      <button
        onClick={() => setMode("all")}
        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
          mode === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        全渠道
      </button>
    </div>
  );

  return (
    <DeptSubPageWrapper title="业务数据" extraControls={modeToggle}>
      <Card>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className={`text-left ${thCls}`}>排名</th>
                  <th className={`text-left ${thCls}`}>营业部</th>
                  <th className={`text-right ${thCls}`}>月期交</th>
                  <th className={`text-right ${thCls}`}>期交目标</th>
                  <th className={`text-right ${thCls}`}>达成差距</th>
                  <th className={`text-right ${thCls}`}>规模趸</th>
                  <th className={`text-right ${thCls}`}>趸交目标</th>
                  <th className={`text-right ${thCls}`}>达成差距</th>
                </tr>
              </thead>
              <tbody>
                {ranking?.map((d: any) => (
                  <tr key={d.name} className={rowHover}>
                    <td className={tdCls}>{d.rank}</td>
                    <td className={`${tdCls} font-medium`}>{d.name}</td>
                    <td className={`${monoR} text-amber-600`}>{fmt(d.monthQj)}</td>
                    <td className={`${monoR} text-muted-foreground`}>{fmt(d.qjTarget)}</td>
                    <td className={`${monoR} ${d.qjGap <= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(d.qjGap)}</td>
                    <td className={`${monoR} text-emerald-600`}>{fmt(d.gmdc)}</td>
                    <td className={`${monoR} text-muted-foreground`}>{fmt(d.dcTarget)}</td>
                    <td className={`${monoR} ${d.dcGap <= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(d.dcGap)}</td>
                  </tr>
                ))}
                <tr className={totalRow}>
                  <td className={tdCls} colSpan={2}>邯郸中支</td>
                  <td className={`${monoR} text-amber-600`}>{fmt(curTotals?.totalQj)}</td>
                  <td className={monoR}>{fmt(curTotals?.totalQjTarget)}</td>
                  <td className={`${monoR} ${curTotals?.totalQjGap <= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(curTotals?.totalQjGap)}</td>
                  <td className={`${monoR} text-emerald-600`}>{fmt(curTotals?.totalGmdc)}</td>
                  <td className={monoR}>{fmt(curTotals?.totalDcTarget)}</td>
                  <td className={`${monoR} ${curTotals?.totalDcGap <= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(curTotals?.totalDcGap)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </DeptSubPageWrapper>
  );
}
