import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function fmt(v: number): string {
  if (v === 0) return "0";
  if (Math.abs(v) >= 10000) return (v / 10000).toFixed(1) + "万";
  return v.toLocaleString();
}

export default function ChannelView({ data }: { data: any }) {
  if (!data) return null;
  const { channels, monthlyTrend, products, totals } = data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">渠道汇总</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">渠道</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">年交</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">趸交</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">件数</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">标保</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">总网点</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">活动网点</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((c: any) => (
                  <tr key={c.name} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="py-2 px-3 font-medium">{c.name}</td>
                    <td className="py-2 px-3 text-right font-mono text-amber-600">{fmt(c.qj)}</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-600">{fmt(c.dc)}</td>
                    <td className="py-2 px-3 text-right font-mono">{c.js}</td>
                    <td className="py-2 px-3 text-right font-mono">{fmt(c.bb)}</td>
                    <td className="py-2 px-3 text-right font-mono">{c.netTotal}</td>
                    <td className="py-2 px-3 text-right font-mono text-primary">{c.netActive}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-primary/30 font-bold bg-primary/5">
                  <td className="py-2 px-3">合计</td>
                  <td className="py-2 px-3 text-right font-mono text-amber-600">{fmt(totals.totalQj)}</td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-600">{fmt(totals.totalDc)}</td>
                  <td className="py-2 px-3 text-right font-mono">{totals.totalJs}</td>
                  <td className="py-2 px-3 text-right font-mono">{fmt(totals.totalBb)}</td>
                  <td className="py-2 px-3 text-right font-mono" colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Product Distribution */}
      {products && products.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">产品分布（年交）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">产品</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">保费</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">占比</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p: any) => {
                    const totalProd = products.reduce((s: number, x: any) => s + x.value, 0);
                    const pct = totalProd > 0 ? ((p.value / totalProd) * 100).toFixed(1) : "0";
                    return (
                      <tr key={p.name} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                        <td className="py-2 px-3 font-medium">{p.name}</td>
                        <td className="py-2 px-3 text-right font-mono text-amber-600">{fmt(p.value)}</td>
                        <td className="py-2 px-3 text-right font-mono text-muted-foreground">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
