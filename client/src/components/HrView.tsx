import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { exportToExcel, ExportColumn } from "@/lib/exportExcel";
import ExportButton from "@/components/ExportButton";

function fmt(v: number): string {
  if (v === 0) return "0";
  if (Math.abs(v) >= 10000) return (v / 10000).toFixed(1) + "万";
  return v.toLocaleString();
}

export default function HrView({ data }: { data: any[] }) {
  const [filterDept, setFilterDept] = useState<string>("all");

  if (!data || data.length === 0) return <div className="text-muted-foreground text-center py-8">暂无人力数据</div>;

  const depts = Array.from(new Set(data.map((r: any) => r["营业部"] || ""))).filter(Boolean);
  const filtered = filterDept === "all" ? data : data.filter((r: any) => r["营业部"] === filterDept);

  const handleExport = () => {
    const columns: ExportColumn[] = [
      { header: "营业区", key: "营业区", width: 14 },
      { header: "营业部", key: "营业部", width: 14 },
      { header: "姓名", key: "姓名", width: 10 },
      { header: "期交保费", key: "期交保费", type: "number", width: 14 },
      { header: "非邮期交", key: "非邮期交", type: "number", width: 14 },
      { header: "规保", key: "规保", type: "number", width: 14 },
      { header: "标保", key: "期交标保", type: "number", width: 14 },
      { header: "件数", key: "件数", type: "number", width: 10 },
      { header: "网点总数", key: "网点总数", type: "number", width: 10 },
      { header: "活动网点", key: "活动网点", type: "number", width: 10 },
    ];
    const rows = filtered.map((r: any) => ({
      "营业区": r["营业区"] || "",
      "营业部": r["营业部"] || "",
      "姓名": r["姓名"] || "",
      "期交保费": r["期交保费"] || 0,
      "非邮期交": r["非邮期交"] || 0,
      "规保": r["规保"] || 0,
      "期交标保": r["期交标保"] || 0,
      "件数": r["件数"] || 0,
      "网点总数": r["网点总数"] || 0,
      "活动网点": r["活动网点"] || 0,
    }));
    exportToExcel(columns, rows, "人力数据");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm text-muted-foreground">筛选营业部：</label>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="all">全部 ({data.length}人)</option>
          {depts.map((d: string) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <div className="ml-auto">
          <ExportButton onClick={handleExport} />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">人力明细 ({filtered.length}人)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium text-xs">营业区</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium text-xs">营业部</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium text-xs">姓名</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">期交保费</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">非邮期交</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">规保</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">标保</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">件数</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">网点总数</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">活动网点</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="py-1.5 px-2 text-xs">{r["营业区"] || ""}</td>
                    <td className="py-1.5 px-2 text-xs">{r["营业部"] || ""}</td>
                    <td className="py-1.5 px-2 text-xs font-medium">{r["姓名"] || ""}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs text-amber-600">{fmt(r["期交保费"] || 0)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs">{fmt(r["非邮期交"] || 0)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs">{fmt(r["规保"] || 0)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs">{fmt(r["期交标保"] || 0)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs">{r["件数"] || 0}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs">{r["网点总数"] || 0}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs text-primary">{r["活动网点"] || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
