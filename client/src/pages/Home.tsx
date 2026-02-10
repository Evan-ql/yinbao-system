import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  BarChart3,
  Users,
  Building2,
  TrendingUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  CalendarDays,
} from "lucide-react";
import DeptView from "@/components/DeptView";
import ChannelView from "@/components/ChannelView";
import HrView from "@/components/HrView";
import TrackingView from "@/components/TrackingView";
import CoreNetworkView from "@/components/CoreNetworkView";
import DataSourceView from "@/components/DataSourceView";

interface ReportData {
  summary: {
    dataSourceCount: number;
    networkCount: number;
    hrCount: number;
    dailyCount: number;
    generatedAt: string;
    monthStart: number;
    monthEnd: number;
  };
  dataSource: any[];
  network: any[];
  hr: any[];
  daily: any[];
  dept: any;
  channel: any;
  tracking: any;
  coreNetwork: any;
}

function formatMoney(v: number): string {
  if (Math.abs(v) >= 10000) {
    return (v / 10000).toFixed(1) + "万";
  }
  return v.toLocaleString();
}

export default function Home() {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [renwangFile, setRenwangFile] = useState<File | null>(null);
  const [dailyFile, setDailyFile] = useState<File | null>(null);
  const [monthStart, setMonthStart] = useState(1);
  const [monthEnd, setMonthEnd] = useState(1);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [activeTab, setActiveTab] = useState("dept");

  const handleGenerate = useCallback(async () => {
    if (!sourceFile || !renwangFile) {
      toast.error("请先上传 2026数据 和 最新人网 文件");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("sourceFile", sourceFile);
      formData.append("renwangFile", renwangFile);
      if (dailyFile) formData.append("dailyFile", dailyFile);
      formData.append("monthStart", String(monthStart));
      formData.append("monthEnd", String(monthEnd));

      const res = await fetch("/api/report/generate", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "生成失败");
      }

      const data = await res.json();
      setReportData(data);
      setActiveTab("dept");
      toast.success("报表生成成功！");
    } catch (err: any) {
      toast.error(err.message || "报表生成失败");
    } finally {
      setLoading(false);
    }
  }, [sourceFile, renwangFile, dailyFile, monthStart, monthEnd]);

  const kpiCards = useMemo(() => {
    if (!reportData) return null;
    const dept = reportData.dept;
    return [
      {
        label: "月期交总额",
        value: formatMoney(dept.totals.totalQj),
        sub: `目标 ${formatMoney(dept.totals.totalQjTarget)}`,
        color: "text-amber-600",
        icon: TrendingUp,
      },
      {
        label: "规模趸总额",
        value: formatMoney(dept.totals.totalGmdc),
        sub: `目标 ${formatMoney(dept.totals.totalDcTarget)}`,
        color: "text-emerald-600",
        icon: BarChart3,
      },
      {
        label: "数据量",
        value: reportData.summary.dataSourceCount.toLocaleString(),
        sub: `${reportData.summary.networkCount} 网点`,
        color: "text-primary",
        icon: FileSpreadsheet,
      },
      {
        label: "人力",
        value: reportData.summary.hrCount + " 人",
        sub: reportData.summary.dailyCount > 0 ? `日清单 ${reportData.summary.dailyCount} 条` : "无日清单",
        color: "text-rose-600",
        icon: Users,
      },
    ];
  }, [reportData]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">银保数据报表系统</h1>
              <p className="text-[10px] text-muted-foreground">大家人寿邯郸中心支公司</p>
            </div>
          </div>
          {reportData && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              <CalendarDays className="w-3 h-3 mr-1" />
              {reportData.summary.monthStart}月 - {reportData.summary.monthEnd}月
            </Badge>
          )}
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Upload Section */}
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
              {/* Source File */}
              <FileUploadBox
                label="2026数据 *"
                file={sourceFile}
                onFileChange={setSourceFile}
                accept=".xlsx,.xls"
              />
              {/* Renwang File */}
              <FileUploadBox
                label="最新人网 *"
                file={renwangFile}
                onFileChange={setRenwangFile}
                accept=".xlsx,.xls"
              />
              {/* Daily File */}
              <FileUploadBox
                label="日清单（可选）"
                file={dailyFile}
                onFileChange={setDailyFile}
                accept=".xlsx,.xls"
              />
              {/* Month Range */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">月份范围</label>
                <div className="flex items-center gap-2">
                  <select
                    value={monthStart}
                    onChange={(e) => setMonthStart(Number(e.target.value))}
                    className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}月</option>
                    ))}
                  </select>
                  <span className="text-muted-foreground text-xs">至</span>
                  <select
                    value={monthEnd}
                    onChange={(e) => setMonthEnd(Number(e.target.value))}
                    className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}月</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={loading || !sourceFile || !renwangFile}
                className="h-9"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    生成报表
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        {kpiCards && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpiCards.map((kpi) => (
              <Card key={kpi.label} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{kpi.label}</span>
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                  <div className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{kpi.sub}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Data Tabs */}
        {reportData && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="dept" className="gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> 部门
              </TabsTrigger>
              <TabsTrigger value="channel" className="gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> 渠道
              </TabsTrigger>
              <TabsTrigger value="hr" className="gap-1.5">
                <Users className="w-3.5 h-3.5" /> 人力
              </TabsTrigger>
              <TabsTrigger value="tracking" className="gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> 追踪报表
              </TabsTrigger>
              <TabsTrigger value="coreNetwork" className="gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> 核心网点
              </TabsTrigger>
              <TabsTrigger value="dataSource" className="gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5" /> 数据来源
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dept" className="mt-4">
              <DeptView data={reportData.dept} />
            </TabsContent>
            <TabsContent value="channel" className="mt-4">
              <ChannelView data={reportData.channel} />
            </TabsContent>
            <TabsContent value="hr" className="mt-4">
              <HrView data={reportData.hr} />
            </TabsContent>
            <TabsContent value="tracking" className="mt-4">
              <TrackingView data={reportData.tracking} />
            </TabsContent>
            <TabsContent value="coreNetwork" className="mt-4">
              <CoreNetworkView data={reportData.coreNetwork} />
            </TabsContent>
            <TabsContent value="dataSource" className="mt-4">
              <DataSourceView data={reportData.dataSource} />
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {!reportData && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <FileSpreadsheet className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">上传数据文件开始生成报表</p>
            <p className="text-sm mt-1">支持 2026数据、最新人网、日清单（可选）</p>
          </div>
        )}
      </main>
    </div>
  );
}

function FileUploadBox({
  label,
  file,
  onFileChange,
  accept,
}: {
  label: string;
  file: File | null;
  onFileChange: (f: File | null) => void;
  accept: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <label className="flex items-center gap-2 h-9 rounded-md border border-input bg-background px-3 text-sm cursor-pointer hover:bg-accent transition-colors">
        {file ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate text-foreground">{file.name}</span>
          </>
        ) : (
          <>
            <Upload className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">选择文件</span>
          </>
        )}
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
        />
      </label>
    </div>
  );
}
