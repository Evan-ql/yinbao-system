import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import { fmt, thCls, tdCls, monoR, rowHover } from "@/components/dept/tableStyles";

/** 解析约定比例输入：支持 "1:3"、"3"、"1/3" 格式，返回除数 */
function parseRatio(input: string): number {
  const s = input.trim();
  if (!s) return 1;
  if (s.includes(":")) {
    const right = parseFloat(s.split(":")[1]);
    if (!isNaN(right) && right !== 0) return right;
    return 1;
  }
  if (s.includes("/")) {
    const right = parseFloat(s.split("/")[1]);
    if (!isNaN(right) && right !== 0) return right;
    return 1;
  }
  const num = parseFloat(s);
  if (!isNaN(num) && num !== 0) return num;
  return 1;
}

interface DetailRow {
  xz: string;
  bank: string;
  branch: string;
  wd: string;
  premium: number;
  bdh: string;
  jfjg: string;
  jfqn: string;
  signDate: string;
  status: string;
  ywymc: string;
}

export default function InsuranceCalcTab() {
  const { reportData } = useReport();
  const data = reportData?.channel;
  const [selectedBank, setSelectedBank] = useState<string>("all");
  const [checkedProducts, setCheckedProducts] = useState<Record<string, boolean>>({});
  const [ratioInputs, setRatioInputs] = useState<Record<string, string>>({});
  const [defaultRatioInput, setDefaultRatioInput] = useState<string>("");
  const [initialized, setInitialized] = useState(false);

  if (!data) return <div className="p-4 text-sm text-muted-foreground">请先导入数据</div>;

  const { insuranceCalcData } = data as any;
  if (!insuranceCalcData) return <div className="p-4 text-sm text-muted-foreground">暂无险种数据</div>;

  const { products = [], banks = [], premiumMap = {}, detailRows = [] } = insuranceCalcData;

  // 初始化：默认全部勾选
  if (!initialized && products.length > 0) {
    const initial: Record<string, boolean> = {};
    for (const p of products) initial[p] = true;
    setCheckedProducts(initial);
    setInitialized(true);
  }

  // 计算每个险种在当前银行筛选下的保费
  const productPremiums = useMemo(() => {
    const result: Record<string, number> = {};
    const filteredBanks = selectedBank === "all" ? banks : [selectedBank];
    for (const prod of products) {
      let total = 0;
      for (const bank of filteredBanks) {
        total += premiumMap[prod]?.[bank] || 0;
      }
      result[prod] = total;
    }
    return result;
  }, [selectedBank, products, banks, premiumMap]);

  // 按保费降序排列的险种列表
  const sortedProducts = useMemo(() => {
    return [...products].sort((a: string, b: string) => (productPremiums[b] || 0) - (productPremiums[a] || 0));
  }, [products, productPremiums]);

  const allChecked = sortedProducts.length > 0 && sortedProducts.every((p: string) => checkedProducts[p]);
  const someChecked = sortedProducts.some((p: string) => checkedProducts[p]);

  const toggleAll = useCallback(() => {
    const newState: Record<string, boolean> = {};
    const targetState = !allChecked;
    for (const p of products) newState[p] = targetState;
    setCheckedProducts(newState);
  }, [allChecked, products]);

  const toggleProduct = useCallback((product: string) => {
    setCheckedProducts(prev => ({ ...prev, [product]: !prev[product] }));
  }, []);

  const updateRatio = useCallback((product: string, value: string) => {
    setRatioInputs(prev => ({ ...prev, [product]: value }));
  }, []);

  const getEffectiveRatio = useCallback((product: string): number => {
    const individual = ratioInputs[product]?.trim();
    if (individual) return parseRatio(individual);
    if (defaultRatioInput.trim()) return parseRatio(defaultRatioInput);
    return 1;
  }, [ratioInputs, defaultRatioInput]);

  const defaultRatioValue = parseRatio(defaultRatioInput);

  const { totalPremium, totalAdjusted, checkedCount } = useMemo(() => {
    let premium = 0;
    let adjusted = 0;
    let count = 0;
    for (const prod of sortedProducts) {
      if (!checkedProducts[prod]) continue;
      const p = productPremiums[prod] || 0;
      if (p === 0) continue;
      const ratio = getEffectiveRatio(prod);
      premium += p;
      adjusted += p / ratio;
      count++;
    }
    return { totalPremium: premium, totalAdjusted: adjusted, checkedCount: count };
  }, [sortedProducts, checkedProducts, productPremiums, getEffectiveRatio]);

  const visibleProducts = sortedProducts.filter((p: string) => (productPremiums[p] || 0) > 0);

  // 根据当前筛选条件（总行 + 勾选的险种）过滤明细数据
  const filteredDetails = useMemo(() => {
    const checkedSet = new Set<string>();
    for (const prod of visibleProducts) {
      if (checkedProducts[prod]) checkedSet.add(prod);
    }
    if (checkedSet.size === 0) return [];

    return (detailRows as DetailRow[])
      .filter((row: DetailRow) => {
        if (!checkedSet.has(row.xz)) return false;
        if (selectedBank !== "all" && row.bank !== selectedBank) return false;
        return true;
      })
      .sort((a: DetailRow, b: DetailRow) => b.premium - a.premium);
  }, [detailRows, checkedProducts, selectedBank, visibleProducts]);

  return (
    <div className="p-4 space-y-4">
      {/* 顶部筛选区域 */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-muted-foreground">险种计算器</p>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <select
            className="text-xs border border-border rounded px-2 py-1.5 bg-background"
            value={selectedBank}
            onChange={(e) => setSelectedBank(e.target.value)}
          >
            <option value="all">全部总行</option>
            {banks.map((b: string) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">默认比例</span>
            <input
              type="text"
              className="text-xs border border-border rounded px-2 py-1.5 bg-background w-20 text-center"
              placeholder="如 1:3"
              value={defaultRatioInput}
              onChange={(e) => setDefaultRatioInput(e.target.value)}
            />
            {defaultRatioInput.trim() && defaultRatioValue !== 1 && (
              <span className="text-xs text-muted-foreground">÷ {defaultRatioValue}</span>
            )}
          </div>
        </div>
      </div>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">已选险种保费合计</p>
            <p className="text-xl font-bold text-primary">{fmt(totalPremium)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">约定比例后金额合计</p>
            <p className="text-xl font-bold text-green-600">{fmt(totalAdjusted)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">已选险种数 / 总险种数</p>
            <p className="text-xl font-bold">{checkedCount} / {visibleProducts.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* 险种列表表格 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className={thCls} style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                      onChange={toggleAll}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className={thCls} style={{ width: 50 }}>序号</th>
                  <th className={thCls}>险种</th>
                  <th className={thCls}>新约保费</th>
                  <th className={thCls} style={{ width: 120 }}>约定比例</th>
                  <th className={thCls}>比例后金额</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      暂无匹配数据
                    </td>
                  </tr>
                ) : (
                  <>
                    {visibleProducts.map((prod: string, i: number) => {
                      const premium = productPremiums[prod] || 0;
                      const isChecked = !!checkedProducts[prod];
                      const individualInput = ratioInputs[prod] || "";
                      const effectiveRatio = getEffectiveRatio(prod);
                      const adjusted = premium / effectiveRatio;

                      return (
                        <tr
                          key={prod}
                          className={`${rowHover} ${!isChecked ? "opacity-40" : ""}`}
                        >
                          <td className={tdCls}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleProduct(prod)}
                              className="cursor-pointer"
                            />
                          </td>
                          <td className={tdCls}>{i + 1}</td>
                          <td className={tdCls}>{prod}</td>
                          <td className={`${tdCls} ${monoR}`}>{fmt(premium)}</td>
                          <td className={tdCls}>
                            <input
                              type="text"
                              className="text-xs border border-border rounded px-1.5 py-1 bg-background w-full text-center"
                              placeholder={defaultRatioInput.trim() || "1:3"}
                              value={individualInput}
                              onChange={(e) => updateRatio(prod, e.target.value)}
                            />
                          </td>
                          <td className={`${tdCls} ${monoR} font-semibold ${isChecked ? "text-green-600" : ""}`}>
                            {fmt(adjusted)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-muted/50 font-semibold border-t-2 border-border">
                      <td className={tdCls}></td>
                      <td className={tdCls}></td>
                      <td className={tdCls}><strong>合计（已选）</strong></td>
                      <td className={`${tdCls} ${monoR}`}><strong>{fmt(totalPremium)}</strong></td>
                      <td className={tdCls}></td>
                      <td className={`${tdCls} ${monoR} text-green-600`}><strong>{fmt(totalAdjusted)}</strong></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 明细表格 */}
      {filteredDetails.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-2 border-b border-border bg-muted/30">
              <p className="text-xs font-semibold">
                业务明细（已选险种，共 {filteredDetails.length} 条）
              </p>
            </div>
            <div className="overflow-x-auto" style={{ maxHeight: 480 }}>
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className={thCls} style={{ width: 45 }}>序号</th>
                    <th className={thCls}>险种</th>
                    <th className={thCls}>总行</th>
                    <th className={thCls}>支行</th>
                    <th className={thCls}>网点</th>
                    <th className={thCls}>新约保费</th>
                    <th className={thCls}>保单号</th>
                    <th className={thCls}>缴费间隔</th>
                    <th className={thCls}>缴费期间</th>
                    <th className={thCls}>签单日期</th>
                    <th className={thCls}>保单状态</th>
                    <th className={thCls}>客户经理</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDetails.map((row: DetailRow, i: number) => (
                    <tr key={i} className={rowHover}>
                      <td className={tdCls}>{i + 1}</td>
                      <td className={tdCls}>{row.xz}</td>
                      <td className={tdCls}>{row.bank || "-"}</td>
                      <td className={tdCls}>{row.branch || "-"}</td>
                      <td className={tdCls}>{row.wd || "-"}</td>
                      <td className={`${tdCls} ${monoR}`}>{fmt(row.premium)}</td>
                      <td className={tdCls}>{row.bdh || "-"}</td>
                      <td className={tdCls}>{row.jfjg || "-"}</td>
                      <td className={tdCls}>{row.jfqn || "-"}</td>
                      <td className={tdCls}>{row.signDate || "-"}</td>
                      <td className={tdCls}>{row.status || "-"}</td>
                      <td className={tdCls}>{row.ywymc || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
