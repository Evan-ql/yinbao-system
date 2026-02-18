import React, { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Check, X, ChevronUp, ChevronDown, ChevronsUpDown, AlertTriangle } from "lucide-react";

export interface ColumnDef {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: { value: string; label: string }[];
  width?: string;
  required?: boolean;
  sortable?: boolean;
}

export interface RowHighlight {
  highlighted: boolean;
  reason?: string;
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
  /** 行高亮回调：返回该行是否需要高亮及原因 */
  rowHighlight?: (item: any) => RowHighlight;
  /** 表格级别的警告信息 */
  alertMessage?: string;
  /** 警告数量 */
  alertCount?: number;
}

type SortDirection = "asc" | "desc" | null;

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
}: SettingsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newData, setNewData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

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

  // 统计高亮行数
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
      defaults[col.key] = col.type === "number" ? 0 : col.options?.[0]?.value || "";
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

  const renderCell = (col: ColumnDef, value: any, isHighlighted: boolean) => {
    if (col.type === "select" && col.options) {
      const opt = col.options.find((o) => o.value === value);
      return opt?.label || value || "-";
    }
    if (col.type === "number") {
      return typeof value === "number" ? value.toLocaleString() : value || "0";
    }
    return value || "-";
  };

  const renderInput = (col: ColumnDef, value: any, onChange: (v: any) => void) => {
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
              <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground w-24">
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
                      setNewData((prev: any) => ({ ...prev, [col.key]: v }))
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
                            setEditData((prev: any) => ({ ...prev, [col.key]: v }))
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
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
    </div>
  );
}
