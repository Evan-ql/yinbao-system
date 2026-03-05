import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import DeptSubPageWrapper from "@/components/DeptSubPageWrapper";
import { pct, fmt, thCls, tdCls, monoR, rowHover, totalRow } from "@/components/dept/tableStyles";
import { exportToExcel, ExportColumn, ExportSheet } from "@/lib/exportExcel";
import ExportButton from "@/components/ExportButton";

export default function HrDataPage() {
  const { reportData } = useReport();
  const hrStats = reportData?.dept?.hrStats;
  const hrManagerDetails = reportData?.dept?.hrManagerDetails;
  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "kaidan" | "weikaidan">("all");
  const [expandedMgr, setExpandedMgr] = useState<Set<string>>(new Set());

  // 营业部列表
  const deptNames = hrStats?.map((h: any) => h.name) || [];

  // 筛选明细
  const filteredDetails = (hrManagerDetails || []).filter((d: any) => {
    if (filterDept !== "all" && d.dept !== filterDept) return false;
    if (filterStatus === "kaidan" && !d.kaidan) return false;
    if (filterStatus === "weikaidan" && d.kaidan) return false;
    return true;
  });

  const kaidanCount = filteredDetails.filter((d: any) => d.kaidan).length;
  const weiKaidanCount = filteredDetails.filter((d: any) => !d.kaidan).length;

  const toggleExpand = (key: string) => {
    setExpandedMgr(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ─── 导出：营业部汇总 ───
  const handleExportSummary = () => {
    if (!hrStats || hrStats.length === 0) return;
    const summaryColumns: ExportColumn[] = [
      { header: "排名", key: "rank", width: 8 },
      { header: "营业部", key: "name", width: 14 },
      { header: "挂网", key: "guawang", type: "number", width: 10 },
      { header: "破零人力", key: "poling", type: "number", width: 10 },
      { header: "开单率", key: "kaidanRateStr", width: 10 },
      { header: "规保2万", key: "guibao2w", type: "number", width: 10 },
    ];
    const summaryData = hrStats.map((h: any) => ({
      rank: h.rank,
      name: h.name,
      guawang: h.guawang,
      poling: h.poling,
      kaidanRateStr: pct(h.kaidanRate),
      guibao2w: h.guibao2w,
    }));
    const summaryTotal = {
      rank: "",
      name: "邯郸中支",
      guawang: hrStats.reduce((s: number, h: any) => s + h.guawang, 0),
      poling: hrStats.reduce((s: number, h: any) => s + h.poling, 0),
      kaidanRateStr: (() => {
        const totalGw = hrStats.reduce((s: number, h: any) => s + h.guawang, 0);
        const totalPl = hrStats.reduce((s: number, h: any) => s + h.poling, 0);
        return totalGw > 0 ? pct(totalPl / totalGw) : "0%";
      })(),
      guibao2w: hrStats.reduce((s: number, h: any) => s + h.guibao2w, 0),
    };

    exportToExcel({
      columns: summaryColumns,
      data: summaryData,
      totalRow: summaryTotal,
      totalLabel: "邯郸中支",
      title: "人力数据-营业部汇总",
      fileName: "人力数据-营业部汇总",
    });
  };

  // ─── 导出：在职经理开单明细（3个Sheet：全部/已开单/未开单）───
  const handleExportDetail = () => {
    if (!hrManagerDetails || hrManagerDetails.length === 0) return;

    const detailColumns: ExportColumn[] = [
      { header: "营业部", key: "dept", width: 14 },
      { header: "姓名", key: "name", width: 10 },
      { header: "期交保费", key: "qjbf", type: "number", width: 14 },
      { header: "件数", key: "js", type: "number", width: 10 },
      { header: "开单状态", key: "status", width: 10 },
      { header: "网点名称", key: "wdName", width: 30 },
      { header: "银行", key: "bankName", width: 14 },
      { header: "网点件数", key: "netJs", type: "number", width: 10 },
      { header: "网点金额", key: "netAmount", type: "number", width: 14 },
    ];

    // 构建明细数据（展开网点）
    const buildDetailData = (list: any[]) => {
      const result: any[] = [];
      for (const d of list) {
        if (d.networks && d.networks.length > 0) {
          for (const n of d.networks) {
            result.push({
              dept: d.dept,
              name: d.name,
              qjbf: d.qjbf,
              js: d.js,
              status: d.kaidan ? "已开单" : "未开单",
              wdName: n.wdName,
              bankName: n.bankName,
              netJs: n.js,
              netAmount: n.amount,
            });
          }
        } else {
          result.push({
            dept: d.dept,
            name: d.name,
            qjbf: d.qjbf,
            js: d.js,
            status: d.kaidan ? "已开单" : "未开单",
            wdName: "",
            bankName: "",
            netJs: 0,
            netAmount: 0,
          });
        }
      }
      return result;
    };

    const allDetails = hrManagerDetails;
    const kaidanDetails = allDetails.filter((d: any) => d.kaidan);
    const weiKaidanDetails = allDetails.filter((d: any) => !d.kaidan);

    const sheets: ExportSheet[] = [
      {
        sheetName: "全部",
        title: "在职经理开单明细-全部",
        columns: detailColumns,
        data: buildDetailData(allDetails),
      },
      {
        sheetName: "已开单",
        title: "在职经理开单明细-已开单",
        columns: detailColumns,
        data: buildDetailData(kaidanDetails),
      },
      {
        sheetName: "未开单",
        title: "在职经理开单明细-未开单",
        columns: detailColumns,
        data: buildDetailData(weiKaidanDetails),
      },
    ];

    exportToExcel({
      columns: [],
      fileName: "在职经理开单明细",
      sheets,
    });
  };

  return (
    <DeptSubPageWrapper title="人力数据" description="各营业部人力与开单情况"
      extraControls={<ExportButton onClick={handleExportSummary} label="导出" />}>
      {/* 原有营业部汇总表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">营业部汇总</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className={`text-left ${thCls}`}>排名</th>
                  <th className={`text-left ${thCls}`}>营业部</th>
                  <th className={`text-right ${thCls}`}>挂网</th>
                  <th className={`text-right ${thCls}`}>破零人力</th>
                  <th className={`text-right ${thCls}`}>开单率</th>
                  <th className={`text-right ${thCls}`}>规保2万</th>
                </tr>
              </thead>
              <tbody>
                {hrStats?.map((h: any) => (
                  <tr key={h.name} className={rowHover}>
                    <td className={tdCls}>{h.rank}</td>
                    <td className={`${tdCls} font-medium`}>{h.name}</td>
                    <td className={monoR}>{h.guawang}</td>
                    <td className={`${monoR} text-emerald-600`}>{h.poling}</td>
                    <td className={`${monoR} ${h.kaidanRate >= 0.8 ? "text-emerald-600" : h.kaidanRate >= 0.5 ? "text-amber-600" : "text-rose-600"}`}>
                      {pct(h.kaidanRate)}
                    </td>
                    <td className={`${monoR} text-primary`}>{h.guibao2w}</td>
                  </tr>
                ))}
                {hrStats && hrStats.length > 0 && (
                  <tr className={totalRow}>
                    <td className={tdCls} colSpan={2}>邯郸中支</td>
                    <td className={monoR}>{hrStats.reduce((s: number, h: any) => s + h.guawang, 0)}</td>
                    <td className={`${monoR} text-emerald-600`}>{hrStats.reduce((s: number, h: any) => s + h.poling, 0)}</td>
                    <td className={monoR}>
                      {(() => {
                        const totalGw = hrStats.reduce((s: number, h: any) => s + h.guawang, 0);
                        const totalPl = hrStats.reduce((s: number, h: any) => s + h.poling, 0);
                        return totalGw > 0 ? pct(totalPl / totalGw) : "0%";
                      })()}
                    </td>
                    <td className={`${monoR} text-primary`}>{hrStats.reduce((s: number, h: any) => s + h.guibao2w, 0)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 在职经理开单明细 */}
      {hrManagerDetails && hrManagerDetails.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base">在职经理开单明细</CardTitle>
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
                <ExportButton onClick={handleExportDetail} label="导出" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto" style={{ maxHeight: "calc(100vh - 480px)" }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                  <tr className="border-b border-border">
                    <th className={`text-left ${thCls}`} style={{ width: 28 }}></th>
                    <th className={`text-left ${thCls}`}>营业部</th>
                    <th className={`text-left ${thCls}`}>姓名</th>
                    <th className={`text-right ${thCls}`}>期交保费</th>
                    <th className={`text-right ${thCls}`}>件数</th>
                    <th className={`text-center ${thCls}`}>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDetails.map((d: any, i: number) => {
                    const key = `${d.code}-${i}`;
                    const isExpanded = expandedMgr.has(key);
                    const hasNetworks = d.networks && d.networks.length > 0;
                    return (
                      <>
                        <tr
                          key={key}
                          className={`${rowHover} ${!d.kaidan ? "bg-rose-50/50" : ""} ${hasNetworks ? "cursor-pointer" : ""}`}
                          onClick={() => hasNetworks && toggleExpand(key)}
                        >
                          <td className={`${tdCls} text-center`}>
                            {hasNetworks && (
                              <span className={`inline-block transition-transform text-muted-foreground ${isExpanded ? "rotate-90" : ""}`}>
                                ▶
                              </span>
                            )}
                          </td>
                          <td className={`${tdCls} text-muted-foreground`}>{d.dept}</td>
                          <td className={`${tdCls} font-medium`}>{d.name}</td>
                          <td className={`${monoR} ${d.kaidan ? "text-amber-600" : "text-muted-foreground"}`}>
                            {d.qjbf > 0 ? fmt(d.qjbf) : "0"}
                          </td>
                          <td className={monoR}>{d.js}</td>
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
                        {isExpanded && hasNetworks && (
                          <tr key={`${key}-detail`}>
                            <td colSpan={6} className="p-0">
                              <div className="bg-blue-50/50 border-l-2 border-blue-300 ml-6 mr-2 my-1 rounded">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-blue-200/60">
                                      <th className="text-left py-1.5 px-3 text-blue-600 font-medium">网点名称</th>
                                      <th className="text-right py-1.5 px-3 text-blue-600 font-medium">件数</th>
                                      <th className="text-right py-1.5 px-3 text-blue-600 font-medium">金额</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {d.networks.map((n: any, ni: number) => (
                                      <tr key={ni} className="border-b border-blue-100/60 hover:bg-blue-100/30">
                                        <td className="py-1 px-3 text-foreground">{n.wdName}</td>
                                        <td className="py-1 px-3 text-right font-mono">{n.js}</td>
                                        <td className="py-1 px-3 text-right font-mono text-amber-600">{n.amount > 0 ? fmt(n.amount) : "0"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
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
