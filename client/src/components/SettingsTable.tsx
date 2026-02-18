import React, { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Check, X, ChevronUp, ChevronDown, ChevronsUpDown, AlertTriangle, History } from "lucide-react";
import OrgPickerModal from "./OrgPickerModal";

export interface ColumnDef {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "org-picker";
  options?: { value: string; label: string }[];
  width?: string;
  required?: boolean;
  sortable?: boolean;
  /** org-picker 专用：展示哪些类别 */
  orgCategories?: ("director" | "deptManager" | "direct")[];
}

export interface RowHighlight {
  highlighted: boolean;
  reason?: string;
}

interface TrackRecord {
  month: number;
  role: string;
  roleLabel: string;
  parentName: string;
  policyCount: number;
  status: string;
  source: "data" | "system";
}

interface StaffTrack {
  name: string;
  code: string;
  records: TrackRecord[];
}

interface SettingsTableProps {
  title: string;
  description?: string;
  columns: ColumnDef[];
  data: any[];
  onAdd: (item: any) => Promise<void>;
  onUpdate: (id: string, item: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
  extraActions?: (item: any) => React.ReactNode;
  rowHighlight?: (item: any) => RowHighlight;
  alertMessage?: string;
  alertCount?: number;
  showTrack?: boolean;
  /** 所有人员数据，用于 org-picker 类型列 */
  allStaff?: any[];
}

type SortDirection = "asc" | "desc" | null;

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  transferred: "bg-amber-100 text-amber-700",
  resigned: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  active: "在职",
  transferred: "调岗",
  resigned: "离职",
};

