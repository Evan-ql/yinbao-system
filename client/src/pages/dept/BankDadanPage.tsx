import { Card, CardContent } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import DeptSubPageWrapper from "@/components/DeptSubPageWrapper";
import { fmt, thCls, tdCls, monoR, rowHover, totalRow } from "@/components/dept/tableStyles";
import { exportToExcel, ExportColumn } from "@/lib/exportExcel";
import ExportButton from "@/components/ExportButton";

export default function BankDadanPage() {
  const { reportData } = useReport();
  const bankDadanList = reportData?.dept?.bankDadanList;


  const handleExport = () => {
    if (!bankDadanList || bankDadanList.length === 0) return;
    const columns: ExportColumn[] = [
      { header: "渠道", key: "name", width: 18 },
      { header: "5万", key: "c5w", type: "number", width: 10 },
      { header: "10万", key: "c10w", type: "number", width: 10 },
      { header: "20万", key: "c20w", type: "number", width: 10 },
      { header: "50万", key: "c50w", type: "number", width: 10 },
      { header: "100万", key: "c100w", type: "number", width: 10 },
      { header: "总保费", key: "totalAbove10w", type: "number", width: 14 },
    ];
    exportToExcel({ columns, data: bankDadanList, fileName: "全渠道大单分布" });
  };

  return (
    <DeptSubPageWrapper title="全渠道大单分布" description="按银行渠道统计大单件数" extraControls={<ExportButton onClick={handleExport} />}>
      <Card>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className={`text-left ${thCls}`}>渠道</th>
                  <th className={`text-right ${thCls}`}>5万</th>
                  <th className={`text-right ${thCls}`}>10万</th>
                  <th className={`text-right ${thCls}`}>20万</th>
                  <th className={`text-right ${thCls}`}>50万</th>
                  <th className={`text-right ${thCls}`}>100万</th>
                  <th className={`text-right ${thCls}`}>总保费</th>
                </tr>
              </thead>
              <tbody>
                {bankDadanList?.map((b: any) => (
                  <tr key={b.name} className={rowHover}>
                    <td className={`${tdCls} font-medium`}>{b.name}</td>
                    <td className={monoR}>{b.c5w}</td>
                    <td className={monoR}>{b.c10w}</td>
                    <td className={`${monoR} text-amber-600`}>{b.c20w}</td>
                    <td className={`${monoR} text-amber-600`}>{b.c50w}</td>
                    <td className={`${monoR} text-emerald-600`}>{b.c100w}</td>
                    <td className={`${monoR} text-primary`}>{fmt(b.totalAbove10w)}</td>
                  </tr>
                ))}
                {bankDadanList && bankDadanList.length > 0 && (
                  <tr className={totalRow}>
                    <td className={tdCls}>中支合计</td>
                    <td className={monoR}>{bankDadanList.reduce((s: number, b: any) => s + b.c5w, 0)}</td>
                    <td className={monoR}>{bankDadanList.reduce((s: number, b: any) => s + b.c10w, 0)}</td>
                    <td className={monoR}>{bankDadanList.reduce((s: number, b: any) => s + b.c20w, 0)}</td>
                    <td className={monoR}>{bankDadanList.reduce((s: number, b: any) => s + b.c50w, 0)}</td>
                    <td className={monoR}>{bankDadanList.reduce((s: number, b: any) => s + b.c100w, 0)}</td>
                    <td className={`${monoR} text-primary`}>{fmt(bankDadanList.reduce((s: number, b: any) => s + b.totalAbove10w, 0))}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {(!bankDadanList || bankDadanList.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">暂无数据</p>
          )}
        </CardContent>
      </Card>
    </DeptSubPageWrapper>
  );
}
