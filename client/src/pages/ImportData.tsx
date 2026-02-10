import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  BarChart3,
  Users,
  TrendingUp,
  Pencil,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useReport } from "@/contexts/ReportContext";
import { useLocation } from "wouter";

function fmt(v: number): string {
  if (v === 0) return "0";
  if (Math.abs(v) >= 10000) return (v / 10000).toFixed(1) + "万";
  return v.toLocaleString();
}

type DataTab = "source" | "renwang" | "daily";

export default function ImportDataPage() {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [renwangFile, setRenwangFile] = useState<File | null>(null);
  const [dailyFile, setDailyFile] = useState<File | null>(null);
  const { reportData, setReportData, rawData, setRawData, loading, setLoading } = useReport();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<DataTab>("source");
  const [editCell, setEditCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [page, setPage] = useState(0);
  const editInputRef = useRef<HTMLInputElement>(null);
  const pageSize = 50;

  // Auto-upload when both required files are selected
  const doUpload = useCallback(async (sf: File, rf: File, df: File | null) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("sourceFile", sf);
      formData.append("renwangFile", rf);
      if (df) formData.append("dailyFile", df);

      const res = await fetch("/api/report/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "解析失败");
      }

      const data = await res.json();
      setRawData(data.rawData);
      setReportData(data.report);
      toast.success("数据导入成功，报表已自动生成");
    } catch (err: any) {
      toast.error(err.message || "数据导入失败");
    } finally {
      setLoading(false);
    }
  }, [setReportData, setRawData, setLoading]);

  const handleSourceFile = useCallback((f: File | null) => {
    setSourceFile(f);
    if (f && renwangFile) {
      doUpload(f, renwangFile, dailyFile);
    }
  }, [renwangFile, dailyFile, doUpload]);

  const handleRenwangFile = useCallback((f: File | null) => {
    setRenwangFile(f);
    if (sourceFile && f) {
      doUpload(sourceFile, f, dailyFile);
    }
  }, [sourceFile, dailyFile, doUpload]);

  const handleDailyFile = useCallback((f: File | null) => {
    setDailyFile(f);
    if (sourceFile && renwangFile && f) {
      doUpload(sourceFile, renwangFile, f);
    }
  }, [sourceFile, renwangFile, doUpload]);

  // Focus edit input when editing
  useEffect(() => {
    if (editCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editCell]);

  // Get current tab data
  const getTabData = (): any[] => {
    if (!rawData) return [];
    switch (activeTab) {
      case "source": return rawData.source;
      case "renwang": return rawData.renwang;
      case "daily": return rawData.daily;
    }
  };

  const getTabTotalCount = (): number => {
    if (!rawData) return 0;
    switch (activeTab) {
      case "source": return rawData.sourceTotalCount;
      case "renwang": return rawData.renwangTotalCount;
      case "daily": return rawData.dailyTotalCount;
    }
  };

  const tabData = getTabData();
  const totalCount = getTabTotalCount();
  const columns = tabData.length > 0 ? Object.keys(tabData[0]) : [];
  const totalPages = Math.max(1, Math.ceil(tabData.length / pageSize));
  const pageData = tabData.slice(page * pageSize, (page + 1) * pageSize);

  // Handle cell edit
  const startEdit = (rowIdx: number, col: string) => {
    const globalIdx = page * pageSize + rowIdx;
    const value = tabData[globalIdx]?.[col];
    setEditCell({ row: globalIdx, col });
    setEditValue(value !== null && value !== undefined ? String(value) : "");
  };

  const saveEdit = () => {
    if (!editCell || !rawData) return;
    const { row, col } = editCell;
    const newData = { ...rawData };
    const tabKey = activeTab;
    const arr = [...newData[tabKey]];
    arr[row] = { ...arr[row], [col]: editValue };
    newData[tabKey] = arr;
    setRawData(newData);
    setEditCell(null);
    toast.info("已修改，数据将在下次生成时更新");
  };

  const cancelEdit = () => {
    setEditCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") cancelEdit();
  };

  // Reset page when switching tabs
  const switchTab = (tab: DataTab) => {
    setActiveTab(tab);
    setPage(0);
    setEditCell(null);
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">导入数据</h2>
        <p className="text-sm text-muted-foreground mt-1">上传数据文件后自动解析并生成报表</p>
      </div>

      {/* Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FileUploadCard
          label="2026数据"
          description="主数据源文件（必填）"
          file={sourceFile}
          onFileChange={handleSourceFile}
          required
          disabled={loading}
        />
        <FileUploadCard
          label="最新人网"
          description="人员网点数据（必填）"
          file={renwangFile}
          onFileChange={handleRenwangFile}
          required
          disabled={loading}
        />
        <FileUploadCard
          label="日清单"
          description="当日清单数据（可选）"
          file={dailyFile}
          onFileChange={handleDailyFile}
          disabled={loading}
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-3" />
          <span className="text-sm text-muted-foreground">正在解析数据并生成报表...</span>
        </div>
      )}

      {/* Summary Cards */}
      {reportData && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            icon={TrendingUp}
            label="月期交总额"
            value={fmt(reportData.dept?.totals?.totalQj || 0)}
            sub={`目标 ${fmt(reportData.dept?.totals?.totalQjTarget || 0)}`}
            color="text-amber-600"
          />
          <SummaryCard
            icon={BarChart3}
            label="规模趸总额"
            value={fmt(reportData.dept?.totals?.totalGmdc || 0)}
            sub={`目标 ${fmt(reportData.dept?.totals?.totalDcTarget || 0)}`}
            color="text-emerald-600"
          />
          <SummaryCard
            icon={FileSpreadsheet}
            label="数据量"
            value={reportData.summary.dataSourceCount.toLocaleString()}
            sub={`${reportData.summary.networkCount} 网点`}
            color="text-primary"
          />
          <SummaryCard
            icon={Users}
            label="人力"
            value={reportData.summary.hrCount + " 人"}
            sub={reportData.summary.dailyCount > 0 ? `日清单 ${reportData.summary.dailyCount} 条` : "无日清单"}
            color="text-rose-600"
          />
        </div>
      )}

      {/* Data Preview with Tabs */}
      {rawData && !loading && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">导入数据预览</CardTitle>
              <span className="text-xs text-muted-foreground">点击单元格可编辑</span>
            </div>
            {/* Tab Buttons */}
            <div className="flex gap-1 mt-2">
              <TabButton
                active={activeTab === "source"}
                onClick={() => switchTab("source")}
                count={rawData.sourceTotalCount}
              >
                2026数据
              </TabButton>
              <TabButton
                active={activeTab === "renwang"}
                onClick={() => switchTab("renwang")}
                count={rawData.renwangTotalCount}
              >
                人网数据
              </TabButton>
              {rawData.daily.length > 0 && (
                <TabButton
                  active={activeTab === "daily"}
                  onClick={() => switchTab("daily")}
                  count={rawData.dailyTotalCount}
                >
                  日清单
                </TabButton>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
              <span className="text-xs text-muted-foreground">
                共 {totalCount.toLocaleString()} 条{totalCount > tabData.length ? `（预览前 ${tabData.length.toLocaleString()} 条）` : ""}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="h-6 w-6 rounded flex items-center justify-center border border-input text-xs disabled:opacity-30 hover:bg-accent/50 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-muted-foreground tabular-nums">{page + 1} / {totalPages}</span>
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
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium w-10">#</th>
                    {columns.map((col) => (
                      <th key={col} className="text-left py-2 px-2 text-muted-foreground font-medium whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((row: any, rowIdx: number) => {
                    const globalIdx = page * pageSize + rowIdx;
                    return (
                      <tr key={rowIdx} className="border-b border-border/30 hover:bg-accent/30 transition-colors">
                        <td className="py-1.5 px-2 text-muted-foreground tabular-nums">{globalIdx + 1}</td>
                        {columns.map((col) => {
                          const isEditing = editCell?.row === globalIdx && editCell?.col === col;
                          const cellValue = row[col];
                          const displayValue = cellValue !== null && cellValue !== undefined ? String(cellValue) : "";

                          return (
                            <td
                              key={col}
                              className={`py-1.5 px-2 whitespace-nowrap max-w-[200px] truncate cursor-pointer transition-colors ${
                                isEditing ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-accent/50"
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
                                  <button onClick={saveEdit} className="shrink-0 text-emerald-600 hover:text-emerald-500">
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button onClick={cancelEdit} className="shrink-0 text-muted-foreground hover:text-foreground">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <span className={typeof cellValue === "number" ? "font-mono text-amber-600/80" : ""}>
                                  {displayValue || <span className="text-muted-foreground/30">-</span>}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!rawData && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileSpreadsheet className="w-12 h-12 mb-3 opacity-15" />
          <p className="text-sm">上传"2026数据"和"最新人网"后自动生成报表</p>
        </div>
      )}
    </div>
  );
}

function FileUploadCard({
  label,
  description,
  file,
  onFileChange,
  required,
  disabled,
}: {
  label: string;
  description: string;
  file: File | null;
  onFileChange: (f: File | null) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <Card className={`transition-colors ${file ? "border-emerald-400/30" : required ? "border-dashed" : "border-dashed border-border/50"} ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
      <CardContent className="pt-5 pb-4">
        <label className="cursor-pointer block">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${file ? "bg-emerald-400/10" : "bg-muted"}`}>
              {file ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Upload className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">{label}</span>
                {required && <span className="text-rose-600 text-xs">*</span>}
              </div>
              {file ? (
                <p className="text-xs text-emerald-600 truncate mt-0.5">{file.name}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
          </div>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          />
        </label>
      </CardContent>
    </Card>
  );
}

function TabButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      }`}
    >
      {children}
      <span className="ml-1.5 text-[10px] opacity-60">{count.toLocaleString()}</span>
    </button>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-muted-foreground">{label}</span>
          <Icon className={`w-3.5 h-3.5 ${color}`} />
        </div>
        <div className={`text-lg font-bold ${color}`}>{value}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
      </CardContent>
    </Card>
  );
}
