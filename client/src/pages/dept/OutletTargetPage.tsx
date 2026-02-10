import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import DeptSubPageWrapper from "@/components/DeptSubPageWrapper";
import { fmt, pct, thCls, tdCls, monoR, rowHover, totalRow } from "@/components/dept/tableStyles";

type Level = "dept" | "network";

interface DeptTargetItem {
  deptName: string;
  month: number;
  qjTarget: number;
  dcTarget: number;
}

interface NetworkTargetItem {
  networkName: string;
  bankName: string;
  deptManager: string;
  customerManager: string;
  month: number;
  qjTarget: number;
  dcTarget: number;
}

interface AchievementRow {
  name: string;
  parent?: string;
  extra?: string; // 银行渠道/客户经理等
  qjTarget: number;
  qjActual: number;
  qjPct: number;
  qjGap: number;
  dcTarget: number;
  dcActual: number;
  dcPct: number;
  dcGap: number;
  count: number;
}

const LEVEL_LABELS: Record<Level, string> = {
  dept: "营业部",
  network: "网点",
};

const LEVEL_COLORS: Record<Level, string> = {
  dept: "bg-orange-500 text-white",
  network: "bg-cyan-500 text-white",
};

const LEVEL_ACTIVE: Record<Level, string> = {
  dept: "ring-orange-400",
  network: "ring-cyan-400",
};

