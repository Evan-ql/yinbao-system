import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import { thCls, tdCls, monoR, rowHover, totalRow } from "@/components/dept/tableStyles";

export default function NetworkOpenTab() {
  const { reportData } = useReport();
  const data = reportData?.channel;
  if (!data) return <div className="p-4 text-sm text-muted-foreground">请先导入数据</div>;

  const { deptManagerOrder, networkData, networkTotals, grandNetTotal, grandNetActive } = data;

  if (!networkData || networkData.length === 0) {
    return (
      <div className="p-4 space-y-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              暂无网点数据
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs text-muted-foreground">
        各银行渠道在各营业部的网点数和开单网点数（每个渠道两行：总网点 / 开单网点）
      </p>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">网点数据—开单网点</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className={`text-left ${thCls} sticky left-0 bg-background z-10 min-w-[120px]`}>营业部</th>
                  {deptManagerOrder.map((dept: string) => (
                    <th key={dept} className={`text-right ${thCls} whitespace-nowrap`}>{dept}</th>
                  ))}
                  <th className={`text-right ${thCls} font-bold`}>渠道</th>
                </tr>
              </thead>
              <tbody>
                {networkData.map((row: any) => (
                  <>
                    {/* 总网点行 */}
                    <tr key={`${row.bank}-total`} className={`${rowHover} border-t border-border`}>
                      <td className={`${tdCls} font-medium sticky left-0 bg-background z-10 whitespace-nowrap`}>
                        {row.bank}
                      </td>
                      {deptManagerOrder.map((dept: string) => {
                        const v = row.depts[dept]?.total || 0;
                        return (
                          <td key={dept} className={`${monoR} ${v > 0 ? "" : "text-muted-foreground/40"}`}>
                            {v > 0 ? v : "—"}
                          </td>
                        );
                      })}
                      <td className={`${monoR} font-semibold`}>{row.totalNet}</td>
                    </tr>
                    {/* 开单网点行 */}
                    <tr key={`${row.bank}-active`} className={`${rowHover} bg-emerald-50/30 dark:bg-emerald-950/10`}>
                      <td className={`${tdCls} text-emerald-600 text-xs sticky left-0 bg-emerald-50/30 dark:bg-emerald-950/10 z-10`}>
                        开单网点
                      </td>
                      {deptManagerOrder.map((dept: string) => {
                        const active = row.depts[dept]?.active || 0;
                        const total = row.depts[dept]?.total || 0;
                        return (
                          <td key={dept} className={`${monoR} text-xs ${active > 0 ? "text-emerald-600" : "text-muted-foreground/40"}`}>
                            {active > 0 ? active : total > 0 ? "0" : "—"}
                          </td>
                        );
                      })}
                      <td className={`${monoR} text-xs text-emerald-600 font-semibold`}>{row.activeNet}</td>
                    </tr>
                  </>
                ))}
                {/* 中支网点总数 */}
                <tr className={`${totalRow} border-t-2 border-border`}>
                  <td className={`${tdCls} font-bold sticky left-0 bg-primary/5 z-10`}>中支网点总数</td>
                  {deptManagerOrder.map((dept: string) => (
                    <td key={dept} className={`${monoR} font-bold`}>
                      {networkTotals[dept]?.total || 0}
                    </td>
                  ))}
                  <td className={`${monoR} font-bold`}>{grandNetTotal}</td>
                </tr>
                {/* 开单网点合计 */}
                <tr className={`${totalRow} bg-emerald-50/50 dark:bg-emerald-950/20`}>
                  <td className={`${tdCls} font-bold text-emerald-600 sticky left-0 bg-emerald-50/50 dark:bg-emerald-950/20 z-10`}>
                    开单网点
                  </td>
                  {deptManagerOrder.map((dept: string) => (
                    <td key={dept} className={`${monoR} font-bold text-emerald-600`}>
                      {networkTotals[dept]?.active || 0}
                    </td>
                  ))}
                  <td className={`${monoR} font-bold text-emerald-600`}>{grandNetActive}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
