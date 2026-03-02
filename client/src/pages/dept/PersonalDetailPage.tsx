import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import DeptSubPageWrapper from "@/components/DeptSubPageWrapper";
import { fmt, thCls, tdCls, monoR, rowHover, totalRow } from "@/components/dept/tableStyles";
import { exportToExcel, ExportColumn } from "@/lib/exportExcel";
import ExportButton from "@/components/ExportButton";

/**
 * 个人详情页面
 * 展示每个客户经理名下各网点的逐月出单业绩
 * 支持搜索客户经理和选择月份范围
 */

interface NetworkMonthly {
  networkName: string;
  bankName: string;
  months: Record<number, { premium: number; count: number }>;
  totalPremium: number;
  totalCount: number;
}

interface PersonDetail {
  name: string;
  deptManager: string;
  networks: NetworkMonthly[];
  totalPremium: number;
  totalCount: number;
}

export default function PersonalDetailPage() {
  const { reportData, monthStart, monthEnd } = useReport();
  const [searchText, setSearchText] = useState("");
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);

  // 从 dataSource 中聚合数据：客户经理 → 网点 → 月份
  const personDetails = useMemo(() => {
    if (!reportData?.dataSource) return [];
    const ds = reportData.dataSource;

    // 聚合结构：person → network → month → { premium, count }
    const personMap = new Map<
      string,
      {
        deptManager: string;
        networks: Map<string, { bankName: string; months: Map<number, { premium: number; count: number }> }>;
      }
    >();

    for (const row of ds) {
      const cm = ((row["业绩归属客户经理姓名"] || row["归属人"]) as string || "").trim();
      if (!cm) continue;

      const networkName = ((row["业绩归属网点名称"]) as string || "").trim();
      if (!networkName) continue;

      const month = row["月"] as number;
      if (!month || month < 1 || month > 12) continue;

      const interval = ((row["缴费间隔"]) as string || "").trim();
      const premium = parseFloat(row["新约保费"] as string) || 0;
      const type = ((row["类型"]) as string || "").trim();
      const bankName = ((row["银行总行"]) as string || "").trim();
      const deptManager = ((row["营业部经理名称"]) as string || "").trim();

      // 只统计期交（价值类年交）
      const isQj = type === "价值类" && interval === "年交";
      if (!isQj) continue;

      if (!personMap.has(cm)) {
        personMap.set(cm, { deptManager, networks: new Map() });
      }
      const person = personMap.get(cm)!;
      if (!person.deptManager && deptManager) person.deptManager = deptManager;

      if (!person.networks.has(networkName)) {
        person.networks.set(networkName, { bankName, months: new Map() });
      }
      const network = person.networks.get(networkName)!;

      if (!network.months.has(month)) {
        network.months.set(month, { premium: 0, count: 0 });
      }
      const monthData = network.months.get(month)!;
      monthData.premium += premium;
      monthData.count += 1;
    }

    // 转换为数组
    const result: PersonDetail[] = [];
    for (const [name, data] of personMap) {
      const networks: NetworkMonthly[] = [];
      let personTotalPremium = 0;
      let personTotalCount = 0;

      for (const [networkName, netData] of data.networks) {
        const monthsObj: Record<number, { premium: number; count: number }> = {};
        let netTotalPremium = 0;
        let netTotalCount = 0;

        for (const [m, mData] of netData.months) {
          monthsObj[m] = mData;
          netTotalPremium += mData.premium;
          netTotalCount += mData.count;
        }

        networks.push({
          networkName,
          bankName: netData.bankName,
          months: monthsObj,
          totalPremium: netTotalPremium,
          totalCount: netTotalCount,
        });

        personTotalPremium += netTotalPremium;
        personTotalCount += netTotalCount;
      }

      // 网点按总保费降序排列
      networks.sort((a, b) => b.totalPremium - a.totalPremium);

      result.push({
        name,
        deptManager: data.deptManager,
        networks,
        totalPremium: personTotalPremium,
        totalCount: personTotalCount,
      });
    }

    // 按总保费降序排列
    result.sort((a, b) => b.totalPremium - a.totalPremium);
    return result;
  }, [reportData]);

  // 搜索过滤
  const filtered = useMemo(() => {
    if (!searchText.trim()) return personDetails;
    const keyword = searchText.trim().toLowerCase();
    return personDetails.filter(
      (p) =>
        p.name.toLowerCase().includes(keyword) ||
        p.deptManager.toLowerCase().includes(keyword) ||
        p.networks.some((n) => n.networkName.toLowerCase().includes(keyword))
    );
  }, [personDetails, searchText]);

  // 月份列表
  const monthList = useMemo(() => {
    const list: number[] = [];
    for (let m = monthStart; m <= monthEnd; m++) {
      list.push(m);
    }
    return list;
  }, [monthStart, monthEnd]);

  const togglePerson = (name: string) => {
    setExpandedPerson((prev) => (prev === name ? null : name));
  };

  const handleExport = () => {
    if (filtered.length === 0) return;
    const columns: ExportColumn[] = [
      { header: "客户经理", key: "name", width: 12 },
      { header: "营业部经理", key: "deptManager", width: 12 },
      { header: "网点", key: "networkName", width: 20 },
      { header: "银行", key: "bankName", width: 14 },
      ...monthList.map(m => ({ header: `${m}月`, key: `m${m}`, type: "number" as const, width: 10 })),
      { header: "合计", key: "total", type: "number", width: 14 },
    ];
    const data: any[] = [];
    for (const person of filtered) {
      for (const net of person.networks) {
        const row: any = {
          name: person.name,
          deptManager: person.deptManager,
          networkName: net.networkName,
          bankName: net.bankName,
          total: net.totalPremium,
        };
        for (const m of monthList) {
          row[`m${m}`] = net.months[m]?.premium || 0;
        }
        data.push(row);
      }
    }
    exportToExcel({ columns, data, fileName: "个人详情" });
  };

  const controls = (
    <div className="flex items-center gap-2 flex-wrap">
      <ExportButton onClick={handleExport} />
      <div className="relative">
        <input
          type="text"
          placeholder="搜索客户经理/网点..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border text-xs bg-background w-52 pl-8"
        />
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <span className="text-xs text-muted-foreground">
        共 {filtered.length} 人
      </span>
    </div>
  );

  return (
    <DeptSubPageWrapper title="个人详情" extraControls={controls}>
      <Card>
        <CardContent className="pt-4">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchText ? "未找到匹配的客户经理" : "暂无数据，请先导入数据"}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((person, idx) => (
                <div
                  key={person.name}
                  className="border border-border/60 rounded-lg overflow-hidden"
                >
                  {/* 客户经理头部（可点击展开） */}
                  <button
                    onClick={() => togglePerson(person.name)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-accent/30 hover:bg-accent/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-6">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-semibold">
                        {person.name}
                      </span>
                      <span className="text-xs text-muted-foreground px-2 py-0.5 bg-background rounded">
                        {person.deptManager || "-"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {person.networks.length} 个网点
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground mr-1">期交:</span>
                        <span className="text-sm font-bold text-amber-600">
                          {fmt(person.totalPremium)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground mr-1">件数:</span>
                        <span className="text-sm font-bold text-blue-600">
                          {person.totalCount}
                        </span>
                      </div>
                      <svg
                        className={`w-4 h-4 text-muted-foreground transition-transform ${
                          expandedPerson === person.name ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </button>

                  {/* 展开的网点明细表 */}
                  {expandedPerson === person.name && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className={`text-left ${thCls}`}>序号</th>
                            <th className={`text-left ${thCls}`}>网点名称</th>
                            <th className={`text-left ${thCls}`}>银行</th>
                            {monthList.map((m) => (
                              <th key={m} className={`text-right ${thCls}`}>
                                {m}月
                              </th>
                            ))}
                            <th className={`text-right ${thCls}`}>合计保费</th>
                            <th className={`text-right ${thCls}`}>合计件数</th>
                          </tr>
                        </thead>
                        <tbody>
                          {person.networks.map((net, nIdx) => (
                            <tr key={net.networkName} className={rowHover}>
                              <td className={tdCls}>{nIdx + 1}</td>
                              <td className={`${tdCls} font-medium`} title={net.networkName}>
                                {net.networkName.length > 16
                                  ? net.networkName.substring(0, 16) + "..."
                                  : net.networkName}
                              </td>
                              <td className={`${tdCls} text-muted-foreground`}>
                                {net.bankName.length > 8
                                  ? net.bankName.substring(0, 8) + "..."
                                  : net.bankName}
                              </td>
                              {monthList.map((m) => {
                                const mData = net.months[m];
                                const count = mData?.count || 0;
                                const premium = mData?.premium || 0;
                                return (
                                  <td
                                    key={m}
                                    className={`${monoR} ${
                                      count > 0
                                        ? "text-emerald-600 font-medium"
                                        : "text-muted-foreground/40"
                                    }`}
                                    title={premium > 0 ? `保费: ${fmt(premium)}` : ""}
                                  >
                                    {count > 0 ? (
                                      <span>
                                        {count}
                                        <span className="text-[10px] text-muted-foreground ml-0.5">
                                          ({fmt(premium)})
                                        </span>
                                      </span>
                                    ) : (
                                      "0"
                                    )}
                                  </td>
                                );
                              })}
                              <td className={`${monoR} font-bold text-amber-600`}>
                                {fmt(net.totalPremium)}
                              </td>
                              <td className={`${monoR} font-bold text-blue-600`}>
                                {net.totalCount}
                              </td>
                            </tr>
                          ))}
                          {/* 个人合计行 */}
                          <tr className={totalRow}>
                            <td className={tdCls} colSpan={3}>
                              合计
                            </td>
                            {monthList.map((m) => {
                              const monthTotal = person.networks.reduce(
                                (sum, net) => {
                                  const mData = net.months[m];
                                  return {
                                    premium: sum.premium + (mData?.premium || 0),
                                    count: sum.count + (mData?.count || 0),
                                  };
                                },
                                { premium: 0, count: 0 }
                              );
                              return (
                                <td key={m} className={monoR}>
                                  {monthTotal.count > 0 ? (
                                    <span>
                                      {monthTotal.count}
                                      <span className="text-[10px] text-muted-foreground ml-0.5">
                                        ({fmt(monthTotal.premium)})
                                      </span>
                                    </span>
                                  ) : (
                                    "0"
                                  )}
                                </td>
                              );
                            })}
                            <td className={`${monoR} text-amber-600`}>
                              {fmt(person.totalPremium)}
                            </td>
                            <td className={`${monoR} text-blue-600`}>
                              {person.totalCount}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DeptSubPageWrapper>
  );
}
