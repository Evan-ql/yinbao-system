import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

function fmt(v: number): string {
  if (v === 0) return "0";
  if (Math.abs(v) >= 10000) return (v / 10000).toFixed(1) + "万";
  return v.toLocaleString();
}

export default function HrView({ data }: { data: any[] }) {
  const [filterDept, setFilterDept] = useState<string>("all");

  if (!data || data.length === 0) return <div className="text-muted-foreground text-center py-8">暂无人力数据</div>;

  const depts = Array.from(new Set(data.map((r: any) => r["\u8425\u4e1a\u90e8"] || ""))).filter(Boolean);
  const filtered = filterDept === "all" ? data : data.filter((r: any) => r["\u8425\u4e1a\u90e8"] === filterDept);

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
                    <td className="py-1.5 px-2 text-xs">{r["\u8425\u4e1a\u533a"] || ""}</td>
                    <td className="py-1.5 px-2 text-xs">{r["\u8425\u4e1a\u90e8"] || ""}</td>
                    <td className="py-1.5 px-2 text-xs font-medium">{r["\u59d3\u540d"] || ""}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs text-amber-600">{fmt(r["\u671f\u4ea4\u4fdd\u8d39"] || 0)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs">{fmt(r["\u975e\u90ae\u671f\u4ea4"] || 0)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs">{fmt(r["\u89c4\u4fdd"] || 0)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs">{fmt(r["\u671f\u4ea4\u6807\u4fdd"] || 0)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs">{r["\u4ef6\u6570"] || 0}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs">{r["\u7f51\u70b9\u603b\u6570"] || 0}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs text-primary">{r["\u6d3b\u52a8\u7f51\u70b9"] || 0}</td>
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
