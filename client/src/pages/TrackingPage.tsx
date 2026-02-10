import TrackingView from "@/components/TrackingView";
import { useReport } from "@/contexts/ReportContext";

export default function TrackingPage() {
  const { reportData } = useReport();

  if (!reportData) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">请先导入数据</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight">追踪报表</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {reportData.summary.monthStart}月 - {reportData.summary.monthEnd}月
        </p>
      </div>
      <TrackingView data={reportData.tracking} />
    </div>
  );
}
