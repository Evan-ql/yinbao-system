import { Card, CardContent } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import DeptSubPageWrapper from "@/components/DeptSubPageWrapper";
import { fmt, thCls, tdCls, monoR, rowHover, totalRow } from "@/components/dept/tableStyles";

export default function DadanPage() {
  const { reportData } = useReport();
  const dadanData = reportData?.dept?.dadanData;

  return (
    <DeptSubPageWrapper title="部门大单分布" description="各营业部大单件数分布">
      <Card>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className={`text-left ${thCls}`}>营业部</th>
                  <th className={`text-right ${thCls}`}>5万</th>
                  <th className={`text-right ${thCls}`}>10万</th>
                  <th className={`text-right ${thCls}`}>20万</th>
                  <th className={`text-right ${thCls}`}>50万</th>
                  <th className={`text-right ${thCls}`}>100万</th>
                  <th className={`text-right ${thCls}`}>10万+总保费</th>
                </tr>
              </thead>
              <tbody>
                {dadanData?.map((d: any) => (
                  <tr key={d.name} className={rowHover}>
                    <td className={`${tdCls} font-medium`}>{d.name}</td>
                    <td className={monoR}>{d.c5w}</td>
                    <td className={monoR}>{d.c10w}</td>
                    <td className={`${monoR} text-amber-600`}>{d.c20w}</td>
                    <td className={`${monoR} text-amber-600`}>{d.c50w}</td>
                    <td className={`${monoR} text-emerald-600`}>{d.c100w}</td>
                    <td className={`${monoR} text-primary`}>{fmt(d.totalAbove10w)}</td>
                  </tr>
                ))}
                {dadanData && dadanData.length > 0 && (
                  <tr className={totalRow}>
                    <td className={tdCls}>中支合计</td>
                    <td className={monoR}>{dadanData.reduce((s: number, d: any) => s + d.c5w, 0)}</td>
                    <td className={monoR}>{dadanData.reduce((s: number, d: any) => s + d.c10w, 0)}</td>
                    <td className={monoR}>{dadanData.reduce((s: number, d: any) => s + d.c20w, 0)}</td>
                    <td className={monoR}>{dadanData.reduce((s: number, d: any) => s + d.c50w, 0)}</td>
                    <td className={monoR}>{dadanData.reduce((s: number, d: any) => s + d.c100w, 0)}</td>
                    <td className={`${monoR} text-primary`}>{fmt(dadanData.reduce((s: number, d: any) => s + d.totalAbove10w, 0))}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </DeptSubPageWrapper>
  );
}
