import { useState, useMemo } from "react";
import {
  AlertTriangle, CheckCircle2, XCircle, Users, X,
  Building2, UserX, UserPlus, ChevronDown, ChevronUp,
  Search, CheckCheck, ArrowRightLeft, UserMinus,
} from "lucide-react";
import { toast } from "sonner";

const DIRECT_PARENT = "公司直营";

interface PersonSource {
  name: string;
  code: string;
  role: string;
  roleLabel: string;
  parent: string;
  status: string;
  months: number[];
  policyCount: number;
  totalPremium: number;
}

interface DiffItem {
  id: string;
  name: string;
  code: string;
  role: string;
  roleLabel: string;
  system: PersonSource | null;
  renwang: PersonSource | null;
  source: PersonSource | null;
  diffType: string;
  diffDescription: string;
  suggestedParent: string;
  confirmedParent: string;
  action: "accept" | "reject" | "modify";
}

export interface DiffResult {
  hasChanges: boolean;
  totalItems: number;
  consistentCount: number;
  conflictCount: number;
  transferredCount: number;
  missingCount: number;
  newCount: number;
  resignedCount: number;
  inactiveCount: number;
  latestMonth?: number;
  items: DiffItem[];
  existingStaff?: {
    directors: string[];
    deptManagers: string[];
  };
}

