import { useReport } from "@/contexts/ReportContext";
import { Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function MonthSelector() {
  const { monthStart, monthEnd, setMonthStart, setMonthEnd, regenerateReport, loading } = useReport();

  const handleMonthStartChange = async (v: number) => {
    const newMs = v;
    const newMe = monthEnd < v ? v : monthEnd;
    setMonthStart(newMs);
    setMonthEnd(newMe);
    try {
      await regenerateReport(newMs, newMe);
      toast.success(`已更新为 ${newMs}月 - ${newMe}月`);
    } catch {
      toast.error("重新生成报表失败");
    }
  };

  const handleMonthEndChange = async (v: number) => {
    const newMe = v;
    const newMs = monthStart > v ? v : monthStart;
    setMonthStart(newMs);
    setMonthEnd(newMe);
    try {
      await regenerateReport(newMs, newMe);
      toast.success(`已更新为 ${newMs}月 - ${newMe}月`);
    } catch {
      toast.error("重新生成报表失败");
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar className="w-3.5 h-3.5" />
        <span>月份范围</span>
      </div>
      <div className="flex items-center gap-1.5">
        <select
          value={monthStart}
          onChange={(e) => handleMonthStartChange(Number(e.target.value))}
          disabled={loading}
          className="h-7 px-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        >
          {MONTHS.map((m) => (
            <option key={m} value={m}>{m}月</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">至</span>
        <select
          value={monthEnd}
          onChange={(e) => handleMonthEndChange(Number(e.target.value))}
          disabled={loading}
          className="h-7 px-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        >
          {MONTHS.map((m) => (
            <option key={m} value={m}>{m}月</option>
          ))}
        </select>
      </div>
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
    </div>
  );
}
