import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import DeptSubPageWrapper from "@/components/DeptSubPageWrapper";
import { thCls, tdCls, monoR, rowHover } from "@/components/dept/tableStyles";

export default function PersonalCountPage() {
  const { reportData } = useReport();
  const [mode, setMode] = useState<"all" | "feiyou">("all");

  const personalCountTop = mode === "all"
    ? reportData?.dept?.personalCountTop
    : reportData?.dept?.personalCountTopFeiyou;

  return (
    <DeptSubPageWrapper
      title={`个人件数前10（${mode === "all" ? "全渠道" : "非邮"}）`}
      description={`${mode === "all" ? "全渠道" : "非邮渠道"}个人件数排名`}
    >
      <div className="flex justify-end mb-3">
        <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs">
          <button
            className={`px-3 py-1.5 transition-colors ${
              mode === "all"
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
            onClick={() => setMode("all")}
          >
            全渠道
          </button>
          <button
            className={`px-3 py-1.5 transition-colors ${
              mode === "feiyou"
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
            onClick={() => setMode("feiyou")}
          >
            非邮
          </button>
        </div>
      </div>
      <Card>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className={`text-left ${thCls}`}>排名</th>
                  <th className={`text-left ${thCls}`}>姓名</th>
                  <th className={`text-right ${thCls}`}>件数</th>
                </tr>
              </thead>
              <tbody>
                {personalCountTop?.map((p: any, i: number) => (
                  <tr key={p.name + i} className={rowHover}>
                    <td className={tdCls}>
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                        i < 3 ? "bg-primary/20 text-primary" : "text-muted-foreground"
                      }`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className={`${tdCls} font-medium`}>{p.name}</td>
                    <td className={`${monoR} text-primary`}>{p.js}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(!personalCountTop || personalCountTop.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">暂无数据</p>
          )}
        </CardContent>
      </Card>
    </DeptSubPageWrapper>
  );
}
