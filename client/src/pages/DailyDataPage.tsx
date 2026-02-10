import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, CheckCircle2, Loader2, FileSpreadsheet } from "lucide-react";
import { useReport } from "@/contexts/ReportContext";
import DataTableEditor from "@/components/DataTableEditor";

export default function DailyDataPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { dailyRaw, setDailyRaw, setReportData } = useReport();

  const handleUpload = useCallback(async (f: File) => {
    setFile(f);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", f);

      const res = await fetch("/api/report/upload-daily", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "解析失败");
      }

      const data = await res.json();
      setDailyRaw({
        rows: data.rawData,
        totalCount: data.totalCount,
        fileName: f.name,
      });

      if (data.report) {
        setReportData(data.report);
        toast.success("日清单导入成功，报表已自动更新");
      } else {
        toast.success("日清单导入成功");
      }
    } catch (err: any) {
      toast.error(err.message || "文件解析失败");
    } finally {
      setUploading(false);
    }
  }, [setDailyRaw, setReportData]);

  const handleDataChange = useCallback((newData: any[]) => {
    if (!dailyRaw) return;
    setDailyRaw({ ...dailyRaw, rows: newData, totalCount: newData.length });
  }, [dailyRaw, setDailyRaw]);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">日清单</h2>
        <p className="text-sm text-muted-foreground mt-1">
          当日清单数据（可选），用于补充当日实时保费数据
        </p>
      </div>

      {/* Upload Card */}
      <Card className={`transition-colors ${dailyRaw ? "border-emerald-400/30" : "border-dashed"} ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
        <CardContent className="pt-5 pb-4">
          <label className="cursor-pointer block">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${dailyRaw ? "bg-emerald-400/10" : "bg-muted"}`}>
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : dailyRaw ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Upload className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">
                    {uploading ? "正在解析..." : dailyRaw ? "重新上传" : "点击上传文件"}
                  </span>
                  <span className="text-muted-foreground text-xs">可选</span>
                </div>
                {dailyRaw ? (
                  <p className="text-xs text-emerald-600 truncate mt-0.5">
                    {dailyRaw.fileName || file?.name} · {dailyRaw.totalCount.toLocaleString()} 条数据
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

      {/* Data Table */}
      {dailyRaw && dailyRaw.rows.length > 0 && (
        <DataTableEditor
          title="数据预览"
          data={dailyRaw.rows}
          totalCount={dailyRaw.totalCount}
          onDataChange={handleDataChange}
        />
      )}

      {/* Empty State */}
      {!dailyRaw && !uploading && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileSpreadsheet className="w-12 h-12 mb-3 opacity-15" />
          <p className="text-sm">上传日清单文件后查看和编辑数据</p>
          <p className="text-xs text-muted-foreground/60 mt-1">日清单为可选数据，不影响主报表生成</p>
        </div>
      )}
    </div>
  );
}
