import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import DeptSubPageWrapper from "@/components/DeptSubPageWrapper";
import { fmt, pct, thCls, tdCls, monoR, rowHover, totalRow } from "@/components/dept/tableStyles";

type Level = "director" | "deptManager" | "customerManager" | "dept" | "network";

interface AchievementRow {
  name: string;
  parent?: string;
  extra?: string;
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

const LEVELS: { key: Level; label: string; color: string; activeRing: string }[] = [
  { key: "director", label: "总监", color: "bg-purple-500 text-white", activeRing: "ring-purple-400" },
  { key: "deptManager", label: "营业部经理", color: "bg-blue-500 text-white", activeRing: "ring-blue-400" },
  { key: "customerManager", label: "客户经理", color: "bg-green-500 text-white", activeRing: "ring-green-400" },
  { key: "dept", label: "营业部", color: "bg-orange-500 text-white", activeRing: "ring-orange-400" },
  { key: "network", label: "网点", color: "bg-cyan-500 text-white", activeRing: "ring-cyan-400" },
];

const LEVEL_MAP = Object.fromEntries(LEVELS.map(l => [l.key, l]));

export default function TargetAchievementPage() {
  const { reportData, monthStart, monthEnd } = useReport();
  const [level, setLevel] = useState<Level>("director");
  const [selectedMonth, setSelectedMonth] = useState<number>(0);

  // 目标数据
  const [directorTargets, setDirectorTargets] = useState<any[]>([]);
  const [deptManagerTargets, setDeptManagerTargets] = useState<any[]>([]);
  const [customerManagerTargets, setCustomerManagerTargets] = useState<any[]>([]);
  const [deptTargets, setDeptTargets] = useState<any[]>([]);
  const [networkTargets, setNetworkTargets] = useState<any[]>([]);
  // 组织架构人员数据
  const [staffList, setStaffList] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings/director-targets").then(r => r.json()),
      fetch("/api/settings/dept-manager-targets").then(r => r.json()),
      fetch("/api/settings/customer-manager-targets").then(r => r.json()),
      fetch("/api/settings/dept-targets").then(r => r.json()),
      fetch("/api/settings/network-targets").then(r => r.json()),
      fetch("/api/settings/staff").then(r => r.json()),
    ]).then(([dt, dmt, cmt, depts, nets, staff]) => {
      setDirectorTargets(dt);
      setDeptManagerTargets(dmt);
      setCustomerManagerTargets(cmt);
      setDeptTargets(depts);
      setNetworkTargets(nets);
      setStaffList(staff);
    });
  }, []);

  // 通用目标查找函数
  const findTarget = (targets: any[], nameField: string, name: string): { qj: number; dc: number } => {
    const matched = targets.filter(t => t[nameField] === name);
    if (matched.length === 0) return { qj: 0, dc: 0 };
    if (selectedMonth > 0) {
      const mt = matched.find((t: any) => Number(t.month) === selectedMonth);
      if (mt) return { qj: Number(mt.qjTarget) || 0, dc: Number(mt.dcTarget) || 0 };
      const yt = matched.find((t: any) => Number(t.month) === 0);
      if (yt) return { qj: (Number(yt.qjTarget) || 0) / 12, dc: (Number(yt.dcTarget) || 0) / 12 };
      return { qj: 0, dc: 0 };
    } else {
      // 汇总视图：把所有已设置的月份目标加起来
      let tqj = 0, tdc = 0;
      const yearTarget = matched.find((t: any) => Number(t.month) === 0);
      const monthTargets = matched.filter((t: any) => Number(t.month) > 0);
      if (monthTargets.length > 0) {
        // 有按月设置的目标，汇总所有月份目标
        for (const mt of monthTargets) {
          tqj += Number(mt.qjTarget) || 0;
          tdc += Number(mt.dcTarget) || 0;
        }
      } else if (yearTarget) {
        // 只有全年目标，按月份范围折算
        const months = monthEnd - monthStart + 1;
        tqj = ((Number(yearTarget.qjTarget) || 0) / 12) * months;
        tdc = ((Number(yearTarget.dcTarget) || 0) / 12) * months;
      }
      return { qj: tqj, dc: tdc };
    }
  };

  // 聚合数据
  const achievements = useMemo(() => {
    if (!reportData?.dataSource) return [];
    const ds = reportData.dataSource;

    const filteredDs = ds.filter((row: any) => {
      const m = row["月"];
      if (m === null || m === undefined) return false;
      if (selectedMonth > 0) return m === selectedMonth;
      return m >= monthStart && m <= monthEnd;
    });

    // 获取有效人员列表（按月份过滤，优先使用具体月份记录，否则使用全年默认记录）
    const getEffectiveStaff = (role: string) => {
      const roleStaff = staffList.filter((s: any) => s.role === role);
      const byName = new Map<string, any>();
      for (const s of roleStaff) {
        const existing = byName.get(s.name);
        if (!existing) {
          byName.set(s.name, s);
        } else {
          // 如果当前选择了月份，优先使用该月份的记录
          const targetMonth = selectedMonth > 0 ? selectedMonth : monthEnd;
          const sMonth = Number(s.month) || 0;
          const existMonth = Number(existing.month) || 0;
          // 选择最接近且不超过目标月份的记录
          if (sMonth > 0 && sMonth <= targetMonth && (existMonth === 0 || sMonth > existMonth)) {
            byName.set(s.name, s);
          }
        }
      }
      // 过滤掉离职和调岗的人员
      return Array.from(byName.values()).filter((s: any) => s.status === 'active');
    };

    const staffDirectors = getEffectiveStaff("director");
    const staffManagers = getEffectiveStaff("deptManager");
    const staffCMs = getEffectiveStaff("customerManager");
    // 构建id->name映射（使用全部staffList）
    const staffIdMap: Record<string, string> = {};
    staffList.forEach((s: any) => { staffIdMap[s.id] = s.name; });

    // 构建人员归属关系映射，用于补全数据源中缺失的字段
    // 客户经理 -> 营业部经理
    const cmToManager: Record<string, string> = {};
    for (const cm of staffCMs) {
      cmToManager[cm.name] = cm.parentId ? (staffIdMap[cm.parentId] || cm.parentId) : "";
    }
    // 营业部经理 -> 总监
    const managerToDirector: Record<string, string> = {};
    for (const mgr of staffManagers) {
      managerToDirector[mgr.name] = mgr.parentId ? (staffIdMap[mgr.parentId] || mgr.parentId) : "";
    }

    // 补全数据源中缺失的人员归属字段
    for (const row of filteredDs) {
      const cm = (row["业绩归属客户经理姓名"] || "").trim();
      const mgr = (row["营业部经理名称"] || "").trim();
      const director = (row["营业区总监"] || "").trim();

      // 如果缺少营业部经理名称，尝试通过客户经理查找
      if (!mgr && cm && cmToManager[cm]) {
        row["营业部经理名称"] = cmToManager[cm];
      }
      // 如果缺少营业区总监，尝试通过营业部经理查找
      const finalMgr = (row["营业部经理名称"] || "").trim();
      if (!director && finalMgr && managerToDirector[finalMgr]) {
        row["营业区总监"] = managerToDirector[finalMgr];
      }
    }

    // 聚合函数
    const aggregate = (
      getKey: (row: any) => string,
      getParent: ((row: any) => string) | null,
      getExtra: ((row: any) => string) | null,
      targets: any[],
      nameField: string,
      parentField?: string,
      staffNames?: { name: string; parent?: string }[],
    ): AchievementRow[] => {
      const actualMap: Record<string, { qj: number; dc: number; count: number; parent: string; extra: string }> = {};

      for (const row of filteredDs) {
        const key = getKey(row);
        if (!key) continue;
        if (!actualMap[key]) {
          actualMap[key] = {
            qj: 0, dc: 0, count: 0,
            parent: getParent ? getParent(row) : "",
            extra: getExtra ? getExtra(row) : "",
          };
        }
        const interval = (row["缴费间隔"] || "").trim();
        const premium = parseFloat(row["新约保费"]) || 0;
        const type = (row["类型"] || "").trim();
        if (type === "价值类" && interval === "年交") actualMap[key].qj += premium;
        if (interval === "趸交") actualMap[key].dc += premium;
        actualMap[key].count += 1;
      }

      const allNames = new Set<string>();
      // 从组织架构补充完整人员名单
      if (staffNames) {
        staffNames.forEach(s => allNames.add(s.name));
      }
      targets.forEach(t => allNames.add(t[nameField]));
      Object.keys(actualMap).forEach(n => allNames.add(n));

      // 构建组织架构的parent映射
      const staffParentMap: Record<string, string> = {};
      if (staffNames) {
        staffNames.forEach(s => { if (s.parent) staffParentMap[s.name] = s.parent; });
      }

      const rows: AchievementRow[] = [];
      for (const name of Array.from(allNames)) {
        const target = findTarget(targets, nameField, name);
        const actual = actualMap[name] || { qj: 0, dc: 0, count: 0, parent: "", extra: "" };
        const parentVal = actual.parent 
          || staffParentMap[name] 
          || (parentField ? targets.find(t => t[nameField] === name)?.[parentField] : "") 
          || "";
        const extraVal = actual.extra || "";

        rows.push({
          name,
          parent: parentVal || undefined,
          extra: extraVal || undefined,
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
    };

    switch (level) {
      case "director":
        return aggregate(
          r => (r["营业区总监"] || "").trim(),
          null, null,
          directorTargets, "name", undefined,
          staffDirectors.map(s => ({ name: s.name }))
        );
      case "deptManager":
        return aggregate(
          r => (r["营业部经理名称"] || "").trim(),
          r => (r["营业区总监"] || "").trim(),
          null,
          deptManagerTargets, "name", "director",
          staffManagers.map(s => ({ name: s.name, parent: staffIdMap[s.parentId] || "" }))
        );
      case "customerManager":
        return aggregate(
          r => (r["业绩归属客户经理姓名"] || "").trim(),
          r => (r["营业部经理名称"] || "").trim(),
          null,
          customerManagerTargets, "name", "deptManager",
          staffCMs.map(s => ({ name: s.name, parent: staffIdMap[s.parentId] || "" }))
        );
      case "dept":
        return aggregate(
          r => (r["营业部经理名称"] || "").trim(),
          null, null,
          deptTargets, "deptName", undefined,
          staffManagers.map(s => ({ name: s.name }))
        );
      case "network":
        return aggregate(
          r => (r["业绩归属网点名称"] || "").trim(),
          r => (r["营业部经理名称"] || "").trim(),
          r => (r["银行总行"] || "").trim(),
          networkTargets, "networkName", "deptManager"
        );
      default:
        return [];
    }
  }, [reportData, level, directorTargets, deptManagerTargets, customerManagerTargets, deptTargets, networkTargets, staffList, selectedMonth, monthStart, monthEnd]);

  // 合计
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

  // 月份选项
  const monthOptions = useMemo(() => {
    const opts = [{ value: 0, label: `${monthStart}-${monthEnd}月汇总` }];
    for (let m = monthStart; m <= monthEnd; m++) {
      opts.push({ value: m, label: `${m}月` });
    }
    return opts;
  }, [monthStart, monthEnd]);

  // 是否显示父级列
  const showParent = level === "deptManager" || level === "customerManager" || level === "network";
  // 是否显示银行渠道列
  const showExtra = level === "network";
  // 父级列标题
  const parentLabel = level === "deptManager" ? "所属总监" : level === "customerManager" ? "所属经理" : level === "network" ? "营业部经理" : "";

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

  const colSpanName = 2 + (showParent ? 1 : 0) + (showExtra ? 1 : 0);

  const controls = (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1">
        {LEVELS.map((l) => (
          <button
            key={l.key}
            onClick={() => setLevel(l.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              level === l.key
                ? `${l.color} ring-2 ${l.activeRing} shadow-sm`
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {l.label}
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

  return (
    <DeptSubPageWrapper title="目标达成" extraControls={controls}>
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
                  <th className={`text-left ${thCls}`}>{LEVEL_MAP[level].label}</th>
                  {showExtra && <th className={`text-left ${thCls}`}>银行渠道</th>}
                  {showParent && <th className={`text-left ${thCls}`}>{parentLabel}</th>}
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
                    {showExtra && <td className={`${tdCls} text-muted-foreground`}>{row.extra || "-"}</td>}
                    {showParent && <td className={`${tdCls} text-muted-foreground`}>{row.parent || "-"}</td>}
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
                  <td className={tdCls} colSpan={colSpanName}>合计</td>
                  <td className={monoR}>{fmt(totals.qjTarget)}</td>
                  <td className={`${monoR} text-amber-600`}>{fmt(totals.qjActual)}</td>
                  <td className={`${monoR} ${pctColor(totals.qjTarget > 0 ? totals.qjActual / totals.qjTarget : 0)}`}>
                    {totals.qjTarget > 0 ? pct(totals.qjActual / totals.qjTarget) : "-"}
                  </td>
                  <td className={`${monoR} ${totals.qjTarget - totals.qjActual <= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {totals.qjTarget > 0 ? fmt(totals.qjTarget - totals.qjActual) : "-"}
                  </td>
                  <td className={monoR}>{fmt(totals.dcTarget)}</td>
                  <td className={`${monoR} text-emerald-600`}>{fmt(totals.dcActual)}</td>
                  <td className={`${monoR} ${pctColor(totals.dcTarget > 0 ? totals.dcActual / totals.dcTarget : 0)}`}>
                    {totals.dcTarget > 0 ? pct(totals.dcActual / totals.dcTarget) : "-"}
                  </td>
                  <td className={`${monoR} ${totals.dcTarget - totals.dcActual <= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {totals.dcTarget > 0 ? fmt(totals.dcTarget - totals.dcActual) : "-"}
                  </td>
                  <td className={monoR}>{totals.count}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {achievements.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              暂无数据，请先在系统设置中配置{LEVEL_MAP[level].label}目标
            </div>
          )}
        </CardContent>
      </Card>
    </DeptSubPageWrapper>
  );
}
