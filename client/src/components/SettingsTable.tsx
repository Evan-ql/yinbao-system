import React, { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, ChevronUp, ChevronDown } from "lucide-react";

export interface ColumnDef {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: { value: string; label: string }[];
  width?: string;
  required?: boolean;
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
}

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
}: SettingsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newData, setNewData] = useState<any>({});
  const [saving, setSaving] = useState(false);

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

  const renderCell = (col: ColumnDef, value: any) => {
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

  return (
    <div className="bg-card border border-border/60 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
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

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                  style={{ width: col.width }}
                >
                  {col.label}
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
            ) : data.length === 0 && !isAdding ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-muted-foreground">
                  暂无数据，点击"新增"添加
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-2">
                      {editingId === item.id ? (
                        renderInput(col, editData[col.key], (v) =>
                          setEditData((prev: any) => ({ ...prev, [col.key]: v }))
                        )
                      ) : (
                        <span className="text-sm">{renderCell(col, item[col.key])}</span>
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {data.length > 0 && (
        <div className="px-4 py-2 border-t border-border/40 text-xs text-muted-foreground">
          共 {data.length} 条记录
        </div>
      )}
    </div>
  );
}
