import { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, CheckCircle2, Loader2, FileSpreadsheet, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { useReport } from "@/contexts/ReportContext";
import DataTableEditor from "@/components/DataTableEditor";
import StaffDiffPanel, { type DiffResult } from "@/components/StaffDiffPanel";

interface ColumnValidation {
  missingCritical: string[];
  missingOptional: string[];
  extraColumns: string[];
  foundColumns: string[];
}

export default function SourceDataPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [validation, setValidation] = useState<ColumnValidation | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [staffDiff, setStaffDiff] = useState<DiffResult | null>(null);
  const [showStaffDiff, setShowStaffDiff] = useState(false);
  const { sourceRaw, setSourceRaw, setReportData } = useReport();

  // 页面加载时自动检查未确认的人事差异
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/report/staff-diff');
        if (res.ok) {
          const data = await res.json();
          if (data.hasChanges && data.items?.length > 0) {
            setStaffDiff(data);
            // 不自动弹出，只显示提示条，用户点击后再弹出
          }
        }
      } catch (_) {}
    })();
  }, []);

  const handleUpload = useCallback(async (f: File) => {
    setFile(f);
    setUploading(true);
    setValidation(null);
    setShowValidation(false);
    setStaffDiff(null);
    setShowStaffDiff(false);
    try {
      const formData = new FormData();
      formData.append("file", f);

      const res = await fetch("/api/report/upload-source", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "解析失败");
      }

      const data = await res.json();

      // 处理列校验结果
      if (data.columnValidation) {
        const cv = data.columnValidation as ColumnValidation;
        setValidation(cv);

        if (cv.missingCritical.length > 0) {
          setShowValidation(true);
          toast.error(`数据缺少 ${cv.missingCritical.length} 个关键列，请检查！`, { duration: 5000 });
        } else if (cv.extraColumns.length > 0 || cv.missingOptional.length > 0) {
          setShowValidation(true);
          toast.warning("数据列有变化，请查看详情", { duration: 3000 });
        }
      }

      // 处理人事对比结果
      if (data.staffDiff && data.staffDiff.hasChanges) {
        setStaffDiff(data.staffDiff);
        setShowStaffDiff(true);
        toast.warning(`检测到 ${data.staffDiff.totalItems} 项人事结构差异，请确认`, { duration: 5000 });
      }

      setSourceRaw({
        rows: data.rawData,
        totalCount: data.totalCount,
        fileName: f.name,
      });

      if (data.report) {
        setReportData(data.report);
        if (!data.columnValidation?.missingCritical?.length && !data.staffDiff?.hasChanges) {
          toast.success("2026数据导入成功，报表已自动生成");
        }
      } else {
        if (!data.columnValidation?.missingCritical?.length && !data.staffDiff?.hasChanges) {
          toast.success("2026数据导入成功");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "文件解析失败");
    } finally {
      setUploading(false);
    }
  }, [setSourceRaw, setReportData]);

  const handleDataChange = useCallback((newData: any[]) => {
    if (!sourceRaw) return;
    setSourceRaw({ ...sourceRaw, rows: newData, totalCount: newData.length });
  }, [sourceRaw, setSourceRaw]);

  const handleStaffDiffConfirmed = useCallback((report: any) => {
    setShowStaffDiff(false);
    setStaffDiff(null);
    if (report) {
      setReportData(report);
    }
  }, [setReportData]);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">2026数据</h2>
        <p className="text-sm text-muted-foreground mt-1">
          主数据源文件，包含保单、保费、险种等核心业务数据
        </p>
      </div>

      {/* Upload Card */}
      <Card className={`transition-colors ${sourceRaw ? "border-emerald-400/30" : "border-dashed"} ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
        <CardContent className="pt-5 pb-4">
          <label className="cursor-pointer block">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${sourceRaw ? "bg-emerald-400/10" : "bg-muted"}`}>
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : sourceRaw ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Upload className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">
                    {uploading ? "正在解析..." : sourceRaw ? "重新上传" : "点击上传文件"}
                  </span>
                  <span className="text-rose-600 text-xs">*</span>
                </div>
                {sourceRaw ? (
                  <p className="text-xs text-emerald-600 truncate mt-0.5">
                    {sourceRaw.fileName || file?.name} · {sourceRaw.totalCount.toLocaleString()} 条数据
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    支持 .xlsx / .xls 格式
                  </p>
                )}
              </div>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
            />
          </label>
        </CardContent>
      </Card>

      {/* 人事差异提示条 */}
      {staffDiff && !showStaffDiff && (
        <button
          onClick={() => setShowStaffDiff(true)}
          className="w-full text-left px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 transition-colors bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            检测到 <strong>{staffDiff.totalItems}</strong> 项人事结构差异（冲突 {staffDiff.conflictCount}，缺失 {staffDiff.missingCount}，新增 {staffDiff.newCount}）
          </span>
          <span className="ml-auto text-xs underline">查看并确认</span>
        </button>
      )}

      {/* 列校验结果提示条 */}
      {validation && !showValidation && (validation.missingCritical.length > 0 || validation.extraColumns.length > 0) && (
        <button
          onClick={() => setShowValidation(true)}
          className={`w-full text-left px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${
            validation.missingCritical.length > 0
              ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
              : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
          }`}
        >
          {validation.missingCritical.length > 0 ? (
            <XCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>
            {validation.missingCritical.length > 0
              ? `缺少 ${validation.missingCritical.length} 个关键列，可能影响数据统计`
              : `检测到 ${validation.extraColumns.length} 个多余列`}
          </span>
          <span className="ml-auto text-xs underline">查看详情</span>
        </button>
      )}

      {/* 人事对比确认面板 */}
      {showStaffDiff && staffDiff && (
        <StaffDiffPanel
          diffResult={staffDiff}
          onClose={() => setShowStaffDiff(false)}
          onConfirmed={handleStaffDiffConfirmed}
        />
      )}

      {/* 列校验弹窗 */}
      {showValidation && validation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowValidation(false)}>
          <div
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`px-5 py-4 flex items-center justify-between ${
              validation.missingCritical.length > 0 ? "bg-red-50" : "bg-amber-50"
            }`}>
              <div className="flex items-center gap-2.5">
                {validation.missingCritical.length > 0 ? (
                  <XCircle className="w-5 h-5 text-red-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
                <h3 className="font-semibold text-base">
                  {validation.missingCritical.length > 0 ? "数据列校验异常" : "数据列变化提示"}
                </h3>
              </div>
              <button
                onClick={() => setShowValidation(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto max-h-[60vh] space-y-4">
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>成功匹配 <strong>{validation.foundColumns.length}</strong> 个列</span>
              </div>

              {validation.missingCritical.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                    <XCircle className="w-4 h-4" />
                    缺少关键列（{validation.missingCritical.length}个）
                    <span className="text-xs font-normal text-red-500">— 会影响核心数据统计</span>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {validation.missingCritical.map((col) => (
                        <span key={col} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 border border-red-300">
                          {col}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-red-600 mt-2.5 leading-relaxed">
                      以上列在Excel中未找到，对应的数据将为空值，可能导致保费统计、人员归属等核心功能不准确。
                      请检查Excel文件的列名是否正确。
                    </p>
                  </div>
                </div>
              )}

              {validation.missingOptional.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
                    <AlertTriangle className="w-4 h-4" />
                    缺少可选列（{validation.missingOptional.length}个）
                    <span className="text-xs font-normal text-amber-500">— 不影响核心统计</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {validation.missingOptional.map((col) => (
                        <span key={col} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {validation.extraColumns.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                    <Info className="w-4 h-4" />
                    多余的列（{validation.extraColumns.length}个）
                    <span className="text-xs font-normal text-blue-500">— 系统未使用，已自动忽略</span>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {validation.extraColumns.map((col) => (
                        <span key={col} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowValidation(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                  validation.missingCritical.length > 0
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      {sourceRaw && sourceRaw.rows.length > 0 && (
        <DataTableEditor
          title="数据预览"
          data={sourceRaw.rows}
          totalCount={sourceRaw.totalCount}
          onDataChange={handleDataChange}
        />
      )}

      {/* Empty State */}
      {!sourceRaw && !uploading && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileSpreadsheet className="w-12 h-12 mb-3 opacity-15" />
          <p className="text-sm">上传2026数据文件后查看和编辑数据</p>
        </div>
      )}
    </div>
  );
}
