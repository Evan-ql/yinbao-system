import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

function fmt(v: number): string {
  if (v === 0) return "0";
  if (Math.abs(v) >= 10000) return (v / 10000).toFixed(1) + "万";
  return v.toLocaleString();
}

function pct(v: number): string {
  return (v * 100).toFixed(0) + "%";
}

const thCls = "py-2 px-2 text-muted-foreground font-medium text-xs whitespace-nowrap";
const tdCls = "py-1.5 px-2 text-xs";
const monoR = "py-1.5 px-2 text-right font-mono text-xs";
const rowHover = "border-b border-border/50 hover:bg-accent/50 transition-colors";
const totalRow = "border-t-2 border-primary/30 font-bold bg-primary/5";

export default function DeptView({ data }: { data: any }) {
  const [mode, setMode] = useState<"feiyou" | "all">("feiyou");
  const [activeSection, setActiveSection] = useState<string>("business");

  if (!data) return null;

  const {
    deptRanking, deptRankingAll, totals, totalsAll,
    dailyData, hrStats, tieganData, dadanData,
    premiumDist, top15Qj, top15Js, bankDadanList, networkDist,
  } = data;

  const ranking = mode === "feiyou" ? deptRanking : deptRankingAll;
  const curTotals = mode === "feiyou" ? totals : totalsAll;

  const sections = [
    { key: "business", label: "业务数据" },
    { key: "hr_tiegan_dadan", label: "人力/铁杆/大单" },
    { key: "premium_dist", label: "保费分布图" },
    { key: "personal_bank", label: "个人/全渠道大单" },
    { key: "network_dist", label: "网点分布" },
  ];

  return (
    <div className="space-y-4">
      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeSection === s.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ===== 区域1: 业务数据 + 日保费数据 ===== */}
      {activeSection === "business" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* 1. 业务数据 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">业务数据</CardTitle>
                  <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
                    <button
                      onClick={() => setMode("feiyou")}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        mode === "feiyou" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      非邮
                    </button>
                    <button
                      onClick={() => setMode("all")}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        mode === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      全渠道
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className={`text-left ${thCls}`}>排名</th>
                        <th className={`text-left ${thCls}`}>营业部</th>
                        <th className={`text-right ${thCls}`}>月期交</th>
                        <th className={`text-right ${thCls}`}>期交目标</th>
                        <th className={`text-right ${thCls}`}>达成差距</th>
                        <th className={`text-right ${thCls}`}>规模趸</th>
                        <th className={`text-right ${thCls}`}>趸交目标</th>
                        <th className={`text-right ${thCls}`}>达成差距</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking?.map((d: any) => (
                        <tr key={d.name} className={rowHover}>
                          <td className={tdCls}>{d.rank}</td>
                          <td className={`${tdCls} font-medium`}>{d.name}</td>
                          <td className={`${monoR} text-amber-600`}>{fmt(d.monthQj)}</td>
                          <td className={`${monoR} text-muted-foreground`}>{fmt(d.qjTarget)}</td>
                          <td className={`${monoR} ${d.qjGap <= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(d.qjGap)}</td>
                          <td className={`${monoR} text-emerald-600`}>{fmt(d.gmdc)}</td>
                          <td className={`${monoR} text-muted-foreground`}>{fmt(d.dcTarget)}</td>
                          <td className={`${monoR} ${d.dcGap <= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(d.dcGap)}</td>
                        </tr>
                      ))}
                      <tr className={totalRow}>
                        <td className={tdCls} colSpan={2}>邯郸中支</td>
                        <td className={`${monoR} text-amber-600`}>{fmt(curTotals?.totalQj)}</td>
                        <td className={monoR}>{fmt(curTotals?.totalQjTarget)}</td>
                        <td className={`${monoR} ${curTotals?.totalQjGap <= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(curTotals?.totalQjGap)}</td>
                        <td className={`${monoR} text-emerald-600`}>{fmt(curTotals?.totalGmdc)}</td>
                        <td className={monoR}>{fmt(curTotals?.totalDcTarget)}</td>
                        <td className={`${monoR} ${curTotals?.totalDcGap <= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(curTotals?.totalDcGap)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 2. 日保费数据 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">日保费数据</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className={`text-left ${thCls}`}>营业部</th>
                        <th className={`text-right ${thCls}`}>今日期交</th>
                        <th className={`text-right ${thCls}`}>非邮期交</th>
                        <th className={`text-right ${thCls}`}>今日趸交</th>
                        <th className={`text-right ${thCls}`}>底线目标</th>
                        <th className={`text-right ${thCls}`}>达成率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyData?.map((d: any) => (
                        <tr key={d.name} className={rowHover}>
                          <td className={`${tdCls} font-medium`}>{d.name}</td>
                          <td className={`${monoR} text-amber-600`}>{fmt(d.todayQj)}</td>
                          <td className={monoR}>{fmt(d.todayFeiyouQj)}</td>
                          <td className={monoR}>{fmt(d.todayDc)}</td>
                          <td className={`${monoR} text-muted-foreground`}>{fmt(d.target)}</td>
                          <td className={`${monoR} ${d.rate >= 1 ? "text-emerald-600" : d.rate > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                            {d.rate > 0 ? (d.rate * 100).toFixed(0) + "%" : "0"}
                          </td>
                        </tr>
                      ))}
                      {dailyData && dailyData.length > 0 && (
                        <tr className={totalRow}>
                          <td className={tdCls}>中支合计</td>
                          <td className={`${monoR} text-amber-600`}>{fmt(dailyData.reduce((s: number, d: any) => s + d.todayQj, 0))}</td>
                          <td className={monoR}>{fmt(dailyData.reduce((s: number, d: any) => s + d.todayFeiyouQj, 0))}</td>
                          <td className={monoR}>{fmt(dailyData.reduce((s: number, d: any) => s + d.todayDc, 0))}</td>
                          <td className={`${monoR} text-muted-foreground`}>{fmt(dailyData.reduce((s: number, d: any) => s + d.target, 0))}</td>
                          <td className={monoR}>
                            {(() => {
                              const totalQj = dailyData.reduce((s: number, d: any) => s + d.todayQj, 0);
                              const totalTarget = dailyData.reduce((s: number, d: any) => s + d.target, 0);
                              return totalTarget > 0 ? ((totalQj / totalTarget) * 100).toFixed(0) + "%" : "0";
                            })()}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ===== 区域2: 人力数据 + 铁杆网点 + 部门大单分布 ===== */}
      {activeSection === "hr_tiegan_dadan" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* 3. 人力数据 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">人力数据</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className={`text-left ${thCls}`}>排名</th>
                        <th className={`text-left ${thCls}`}>营业部</th>
                        <th className={`text-right ${thCls}`}>挂网</th>
                        <th className={`text-right ${thCls}`}>破零人力</th>
                        <th className={`text-right ${thCls}`}>开单率</th>
                        <th className={`text-right ${thCls}`}>规保2万</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hrStats?.map((h: any) => (
                        <tr key={h.name} className={rowHover}>
                          <td className={tdCls}>{h.rank}</td>
                          <td className={`${tdCls} font-medium`}>{h.name}</td>
                          <td className={monoR}>{h.guawang}</td>
                          <td className={`${monoR} text-emerald-600`}>{h.poling}</td>
                          <td className={`${monoR} ${h.kaidanRate >= 0.8 ? "text-emerald-600" : h.kaidanRate >= 0.5 ? "text-amber-600" : "text-rose-600"}`}>
                            {pct(h.kaidanRate)}
                          </td>
                          <td className={`${monoR} text-primary`}>{h.guibao2w}</td>
                        </tr>
                      ))}
                      {hrStats && hrStats.length > 0 && (
                        <tr className={totalRow}>
                          <td className={tdCls} colSpan={2}>邯郸中支</td>
                          <td className={monoR}>{hrStats.reduce((s: number, h: any) => s + h.guawang, 0)}</td>
                          <td className={`${monoR} text-emerald-600`}>{hrStats.reduce((s: number, h: any) => s + h.poling, 0)}</td>
                          <td className={monoR}>
                            {(() => {
                              const totalGw = hrStats.reduce((s: number, h: any) => s + h.guawang, 0);
                              const totalPl = hrStats.reduce((s: number, h: any) => s + h.poling, 0);
                              return totalGw > 0 ? pct(totalPl / totalGw) : "0%";
                            })()}
                          </td>
                          <td className={`${monoR} text-primary`}>{hrStats.reduce((s: number, h: any) => s + h.guibao2w, 0)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 4. 铁杆网点 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">铁杆网点</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className={`text-left ${thCls}`}>营业部</th>
                        <th className={`text-right ${thCls}`}>总数</th>
                        <th className={`text-right ${thCls}`}>开单</th>
                        <th className={`text-right ${thCls}`}>开单率</th>
                        <th className={`text-right ${thCls}`}>差距</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tieganData?.map((t: any) => (
                        <tr key={t.name} className={rowHover}>
                          <td className={`${tdCls} font-medium`}>{t.name}</td>
                          <td className={monoR}>{t.total}</td>
                          <td className={`${monoR} text-emerald-600`}>{t.kaidan}</td>
                          <td className={`${monoR} ${t.kaidanRate >= 0.8 ? "text-emerald-600" : t.kaidanRate >= 0.5 ? "text-amber-600" : "text-rose-600"}`}>
                            {t.total > 0 ? pct(t.kaidanRate) : "-"}
                          </td>
                          <td className={`${monoR} ${t.gap > 0 ? "text-rose-600" : "text-emerald-600"}`}>{t.gap}</td>
                        </tr>
                      ))}
                      {tieganData && tieganData.length > 0 && (
                        <tr className={totalRow}>
                          <td className={tdCls}>邯郸中支</td>
                          <td className={monoR}>{tieganData.reduce((s: number, t: any) => s + t.total, 0)}</td>
                          <td className={`${monoR} text-emerald-600`}>{tieganData.reduce((s: number, t: any) => s + t.kaidan, 0)}</td>
                          <td className={monoR}>
                            {(() => {
                              const tt = tieganData.reduce((s: number, t: any) => s + t.total, 0);
                              const tk = tieganData.reduce((s: number, t: any) => s + t.kaidan, 0);
                              return tt > 0 ? pct(tk / tt) : "-";
                            })()}
                          </td>
                          <td className={monoR}>{tieganData.reduce((s: number, t: any) => s + t.gap, 0)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 5. 部门大单分布 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">部门大单分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className={`text-left ${thCls}`}>营业部</th>
                        <th className={`text-right ${thCls}`}>5万</th>
                        <th className={`text-right ${thCls}`}>10万</th>
                        <th className={`text-right ${thCls}`}>20万</th>
                        <th className={`text-right ${thCls}`}>50万</th>
                        <th className={`text-right ${thCls}`}>100万</th>
                        <th className={`text-right ${thCls}`}>10万+总保费</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dadanData?.map((d: any) => (
                        <tr key={d.name} className={rowHover}>
                          <td className={`${tdCls} font-medium`}>{d.name}</td>
                          <td className={monoR}>{d.c5w}</td>
                          <td className={monoR}>{d.c10w}</td>
                          <td className={`${monoR} text-amber-600`}>{d.c20w}</td>
                          <td className={`${monoR} text-amber-600`}>{d.c50w}</td>
                          <td className={`${monoR} text-emerald-600`}>{d.c100w}</td>
                          <td className={`${monoR} text-primary`}>{fmt(d.totalAbove10w)}</td>
                        </tr>
                      ))}
                      {dadanData && dadanData.length > 0 && (
                        <tr className={totalRow}>
                          <td className={tdCls}>中支合计</td>
                          <td className={monoR}>{dadanData.reduce((s: number, d: any) => s + d.c5w, 0)}</td>
                          <td className={monoR}>{dadanData.reduce((s: number, d: any) => s + d.c10w, 0)}</td>
                          <td className={monoR}>{dadanData.reduce((s: number, d: any) => s + d.c20w, 0)}</td>
                          <td className={monoR}>{dadanData.reduce((s: number, d: any) => s + d.c50w, 0)}</td>
                          <td className={monoR}>{dadanData.reduce((s: number, d: any) => s + d.c100w, 0)}</td>
                          <td className={`${monoR} text-primary`}>{fmt(dadanData.reduce((s: number, d: any) => s + d.totalAbove10w, 0))}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ===== 区域3: 年交保费分布图 ===== */}
      {activeSection === "premium_dist" && premiumDist && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">年交保费分布图</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className={`text-left ${thCls} sticky left-0 bg-card z-10`}>营业部</th>
                    {premiumDist.headers?.map((h: string) => (
                      <th key={h} className={`text-right ${thCls}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {premiumDist.rows?.map((r: any) => (
                    <tr key={r.name} className={rowHover}>
                      <td className={`${tdCls} font-medium sticky left-0 bg-card z-10`}>{r.name}</td>
                      {r.values?.map((v: number, i: number) => {
                        const isLast = i === r.values.length - 1; // 非邮 column
                        return (
                          <td key={i} className={`${monoR} ${isLast ? "text-amber-600 font-semibold" : v > 0 ? "" : "text-muted-foreground"}`}>
                            {fmt(v)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {premiumDist.rows && premiumDist.rows.length > 0 && (
                    <tr className={totalRow}>
                      <td className={`${tdCls} sticky left-0 bg-card z-10`}>中支合计</td>
                      {premiumDist.headers?.map((_: string, i: number) => {
                        const total = premiumDist.rows.reduce((s: number, r: any) => s + (r.values?.[i] || 0), 0);
                        const isLast = i === premiumDist.headers.length - 1;
                        return (
                          <td key={i} className={`${monoR} ${isLast ? "text-amber-600 font-semibold" : ""}`}>
                            {fmt(total)}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== 区域4: 个人业绩前10 + 个人件数前10 + 全渠道大单分布 ===== */}
      {activeSection === "personal_bank" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* 7. 个人业绩前10 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">个人业绩前10（全渠道）</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className={`text-left ${thCls}`}>排名</th>
                      <th className={`text-left ${thCls}`}>姓名</th>
                      <th className={`text-right ${thCls}`}>业绩</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top15Qj?.map((p: any, i: number) => (
                      <tr key={p.name + i} className={rowHover}>
                        <td className={tdCls}>{i + 1}</td>
                        <td className={`${tdCls} font-medium`}>{p.name}</td>
                        <td className={`${monoR} text-amber-600`}>{fmt(p.qj)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 8. 个人件数前10 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">个人件数前10（全渠道）</CardTitle>
            </CardHeader>
            <CardContent>
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
                    {top15Js?.map((p: any, i: number) => (
                      <tr key={p.name + i} className={rowHover}>
                        <td className={tdCls}>{i + 1}</td>
                        <td className={`${tdCls} font-medium`}>{p.name}</td>
                        <td className={`${monoR} text-primary`}>{p.js}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 9. 全渠道大单分布 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">全渠道大单分布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className={`text-left ${thCls}`}>渠道</th>
                      <th className={`text-right ${thCls}`}>5万</th>
                      <th className={`text-right ${thCls}`}>10万</th>
                      <th className={`text-right ${thCls}`}>20万</th>
                      <th className={`text-right ${thCls}`}>50万</th>
                      <th className={`text-right ${thCls}`}>100万</th>
                      <th className={`text-right ${thCls}`}>总保费</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankDadanList?.map((b: any) => (
                      <tr key={b.name} className={rowHover}>
                        <td className={`${tdCls} font-medium`}>{b.name}</td>
                        <td className={monoR}>{b.c5w}</td>
                        <td className={monoR}>{b.c10w}</td>
                        <td className={`${monoR} text-amber-600`}>{b.c20w}</td>
                        <td className={`${monoR} text-amber-600`}>{b.c50w}</td>
                        <td className={`${monoR} text-emerald-600`}>{b.c100w}</td>
                        <td className={`${monoR} text-primary`}>{fmt(b.totalAbove10w)}</td>
                      </tr>
                    ))}
                    {bankDadanList && bankDadanList.length > 0 && (
                      <tr className={totalRow}>
                        <td className={tdCls}>中支合计</td>
                        <td className={monoR}>{bankDadanList.reduce((s: number, b: any) => s + b.c5w, 0)}</td>
                        <td className={monoR}>{bankDadanList.reduce((s: number, b: any) => s + b.c10w, 0)}</td>
                        <td className={monoR}>{bankDadanList.reduce((s: number, b: any) => s + b.c20w, 0)}</td>
                        <td className={monoR}>{bankDadanList.reduce((s: number, b: any) => s + b.c50w, 0)}</td>
                        <td className={monoR}>{bankDadanList.reduce((s: number, b: any) => s + b.c100w, 0)}</td>
                        <td className={`${monoR} text-primary`}>{fmt(bankDadanList.reduce((s: number, b: any) => s + b.totalAbove10w, 0))}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== 区域5: 网点分布 ===== */}
      {activeSection === "network_dist" && networkDist && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">网点分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className={`text-left ${thCls} sticky left-0 bg-card z-10`}>营业部</th>
                    {networkDist.headers?.map((h: string) => (
                      <th key={h} className={`text-right ${thCls}`}>{h}</th>
                    ))}
                    <th className={`text-right ${thCls}`}>合计</th>
                  </tr>
                </thead>
                <tbody>
                  {networkDist.rows?.map((r: any) => (
                    <tr key={r.name} className={rowHover}>
                      <td className={`${tdCls} font-medium sticky left-0 bg-card z-10`}>{r.name}</td>
                      {r.values?.map((v: number, i: number) => (
                        <td key={i} className={`${monoR} ${v > 0 ? "" : "text-muted-foreground"}`}>{v}</td>
                      ))}
                      <td className={`${monoR} text-primary font-semibold`}>{r.total}</td>
                    </tr>
                  ))}
                  {/* 合计行 */}
                  {networkDist.rows && networkDist.rows.length > 0 && (
                    <>
                      <tr className={totalRow}>
                        <td className={`${tdCls} sticky left-0 bg-card z-10`}>合计</td>
                        {networkDist.headers?.map((_: string, i: number) => {
                          const total = networkDist.rows.reduce((s: number, r: any) => s + (r.values?.[i] || 0), 0);
                          return <td key={i} className={monoR}>{total}</td>;
                        })}
                        <td className={`${monoR} text-primary font-semibold`}>
                          {networkDist.rows.reduce((s: number, r: any) => s + r.total, 0)}
                        </td>
                      </tr>
                      <tr className="bg-muted/30">
                        <td className={`${tdCls} sticky left-0 bg-card z-10`}>中支总网点</td>
                        <td className={`${monoR} text-primary font-semibold`} colSpan={(networkDist.headers?.length || 0) + 1}>
                          {networkDist.totalNetworks}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
