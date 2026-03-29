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

export default function InsuranceCalcTab() {
  const { reportData } = useReport();
  const data = reportData?.channel;
  const [selectedBank, setSelectedBank] = useState<string>("all");
  const [checkedProducts, setCheckedProducts] = useState<Record<string, boolean>>({});
  const [ratioInputs, setRatioInputs] = useState<Record<string, string>>({});
  const [defaultRatioInput, setDefaultRatioInput] = useState<string>("");
  const [initialized, setInitialized] = useState(false);
  // 展开明细的险种
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});

  if (!data) return <div className="p-4 text-sm text-muted-foreground">请先导入数据</div>;

  const { insuranceCalcData } = data as any;
  if (!insuranceCalcData) return <div className="p-4 text-sm text-muted-foreground">暂无险种数据</div>;

  const { products = [], banks = [], premiumMap = {} } = insuranceCalcData;

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

  // 每个险种按总行维度的明细（按保费降序）
  const productBankDetails = useMemo(() => {
    const result: Record<string, Array<{ bank: string; premium: number }>> = {};
    const filteredBanks = selectedBank === "all" ? banks : [selectedBank];
    for (const prod of products) {
      const details: Array<{ bank: string; premium: number }> = [];
      for (const bank of filteredBanks) {
        const premium = premiumMap[prod]?.[bank] || 0;
        if (premium > 0) {
          details.push({ bank, premium });
        }
      }
      details.sort((a, b) => b.premium - a.premium);
      result[prod] = details;
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

  const toggleExpand = useCallback((product: string) => {
    setExpandedProducts(prev => ({ ...prev, [product]: !prev[product] }));
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
                  <th className={thCls} style={{ width: 50 }}>明细</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
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
                      const isExpanded = !!expandedProducts[prod];
                      const details = productBankDetails[prod] || [];

                      return (
                        <>
                          {/* 险种主行 */}
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
                            <td className={tdCls}>
                              {details.length > 1 && (
                                <button
                                  onClick={() => toggleExpand(prod)}
                                  className="text-xs text-primary hover:underline cursor-pointer"
                                >
                                  {isExpanded ? "收起" : "展开"}
                                </button>
                              )}
                            </td>
                          </tr>
                          {/* 明细行 */}
                          {isExpanded && details.map((d, j) => (
                            <tr
                              key={`${prod}-${d.bank}`}
                              className={`bg-muted/30 ${!isChecked ? "opacity-40" : ""}`}
                            >
                              <td className={tdCls}></td>
                              <td className={tdCls}></td>
                              <td className={`${tdCls} pl-8 text-muted-foreground`}>
                                <span className="inline-block w-3 border-l border-b border-muted-foreground/30 h-3 mr-1 align-middle" />
                                {d.bank}
                              </td>
                              <td className={`${tdCls} ${monoR} text-muted-foreground`}>{fmt(d.premium)}</td>
                              <td className={tdCls}></td>
                              <td className={`${tdCls} ${monoR} text-muted-foreground`}>{fmt(d.premium / effectiveRatio)}</td>
                              <td className={tdCls}></td>
                            </tr>
                          ))}
                        </>
                      );
                    })}
                    <tr className="bg-muted/50 font-semibold border-t-2 border-border">
                      <td className={tdCls}></td>
                      <td className={tdCls}></td>
                      <td className={tdCls}><strong>合计（已选）</strong></td>
                      <td className={`${tdCls} ${monoR}`}><strong>{fmt(totalPremium)}</strong></td>
                      <td className={tdCls}></td>
                      <td className={`${tdCls} ${monoR} text-green-600`}><strong>{fmt(totalAdjusted)}</strong></td>
                      <td className={tdCls}></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
