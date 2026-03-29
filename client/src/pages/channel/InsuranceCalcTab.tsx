import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useReport } from "@/contexts/ReportContext";
import { fmt, thCls, tdCls, monoR, rowHover } from "@/components/dept/tableStyles";

export default function InsuranceCalcTab() {
  const { reportData } = useReport();
  const data = reportData?.channel;
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [selectedBank, setSelectedBank] = useState<string>("all");
  const [ratioInput, setRatioInput] = useState<string>("");

  if (!data) return <div className="p-4 text-sm text-muted-foreground">请先导入数据</div>;

  const { insuranceCalcData } = data as any;
  if (!insuranceCalcData) return <div className="p-4 text-sm text-muted-foreground">暂无险种数据</div>;

  const { products = [], banks = [], premiumMap = {} } = insuranceCalcData;

  // 解析约定比例：支持 "1:3"、"3"、"1/3" 格式
  const ratioValue = useMemo(() => {
    const input = ratioInput.trim();
    if (!input) return 1;
    // 格式 1:N
    if (input.includes(":")) {
      const parts = input.split(":");
      const right = parseFloat(parts[1]);
      if (!isNaN(right) && right !== 0) return right;
      return 1;
    }
    // 格式 1/N
    if (input.includes("/")) {
      const parts = input.split("/");
      const right = parseFloat(parts[1]);
      if (!isNaN(right) && right !== 0) return right;
      return 1;
    }
    // 纯数字
    const num = parseFloat(input);
    if (!isNaN(num) && num !== 0) return num;
    return 1;
  }, [ratioInput]);

  // 计算汇总表格数据
  const tableData = useMemo(() => {
    const rows: Array<{ product: string; bank: string; premium: number; adjusted: number }> = [];

    const filteredProducts = selectedProduct === "all" ? products : [selectedProduct];
    const filteredBanks = selectedBank === "all" ? banks : [selectedBank];

    for (const prod of filteredProducts) {
      for (const bank of filteredBanks) {
        const premium = premiumMap[prod]?.[bank] || 0;
        if (premium !== 0) {
          rows.push({
            product: prod,
            bank: bank,
            premium,
            adjusted: premium / ratioValue,
          });
        }
      }
    }

    rows.sort((a, b) => b.premium - a.premium);
    return rows;
  }, [selectedProduct, selectedBank, products, banks, premiumMap, ratioValue]);

  const totalPremium = tableData.reduce((s, r) => s + r.premium, 0);
  const totalAdjusted = tableData.reduce((s, r) => s + r.adjusted, 0);

  return (
    <div className="p-4 space-y-4">
      {/* 筛选区域 */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-muted-foreground">险种计算器</p>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <select
            className="text-xs border border-border rounded px-2 py-1.5 bg-background"
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
          >
            <option value="all">全部险种</option>
            {products.map((p: string) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
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
            <span className="text-xs text-muted-foreground whitespace-nowrap">约定比例</span>
            <input
              type="text"
              className="text-xs border border-border rounded px-2 py-1.5 bg-background w-20 text-center"
              placeholder="如 1:3"
              value={ratioInput}
              onChange={(e) => setRatioInput(e.target.value)}
            />
            {ratioInput.trim() && ratioValue !== 1 && (
              <span className="text-xs text-muted-foreground">÷ {ratioValue}</span>
            )}
          </div>
        </div>
      </div>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">新约保费合计</p>
            <p className="text-xl font-bold text-primary">{fmt(totalPremium)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">
              约定比例后金额
              {ratioInput.trim() && ratioValue !== 1 && (
                <span className="ml-1 text-muted-foreground">（÷ {ratioValue}）</span>
              )}
            </p>
            <p className="text-xl font-bold text-green-600">{fmt(totalAdjusted)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">匹配记录数</p>
            <p className="text-xl font-bold">{tableData.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* 明细表格 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className={thCls}>序号</th>
                  <th className={thCls}>险种</th>
                  <th className={thCls}>总行</th>
                  <th className={thCls}>新约保费</th>
                  <th className={thCls}>
                    约定比例后
                    {ratioInput.trim() && ratioValue !== 1 && (
                      <span className="font-normal text-muted-foreground ml-1">（÷{ratioValue}）</span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      暂无匹配数据
                    </td>
                  </tr>
                ) : (
                  <>
                    {tableData.map((row, i) => (
                      <tr key={`${row.product}-${row.bank}`} className={rowHover}>
                        <td className={tdCls}>{i + 1}</td>
                        <td className={tdCls}>{row.product}</td>
                        <td className={tdCls}>{row.bank}</td>
                        <td className={`${tdCls} ${monoR}`}>{fmt(row.premium)}</td>
                        <td className={`${tdCls} ${monoR} font-semibold text-green-600`}>{fmt(row.adjusted)}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/50 font-semibold border-t-2 border-border">
                      <td className={tdCls}></td>
                      <td className={tdCls} colSpan={2}><strong>合计</strong></td>
                      <td className={`${tdCls} ${monoR}`}><strong>{fmt(totalPremium)}</strong></td>
                      <td className={`${tdCls} ${monoR} text-green-600`}><strong>{fmt(totalAdjusted)}</strong></td>
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
