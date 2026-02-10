import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import DeptSubPageWrapper from "@/components/DeptSubPageWrapper";
import { pct, fmt, thCls, tdCls, monoR, rowHover, totalRow } from "@/components/dept/tableStyles";

export default function TieganPage() {
  const { reportData } = useReport();
  const tieganData = reportData?.dept?.tieganData;
  const tieganDetails = reportData?.dept?.tieganDetails;
  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "kaidan" | "weikaidan">("all");

  // 明细筛选
  const filteredDetails = (tieganDetails || []).filter((d: any) => {
    if (filterDept !== "all" && d.dept !== filterDept) return false;
    if (filterStatus === "kaidan" && !d.kaidan) return false;
    if (filterStatus === "weikaidan" && d.kaidan) return false;
    return true;
  });

  // 按营业部分组
  const deptNames = tieganData?.map((t: any) => t.name) || [];

  // 统计已开单/未开单人数
  const kaidanCount = filteredDetails.filter((d: any) => d.kaidan).length;
  const weiKaidanCount = filteredDetails.filter((d: any) => !d.kaidan).length;

  return (
    <DeptSubPageWrapper title="铁杆网点" description="各营业部铁杆网点开单情况">
      {/* 营业部汇总表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">营业部汇总</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className={`text-left ${thCls}`}>营业部</th>
                  <th className={`text-right ${thCls}`}>总数</th>
                  <th className={`text-right ${thCls}`}>开单</th>
                  <th className={`text-right ${thCls}`}>开单率</th>
                  <th className={`text-right ${thCls}`}>差距</th>
                </tr>
              </thead>
              <tbody>
                {tieganData?.map((t: any) => (
                  <tr key={t.name} className={rowHover}>
                    <td className={`${tdCls} font-medium`}>{t.name}</td>
                    <td className={monoR}>{t.total}</td>
                    <td className={`${monoR} text-emerald-600`}>{t.kaidan}</td>
                    <td className={`${monoR} ${t.kaidanRate >= 0.8 ? "text-emerald-600" : t.kaidanRate >= 0.5 ? "text-amber-600" : "text-rose-600"}`}>
                      {t.total > 0 ? pct(t.kaidanRate) : "-"}
                    </td>
                    <td className={`${monoR} ${t.gap > 0 ? "text-rose-600" : "text-emerald-600"}`}>{t.gap}</td>
                  </tr>
                ))}
                {tieganData && tieganData.length > 0 && (
                  <tr className={totalRow}>
                    <td className={tdCls}>邯郸中支</td>
                    <td className={monoR}>{tieganData.reduce((s: number, t: any) => s + t.total, 0)}</td>
                    <td className={`${monoR} text-emerald-600`}>{tieganData.reduce((s: number, t: any) => s + t.kaidan, 0)}</td>
                    <td className={monoR}>
                      {(() => {
                        const tt = tieganData.reduce((s: number, t: any) => s + t.total, 0);
                        const tk = tieganData.reduce((s: number, t: any) => s + t.kaidan, 0);
                        return tt > 0 ? pct(tk / tt) : "-";
                      })()}
                    </td>
                    <td className={monoR}>{tieganData.reduce((s: number, t: any) => s + t.gap, 0)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 客户经理明细表 */}
      {tieganDetails && tieganDetails.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base">客户经理明细</CardTitle>
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    已开单 {kaidanCount}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    未开单 {weiKaidanCount}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="h-7 px-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">全部营业部</option>
                  {deptNames.map((name: string) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
                  <button
                    onClick={() => setFilterStatus("all")}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      filterStatus === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    全部
                  </button>
                  <button
                    onClick={() => setFilterStatus("kaidan")}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      filterStatus === "kaidan" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    已开单
                  </button>
                  <button
                    onClick={() => setFilterStatus("weikaidan")}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      filterStatus === "weikaidan" ? "bg-rose-600 text-white" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    未开单
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto" style={{ maxHeight: "calc(100vh - 480px)" }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                  <tr className="border-b border-border">
                    <th className={`text-left ${thCls}`}>营业部</th>
                    <th className={`text-left ${thCls}`}>客户经理</th>
                    <th className={`text-left ${thCls}`}>网点名称</th>
                    <th className={`text-left ${thCls}`}>银行</th>
                    <th className={`text-right ${thCls}`}>年交保费</th>
                    <th className={`text-center ${thCls}`}>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDetails.map((d: any, i: number) => (
                    <tr key={i} className={`${rowHover} ${!d.kaidan ? "bg-rose-50/50" : ""}`}>
                      <td className={`${tdCls} text-muted-foreground`}>{d.dept}</td>
                      <td className={`${tdCls} font-medium`}>{d.customerManager}</td>
                      <td className={tdCls}>{d.agencyName}</td>
                      <td className={`${tdCls} text-muted-foreground`}>{d.bankName}</td>
                      <td className={`${monoR} ${d.kaidan ? "text-amber-600" : "text-muted-foreground"}`}>
                        {d.nj > 0 ? fmt(d.nj) : "0"}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        {d.kaidan ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
                            <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                            已开单
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-700">
                            <span className="w-1 h-1 rounded-full bg-rose-500"></span>
                            未开单
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredDetails.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                        暂无匹配数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </DeptSubPageWrapper>
  );
}