export default function OutletTargetPage() {
  const { reportData, monthStart, monthEnd } = useReport();
  const [level, setLevel] = useState<Level>("dept");
  const [deptTargets, setDeptTargets] = useState<DeptTargetItem[]>([]);
  const [networkTargets, setNetworkTargets] = useState<NetworkTargetItem[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(0);

  // 加载目标数据
  useEffect(() => {
    Promise.all([
      fetch("/api/settings/dept-targets").then(r => r.json()),
      fetch("/api/settings/network-targets").then(r => r.json()),
    ]).then(([dt, nt]) => {
      setDeptTargets(dt);
      setNetworkTargets(nt);
    });
  }, []);

  // 聚合实际完成数据
  const achievements = useMemo(() => {
    if (!reportData?.dataSource) return [];
    const ds = reportData.dataSource;

    // 按月份过滤
    const filteredDs = ds.filter((row: any) => {
      const m = row["月"];
      if (m === null || m === undefined) return false;
      if (selectedMonth > 0) return m === selectedMonth;
      return m >= monthStart && m <= monthEnd;
    });

    if (level === "dept") {
      // 营业部层级：按营业部经理名称聚合
      const actualMap: Record<string, { qj: number; dc: number; count: number }> = {};
      for (const row of filteredDs) {
        const name = (row["营业部经理名称"] || "").trim();
        if (!name) continue;
        if (!actualMap[name]) actualMap[name] = { qj: 0, dc: 0, count: 0 };
        const interval = (row["缴费间隔"] || "").trim();
        const premium = parseFloat(row["新约保费"]) || 0;
        const type = (row["类型"] || "").trim();
        if (type === "价值类" && interval === "年交") actualMap[name].qj += premium;
        if (interval === "趸交") actualMap[name].dc += premium;
        actualMap[name].count += 1;
      }

      const getTarget = (name: string): { qj: number; dc: number } => {
        const matched = deptTargets.filter(t => t.deptName === name);
        if (matched.length === 0) return { qj: 0, dc: 0 };
        if (selectedMonth > 0) {
          const mt = matched.find(t => t.month === selectedMonth);
          if (mt) return { qj: mt.qjTarget, dc: mt.dcTarget };
          const yt = matched.find(t => t.month === 0);
          if (yt) return { qj: yt.qjTarget / 12, dc: yt.dcTarget / 12 };
          return { qj: 0, dc: 0 };
        } else {
          let tqj = 0, tdc = 0;
          for (let m = monthStart; m <= monthEnd; m++) {
            const mt = matched.find(t => t.month === m);
            if (mt) { tqj += mt.qjTarget; tdc += mt.dcTarget; }
            else {
              const yt = matched.find(t => t.month === 0);
              if (yt) { tqj += yt.qjTarget / 12; tdc += yt.dcTarget / 12; }
            }
          }
          return { qj: tqj, dc: tdc };
        }
      };

      const allNames = new Set<string>();
      deptTargets.forEach(t => allNames.add(t.deptName));
      Object.keys(actualMap).forEach(n => allNames.add(n));

      const rows: AchievementRow[] = [];
      for (const name of Array.from(allNames)) {
        const target = getTarget(name);
        const actual = actualMap[name] || { qj: 0, dc: 0, count: 0 };
        rows.push({
          name,
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
      rows.sort((a, b) => b.qjActual - a.qjActual);
      return rows;

    } else {
      // 网点层级：按业绩归属网点名称聚合
      const actualMap: Record<string, { qj: number; dc: number; count: number; bank: string; manager: string; cm: string }> = {};
      for (const row of filteredDs) {
        const name = (row["业绩归属网点名称"] || "").trim();
        if (!name) continue;
        if (!actualMap[name]) {
          actualMap[name] = {
            qj: 0, dc: 0, count: 0,
            bank: (row["银行总行"] || "").trim(),
            manager: (row["营业部经理名称"] || "").trim(),
            cm: (row["业绩归属客户经理姓名"] || "").trim(),
          };
        }
        const interval = (row["缴费间隔"] || "").trim();
        const premium = parseFloat(row["新约保费"]) || 0;
        const type = (row["类型"] || "").trim();
        if (type === "价值类" && interval === "年交") actualMap[name].qj += premium;
        if (interval === "趸交") actualMap[name].dc += premium;
        actualMap[name].count += 1;
      }

      const getTarget = (name: string): { qj: number; dc: number } => {
        const matched = networkTargets.filter(t => t.networkName === name);
        if (matched.length === 0) return { qj: 0, dc: 0 };
        if (selectedMonth > 0) {
          const mt = matched.find(t => t.month === selectedMonth);
          if (mt) return { qj: mt.qjTarget, dc: mt.dcTarget };
          const yt = matched.find(t => t.month === 0);
          if (yt) return { qj: yt.qjTarget / 12, dc: yt.dcTarget / 12 };
          return { qj: 0, dc: 0 };
        } else {
          let tqj = 0, tdc = 0;
          for (let m = monthStart; m <= monthEnd; m++) {
            const mt = matched.find(t => t.month === m);
            if (mt) { tqj += mt.qjTarget; tdc += mt.dcTarget; }
            else {
              const yt = matched.find(t => t.month === 0);
              if (yt) { tqj += yt.qjTarget / 12; tdc += yt.dcTarget / 12; }
            }
          }
          return { qj: tqj, dc: tdc };
        }
      };

      const allNames = new Set<string>();
      networkTargets.forEach(t => allNames.add(t.networkName));
      Object.keys(actualMap).forEach(n => allNames.add(n));

      const rows: AchievementRow[] = [];
      for (const name of Array.from(allNames)) {
        const target = getTarget(name);
        const actual = actualMap[name] || { qj: 0, dc: 0, count: 0, bank: "", manager: "", cm: "" };
        const nt = networkTargets.find(t => t.networkName === name);
        rows.push({
          name,
          parent: actual.manager || nt?.deptManager || "",
          extra: actual.bank || nt?.bankName || "",
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
      rows.sort((a, b) => b.qjActual - a.qjActual);
      return rows;
    }
  }, [reportData, level, deptTargets, networkTargets, selectedMonth, monthStart, monthEnd]);

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
        {(["dept", "network"] as Level[]).map((l) => (
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
    <DeptSubPageWrapper title="网点目标达成" extraControls={levelSelector}>
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
                  {level === "network" && (
                    <>
                      <th className={`text-left ${thCls}`}>银行渠道</th>
                      <th className={`text-left ${thCls}`}>营业部经理</th>
                    </>
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
                    <td className={`${tdCls} font-medium`} title={row.name}>
                      {level === "network" && row.name.length > 20
                        ? row.name.substring(0, 20) + "..."
                        : row.name}
                    </td>
                    {level === "network" && (
                      <>
                        <td className={`${tdCls} text-muted-foreground`}>{row.extra || "-"}</td>
                        <td className={`${tdCls} text-muted-foreground`}>{row.parent || "-"}</td>
                      </>
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
                    <td className={monoR}>{row.count}</td>
                  </tr>
                ))}
                {/* 合计行 */}
                <tr className={totalRow}>
                  <td className={tdCls} colSpan={level === "network" ? 4 : 2}>合计</td>
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
