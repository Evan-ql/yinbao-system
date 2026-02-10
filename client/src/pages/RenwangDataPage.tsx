import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, CheckCircle2, Loader2, FileSpreadsheet } from "lucide-react";
import { useReport } from "@/contexts/ReportContext";
import DataTableEditor from "@/components/DataTableEditor";

type SheetTab = "agency" | "network";

export default function RenwangDataPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<SheetTab>("network");
  const { renwangRaw, setRenwangRaw, setReportData } = useReport();

  const handleUpload = useCallback(async (f: File) => {
    setFile(f);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", f);

      const res = await fetch("/api/report/upload-renwang", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "解析失败");
      }

      const data = await res.json();
      setRenwangRaw({
        agency: data.rawData.agency,
        network: data.rawData.network,
        agencyTotalCount: data.rawData.agencyTotalCount,
        networkTotalCount: data.rawData.networkTotalCount,
        fileName: f.name,
      });

      if (data.report) {
        setReportData(data.report);
        toast.success("人网数据导入成功，报表已自动生成");
      } else {
        toast.success("人网数据导入成功");
      }
    } catch (err: any) {
      toast.error(err.message || "文件解析失败");
    } finally {
      setUploading(false);
    }
  }, [setRenwangRaw, setReportData]);

  const handleAgencyChange = useCallback((newData: any[]) => {
    if (!renwangRaw) return;
    setRenwangRaw({ ...renwangRaw, agency: newData, agencyTotalCount: newData.length });
  }, [renwangRaw, setRenwangRaw]);

  const handleNetworkChange = useCallback((newData: any[]) => {
    if (!renwangRaw) return;
    setRenwangRaw({ ...renwangRaw, network: newData, networkTotalCount: newData.length });
  }, [renwangRaw, setRenwangRaw]);

  const totalCount = renwangRaw
    ? renwangRaw.agencyTotalCount + renwangRaw.networkTotalCount
    : 0;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">人网数据</h2>
        <p className="text-sm text-muted-foreground mt-1">
          人员网点数据，包含代理机构查询和网点人员信息两个Sheet
        </p>
      </div>

      {/* Upload Card */}
      <Card className={`transition-colors ${renwangRaw ? "border-emerald-400/30" : "border-dashed"} ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
        <CardContent className="pt-5 pb-4">
          <label className="cursor-pointer block">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${renwangRaw ? "bg-emerald-400/10" : "bg-muted"}`}>
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : renwangRaw ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Upload className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">
                    {uploading ? "正在解析..." : renwangRaw ? "重新上传" : "点击上传文件"}
                  </span>
                  <span className="text-rose-600 text-xs">*</span>
                </div>
                {renwangRaw ? (
                  <p className="text-xs text-emerald-600 truncate mt-0.5">
                    {renwangRaw.fileName || file?.name} · {totalCount.toLocaleString()} 条数据（2个Sheet）
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

      {/* Sheet Tab Switcher */}
      {renwangRaw && (
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("network")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === "network"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
          >
            网点人员
            <span className="ml-1.5 text-[10px] opacity-60">
              {renwangRaw.networkTotalCount.toLocaleString()}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("agency")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === "agency"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
          >
            代理机构查询
            <span className="ml-1.5 text-[10px] opacity-60">
              {renwangRaw.agencyTotalCount.toLocaleString()}
            </span>
          </button>
        </div>
      )}

      {/* Data Table */}
      {renwangRaw && activeTab === "network" && renwangRaw.network.length > 0 && (
        <DataTableEditor
          title="网点人员数据"
          data={renwangRaw.network}
          totalCount={renwangRaw.networkTotalCount}
          onDataChange={handleNetworkChange}
        />
      )}

      {renwangRaw && activeTab === "agency" && renwangRaw.agency.length > 0 && (
        <DataTableEditor
          title="代理机构查询数据"
          data={renwangRaw.agency}
          totalCount={renwangRaw.agencyTotalCount}
          onDataChange={handleAgencyChange}
        />
      )}

      {/* Empty State */}
      {!renwangRaw && !uploading && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileSpreadsheet className="w-12 h-12 mb-3 opacity-15" />
          <p className="text-sm">上传人网数据文件后查看和编辑数据</p>
        </div>
      )}
    </div>
  );
}
