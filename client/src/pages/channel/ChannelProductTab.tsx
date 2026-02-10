import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import { fmt, thCls, tdCls, monoR, rowHover, totalRow } from "@/components/dept/tableStyles";

export default function ChannelProductTab() {
  const { reportData } = useReport();
  const data = reportData?.channel;
  if (!data) return <div className="p-4 text-sm text-muted-foreground">请先导入数据</div>;

  const { productList, channelProductMatrix, channelProductTotals } = data;

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs text-muted-foreground">
        各银行渠道在每个产品上的年交保费分布
      </p>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">渠道产品分布</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className={`text-left ${thCls} sticky left-0 bg-background z-10`}>银行渠道</th>
                  {productList.map((prod: string) => (
                    <th key={prod} className={`text-right ${thCls} whitespace-nowrap`}>{prod}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {channelProductMatrix.map((row: any) => (
                  <tr key={row.name} className={rowHover}>
                    <td className={`${tdCls} font-medium sticky left-0 bg-background z-10`}>{row.name}</td>
                    {productList.map((prod: string) => {
                      const v = row.products[prod] || 0;
                      return (
                        <td key={prod} className={`${monoR} ${v > 0 ? "text-amber-600" : "text-muted-foreground/40"}`}>
                          {v > 0 ? fmt(v) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className={totalRow}>
                  <td className={`${tdCls} font-bold sticky left-0 bg-primary/5 z-10`}>中支合计</td>
                  {productList.map((prod: string) => {
                    const v = channelProductTotals[prod] || 0;
                    return (
                      <td key={prod} className={`${monoR} font-bold text-amber-600`}>
                        {v > 0 ? fmt(v) : "—"}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
