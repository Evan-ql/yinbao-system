import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import { fmt, pct, thCls, tdCls, monoR, rowHover, totalRow } from "@/components/dept/tableStyles";

export default function ChannelSummaryTab() {
  const { reportData } = useReport();
  const data = reportData?.channel;
  const [mode, setMode] = useState<"qj" | "dc">("qj");

  if (!data) return <div className="p-4 text-sm text-muted-foreground">请先导入数据</div>;

  const {
    channelSummary, channelSummaryTotals,
    channelSummaryDc, channelSummaryDcTotals,
  } = data;

  const rows = mode === "qj" ? channelSummary : (channelSummaryDc || []);
  const totals = mode === "qj" ? channelSummaryTotals : (channelSummaryDcTotals || {});

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          各银行渠道业务数据汇总（{mode === "qj" ? "年交" : "趸交"}）
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
            业务数据—渠道
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {mode === "qj" ? "年交" : "趸交"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className={`text-left ${thCls}`}>银行渠道</th>
                  <th className={`text-right ${thCls}`}>保费</th>
                  <th className={`text-right ${thCls}`}>渠道占比</th>
                  <th className={`text-right ${thCls}`}>网点数量</th>
                  <th className={`text-right ${thCls}`}>开单网点</th>
                  <th className={`text-right ${thCls}`}>网活率</th>
                  <th className={`text-right ${thCls}`}>网均产量</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c: any) => (
                  <tr key={c.name} className={rowHover}>
                    <td className={`${tdCls} font-medium`}>{c.name}</td>
                    <td className={`${monoR} text-amber-600`}>{fmt(c.baofei)}</td>
                    <td className={monoR}>{pct(c.ratio)}</td>
                    <td className={monoR}>{c.netTotal}</td>
                    <td className={`${monoR} text-emerald-600`}>{c.netActive}</td>
                    <td className={`${monoR} ${c.netActiveRate >= 0.5 ? "text-emerald-600" : c.netActiveRate >= 0.2 ? "text-amber-600" : "text-rose-600"}`}>
                      {pct(c.netActiveRate)}
                    </td>
                    <td className={monoR}>{fmt(Math.round(c.netAvgOutput))}</td>
                  </tr>
                ))}
                <tr className={totalRow}>
                  <td className={`${tdCls} font-bold`}>中支合计</td>
                  <td className={`${monoR} text-amber-600 font-bold`}>{fmt(totals.baofei)}</td>
                  <td className={`${monoR} font-bold`}>100%</td>
                  <td className={`${monoR} font-bold`}>{totals.netTotal}</td>
                  <td className={`${monoR} text-emerald-600 font-bold`}>{totals.netActive}</td>
                  <td className={`${monoR} font-bold`}>{pct(totals.netActiveRate)}</td>
                  <td className={`${monoR} font-bold`}>{fmt(Math.round(totals.netAvgOutput))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
