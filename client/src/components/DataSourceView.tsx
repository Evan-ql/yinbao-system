import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

function fmt(v: number): string {
  if (v === 0) return "0";
  if (Math.abs(v) >= 10000) return (v / 10000).toFixed(1) + "万";
  return v.toLocaleString();
}

const DISPLAY_COLS = [
  { key: "\u4fdd\u5355\u53f7", label: "\u4fdd\u5355\u53f7" },
  { key: "\u6295\u4fdd\u4eba\u59d3\u540d", label: "\u6295\u4fdd\u4eba" },
  { key: "\u4ea7\u54c1\u7b80", label: "\u4ea7\u54c1" },
  { key: "\u7f34\u8d39\u95f4\u9694", label: "\u7f34\u8d39\u65b9\u5f0f" },
  { key: "\u65b0\u7ea6\u4fdd\u8d39", label: "\u65b0\u7ea6\u4fdd\u8d39", numeric: true },
  { key: "\u671f\u4ea4\u4fdd\u8d39", label: "\u671f\u4ea4\u4fdd\u8d39", numeric: true },
  { key: "\u6807\u4fdd", label: "\u6807\u4fdd", numeric: true },
  { key: "\u4e1a\u7ee9\u5f52\u5c5e\u7f51\u70b9\u540d\u79f0", label: "\u7f51\u70b9" },
  { key: "\u5341\u5927\u94f6\u884c\u6e20\u9053", label: "\u6e20\u9053" },
  { key: "\u8425\u4e1a\u90e8\u7ecf\u7406\u59d3\u540d", label: "\u8425\u4e1a\u90e8\u7ecf\u7406" },
  { key: "\u7b7e\u5355\u65e5\u671f", label: "\u7b7e\u5355\u65e5\u671f" },
];

export default function DataSourceView({ data }: { data: any[] }) {
  const [page, setPage] = useState(0);
  const pageSize = 50;

  if (!data || data.length === 0) return <div className="text-muted-foreground text-center py-8">暂无数据来源</div>;

  const totalPages = Math.ceil(data.length / pageSize);
  const pageData = data.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">共 {data.length} 条记录</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="h-7 px-2 rounded border border-input text-xs disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="h-7 px-2 rounded border border-input text-xs disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium text-xs">#</th>
                  {DISPLAY_COLS.map((col) => (
                    <th key={col.key} className={`py-2 px-2 text-muted-foreground font-medium text-xs ${col.numeric ? "text-right" : "text-left"}`}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageData.map((row: any, i: number) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="py-1.5 px-2 text-xs text-muted-foreground">{page * pageSize + i + 1}</td>
                    {DISPLAY_COLS.map((col) => (
                      <td
                        key={col.key}
                        className={`py-1.5 px-2 text-xs ${col.numeric ? "text-right font-mono text-amber-600" : ""}`}
                      >
                        {col.numeric ? fmt(row[col.key] || 0) : (row[col.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
