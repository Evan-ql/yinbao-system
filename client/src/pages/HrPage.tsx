import { useState } from "react";
import HrView from "@/components/HrView";
import { useReport } from "@/contexts/ReportContext";
import { Calendar, Loader2 } from "lucide-react";

export default function HrPage() {
  const { reportData, monthStart, monthEnd, regenerateReport, loading } = useReport();
  const [localStart, setLocalStart] = useState(monthStart);
  const [localEnd, setLocalEnd] = useState(monthEnd);

  if (!reportData) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">请先导入数据</p>
      </div>
    );
  }

  const handleApply = async () => {
    if (localStart > localEnd) return;
    if (localStart === monthStart && localEnd === monthEnd) return;
    try {
      await regenerateReport(localStart, localEnd);
    } catch (e) {
      console.error("Failed to regenerate:", e);
    }
  };

  const hasChanged = localStart !== monthStart || localEnd !== monthEnd;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">人力数据</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            当前统计范围：{monthStart}月 - {monthEnd}月
          </p>
        </div>

        {/* 右上角月份范围选择器 */}
        <div className="flex items-center gap-2 bg-card border border-border/60 rounded-lg px-3 py-2">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          <select
            value={localStart}
            onChange={(e) => {
              const v = Number(e.target.value);
              setLocalStart(v);
              if (v > localEnd) setLocalEnd(v);
            }}
            className="h-7 rounded border border-border bg-background px-2 text-sm min-w-[64px]"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m}月</option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">至</span>
          <select
            value={localEnd}
            onChange={(e) => {
              const v = Number(e.target.value);
              setLocalEnd(v);
              if (v < localStart) setLocalStart(v);
            }}
            className="h-7 rounded border border-border bg-background px-2 text-sm min-w-[64px]"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m}月</option>
            ))}
          </select>
          <button
            onClick={handleApply}
            disabled={loading || !hasChanged || localStart > localEnd}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              hasChanged && !loading
                ? "bg-primary text-white hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                生成中...
              </>
            ) : (
              "应用"
            )}
          </button>
        </div>
      </div>
      <HrView data={reportData.hr} />
    </div>
  );
}