interface Props {
  diffResult: DiffResult;
  onClose: () => void;
  onConfirmed: (report: any) => void;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; textColor: string; Icon: any }> = {
  resigned:       { label: "疑似离职", color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    textColor: "#b91c1c", Icon: UserMinus },
  transferred:    { label: "调岗",     color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", textColor: "#7c3aed", Icon: ArrowRightLeft },
  conflict:       { label: "冲突",     color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", textColor: "#c2410c", Icon: XCircle },
  missing_parent: { label: "缺失归属", color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200",  textColor: "#b45309", Icon: AlertTriangle },
  new_person:     { label: "新增人员", color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200",   textColor: "#1d4ed8", Icon: UserPlus },
  renwang_only:   { label: "仅人网",   color: "text-cyan-700",   bg: "bg-cyan-50",   border: "border-cyan-200",   textColor: "#0e7490", Icon: Users },
  inactive:       { label: "未出现",   color: "text-gray-600",   bg: "bg-gray-50",   border: "border-gray-200",   textColor: "#4b5563", Icon: UserX },
};

const ROLE_ORDER: Record<string, number> = { director: 0, deptManager: 1, customerManager: 2 };

function formatPremium(val: number): string {
  if (!val) return "-";
  if (val >= 10000) return `${(val / 10000).toFixed(1)}万`;
  return `${val.toLocaleString()}元`;
}

export default function StaffDiffPanel({ diffResult, onClose, onConfirmed }: Props) {
  const [items, setItems] = useState<DiffItem[]>(() =>
    diffResult.items
      .map(it => ({
        ...it,
        confirmedParent: it.role === "director"
          ? (it.confirmedParent || "")
          : (it.confirmedParent || it.suggestedParent),
      }))
  );

  // 根据角色构建上级候选列表
  const parentOptions = useMemo(() => {
    const directors: string[] = [...(diffResult.existingStaff?.directors || [])];
    const deptManagers: string[] = [...(diffResult.existingStaff?.deptManagers || [])];
    for (const it of diffResult.items) {
      if (it.role === "director" && !directors.includes(it.name)) directors.push(it.name);
      if (it.role === "deptManager" && !deptManagers.includes(it.name)) deptManagers.push(it.name);
    }
    for (const it of diffResult.items) {
      if (it.system?.role === "director" && !directors.includes(it.system.name)) directors.push(it.system.name);
      if (it.system?.role === "deptManager" && !deptManagers.includes(it.system.name)) deptManagers.push(it.system.name);
    }
    directors.sort();
    deptManagers.sort();
    return { directors, deptManagers };
  }, [diffResult.items, diffResult.existingStaff]);

  const getParentOptionsForRole = (role: string): string[] => {
    switch (role) {
      case "director": return [];
      case "deptManager": return parentOptions.directors;
      case "customerManager": return parentOptions.deptManagers;
      default: return [];
    }
  };

  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchText, setSearchText] = useState("");

  const filteredItems = useMemo(() => {
    let list = items;
    if (filterType !== "all") list = list.filter(it => it.diffType === filterType);
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(it =>
        it.name.toLowerCase().includes(q) ||
        it.code.toLowerCase().includes(q) ||
        (it.confirmedParent || it.suggestedParent || "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (a.role === "director" && b.role !== "director") return -1;
      if (a.role !== "director" && b.role === "director") return 1;
      const aUnresolved = a.role !== "director" && a.action !== "reject" && !a.confirmedParent && !a.suggestedParent ? 0 : 1;
      const bUnresolved = b.role !== "director" && b.action !== "reject" && !b.confirmedParent && !b.suggestedParent ? 0 : 1;
      if (aUnresolved !== bUnresolved) return aUnresolved - bUnresolved;
      return (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9);
    });
  }, [items, filterType, searchText]);

  const updateItem = (id: string, updates: Partial<DiffItem>) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...updates } : it));
  };

  // 批量操作：将所有疑似离职标记为离职
  const handleBatchResign = () => {
    setItems(prev => prev.map(it =>
      it.diffType === "resigned" ? { ...it, action: "modify" } : it
    ));
    toast.success("已将所有疑似离职人员标记为【确认离职】");
  };

  // 批量操作：将所有调岗确认
  const handleBatchTransfer = () => {
    setItems(prev => prev.map(it =>
      it.diffType === "transferred" ? { ...it, action: "accept" } : it
    ));
    toast.success("已确认所有调岗变动");
  };

  // 检查是否有未处理的冲突项
  const unresolvedConflicts = useMemo(() => {
    return items.filter(it =>
      it.diffType === "conflict" && it.action !== "reject" && !it.confirmedParent
    );
  }, [items]);

  const handleConfirmAll = async () => {
    // 检查冲突是否已解决
    if (unresolvedConflicts.length > 0) {
      toast.error(`还有 ${unresolvedConflicts.length} 项冲突未解决，请先处理所有冲突后再提交`);
      setFilterType("conflict");
      return;
    }

    const unresolved = items.filter(it =>
      it.role !== "director" &&
      it.action !== "reject" &&
      it.diffType !== "resigned" &&
      it.diffType !== "inactive" &&
      !it.confirmedParent && !it.suggestedParent
    );
    if (unresolved.length > 0) {
      toast.warning(`还有 ${unresolved.length} 人的上级未指定，请先处理或忽略`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/report/staff-diff/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "确认失败");
      }
      const data = await res.json();
      toast.success(`人事数据已更新（${data.changeCount} 项变动），报表已重新生成`);
      onConfirmed(data.report);
    } catch (err: any) {
      toast.error(err.message || "确认失败");
    } finally {
      setSubmitting(false);
    }
  };

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const it of items) counts[it.diffType] = (counts[it.diffType] || 0) + 1;
    return counts;
  }, [items]);

  const rejectedCount = items.filter(i => i.action === "reject").length;
  const resignedActionCount = items.filter(i => i.diffType === "resigned" && i.action === "modify").length;
  const unresolvedCount = items.filter(i =>
    i.role !== "director" &&
    i.action !== "reject" &&
    i.diffType !== "resigned" &&
    i.diffType !== "inactive" &&
    !i.confirmedParent && !i.suggestedParent
  ).length;
  const directorCount = items.filter(i => i.role === "director").length;

  // 构建筛选按钮配置
  const filterButtons = [
    { key: "resigned",       count: typeCounts["resigned"] || 0 },
    { key: "transferred",    count: typeCounts["transferred"] || 0 },
    { key: "conflict",       count: typeCounts["conflict"] || 0 },
    { key: "missing_parent", count: typeCounts["missing_parent"] || 0 },
    { key: "new_person",     count: typeCounts["new_person"] || 0 },
    { key: "renwang_only",   count: typeCounts["renwang_only"] || 0 },
    { key: "inactive",       count: typeCounts["inactive"] || 0 },
  ].filter(b => b.count > 0); // 只显示有数据的类型

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-amber-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg">人事结构变化确认</h3>
              <p className="text-xs text-amber-700 mt-0.5">
                检测到 <strong>{items.length}</strong> 项人事变动，请逐项确认后提交更新
                {diffResult.latestMonth && (
                  <span className="ml-2 text-blue-600">(数据截止{diffResult.latestMonth}月)</span>
                )}
                {(typeCounts["resigned"] || 0) > 0 && (
                  <span className="ml-2 text-red-600 font-medium">
                    （{typeCounts["resigned"]}人疑似离职）
                  </span>
                )}
                {(typeCounts["transferred"] || 0) > 0 && (
                  <span className="ml-2 text-purple-600 font-medium">
                    （{typeCounts["transferred"]}人疑似调岗）
                  </span>
                )}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary cards */}
        <div className="px-6 py-3 border-b bg-gray-50 shrink-0">
          <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${Math.min(filterButtons.length, 7)}, 1fr)` }}>
            {filterButtons.map(({ key, count }) => {
              const cfg = TYPE_CONFIG[key];
              return (
                <button
                  key={key}
                  onClick={() => setFilterType(filterType === key ? "all" : key)}
                  className={`rounded-lg p-2.5 text-center transition-all border ${
                    filterType === key
                      ? `${cfg.bg} ${cfg.border} ring-2 ring-offset-1`
                      : count > 0
                        ? `bg-white ${cfg.border} hover:${cfg.bg}`
                        : "bg-white border-gray-100 opacity-50 cursor-default"
                  }`}
                  disabled={count === 0}
                  style={filterType === key ? { outlineColor: cfg.textColor } as React.CSSProperties : undefined}
                >
                  <div className={`text-xl font-bold ${count > 0 ? cfg.color : "text-gray-300"}`}>{count}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{cfg.label}</div>
                </button>
              );
            })}
          </div>

          {/* 批量操作按钮 */}
          {((typeCounts["resigned"] || 0) > 0 || (typeCounts["transferred"] || 0) > 0) && (
            <div className="flex gap-2 mt-3">
              {(typeCounts["resigned"] || 0) > 0 && (
                <button
                  onClick={handleBatchResign}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors flex items-center gap-1.5"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  一键确认全部离职（{typeCounts["resigned"]}人）
                </button>
              )}
              {(typeCounts["transferred"] || 0) > 0 && (
                <button
                  onClick={handleBatchTransfer}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  一键确认全部调岗（{typeCounts["transferred"]}人）
                </button>
              )}
            </div>
          )}
        </div>

        {/* Search bar */}
        <div className="px-6 py-2.5 border-b bg-white flex items-center gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索姓名、工号或上级..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="text-xs text-gray-400 shrink-0">
            显示 {filteredItems.length} / {items.length} 条
          </div>
          {filterType !== "all" && (
            <button
              onClick={() => setFilterType("all")}
              className="text-xs text-blue-600 hover:text-blue-800 shrink-0"
            >
              清除筛选
            </button>
          )}
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1.5">
          {filteredItems.map((item) => {
            const cfg = TYPE_CONFIG[item.diffType] || TYPE_CONFIG.inactive;
            const isExpanded = expandedId === item.id;
            const IconComp = cfg.Icon;
            const isDirector = item.role === "director";
            const isResigned = item.diffType === "resigned";
            const isTransferred = item.diffType === "transferred";
            const isInactive = item.diffType === "inactive";
            const parentDisplay = item.confirmedParent || item.suggestedParent || "";
            const isUnresolved = !isDirector && !isResigned && !isInactive &&
              item.action !== "reject" && !parentDisplay;

            return (
              <div
                key={item.id}
                data-unresolved={isUnresolved ? "true" : undefined}
                className={`border rounded-lg overflow-hidden transition-all ${
                  item.action === "reject" ? "opacity-40" : ""
                } ${isUnresolved ? "border-orange-400 ring-2 ring-orange-300 bg-orange-50/30" : ""} ${
                  isResigned ? `${cfg.border} ${item.action === "modify" ? "bg-red-50/40" : ""}` :
                  isTransferred ? `${cfg.border} bg-purple-50/20` :
                  isDirector ? "border-purple-300 bg-purple-50/20" : cfg.border
                }`}
              >
                {/* Row header */}
                <div
                  className={`px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors hover:bg-gray-50/80 ${
                    isExpanded ? "bg-gray-50" : ""
                  }`}
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <IconComp className={`w-4 h-4 shrink-0 ${cfg.color}`} />
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className={`text-sm font-semibold whitespace-nowrap ${
                      isResigned && item.action === "modify" ? "line-through text-gray-400" : ""
                    }`}>{item.name}</span>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{item.code}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${
                      item.role === "director" ? "bg-purple-100 text-purple-700" :
                      item.role === "deptManager" ? "bg-indigo-50 text-indigo-700" :
                      "bg-teal-50 text-teal-700"
                    }`}>
                      {item.roleLabel}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color} font-medium whitespace-nowrap`}>
                      {cfg.label}
                    </span>
                    {/* 显示关键信息 */}
                    {isResigned && item.system && (
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        原上级：{item.system.parent || "无"}
                      </span>
                    )}
                    {isResigned && !item.system && item.source && (
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        原上级：{item.source.parent || "无"}
                      </span>
                    )}
                    {isResigned && item.source?.months?.length ? (
                      <span className="text-[10px] text-red-400 whitespace-nowrap">
                        出单：{item.source.months.map((m: number) => `${m}月`).join("、")}
                      </span>
                    ) : null}
                    {(isInactive || isResigned) && item.source?.months?.length ? (
                      <span className="text-[10px] whitespace-nowrap flex items-center gap-0.5">
                        {Array.from({ length: diffResult.latestMonth || Math.max(...(item.source.months || [1])) }, (_, i) => i + 1).map(m => {
                          const hasData = item.source!.months.includes(m);
                          return (
                            <span
                              key={m}
                              className={`px-0.5 rounded ${hasData ? "text-emerald-600" : "text-red-500"}`}
                            >
                              {m}月{hasData ? "✓" : "✗"}
                            </span>
                          );
                        })}
                      </span>
                    ) : null}
                    {isTransferred && (
                      <span className="text-[10px] text-purple-600 whitespace-nowrap">
                        {item.system?.parent || "?"} → {item.suggestedParent || "?"}
                      </span>
                    )}
                    {!isResigned && !isTransferred && item.system && (
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        现有上级：{item.system.parent || "无"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.action === "reject" ? (
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">已忽略</span>
                    ) : isResigned ? (
                      item.action === "modify" ? (
                        <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded font-medium">
                          确认离职
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-medium animate-pulse">
                          待确认
                        </span>
                      )
                    ) : isInactive ? (
                      item.action === "modify" ? (
                        <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded font-medium">
                          标记离职
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          保留在职
                        </span>
                      )
                    ) : isDirector ? (
                      <span className="text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded font-medium">
                        最高级别
                      </span>
                    ) : isUnresolved ? (
                      <span className="text-[10px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded font-medium animate-pulse">
                        待指定
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        → {parentDisplay}
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 py-3 border-t bg-white space-y-3">
                    {/* 差异描述 */}
                    <div className={`text-xs px-3 py-2 rounded-lg ${cfg.bg} ${cfg.color}`}>
                      {item.diffDescription}
                    </div>

                    {/* Three-way comparison table */}
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="text-gray-400 border-b">
                          <th className="text-left py-1.5 font-medium w-28">数据来源</th>
                          <th className="text-left py-1.5 font-medium">上级姓名</th>
                          <th className="text-left py-1.5 font-medium">职位</th>
                          <th className="text-left py-1.5 font-medium">状态</th>
                          <th className="text-left py-1.5 font-medium">活跃月份</th>
                          <th className="text-left py-1.5 font-medium">保单/保费</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-gray-50">
                          <td className="py-2 font-medium text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5" />
                              <span>系统现有</span>
                            </div>
                          </td>
                          <td className={`py-2 ${item.system ? "font-medium" : "text-gray-300"}`}>
                            {isDirector ? "（最高级别）" : (item.system?.parent || (item.system ? "无" : "—"))}
                          </td>
                          <td className="py-2">{item.system?.roleLabel || "—"}</td>
                          <td className="py-2">
                            {item.system?.status === "active" ? (
                              <span className="text-emerald-600">在职</span>
                            ) : item.system?.status === "resigned" ? (
                              <span className="text-red-600">离职</span>
                            ) : item.system?.status === "transferred" ? (
                              <span className="text-amber-600">调岗</span>
                            ) : "—"}
                          </td>
                          <td className="py-2">—</td>
                          <td className="py-2">—</td>
                        </tr>
                        <tr className="border-b hover:bg-gray-50">
                          <td className="py-2 font-medium text-cyan-700">
                            <div className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" />
                              <span>人网数据</span>
                            </div>
                          </td>
                          <td className={`py-2 ${item.renwang ? "font-medium" : "text-gray-300"}`}>
                            {isDirector ? "（最高级别）" : (item.renwang?.parent || (item.renwang ? "无" : "—"))}
                          </td>
                          <td className="py-2">{item.renwang?.roleLabel || "—"}</td>
                          <td className="py-2">
                            {item.renwang ? (
                              <span className="text-cyan-600">在册</span>
                            ) : (
                              <span className="text-red-500 font-medium">未在册</span>
                            )}
                          </td>
                          <td className="py-2">—</td>
                          <td className="py-2">—</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="py-2 font-medium text-blue-700">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>2026数据</span>
                            </div>
                          </td>
                          <td className={`py-2 ${item.source?.parent ? "font-medium" : isDirector ? "text-gray-500" : "text-orange-500 font-bold"}`}>
                            {isDirector ? "（最高级别）" : (item.source?.parent || (item.source ? "空（缺失）" : "—"))}
                          </td>
                          <td className="py-2">{item.source?.roleLabel || "—"}</td>
                          <td className="py-2">
                            {item.source ? (
                              <span className="text-blue-600">有出单</span>
                            ) : (
                              <span className="text-gray-400">无出单</span>
                            )}
                          </td>
                          <td className="py-2">
                            {item.source?.months?.length ? (
                              <span className="flex flex-wrap gap-1">
                                {Array.from({ length: diffResult.latestMonth || Math.max(...(item.source.months || [1])) }, (_, i) => i + 1).map(m => {
                                  const hasData = item.source!.months.includes(m);
                                  return (
                                    <span
                                      key={m}
                                      className={`inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium ${
                                        hasData
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-red-100 text-red-600"
                                      }`}
                                    >
                                      {m}月{hasData ? "✓" : "✗"}
                                    </span>
                                  );
                                })}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="py-2">
                            {item.source ? `${item.source.policyCount}单 / ${formatPremium(item.source.totalPremium)}` : "—"}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Action area */}
                    <div className="flex items-center gap-3 pt-2 border-t">
                      {isResigned || isInactive ? (
                        /* 疑似离职 / 未出现：提供"确认离职"和"保留在职"按钮 */
                        <>
                          <div className="flex-1 flex items-center gap-2">
                            <span className={`text-xs px-3 py-1.5 rounded-lg border ${
                              isResigned
                                ? "text-red-600 bg-red-50 border-red-200"
                                : "text-gray-600 bg-gray-50 border-gray-200"
                            }`}>
                              {isResigned
                                ? (item.system
                                    ? "该人员在人网和业务数据中均未出现，建议标记为离职"
                                    : "该人员仅在历史保单中出现，人网中已不存在，疑似已离职"
                                  )
                                : "该人员在部分数据中未出现，请确认是否离职"
                              }
                            </span>
                          </div>
                          <button
                            onClick={() => updateItem(item.id, { action: "modify" })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                              item.action === "modify"
                                ? "bg-red-600 text-white border border-red-600"
                                : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <UserMinus className="w-3.5 h-3.5" />
                              {item.action === "modify" ? "已确认离职" : "确认离职"}
                            </span>
                          </button>
                          <button
                            onClick={() => updateItem(item.id, { action: "accept" })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                              item.action === "accept"
                                ? "bg-emerald-600 text-white border border-emerald-600"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            }`}
                          >
                            {item.action === "accept" ? "保留在职" : "保留在职"}
                          </button>
                          <button
                            onClick={() => updateItem(item.id, { action: item.action === "reject" ? (isResigned ? "modify" : "accept") : "reject" })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                              item.action === "reject"
                                ? "bg-gray-200 text-gray-700 border border-gray-300"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200 border border-transparent"
                            }`}
                          >
                            {item.action === "reject" ? "已忽略" : "忽略"}
                          </button>
                        </>
                      ) : isDirector ? (
                        /* 总监 */
                        <>
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-xs text-purple-600 font-medium bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200">
                              总监为最高级别，无需指定上级，确认后将自动加入组织架构
                            </span>
                          </div>
                          <button
                            onClick={() => updateItem(item.id, { action: item.action === "reject" ? "accept" : "reject" })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                              item.action === "reject"
                                ? "bg-red-100 text-red-700 border border-red-300"
                                : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 border border-transparent"
                            }`}
                          >
                            {item.action === "reject" ? "已忽略" : "忽略此项"}
                          </button>
                        </>
                      ) : (
                        /* 其他类型：选择上级 */
                        <>
                          <label className="text-xs text-gray-500 shrink-0 font-medium">
                            {isTransferred ? "确认新上级：" : "确认上级："}
                          </label>
                          {(() => {
                            const options = getParentOptionsForRole(item.role);
                            return (
                              <select
                                value={item.confirmedParent || ""}
                                onChange={(e) => updateItem(item.id, { confirmedParent: e.target.value, action: "accept" })}
                                className={`flex-1 px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none bg-white cursor-pointer ${
                                  !item.confirmedParent ? "text-gray-400" : "text-gray-900"
                                }`}
                              >
                                <option value="" disabled>
                                  {`请选择${item.role === "deptManager" ? "所属总监" : "所属营业部经理"}`}
                                </option>
                                <option value={DIRECT_PARENT}>
                                  公司直营（无上级）
                                </option>
                                {options.map(name => (
                                  <option key={name} value={name}>{name}</option>
                                ))}
                              </select>
                            );
                          })()}
                          {item.confirmedParent && item.confirmedParent !== DIRECT_PARENT && item.action === "accept" ? (
                            <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-300 whitespace-nowrap flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              已确认
                            </span>
                          ) : null}
                          <button
                            onClick={() => updateItem(item.id, { confirmedParent: DIRECT_PARENT, action: "accept" })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                              item.confirmedParent === DIRECT_PARENT
                                ? "bg-purple-100 text-purple-700 border border-purple-300"
                                : "bg-gray-100 text-gray-600 hover:bg-purple-50 hover:text-purple-600 border border-transparent"
                            }`}
                          >
                            公司直营
                          </button>
                          <button
                            onClick={() => updateItem(item.id, {
                              action: item.action === "reject" ? "accept" : "reject",
                              confirmedParent: item.action === "reject" ? (item.suggestedParent || "") : "",
                            })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                              item.action === "reject"
                                ? "bg-red-100 text-red-700 border border-red-300"
                                : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 border border-transparent"
                            }`}
                          >
                            {item.action === "reject" ? "已忽略" : "忽略此项"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-sm text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              {searchText ? "未找到匹配的人员" : "该分类下没有差异项"}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t bg-gray-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>共 <strong className="text-gray-700">{items.length}</strong> 项差异</span>
            {(typeCounts["resigned"] || 0) > 0 && (
              <span className="text-red-600">
                {resignedActionCount}/{typeCounts["resigned"]} 人确认离职
              </span>
            )}
            {(typeCounts["transferred"] || 0) > 0 && (
              <span className="text-purple-600">{typeCounts["transferred"]} 人调岗</span>
            )}
            {directorCount > 0 && <span className="text-purple-600">{directorCount} 名总监</span>}
            {rejectedCount > 0 && <span className="text-gray-400">{rejectedCount} 项已忽略</span>}
            {unresolvedCount > 0 && (
              <button
                onClick={() => {
                  setFilterType("all");
                  setSearchText("");
                  setTimeout(() => {
                    const el = document.querySelector('[data-unresolved="true"]');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 100);
                }}
                className="text-orange-600 font-medium animate-pulse hover:underline cursor-pointer"
              >
                {unresolvedCount} 项待指定上级
              </button>
            )}
            {unresolvedConflicts.length > 0 && (
              <button
                onClick={() => setFilterType("conflict")}
                className="text-red-600 font-medium animate-pulse hover:underline cursor-pointer"
              >
                {unresolvedConflicts.length} 项冲突待解决
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-white border hover:bg-gray-50 transition-colors"
            >
              稍后处理
            </button>
            <button
              onClick={handleConfirmAll}
              disabled={submitting || unresolvedConflicts.length > 0}
              className={`px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2 ${
                unresolvedConflicts.length > 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
              title={unresolvedConflicts.length > 0 ? `还有 ${unresolvedConflicts.length} 项冲突未解决` : undefined}
            >
              <CheckCheck className="w-4 h-4" />
              {submitting ? "正在更新..." : unresolvedConflicts.length > 0 ? `请先解决 ${unresolvedConflicts.length} 项冲突` : "确认并更新组织架构"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
