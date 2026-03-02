import { Card, CardContent } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import DeptSubPageWrapper from "@/components/DeptSubPageWrapper";
import { fmt, thCls, tdCls, monoR, rowHover, totalRow } from "@/components/dept/tableStyles";
import { exportToExcel, ExportColumn } from "@/lib/exportExcel";
import ExportButton from "@/components/ExportButton";

export default function DailyPremiumPage() {
  const { reportData } = useReport();
  const dailyData = reportData?.dept?.dailyData;


  const handleExport = () => {
    if (!dailyData || dailyData.length === 0) return;
    const columns: ExportColumn[] = [
      { header: "日期", key: "date", width: 12 },
      { header: "当日保费", key: "daily", type: "number", width: 14 },
      { header: "累计保费", key: "cumulative", type: "number", width: 14 },
    ];
    exportToExcel({ columns, data: dailyData, fileName: "日保费数据" });
  };

  return (
    <DeptSubPageWrapper title="日保费数据" description="当日各营业部实时保费数据" extraControls={<ExportButton onClick={handleExport} />}>
      <Card>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className={`text-left ${thCls}`}>营业部</th>
                  <th className={`text-right ${thCls}`}>今日期交</th>
                  <th className={`text-right ${thCls}`}>非邮期交</th>
                  <th className={`text-right ${thCls}`}>今日趸交</th>
                  <th className={`text-right ${thCls}`}>底线目标</th>
                  <th className={`text-right ${thCls}`}>达成率</th>
                </tr>
              </thead>
              <tbody>
                {dailyData?.map((d: any) => (
                  <tr key={d.name} className={rowHover}>
                    <td className={`${tdCls} font-medium`}>{d.name}</td>
                    <td className={`${monoR} text-amber-600`}>{fmt(d.todayQj)}</td>
                    <td className={monoR}>{fmt(d.todayFeiyouQj)}</td>
                    <td className={monoR}>{fmt(d.todayDc)}</td>
                    <td className={`${monoR} text-muted-foreground`}>{fmt(d.target)}</td>
                    <td className={`${monoR} ${d.rate >= 1 ? "text-emerald-600" : d.rate > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                      {d.rate > 0 ? (d.rate * 100).toFixed(0) + "%" : "0"}
                    </td>
                  </tr>
                ))}
                {dailyData && dailyData.length > 0 && (
                  <tr className={totalRow}>
                    <td className={tdCls}>中支合计</td>
                    <td className={`${monoR} text-amber-600`}>{fmt(dailyData.reduce((s: number, d: any) => s + d.todayQj, 0))}</td>
                    <td className={monoR}>{fmt(dailyData.reduce((s: number, d: any) => s + d.todayFeiyouQj, 0))}</td>
                    <td className={monoR}>{fmt(dailyData.reduce((s: number, d: any) => s + d.todayDc, 0))}</td>
                    <td className={`${monoR} text-muted-foreground`}>{fmt(dailyData.reduce((s: number, d: any) => s + d.target, 0))}</td>
                    <td className={monoR}>
                      {(() => {
                        const totalQj = dailyData.reduce((s: number, d: any) => s + d.todayQj, 0);
                        const totalTarget = dailyData.reduce((s: number, d: any) => s + d.target, 0);
                        return totalTarget > 0 ? ((totalQj / totalTarget) * 100).toFixed(0) + "%" : "0";
                      })()}
                    </td>
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
