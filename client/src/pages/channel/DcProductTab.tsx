import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import { fmt, thCls, tdCls, monoR, rowHover, totalRow } from "@/components/dept/tableStyles";

export default function DcProductTab() {
  const { reportData } = useReport();
  const data = reportData?.channel;
  if (!data) return <div className="p-4 text-sm text-muted-foreground">请先导入数据</div>;

  const { dcProducts, dcProductTotal } = data;

  if (!dcProducts || dcProducts.length === 0) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-xs text-muted-foreground">趸交产品月度保费数据</p>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">趸交产品数据</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              暂无趸交产品数据
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs text-muted-foreground">
        趸交产品月度保费数据
      </p>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">趸交产品数据</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className={`text-left ${thCls}`}>产品名称</th>
                  <th className={`text-right ${thCls}`}>月度保费</th>
                  <th className={`text-right ${thCls}`}>占比</th>
                </tr>
              </thead>
              <tbody>
                {dcProducts.map((p: any) => (
                  <tr key={p.name} className={rowHover}>
                    <td className={`${tdCls} font-medium`}>{p.name}</td>
                    <td className={`${monoR} text-blue-600`}>{fmt(p.value)}</td>
                    <td className={monoR}>
                      {dcProductTotal > 0 ? (p.value / dcProductTotal * 100).toFixed(1) + "%" : "—"}
                    </td>
                  </tr>
                ))}
                <tr className={totalRow}>
                  <td className={`${tdCls} font-bold`}>合计</td>
                  <td className={`${monoR} text-blue-600 font-bold`}>{fmt(dcProductTotal)}</td>
                  <td className={`${monoR} font-bold`}>100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
