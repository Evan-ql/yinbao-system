import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

function fmt(v: number): string {
  if (v === 0) return "0";
  if (Math.abs(v) >= 10000) return (v / 10000).toFixed(1) + "万";
  return v.toLocaleString();
}

export default function CoreNetworkView({ data }: { data: any }) {
  const [filterBank, setFilterBank] = useState<string>("all");

  if (!data || !data.networks) return <div className="text-muted-foreground text-center py-8">暂无核心网点数据</div>;

  const banks = Array.from(new Set(data.networks.map((n: any) => n.totalBankName || ""))).filter(Boolean) as string[];
  const filtered = filterBank === "all" ? data.networks : data.networks.filter((n: any) => n.totalBankName === filterBank);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm text-muted-foreground">筛选银行：</label>
        <select
          value={filterBank}
          onChange={(e) => setFilterBank(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="all">全部 ({data.networks.length}个)</option>
          {banks.map((b: string) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">核心网点追踪 ({filtered.length}个)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium text-xs">银行</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium text-xs">网点</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium text-xs">客户经理</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">1月</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">2月</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">3月</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">合计</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">件数</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((n: any, i: number) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="py-1.5 px-2 text-xs">{n.totalBankName}</td>
                    <td className="py-1.5 px-2 text-xs font-medium">{n.agencyName}</td>
                    <td className="py-1.5 px-2 text-xs">{n.customerManager}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs">{fmt(n.months?.[1] || 0)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs">{fmt(n.months?.[2] || 0)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs">{fmt(n.months?.[3] || 0)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs text-amber-600">{fmt(n.total)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs">{n.js}</td>
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
