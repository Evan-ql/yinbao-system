import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import { fmt, pct, thCls, tdCls, monoR, rowHover, totalRow } from "@/components/dept/tableStyles";

export default function ProductDetailTab() {
  const { reportData } = useReport();
  const data = reportData?.channel;
  if (!data) return <div className="p-4 text-sm text-muted-foreground">请先导入数据</div>;

  const { productDetail, productDetailTotals } = data;

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs text-muted-foreground">
        各产品年交保费、占比、按缴费年限分布及趸交数据
      </p>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">业务数据—产品</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className={`text-left ${thCls}`}>产品名称</th>
                  <th className={`text-right ${thCls}`}>年交</th>
                  <th className={`text-right ${thCls}`}>占比</th>
                  <th className={`text-right ${thCls}`}>3年</th>
                  <th className={`text-right ${thCls}`}>5年</th>
                  <th className={`text-right ${thCls}`}>趸交</th>
                </tr>
              </thead>
              <tbody>
                {productDetail.map((p: any) => (
                  <tr key={p.name} className={rowHover}>
                    <td className={`${tdCls} font-medium`}>{p.name}</td>
                    <td className={`${monoR} text-amber-600`}>{fmt(p.qj)}</td>
                    <td className={monoR}>{pct(p.ratio)}</td>
                    <td className={`${monoR} ${p.y3 > 0 ? "" : "text-muted-foreground/40"}`}>
                      {p.y3 > 0 ? fmt(p.y3) : "—"}
                    </td>
                    <td className={`${monoR} ${p.y5 > 0 ? "" : "text-muted-foreground/40"}`}>
                      {p.y5 > 0 ? fmt(p.y5) : "—"}
                    </td>
                    <td className={`${monoR} ${p.dc > 0 ? "text-blue-600" : "text-muted-foreground/40"}`}>
                      {p.dc > 0 ? fmt(p.dc) : "—"}
                    </td>
                  </tr>
                ))}
                <tr className={totalRow}>
                  <td className={`${tdCls} font-bold`}>中支合计</td>
                  <td className={`${monoR} text-amber-600 font-bold`}>{fmt(productDetailTotals.qj)}</td>
                  <td className={`${monoR} font-bold`}>{productDetailTotals.qj > 0 ? pct(1) : "—"}</td>
                  <td className={`${monoR} font-bold`}>{fmt(productDetailTotals.y3)}</td>
                  <td className={`${monoR} font-bold`}>{fmt(productDetailTotals.y5)}</td>
                  <td className={`${monoR} text-blue-600 font-bold`}>{fmt(productDetailTotals.dc)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