export default function SettingsTable({
  title,
  description,
  columns,
  data,
  onAdd,
  onUpdate,
  onDelete,
  loading,
  extraActions,
  rowHighlight,
  alertMessage,
  alertCount,
  showTrack = true,
  allStaff = [],
}: SettingsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newData, setNewData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  // 岗位轨迹弹窗状态
  const [trackModal, setTrackModal] = useState<StaffTrack | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);

  // OrgPicker 弹窗状态
  const [orgPicker, setOrgPicker] = useState<{
    target: "edit" | "add";
    colKey: string;
    currentValue: string;
    categories: ("director" | "deptManager" | "direct")[];
  } | null>(null);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else if (sortDir === "desc") {
        setSortKey(null);
        setSortDir(null);
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return data;

    return [...data].sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      if (col.type === "select" && col.options) {
        const aOpt = col.options.find((o) => o.value === aVal);
        const bOpt = col.options.find((o) => o.value === bVal);
        aVal = aOpt?.label || aVal || "";
        bVal = bOpt?.label || bVal || "";
      }

      if (!aVal && aVal !== 0) return 1;
      if (!bVal && bVal !== 0) return -1;

      const aStr = String(aVal);
      const bStr = String(bVal);
      const cmp = aStr.localeCompare(bStr, "zh-CN");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, columns]);

  const highlightedCount = useMemo(() => {
    if (!rowHighlight) return 0;
    return data.filter(item => rowHighlight(item).highlighted).length;
  }, [data, rowHighlight]);

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditData({ ...item });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await onUpdate(editingId!, editData);
      setEditingId(null);
      setEditData({});
    } finally {
      setSaving(false);
    }
  };

  const startAdd = () => {
    setIsAdding(true);
    const defaults: any = {};
    columns.forEach((col) => {
      if (col.type === "org-picker") {
        defaults[col.key] = "";
      } else {
        defaults[col.key] = col.type === "number" ? 0 : col.options?.[0]?.value || "";
      }
    });
    setNewData(defaults);
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setNewData({});
  };

  const saveAdd = async () => {
    setSaving(true);
    try {
      await onAdd(newData);
      setIsAdding(false);
      setNewData({});
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除吗？")) return;
    await onDelete(id);
  };

  const handleViewTrack = async (name: string) => {
    setTrackLoading(true);
    try {
      const res = await fetch(`/api/report/staff-track/${encodeURIComponent(name)}`);
      if (res.ok) {
        const track: StaffTrack = await res.json();
        setTrackModal(track);
      }
    } catch (e) {
      console.error("Failed to fetch staff track:", e);
    } finally {
      setTrackLoading(false);
    }
  };

  const renderCell = (col: ColumnDef, value: any, _isHighlighted: boolean) => {
    if (col.type === "org-picker") {
      if (value === "公司直营") {
        return <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">公司直营</span>;
      }
      return value || "-";
    }
    if (col.type === "select" && col.options) {
      const opt = col.options.find((o) => o.value === value);
      return opt?.label || value || "-";
    }
    if (col.type === "number") {
      return typeof value === "number" ? value.toLocaleString() : value || "0";
    }
    return value || "-";
  };

  const renderInput = (col: ColumnDef, value: any, onChange: (v: any) => void, target: "edit" | "add") => {
    if (col.type === "org-picker") {
      // 显示一个可点击的按钮，点击弹出 OrgPickerModal
      return (
        <button
          type="button"
          onClick={() =>
            setOrgPicker({
              target,
              colKey: col.key,
              currentValue: value || "",
              categories: col.orgCategories || ["director", "deptManager", "direct"],
            })
          }
          className="w-full px-2 py-1 text-sm border border-border rounded bg-background text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
        >
          <span className={value ? "" : "text-muted-foreground"}>
            {value === "公司直营" ? (
              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">公司直营</span>
            ) : (
              value || "点击选择上级..."
            )}
          </span>
          <span className="text-muted-foreground text-xs">选择</span>
        </button>
      );
    }
    if (col.type === "select" && col.options) {
      return (
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
        >
          {col.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        type={col.type === "number" ? "number" : "text"}
        value={value ?? ""}
        onChange={(e) =>
          onChange(col.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)
        }
        className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
        placeholder={col.label}
      />
    );
  };

  const renderSortIcon = (key: string) => {
    if (sortKey !== key || !sortDir) {
      return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
    }
    if (sortDir === "asc") {
      return <ChevronUp className="w-3 h-3 text-primary" />;
    }
    return <ChevronDown className="w-3 h-3 text-primary" />;
  };

  // OrgPicker 选择回调
  const handleOrgPickerSelect = (value: string) => {
    if (!orgPicker) return;
    if (orgPicker.target === "edit") {
      setEditData((prev: any) => ({ ...prev, [orgPicker.colKey]: value }));
    } else {
      setNewData((prev: any) => ({ ...prev, [orgPicker.colKey]: value }));
    }
    setOrgPicker(null);
  };

  return (
    <div className={`bg-card border rounded-lg ${
      (alertCount || highlightedCount) > 0 ? "border-orange-300" : "border-border/60"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{title}</h3>
              {(alertCount || highlightedCount) > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-medium rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                  {alertCount || highlightedCount} 项需关注
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
        <button
          onClick={startAdd}
          disabled={isAdding}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          新增
        </button>
      </div>

      {/* Alert banner */}
      {alertMessage && (
        <div className="px-4 py-2 bg-orange-50 border-b border-orange-200 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
          <span className="text-xs text-orange-700">{alertMessage}</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2 text-left text-xs font-medium text-muted-foreground ${
                    col.sortable ? "cursor-pointer select-none hover:text-foreground hover:bg-muted/50 transition-colors" : ""
                  }`}
                  style={{ width: col.width }}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && renderSortIcon(col.key)}
                  </span>
                </th>
              ))}
              <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground w-32">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Add row */}
            {isAdding && (
              <tr className="bg-primary/5 border-b border-border/40">
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-1.5">
                    {renderInput(col, newData[col.key], (v) =>
                      setNewData((prev: any) => ({ ...prev, [col.key]: v })),
                      "add"
                    )}
                  </td>
                ))}
                <td className="px-3 py-1.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={saveAdd}
                      disabled={saving}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelAdd}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Data rows */}
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-muted-foreground">
                  加载中...
                </td>
              </tr>
            ) : sortedData.length === 0 && !isAdding ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-muted-foreground">
                  暂无数据，点击"新增"添加
                </td>
              </tr>
            ) : (
              sortedData.map((item) => {
                const highlight = rowHighlight ? rowHighlight(item) : { highlighted: false };
                const isHighlighted = highlight.highlighted;

                return (
                  <tr
                    key={item.id}
                    className={`border-b transition-colors ${
                      isHighlighted
                        ? "bg-orange-50 border-orange-200 hover:bg-orange-100"
                        : "border-border/30 hover:bg-muted/20"
                    }`}
                    title={isHighlighted ? highlight.reason : undefined}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-3 py-2">
                        {editingId === item.id ? (
                          renderInput(col, editData[col.key], (v) =>
                            setEditData((prev: any) => ({ ...prev, [col.key]: v })),
                            "edit"
                          )
                        ) : (
                          <span className={`text-sm ${
                            isHighlighted ? "font-bold text-orange-700" : ""
                          }`}>
                            {renderCell(col, item[col.key], isHighlighted)}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center">
                      {editingId === item.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={saveEdit}
                            disabled={saving}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          {isHighlighted && (
                            <AlertTriangle className="w-3.5 h-3.5 text-orange-500 mr-0.5" />
                          )}
                          <button
                            onClick={() => startEdit(item)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="编辑"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {showTrack && (
                            <button
                              onClick={() => handleViewTrack(item.name)}
                              className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                              title="岗位轨迹"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {extraActions && extraActions(item)}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {data.length > 0 && (
        <div className="px-4 py-2 border-t border-border/40 text-xs text-muted-foreground flex items-center justify-between">
          <span>共 {data.length} 条记录</span>
          {highlightedCount > 0 && (
            <span className="text-orange-600 font-medium">
              {highlightedCount} 条数据需要补全
            </span>
          )}
        </div>
      )}

      {/* OrgPicker 弹窗 */}
      {orgPicker && (
        <OrgPickerModal
          title="选择上级"
          currentValue={orgPicker.currentValue}
          allStaff={allStaff}
          categories={orgPicker.categories}
          onSelect={handleOrgPickerSelect}
          onClose={() => setOrgPicker(null)}
        />
      )}

      {/* 岗位轨迹弹窗 */}
      {(trackModal || trackLoading) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !trackLoading && setTrackModal(null)}>
          <div className="bg-white rounded-lg shadow-xl w-[560px] max-w-[90vw] max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-600" />
                  岗位轨迹
                </h3>
                {trackModal && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {trackModal.name}{trackModal.code ? `（${trackModal.code}）` : ""}
                  </p>
                )}
              </div>
              <button
                onClick={() => setTrackModal(null)}
                className="p-1 text-muted-foreground hover:bg-muted rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto max-h-[60vh]">
              {trackLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  加载中...
                </div>
              ) : trackModal && trackModal.records.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  暂无岗位轨迹数据（需要上传2026数据后才能查看）
                </div>
              ) : trackModal ? (
                <div className="space-y-0">
                  {trackModal.records.map((rec, idx) => {
                    const isLast = idx === trackModal.records.length - 1;
                    const statusColor = STATUS_COLORS[rec.status] || "bg-gray-100 text-gray-600";
                    const statusLabel = STATUS_LABELS[rec.status] || rec.status;

                    return (
                      <div key={idx} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full border-2 mt-1 shrink-0 ${
                            rec.status === "active"
                              ? "border-emerald-500 bg-emerald-100"
                              : rec.status === "transferred"
                              ? "border-amber-500 bg-amber-100"
                              : "border-red-500 bg-red-100"
                          }`} />
                          {!isLast && (
                            <div className="w-0.5 bg-border flex-1 min-h-[24px]" />
                          )}
                        </div>

                        <div className={`flex-1 pb-4`}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">
                              {rec.month === 0 ? "全年" : `${rec.month}月`}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusColor}`}>
                              {statusLabel}
                            </span>
                            <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                              {rec.roleLabel}
                            </span>
                            {rec.source === "system" && (
                              <span className="text-[10px] text-blue-500 bg-blue-50 px-1 py-0.5 rounded">
                                系统记录
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                            {rec.parentName && (
                              <div>
                                上级：<span className="text-foreground font-medium">{rec.parentName}</span>
                              </div>
                            )}
                            {rec.policyCount > 0 && (
                              <div>
                                保单数：<span className="text-foreground font-medium">{rec.policyCount}</span> 单
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="px-5 py-3 border-t border-border/60 bg-muted/20 flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground">
                数据来源：2026年度数据 + 组织架构记录
              </span>
              <button
                onClick={() => setTrackModal(null)}
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded-md"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
