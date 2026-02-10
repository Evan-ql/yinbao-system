import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";

interface DataTableEditorProps {
  title: string;
  data: any[];
  totalCount: number;
  onDataChange: (newData: any[]) => void;
  pageSize?: number;
  maxHeight?: string;
}

export default function DataTableEditor({
  title,
  data,
  totalCount,
  onDataChange,
  pageSize = 50,
  maxHeight = "calc(100vh - 320px)",
}: DataTableEditorProps) {
  const [page, setPage] = useState(0);
  const [editCell, setEditCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Filter data by search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((v) =>
        v !== null && v !== undefined && String(v).toLowerCase().includes(term)
      )
    );
  }, [data, searchTerm]);

  const columns = data.length > 0 ? Object.keys(data[0]) : [];
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const pageData = filteredData.slice(page * pageSize, (page + 1) * pageSize);

  // Reset page when data or search changes
  useEffect(() => {
    setPage(0);
  }, [searchTerm]);

  // Focus edit input
  useEffect(() => {
    if (editCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editCell]);

  // Get the original index in data array for a filtered row
  const getOriginalIndex = useCallback(
    (filteredIdx: number): number => {
      if (!searchTerm.trim()) return page * pageSize + filteredIdx;
      const row = pageData[filteredIdx];
      return data.indexOf(row);
    },
    [data, pageData, page, pageSize, searchTerm]
  );

  const startEdit = (filteredRowIdx: number, col: string) => {
    const originalIdx = getOriginalIndex(filteredRowIdx);
    const value = data[originalIdx]?.[col];
    setEditCell({ row: originalIdx, col });
    setEditValue(value !== null && value !== undefined ? String(value) : "");
  };

  const saveEdit = () => {
    if (!editCell) return;
    const { row, col } = editCell;
    const newData = [...data];
    newData[row] = { ...newData[row], [col]: editValue };
    onDataChange(newData);
    setEditCell(null);
    toast.info("已修改");
  };

  const cancelEdit = () => {
    setEditCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") cancelEdit();
  };

  const deleteRow = (filteredRowIdx: number) => {
    const originalIdx = getOriginalIndex(filteredRowIdx);
    const newData = [...data];
    newData.splice(originalIdx, 1);
    onDataChange(newData);
    toast.info("已删除一行");
  };

  const addRow = () => {
    if (columns.length === 0) return;
    const newRow: any = {};
    for (const col of columns) {
      newRow[col] = "";
    }
    const newData = [...data, newRow];
    onDataChange(newData);
    // Jump to last page
    const newTotalPages = Math.ceil(newData.length / pageSize);
    setPage(newTotalPages - 1);
    toast.info("已添加一行");
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">{title}</CardTitle>
            <span className="text-xs text-muted-foreground">
              共 {totalCount.toLocaleString()} 条
              {totalCount > data.length ? `（预览前 ${data.length.toLocaleString()} 条）` : ""}
              {searchTerm && ` · 筛选 ${filteredData.length} 条`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-7 w-40 pl-7 pr-2 rounded-md border border-input bg-transparent text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            {/* Add Row */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={addRow}
            >
              <Plus className="w-3.5 h-3.5" />
              添加行
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col">
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 shrink-0">
          <span className="text-[10px] text-muted-foreground">
            点击单元格可编辑
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="h-6 w-6 rounded flex items-center justify-center border border-input text-xs disabled:opacity-30 hover:bg-accent/50 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="h-6 w-6 rounded flex items-center justify-center border border-input text-xs disabled:opacity-30 hover:bg-accent/50 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight }}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-muted-foreground font-medium w-8">#</th>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="text-left py-2 px-2 text-muted-foreground font-medium whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
                <th className="text-center py-2 px-2 text-muted-foreground font-medium w-10">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((row: any, rowIdx: number) => {
                const originalIdx = getOriginalIndex(rowIdx);
                return (
                  <tr
                    key={`${originalIdx}-${rowIdx}`}
                    className="border-b border-border/30 hover:bg-accent/30 transition-colors group"
                  >
                    <td className="py-1.5 px-2 text-muted-foreground tabular-nums text-[10px]">
                      {originalIdx + 1}
                    </td>
                    {columns.map((col) => {
                      const isEditing =
                        editCell?.row === originalIdx && editCell?.col === col;
                      const cellValue = row[col];
                      const displayValue =
                        cellValue !== null && cellValue !== undefined
                          ? String(cellValue)
                          : "";

                      return (
                        <td
                          key={col}
                          className={`py-1.5 px-2 whitespace-nowrap max-w-[200px] truncate cursor-pointer transition-colors ${
                            isEditing
                              ? "bg-primary/10 ring-1 ring-primary/30"
                              : "hover:bg-accent/50"
                          }`}
                          onClick={() => !isEditing && startEdit(rowIdx, col)}
                          title={displayValue}
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                ref={editInputRef}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="h-5 w-full bg-transparent border-none outline-none text-xs"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveEdit();
                                }}
                                className="shrink-0 text-emerald-600 hover:text-emerald-500"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelEdit();
                                }}
                                className="shrink-0 text-muted-foreground hover:text-foreground"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span
                              className={
                                typeof cellValue === "number"
                                  ? "font-mono text-amber-600/80"
                                  : ""
                              }
                            >
                              {displayValue || (
                                <span className="text-muted-foreground/30">-</span>
                              )}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-1.5 px-2 text-center">
                      <button
                        onClick={() => deleteRow(rowIdx)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                        title="删除此行"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {pageData.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="py-8 text-center text-muted-foreground text-sm"
                  >
                    {searchTerm ? "没有匹配的数据" : "暂无数据"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
