import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import DeptSubPageWrapper from "@/components/DeptSubPageWrapper";
import { fmt, thCls, tdCls, monoR, rowHover, totalRow } from "@/components/dept/tableStyles";

interface ProductRow {
  name: string;
  code: string;
  type: string;       // 价值类/规模类
  interval: string;   // 年交/趸交
  period: string;     // 缴费期间
  premium: number;
  premiumPct: number;
  count: number;
  countPct: number;
}

// 保费占比条形图颜色
const BAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500",
  "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-indigo-500",
  "bg-teal-500", "bg-pink-500", "bg-lime-500",
];

export default function ProductDistPage() {
  const { reportData, monthStart, monthEnd } = useReport();

  const { products, totalPremium, totalCount } = useMemo(() => {
    if (!reportData?.dataSource) return { products: [], totalPremium: 0, totalCount: 0 };
    const ds = reportData.dataSource;

    // 按月份范围过滤
    const filtered = ds.filter((row: any) => {
      const m = row["月"];
      return m !== null && m !== undefined && m >= monthStart && m <= monthEnd;
    });

    // 按险种聚合
    const map: Record<string, { premium: number; count: number; code: string; type: string; interval: string; period: string }> = {};
    for (const row of filtered) {
      const name = (row["险种"] || "").trim();
      if (!name) continue;
      if (!map[name]) {
        map[name] = {
          premium: 0, count: 0,
          code: (row["险种代码"] || "").trim(),
          type: (row["类型"] || "").trim(),
          interval: (row["缴费间隔"] || "").trim(),
          period: String(row["缴费期间年"] || ""),
        };
      }
      map[name].premium += parseFloat(row["新约保费"]) || 0;
      map[name].count += 1;
    }

    const tp = Object.values(map).reduce((s, v) => s + v.premium, 0);
    const tc = Object.values(map).reduce((s, v) => s + v.count, 0);

    const rows: ProductRow[] = Object.entries(map).map(([name, v]) => ({
      name,
      code: v.code,
      type: v.type,
      interval: v.interval,
      period: v.period === "1000" ? "终身" : v.period + "年",
      premium: v.premium,
      premiumPct: tp > 0 ? v.premium / tp : 0,
      count: v.count,
      countPct: tc > 0 ? v.count / tc : 0,
    }));

    rows.sort((a, b) => b.premium - a.premium);
    return { products: rows, totalPremium: tp, totalCount: tc };
  }, [reportData, monthStart, monthEnd]);

  // 按类型汇总
  const typeSummary = useMemo(() => {
    const map: Record<string, { premium: number; count: number }> = {};
    for (const p of products) {
      const key = p.type || "其他";
      if (!map[key]) map[key] = { premium: 0, count: 0 };
      map[key].premium += p.premium;
      map[key].count += p.count;
    }
    return Object.entries(map).map(([type, v]) => ({
      type,
      premium: v.premium,
      premiumPct: totalPremium > 0 ? v.premium / totalPremium : 0,
      count: v.count,
      countPct: totalCount > 0 ? v.count / totalCount : 0,
    }));
  }, [products, totalPremium, totalCount]);

  const pctFmt = (v: number) => (v * 100).toFixed(1) + "%";

  return (
    <DeptSubPageWrapper title="险种分布">
      {/* 类型汇总卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {typeSummary.map((t) => (
          <Card key={t.type}>
            <CardContent className="p-3 text-center">
              <div className={`text-xs mb-1 ${t.type === "价值类" ? "text-blue-600" : "text-amber-600"}`}>
                {t.type}
              </div>
              <div className="text-sm font-bold">{fmt(t.premium)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {pctFmt(t.premiumPct)} · {t.count}件({pctFmt(t.countPct)})
              </div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">合计</div>
            <div className="text-sm font-bold">{fmt(totalPremium)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              100% · {totalCount}件
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 保费占比可视化条 */}
      <Card className="mb-4">
        <CardContent className="pt-4 pb-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">保费占比</div>
          <div className="flex rounded-lg overflow-hidden h-8">
            {products.map((p, i) => (
              p.premiumPct > 0.01 && (
                <div
                  key={p.name}
                  className={`${BAR_COLORS[i % BAR_COLORS.length]} flex items-center justify-center transition-all`}
                  style={{ width: `${p.premiumPct * 100}%` }}
                  title={`${p.name}: ${pctFmt(p.premiumPct)}`}
                >
                  {p.premiumPct >= 0.05 && (
                    <span className="text-white text-[10px] font-medium truncate px-1">
                      {pctFmt(p.premiumPct)}
                    </span>
                  )}
                </div>
              )
            ))}
          </div>
          {/* 图例 */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {products.map((p, i) => (
              <div key={p.name} className="flex items-center gap-1">
                <div className={`w-2.5 h-2.5 rounded-sm ${BAR_COLORS[i % BAR_COLORS.length]}`} />
                <span className="text-[10px] text-muted-foreground">{p.name.replace(/大家/, "")}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 件数占比可视化条 */}
      <Card className="mb-4">
        <CardContent className="pt-4 pb-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">件数占比</div>
          <div className="flex rounded-lg overflow-hidden h-8">
            {products.map((p, i) => (
              p.countPct > 0.01 && (
                <div
                  key={p.name}
                  className={`${BAR_COLORS[i % BAR_COLORS.length]} flex items-center justify-center transition-all`}
                  style={{ width: `${p.countPct * 100}%` }}
                  title={`${p.name}: ${pctFmt(p.countPct)}`}
                >
                  {p.countPct >= 0.05 && (
                    <span className="text-white text-[10px] font-medium truncate px-1">
                      {pctFmt(p.countPct)}
                    </span>
                  )}
                </div>
              )
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 明细表格 */}
      <Card>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className={`text-left ${thCls}`}>序号</th>
                  <th className={`text-left ${thCls}`}>险种名称</th>
                  <th className={`text-left ${thCls}`}>类型</th>
                  <th className={`text-left ${thCls}`}>缴费方式</th>
                  <th className={`text-left ${thCls}`}>缴费期间</th>
                  <th className={`text-right ${thCls}`}>保费</th>
                  <th className={`text-right ${thCls}`}>保费占比</th>
                  <th className={`text-right ${thCls}`}>件数</th>
                  <th className={`text-right ${thCls}`}>件数占比</th>
                  <th className={`text-left ${thCls} w-32`}>保费占比</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, idx) => (
                  <tr key={p.name} className={rowHover}>
                    <td className={tdCls}>{idx + 1}</td>
                    <td className={`${tdCls} font-medium`}>{p.name}</td>
                    <td className={tdCls}>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        p.type === "价值类"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {p.type}
                      </span>
                    </td>
                    <td className={`${tdCls} text-muted-foreground`}>{p.interval}</td>
                    <td className={`${tdCls} text-muted-foreground`}>{p.period}</td>
                    <td className={`${monoR} text-amber-600 font-medium`}>{fmt(p.premium)}</td>
                    <td className={`${monoR} font-medium`}>{pctFmt(p.premiumPct)}</td>
                    <td className={monoR}>{p.count}</td>
                    <td className={`${monoR} text-muted-foreground`}>{pctFmt(p.countPct)}</td>
                    <td className={`${tdCls}`}>
                      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${BAR_COLORS[idx % BAR_COLORS.length]}`}
                          style={{ width: `${p.premiumPct * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className={totalRow}>
                  <td className={tdCls} colSpan={5}>合计</td>
                  <td className={`${monoR} text-amber-600`}>{fmt(totalPremium)}</td>
                  <td className={monoR}>100%</td>
                  <td className={monoR}>{totalCount}</td>
                  <td className={monoR}>100%</td>
                  <td className={tdCls}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </DeptSubPageWrapper>
  );
}
