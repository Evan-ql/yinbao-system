import { useState, useMemo } from "react";
import {
  AlertTriangle, CheckCircle2, XCircle, Users, X,
  Building2, UserX, UserPlus, ChevronDown, ChevronUp,
  Search, CheckCheck,
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
  missingCount: number;
  newCount: number;
  inactiveCount: number;
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
  conflict:       { label: "冲突",     color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    textColor: "#b91c1c", Icon: XCircle },
  missing_parent: { label: "缺失归属", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", textColor: "#c2410c", Icon: AlertTriangle },
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
  // 所有人员（包括总监）都参与确认流程
  const [items, setItems] = useState<DiffItem[]>(() =>
    diffResult.items
      .map(it => ({
        ...it,
        // 总监不需要上级，自动设为空字符串（表示已确认，无需指定上级）
        confirmedParent: it.role === "director"
          ? (it.confirmedParent || "")
          : (it.confirmedParent || it.suggestedParent),
      }))
  );

  // 根据角色构建上级候选列表（优先使用后端返回的组织架构数据，再从diff项中补充）
  const parentOptions = useMemo(() => {
    // 从后端返回的组织架构中获取已有人员
    const directors: string[] = [...(diffResult.existingStaff?.directors || [])];
    const deptManagers: string[] = [...(diffResult.existingStaff?.deptManagers || [])];
    // 从所有diff项中补充（新增的人员可能还不在组织架构中）
    for (const it of diffResult.items) {
      if (it.role === "director" && !directors.includes(it.name)) directors.push(it.name);
      if (it.role === "deptManager" && !deptManagers.includes(it.name)) deptManagers.push(it.name);
    }
    // 也从系统现有数据中补充
    for (const it of diffResult.items) {
      if (it.system?.role === "director" && !directors.includes(it.system.name)) directors.push(it.system.name);
      if (it.system?.role === "deptManager" && !deptManagers.includes(it.system.name)) deptManagers.push(it.system.name);
    }
    directors.sort();
    deptManagers.sort();
    return { directors, deptManagers };
  }, [diffResult.items, diffResult.existingStaff]);

  // 根据角色获取对应的上级候选列表
  const getParentOptionsForRole = (role: string): string[] => {
    switch (role) {
      case "director": return []; // 总监没有上级可选
      case "deptManager": return parentOptions.directors; // 营业部经理选总监
      case "customerManager": return parentOptions.deptManagers; // 客户经理选营业部经理
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
    // 排序：1.总监排最前 2.待指定的排前面 3.按角色排序：总监 > 营业部经理 > 客户经理
    return [...list].sort((a, b) => {
      // 总监始终排在最前面
      if (a.role === "director" && b.role !== "director") return -1;
      if (a.role !== "director" && b.role === "director") return 1;
      // 非总监：待指定的排前面
      const aUnresolved = a.role !== "director" && a.action !== "reject" && !a.confirmedParent && !a.suggestedParent ? 0 : 1;
      const bUnresolved = b.role !== "director" && b.action !== "reject" && !b.confirmedParent && !b.suggestedParent ? 0 : 1;
      if (aUnresolved !== bUnresolved) return aUnresolved - bUnresolved;
      return (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9);
    });
  }, [items, filterType, searchText]);

  const updateItem = (id: string, updates: Partial<DiffItem>) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...updates } : it));
  };

  const handleConfirmAll = async () => {
    // 检查是否有"待指定"的项（总监不需要指定上级，排除在外）
    const unresolved = items.filter(it =>
      it.role !== "director" && it.action !== "reject" && !it.confirmedParent && !it.suggestedParent
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
  const unresolvedCount = items.filter(i =>
    i.role !== "director" && i.action !== "reject" && !i.confirmedParent && !i.suggestedParent
  ).length;

  // 统计总监数量
  const directorCount = items.filter(i => i.role === "director").length;

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
                检测到 <strong>{items.length}</strong> 项人事变动（含 {directorCount} 名总监），请逐项确认后提交更新
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary cards */}
        <div className="px-6 py-3 border-b bg-gray-50 shrink-0">
          <div className="grid grid-cols-5 gap-3">
            {[
              { key: "conflict",       count: diffResult.conflictCount },
              { key: "missing_parent", count: diffResult.missingCount },
              { key: "new_person",     count: diffResult.newCount },
              { key: "renwang_only",   count: typeCounts["renwang_only"] || 0 },
              { key: "inactive",       count: diffResult.inactiveCount },
            ].map(({ key, count }) => {
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
        </div>

        {/* Search + filter bar */}
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
            const parentDisplay = item.confirmedParent || item.suggestedParent || "";
            const isUnresolved = !isDirector && item.action !== "reject" && !parentDisplay;

            return (
              <div
                key={item.id}
                data-unresolved={isUnresolved ? "true" : undefined}
                className={`border rounded-lg overflow-hidden transition-all ${
                  item.action === "reject" ? "opacity-40" : ""
                } ${isUnresolved ? "border-orange-400 ring-2 ring-orange-300 bg-orange-50/30" : ""} ${
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
                  <IconComp className={`w-4 h-4 shrink-0 ${isDirector ? "text-purple-600" : cfg.color}`} />
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-sm font-semibold whitespace-nowrap">{item.name}</span>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{item.code}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${
                      item.role === "director" ? "bg-purple-100 text-purple-700" :
                      item.role === "deptManager" ? "bg-indigo-50 text-indigo-700" :
                      "bg-teal-50 text-teal-700"
                    }`}>
                      {item.roleLabel}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color} whitespace-nowrap`}>
                      {cfg.label}
                    </span>
                    {item.system && (
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        现有上级：{item.system.parent || "无"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.action === "reject" ? (
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">已忽略</span>
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
                          <td className="py-2">{item.renwang ? <span className="text-cyan-600">在册</span> : "—"}</td>
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
                          <td className="py-2">{item.source ? <span className="text-blue-600">有出单</span> : "—"}</td>
                          <td className="py-2">
                            {item.source?.months?.length ? item.source.months.map(m => `${m}月`).join("、") : "—"}
                          </td>
                          <td className="py-2">
                            {item.source ? `${item.source.policyCount}单 / ${formatPremium(item.source.totalPremium)}` : "—"}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Action area */}
                    <div className="flex items-center gap-3 pt-2 border-t">
                      {isDirector ? (
                        /* 总监：不需要选择上级，只显示确认信息 */
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
                        /* 营业部经理和客户经理：选择上级 */
                        <>
                          <label className="text-xs text-gray-500 shrink-0 font-medium">确认上级：</label>
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
            {directorCount > 0 && <span className="text-purple-600">{directorCount} 名总监</span>}
            {rejectedCount > 0 && <span className="text-red-500">{rejectedCount} 项已忽略</span>}
            {unresolvedCount > 0 && (
              <button
                onClick={() => {
                  setFilterType("all");
                  setSearchText("");
                  // 滚动到第一个待指定项
                  setTimeout(() => {
                    const el = document.querySelector('[data-unresolved="true"]');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 100);
                }}
                className="text-orange-600 font-medium animate-pulse hover:underline cursor-pointer"
              >
                {unresolvedCount} 项待指定上级 ← 点击定位
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
              disabled={submitting}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <CheckCheck className="w-4 h-4" />
              {submitting ? "正在更新..." : "确认并更新组织架构"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
