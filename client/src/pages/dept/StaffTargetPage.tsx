import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import DeptSubPageWrapper from "@/components/DeptSubPageWrapper";
import { fmt, pct, thCls, tdCls, monoR, rowHover, totalRow } from "@/components/dept/tableStyles";

type Level = "director" | "deptManager" | "customerManager";

interface TargetItem {
  name: string;
  parent?: string;
  month: number;
  qjTarget: number;
  dcTarget: number;
}

interface AchievementRow {
  name: string;
  parent?: string;
  qjTarget: number;
  qjActual: number;
  qjPct: number;
  qjGap: number;
  dcTarget: number;
  dcActual: number;
  dcPct: number;
  dcGap: number;
  count: number; // 件数
}

const LEVEL_LABELS: Record<Level, string> = {
  director: "总监",
  deptManager: "营业部经理",
  customerManager: "客户经理",
};

const LEVEL_COLORS: Record<Level, string> = {
  director: "bg-purple-500 text-white",
  deptManager: "bg-blue-500 text-white",
  customerManager: "bg-green-500 text-white",
};

const LEVEL_ACTIVE: Record<Level, string> = {
  director: "ring-purple-400",
  deptManager: "ring-blue-400",
  customerManager: "ring-green-400",
};

export default function StaffTargetPage() {
  const { reportData, monthStart, monthEnd } = useReport();
  const [level, setLevel] = useState<Level>("director");
  const [directorTargets, setDirectorTargets] = useState<TargetItem[]>([]);
  const [deptManagerTargets, setDeptManagerTargets] = useState<TargetItem[]>([]);
  const [customerManagerTargets, setCustomerManagerTargets] = useState<TargetItem[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0=按月份范围汇总

  // 加载目标数据
  useEffect(() => {
    Promise.all([
      fetch("/api/settings/director-targets").then(r => r.json()),
      fetch("/api/settings/dept-manager-targets").then(r => r.json()),
      fetch("/api/settings/customer-manager-targets").then(r => r.json()),
    ]).then(([dt, dmt, cmt]) => {
      setDirectorTargets(dt);
      setDeptManagerTargets(dmt);
      setCustomerManagerTargets(cmt);
    });
  }, []);

  // 聚合实际完成数据
  const achievements = useMemo(() => {
    if (!reportData?.dataSource) return [];
    const ds = reportData.dataSource;

    // 获取当前层级的目标
    let targets: TargetItem[] = [];
    let getPersonName: (row: any) => string;
    let getParentName: ((row: any) => string) | null = null;

    if (level === "director") {
      targets = directorTargets;
      getPersonName = (row) => (row["营业区总监"] || "").trim();
    } else if (level === "deptManager") {
      targets = deptManagerTargets;
      getPersonName = (row) => (row["营业部经理名称"] || "").trim();
      getParentName = (row) => (row["营业区总监"] || "").trim();
    } else {
      targets = customerManagerTargets;
      getPersonName = (row) => (row["业绩归属客户经理姓名"] || "").trim();
      getParentName = (row) => (row["营业部经理名称"] || "").trim();
    }

    // 按月份过滤数据（使用选择的月份或报表月份范围）
    const filteredDs = ds.filter((row: any) => {
      const m = row["月"];
      if (m === null || m === undefined) return false;
      if (selectedMonth > 0) return m === selectedMonth;
      return m >= monthStart && m <= monthEnd;
    });

    // 聚合实际保费
    const actualMap: Record<string, { qj: number; dc: number; count: number; parent: string }> = {};
    for (const row of filteredDs) {
      const name = getPersonName(row);
      if (!name) continue;
      if (!actualMap[name]) {
        actualMap[name] = { qj: 0, dc: 0, count: 0, parent: getParentName ? getParentName(row) : "" };
      }
      const interval = (row["缴费间隔"] || "").trim();
      const premium = parseFloat(row["新约保费"]) || 0;
      const type = (row["类型"] || "").trim();

      // 期交 = 价值类 + 年交
      if (type === "价值类" && interval === "年交") {
        actualMap[name].qj += premium;
      }
      // 趸交 = 规模类 + 趸交
      if (interval === "趸交") {
        actualMap[name].dc += premium;
      }
      actualMap[name].count += 1;
    }

    // 获取目标（按月份匹配）
    const getTarget = (name: string): { qj: number; dc: number } => {
      const matched = targets.filter(t => t.name === name);
      if (matched.length === 0) return { qj: 0, dc: 0 };

      if (selectedMonth > 0) {
        // 选了具体月份，找该月目标，找不到用全年/12
        const monthTarget = matched.find(t => t.month === selectedMonth);
        if (monthTarget) return { qj: monthTarget.qjTarget, dc: monthTarget.dcTarget };
        const yearTarget = matched.find(t => t.month === 0);
        if (yearTarget) return { qj: yearTarget.qjTarget / 12, dc: yearTarget.dcTarget / 12 };
        return { qj: 0, dc: 0 };
      } else {
        // 汇总月份范围内的目标
        let totalQj = 0, totalDc = 0;
        for (let m = monthStart; m <= monthEnd; m++) {
          const monthTarget = matched.find(t => t.month === m);
          if (monthTarget) {
            totalQj += monthTarget.qjTarget;
            totalDc += monthTarget.dcTarget;
          } else {
            const yearTarget = matched.find(t => t.month === 0);
            if (yearTarget) {
              totalQj += yearTarget.qjTarget / 12;
              totalDc += yearTarget.dcTarget / 12;
            }
          }
        }
        return { qj: totalQj, dc: totalDc };
      }
    };

    // 合并目标和实际数据
    const allNames = new Set<string>();
    targets.forEach(t => allNames.add(t.name));
    Object.keys(actualMap).forEach(n => allNames.add(n));

    const rows: AchievementRow[] = [];
    for (const name of Array.from(allNames)) {
      const target = getTarget(name);
      const actual = actualMap[name] || { qj: 0, dc: 0, count: 0, parent: "" };
      const parent = actual.parent || targets.find(t => t.name === name)?.parent || "";

      rows.push({
        name,
        parent: parent || undefined,
        qjTarget: target.qj,
        qjActual: actual.qj,
        qjPct: target.qj > 0 ? actual.qj / target.qj : 0,
        qjGap: target.qj - actual.qj,
        dcTarget: target.dc,
        dcActual: actual.dc,
        dcPct: target.dc > 0 ? actual.dc / target.dc : 0,
        dcGap: target.dc - actual.dc,
        count: actual.count,
      });
    }

    // 排序：按期交实际完成降序
    rows.sort((a, b) => b.qjActual - a.qjActual);
    return rows;
  }, [reportData, level, directorTargets, deptManagerTargets, customerManagerTargets, selectedMonth, monthStart, monthEnd]);

  // 合计行
  const totals = useMemo(() => {
    return achievements.reduce(
      (acc, row) => ({
        qjTarget: acc.qjTarget + row.qjTarget,
        qjActual: acc.qjActual + row.qjActual,
        dcTarget: acc.dcTarget + row.dcTarget,
        dcActual: acc.dcActual + row.dcActual,
        count: acc.count + row.count,
      }),
      { qjTarget: 0, qjActual: 0, dcTarget: 0, dcActual: 0, count: 0 }
    );
  }, [achievements]);

  // 月份选择器
  const monthOptions = useMemo(() => {
    const opts = [{ value: 0, label: `${monthStart}-${monthEnd}月汇总` }];
    for (let m = monthStart; m <= monthEnd; m++) {
      opts.push({ value: m, label: `${m}月` });
    }
    return opts;
  }, [monthStart, monthEnd]);

  const levelSelector = (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1">
        {(["director", "deptManager", "customerManager"] as Level[]).map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              level === l
                ? `${LEVEL_COLORS[l]} ring-2 ${LEVEL_ACTIVE[l]} shadow-sm`
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {LEVEL_LABELS[l]}
          </button>
        ))}
      </div>
      <select
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(Number(e.target.value))}
        className="px-2 py-1.5 rounded border border-border text-xs bg-background"
      >
        {monthOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );

  const pctColor = (v: number) => {
    if (v >= 1) return "text-emerald-600 font-bold";
    if (v >= 0.8) return "text-amber-600";
    if (v >= 0.5) return "text-orange-500";
    return "text-rose-600";
  };

  const pctBg = (v: number) => {
    if (v >= 1) return "bg-emerald-50";
    if (v >= 0.8) return "bg-amber-50";
    return "";
  };

  return (
    <DeptSubPageWrapper title="人员目标达成" extraControls={levelSelector}>
      <Card>
        <CardContent className="pt-4">
          {/* 汇总卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-xs text-blue-600 mb-1">期交目标</div>
              <div className="text-sm font-bold text-blue-800">{fmt(totals.qjTarget)}</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <div className="text-xs text-emerald-600 mb-1">期交完成</div>
              <div className="text-sm font-bold text-emerald-800">{fmt(totals.qjActual)}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <div className="text-xs text-purple-600 mb-1">趸交目标</div>
              <div className="text-sm font-bold text-purple-800">{fmt(totals.dcTarget)}</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <div className="text-xs text-amber-600 mb-1">趸交完成</div>
              <div className="text-sm font-bold text-amber-800">{fmt(totals.dcActual)}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className={`text-left ${thCls}`}>序号</th>
                  <th className={`text-left ${thCls}`}>{LEVEL_LABELS[level]}</th>
                  {level !== "director" && (
                    <th className={`text-left ${thCls}`}>
                      {level === "deptManager" ? "所属总监" : "所属经理"}
                    </th>
                  )}
                  <th className={`text-right ${thCls}`}>期交目标</th>
                  <th className={`text-right ${thCls}`}>期交完成</th>
                  <th className={`text-right ${thCls}`}>完成率</th>
                  <th className={`text-right ${thCls}`}>差距</th>
                  <th className={`text-right ${thCls}`}>趸交目标</th>
                  <th className={`text-right ${thCls}`}>趸交完成</th>
                  <th className={`text-right ${thCls}`}>完成率</th>
                  <th className={`text-right ${thCls}`}>差距</th>
                  <th className={`text-right ${thCls}`}>件数</th>
                </tr>
              </thead>
              <tbody>
                {achievements.map((row, idx) => (
                  <tr key={row.name} className={`${rowHover} ${pctBg(row.qjPct)}`}>
                    <td className={tdCls}>{idx + 1}</td>
                    <td className={`${tdCls} font-medium`}>{row.name}</td>
                    {level !== "director" && (
                      <td className={`${tdCls} text-muted-foreground`}>{row.parent || "-"}</td>
                    )}
                    <td className={`${monoR} text-muted-foreground`}>{row.qjTarget > 0 ? fmt(row.qjTarget) : "-"}</td>
                    <td className={`${monoR} text-amber-600 font-medium`}>{fmt(row.qjActual)}</td>
                    <td className={`${monoR} ${pctColor(row.qjPct)}`}>
                      {row.qjTarget > 0 ? pct(row.qjPct) : "-"}
                    </td>
                    <td className={`${monoR} ${row.qjGap <= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {row.qjTarget > 0 ? fmt(row.qjGap) : "-"}
                    </td>
                    <td className={`${monoR} text-muted-foreground`}>{row.dcTarget > 0 ? fmt(row.dcTarget) : "-"}</td>
                    <td className={`${monoR} text-emerald-600 font-medium`}>{fmt(row.dcActual)}</td>
                    <td className={`${monoR} ${pctColor(row.dcPct)}`}>
                      {row.dcTarget > 0 ? pct(row.dcPct) : "-"}
                    </td>
                    <td className={`${monoR} ${row.dcGap <= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {row.dcTarget > 0 ? fmt(row.dcGap) : "-"}
                    </td>
                    <td className={`${monoR}`}>{row.count}</td>
                  </tr>
                ))}
                {/* 合计行 */}
                <tr className={totalRow}>
                  <td className={tdCls} colSpan={level !== "director" ? 3 : 2}>合计</td>
                  <td className={monoR}>{fmt(totals.qjTarget)}</td>
                  <td className={`${monoR} text-amber-600`}>{fmt(totals.qjActual)}</td>
                  <td className={`${monoR} ${pctColor(totals.qjTarget > 0 ? totals.qjActual / totals.qjTarget : 0)}`}>
                    {totals.qjTarget > 0 ? pct(totals.qjActual / totals.qjTarget) : "-"}
                  </td>
                  <td className={`${monoR} ${totals.qjTarget - totals.qjActual <= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {fmt(totals.qjTarget - totals.qjActual)}
                  </td>
                  <td className={monoR}>{fmt(totals.dcTarget)}</td>
                  <td className={`${monoR} text-emerald-600`}>{fmt(totals.dcActual)}</td>
                  <td className={`${monoR} ${pctColor(totals.dcTarget > 0 ? totals.dcActual / totals.dcTarget : 0)}`}>
                    {totals.dcTarget > 0 ? pct(totals.dcActual / totals.dcTarget) : "-"}
                  </td>
                  <td className={`${monoR} ${totals.dcTarget - totals.dcActual <= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {fmt(totals.dcTarget - totals.dcActual)}
                  </td>
                  <td className={monoR}>{totals.count}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {achievements.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              暂无数据，请先在系统设置中配置{LEVEL_LABELS[level]}目标
            </div>
          )}
        </CardContent>
      </Card>
    </DeptSubPageWrapper>
  );
}
