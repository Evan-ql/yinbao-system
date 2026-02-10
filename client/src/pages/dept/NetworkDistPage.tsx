import { Card, CardContent } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import DeptSubPageWrapper from "@/components/DeptSubPageWrapper";
import { thCls, tdCls, monoR, rowHover, totalRow } from "@/components/dept/tableStyles";

export default function NetworkDistPage() {
  const { reportData } = useReport();
  const networkDist = reportData?.dept?.networkDist;

  return (
    <DeptSubPageWrapper title="网点分布" description="各营业部在各银行渠道的网点数量">
      <Card>
        <CardContent className="pt-4">
          {networkDist ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className={`text-left ${thCls} sticky left-0 bg-card z-10`}>营业部</th>
                    {networkDist.headers?.map((h: string) => (
                      <th key={h} className={`text-right ${thCls}`}>{h}</th>
                    ))}
                    <th className={`text-right ${thCls}`}>合计</th>
                  </tr>
                </thead>
                <tbody>
                  {networkDist.rows?.map((r: any) => (
                    <tr key={r.name} className={rowHover}>
                      <td className={`${tdCls} font-medium sticky left-0 bg-card z-10`}>{r.name}</td>
                      {r.values?.map((v: number, i: number) => (
                        <td key={i} className={`${monoR} ${v > 0 ? "" : "text-muted-foreground"}`}>{v}</td>
                      ))}
                      <td className={`${monoR} text-primary font-semibold`}>{r.total}</td>
                    </tr>
                  ))}
                  {networkDist.rows && networkDist.rows.length > 0 && (
                    <>
                      <tr className={totalRow}>
                        <td className={`${tdCls} sticky left-0 bg-card z-10`}>合计</td>
                        {networkDist.headers?.map((_: string, i: number) => {
                          const total = networkDist.rows.reduce((s: number, r: any) => s + (r.values?.[i] || 0), 0);
                          return <td key={i} className={monoR}>{total}</td>;
                        })}
                        <td className={`${monoR} text-primary font-semibold`}>
                          {networkDist.rows.reduce((s: number, r: any) => s + r.total, 0)}
                        </td>
                      </tr>
                      <tr className="bg-muted/30">
                        <td className={`${tdCls} sticky left-0 bg-card z-10`}>中支总网点</td>
                        <td className={`${monoR} text-primary font-semibold`} colSpan={(networkDist.headers?.length || 0) + 1}>
                          {networkDist.totalNetworks}
                        </td>
                      </tr>
                    </>
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
