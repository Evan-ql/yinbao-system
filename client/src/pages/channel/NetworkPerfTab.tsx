import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import { fmt, pct, thCls, tdCls, monoR, rowHover, totalRow } from "@/components/dept/tableStyles";
import { exportToExcel, ExportColumn } from "@/lib/exportExcel";
import ExportButton from "@/components/ExportButton";

export default function NetworkPerfTab() {
  const { reportData } = useReport();
  const data = reportData?.channel;
  const [mode, setMode] = useState<"qj" | "dc">("qj");
  const [bankFilter, setBankFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "notOpen">("all");

  if (!data) return <div className="p-4 text-sm text-muted-foreground">请先导入数据</div>;

  const { networkPerformance = [], networkPerfTotals = {} } = data;

  const bankList = useMemo(() => {
    const banks = new Set<string>();
    networkPerformance.forEach((n: any) => { if (n.bank) banks.add(n.bank); });
    return Array.from(banks).sort();
  }, [networkPerformance]);

  // 支行列表：根据当前银行筛选动态生成
  const branchList = useMemo(() => {
    const branches = new Set<string>();
    networkPerformance.forEach((n: any) => {
      if (n.branch && (bankFilter === "all" || n.bank === bankFilter)) {
        branches.add(n.branch);
      }
    });
    return Array.from(branches).sort();
  }, [networkPerformance, bankFilter]);

  const deptList = useMemo(() => {
    const depts = new Set<string>();
    networkPerformance.forEach((n: any) => { if (n.deptManager) depts.add(n.deptManager); });
    return Array.from(depts).sort();
  }, [networkPerformance]);


  const filtered = useMemo(() => {
    let rows = networkPerformance;
    if (bankFilter !== "all") rows = rows.filter((n: any) => n.bank === bankFilter);
    if (branchFilter !== "all") rows = rows.filter((n: any) => n.branch === branchFilter);
    if (deptFilter !== "all") rows = rows.filter((n: any) => n.deptManager === deptFilter);
    if (statusFilter === "open") rows = rows.filter((n: any) => (mode === "qj" ? n.qj : n.dc) > 0);
    if (statusFilter === "notOpen") rows = rows.filter((n: any) => (mode === "qj" ? n.qj : n.dc) === 0);
    return [...rows].sort((a: any, b: any) =>
      mode === "qj" ? b.qj - a.qj : b.dc - a.dc
    );
  }, [networkPerformance, bankFilter, branchFilter, deptFilter, statusFilter, mode]);

  const filteredTotals = useMemo(() => ({
    baofei: filtered.reduce((s: number, n: any) => s + (mode === "qj" ? n.qj : n.dc), 0),
    js: filtered.reduce((s: number, n: any) => s + n.js, 0),
    target: filtered.reduce((s: number, n: any) => s + (mode === "qj" ? n.qjTarget : n.dcTarget), 0),
  }), [filtered, mode]);

  const isQj = mode === "qj";

  // 当银行筛选变化时，重置支行筛选
  const handleBankFilterChange = (value: string) => {
    setBankFilter(value);
    setBranchFilter("all");
  };

  const buildSheetData = (modeType: "qj" | "dc") => {
    const isQ = modeType === "qj";
    const label = isQ ? "期交" : "趸交";
    const columns: ExportColumn[] = [
      { header: "银行", key: "bank", width: 14 },
      { header: "支行", key: "branch", width: 12 },
      { header: "网点名称", key: "name", width: 20 },
      { header: "简称", key: "shortName", width: 14 },
      { header: "部门经理", key: "deptManager", width: 10 },
      { header: "客户经理", key: "customerManager", width: 10 },
      { header: label, key: "premium", type: "number", width: 14 },
      { header: "件数", key: "js", type: "number", width: 10 },
      { header: `${label}目标`, key: "target", type: "number", width: 14 },
      { header: "完成率", key: "completionStr", width: 10 },
      { header: "差距", key: "gap", type: "number", width: 14 },
    ];
    const allRows = [...networkPerformance].sort((a: any, b: any) =>
      isQ ? b.qj - a.qj : b.dc - a.dc
    );
    const exportData = allRows.map((n: any) => {
      const premium = isQ ? n.qj : n.dc;
      const tgt = isQ ? n.qjTarget : n.dcTarget;
      return {
        bank: n.bank,
        branch: n.branch || "",
        name: n.name,
        shortName: n.shortName || "",
        deptManager: n.deptManager,
        customerManager: n.customerManager,
        premium,
        js: n.js,
        target: tgt,
        completionStr: tgt > 0 ? ((premium / tgt) * 100).toFixed(1) + "%" : "-",
        gap: tgt > 0 ? premium - tgt : 0,
      };
    });
    const totalBaofei = allRows.reduce((s: number, n: any) => s + (isQ ? n.qj : n.dc), 0);
    const totalJs = allRows.reduce((s: number, n: any) => s + n.js, 0);
    const totalTarget = allRows.reduce((s: number, n: any) => s + (isQ ? n.qjTarget : n.dcTarget), 0);
    const totalRowData: any = {
      bank: "合计",
      branch: "",
      name: "",
      shortName: "",
      deptManager: "",
      customerManager: "",
      premium: totalBaofei,
      js: totalJs,
      target: totalTarget,
      completionStr: totalTarget > 0 ? ((totalBaofei / totalTarget) * 100).toFixed(1) + "%" : "-",
      gap: totalTarget > 0 ? totalBaofei - totalTarget : 0,
    };
    return { columns, exportData, totalRowData };
  };

  const handleExport = () => {
    const qjSheet = buildSheetData("qj");
    const dcSheet = buildSheetData("dc");
    exportToExcel({
      fileName: "网点业绩明细",
      sheets: [
        { sheetName: "期交", columns: qjSheet.columns, data: qjSheet.exportData, totalRow: qjSheet.totalRowData, totalLabel: "合计" },
        { sheetName: "趸交", columns: dcSheet.columns, data: dcSheet.exportData, totalRow: dcSheet.totalRowData, totalLabel: "合计" },
      ],
    });
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-muted-foreground">
          网点业绩明细（{isQj ? "期交" : "趸交"}）
        </p>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <ExportButton onClick={handleExport} />
          <select
            className="text-xs border border-border rounded px-2 py-1.5 bg-background"
            value={bankFilter}
            onChange={(e) => handleBankFilterChange(e.target.value)}
          >
            <option value="all">全部渠道</option>
            {bankList.map((b: string) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <select
            className="text-xs border border-border rounded px-2 py-1.5 bg-background"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
          >
            <option value="all">全部支行</option>
            {branchList.map((b: string) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <select
            className="text-xs border border-border rounded px-2 py-1.5 bg-background"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="all">全部营业部</option>
            {deptList.map((d: string) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs">
            <button
              className={`px-3 py-1.5 transition-colors ${
                mode === "qj"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setMode("qj")}
            >
              期交
            </button>
            <button
              className={`px-3 py-1.5 transition-colors ${
                mode === "dc"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setMode("dc")}
            >
              趸交
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 text-xs">
        <button
          className={`px-2 py-1 rounded transition-colors cursor-pointer ${
            statusFilter === "all"
              ? "bg-blue-500 text-white ring-2 ring-blue-300"
              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
          }`}
          onClick={() => setStatusFilter("all")}
        >
          共 {networkPerformance.filter((n: any) =>
            (bankFilter === "all" || n.bank === bankFilter) &&
            (branchFilter === "all" || n.branch === branchFilter) &&
            (deptFilter === "all" || n.deptManager === deptFilter)
          ).length} 个网点
        </button>
        <button
          className={`px-2 py-1 rounded transition-colors cursor-pointer ${
            statusFilter === "open"
              ? "bg-green-500 text-white ring-2 ring-green-300"
              : "bg-green-100 text-green-700 hover:bg-green-200"
          }`}
          onClick={() => setStatusFilter(statusFilter === "open" ? "all" : "open")}
        >
          已开单 {networkPerformance.filter((n: any) =>
            (bankFilter === "all" || n.bank === bankFilter) &&
            (branchFilter === "all" || n.branch === branchFilter) &&
            (deptFilter === "all" || n.deptManager === deptFilter) &&
            (isQj ? n.qj : n.dc) > 0
          ).length}
        </button>
        <button
          className={`px-2 py-1 rounded transition-colors cursor-pointer ${
            statusFilter === "notOpen"
              ? "bg-red-500 text-white ring-2 ring-red-300"
              : "bg-red-100 text-red-700 hover:bg-red-200"
          }`}
          onClick={() => setStatusFilter(statusFilter === "notOpen" ? "all" : "notOpen")}
        >
          未开单 {networkPerformance.filter((n: any) =>
            (bankFilter === "all" || n.bank === bankFilter) &&
            (branchFilter === "all" || n.branch === branchFilter) &&
            (deptFilter === "all" || n.deptManager === deptFilter) &&
            (isQj ? n.qj : n.dc) === 0
          ).length}
        </button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className={thCls}>序号</th>
                  <th className={thCls}>银行渠道</th>
                  <th className={thCls}>支行</th>
                  <th className={thCls}>网点名称</th>
                  <th className={thCls}>营业部经理</th>
                  <th className={thCls}>客户经理</th>
                  <th className={thCls}>{isQj ? "期交保费" : "趸交保费"}</th>
                  <th className={thCls}>件数</th>
                  <th className={thCls}>{isQj ? "期交目标" : "趸交目标"}</th>
                  <th className={thCls}>完成率</th>
                  <th className={thCls}>差距</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((n: any, i: number) => {
                  const baofei = isQj ? n.qj : n.dc;
                  const target = isQj ? n.qjTarget : n.dcTarget;
                  const completion = target > 0 ? baofei / target : 0;
                  const gap = baofei - target;
                  const hasTarget = target > 0;
                  const isComplete = hasTarget && baofei >= target;

                  return (
                    <tr key={i} className={`${rowHover} ${baofei === 0 ? "bg-red-50/50" : ""}`}>
                      <td className={tdCls}>{i + 1}</td>
                      <td className={tdCls}>{n.bank}</td>
                      <td className={tdCls}>{n.branch || "-"}</td>
                      <td className={tdCls} title={n.shortName ? `简称: ${n.shortName}` : ''}>
                        {n.name}
                      </td>
                      <td className={tdCls}>{n.deptManager}</td>
                      <td className={tdCls}>{n.customerManager}</td>
                      <td className={`${tdCls} ${monoR}`}>
                        {fmt(baofei)}
                        {baofei > 0 && (
                          <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-green-100 text-green-700">已开单</span>
                        )}
                        {baofei === 0 && (
                          <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-700">未开单</span>
                        )}
                      </td>
                      <td className={`${tdCls} ${monoR}`}>{n.js}</td>
                      <td className={`${tdCls} ${monoR}`}>
                        {hasTarget ? fmt(target) : <span className="text-muted-foreground">未设定</span>}
                      </td>
                      <td className={`${tdCls} ${monoR}`}>
                        {hasTarget ? (
                          <span className={isComplete ? "text-green-600 font-medium" : "text-orange-600"}>
                            {pct(completion)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className={`${tdCls} ${monoR}`}>
                        {hasTarget ? (
                          <span className={gap >= 0 ? "text-green-600" : "text-red-600 font-medium"}>
                            {gap >= 0 ? "+" : ""}{fmt(gap)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                <tr className={totalRow}>
                  <td className={tdCls}></td>
                  <td className={tdCls} colSpan={5}><strong>合计</strong></td>
                  <td className={`${tdCls} ${monoR}`}><strong>{fmt(filteredTotals.baofei)}</strong></td>
                  <td className={`${tdCls} ${monoR}`}><strong>{filteredTotals.js}</strong></td>
                  <td className={`${tdCls} ${monoR}`}>
                    <strong>{filteredTotals.target > 0 ? fmt(filteredTotals.target) : "-"}</strong>
                  </td>
                  <td className={`${tdCls} ${monoR}`}>
                    <strong>
                      {filteredTotals.target > 0
                        ? pct(filteredTotals.baofei / filteredTotals.target)
                        : "-"}
                    </strong>
                  </td>
                  <td className={`${tdCls} ${monoR}`}>
                    {filteredTotals.target > 0 ? (
                      <strong className={filteredTotals.baofei - filteredTotals.target >= 0 ? "text-green-600" : "text-red-600"}>
                        {filteredTotals.baofei - filteredTotals.target >= 0 ? "+" : ""}
                        {fmt(filteredTotals.baofei - filteredTotals.target)}
                      </strong>
                    ) : "-"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
