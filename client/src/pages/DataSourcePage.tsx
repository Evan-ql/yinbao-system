import DataSourceView from "@/components/DataSourceView";
import { useReport } from "@/contexts/ReportContext";

export default function DataSourcePage() {
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
        <h2 className="text-lg font-semibold tracking-tight">数据来源</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {reportData.summary.monthStart}月 - {reportData.summary.monthEnd}月 · 共 {reportData.dataSource.length} 条记录
        </p>
      </div>
      <DataSourceView data={reportData.dataSource} />
    </div>
  );
}
