import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

function fmt(v: number): string {
  if (v === 0) return "0";
  if (Math.abs(v) >= 10000) return (v / 10000).toFixed(1) + "万";
  return v.toLocaleString();
}

export default function TrackingView({ data }: { data: any }) {
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  if (!data || !data.groups) return <div className="text-muted-foreground text-center py-8">暂无追踪数据</div>;

  return (
    <div className="space-y-4">
      {data.groups.map((group: any) => (
        <Card key={group.deptName}>
          <CardHeader
            className="pb-3 cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => setExpandedDept(expandedDept === group.deptName ? null : group.deptName)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{group.deptName}</CardTitle>
              <span className="text-sm text-muted-foreground">{group.members.length} 人</span>
            </div>
          </CardHeader>
          {(expandedDept === group.deptName || expandedDept === null) && (
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium text-xs">姓名</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">期交保费</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">非邮期交</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">规保</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">价值趸</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">规模趸</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">标保</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">件数</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">网点总数</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">活动网点</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.members.map((m: any) => (
                      <tr key={m.name} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                        <td className="py-1.5 px-2 text-xs font-medium">{m.name}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-xs text-amber-600">{fmt(m.qjbf)}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-xs">{fmt(m.feiyouQj)}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-xs">{fmt(m.guibao)}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-xs">{fmt(m.jzdc)}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-xs text-emerald-600">{fmt(m.gmdc)}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-xs">{fmt(m.bb)}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-xs">{m.js}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-xs">{m.wdTotal}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-xs text-primary">{m.activeWd}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
