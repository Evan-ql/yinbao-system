import { useState, useRef } from "react";
import { useReport } from "@/contexts/ReportContext";
import SettingsTable, { ColumnDef } from "@/components/SettingsTable";
import { useSettingsData } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "sonner";

interface CoreNetwork {
  id: string;
  totalBankName: string;
  networkCode: string;
  agencyName: string;
  customerManager: string;
  deptManager: string;
  areaDirector: string;
  coreNetwork: string;
}

interface NetworkShort {
  id: string;
  totalBank: string;
  branch: string;
  fullName: string;
  shortName: string;
}

interface NetworkTarget {
  id: string;
  networkName: string;
  bankName: string;
  deptManager: string;
  customerManager: string;
  qjTarget: number;
  dcTarget: number;
}

const coreNetworkColumns: ColumnDef[] = [
  { key: "totalBankName", label: "银行总行", type: "text" },
  { key: "networkCode", label: "网点编码", type: "text" },
  { key: "agencyName", label: "代理机构名称", type: "text", required: true },
  { key: "customerManager", label: "客户经理", type: "text" },
  { key: "deptManager", label: "营业部经理", type: "text" },
  { key: "areaDirector", label: "区域总监", type: "text" },
  {
    key: "coreNetwork",
    label: "核心网点",
    type: "select",
    options: [
      { value: "是", label: "是" },
      { value: "否", label: "否" },
    ],
  },
];

const networkShortColumns: ColumnDef[] = [
  { key: "totalBank", label: "总行", type: "text" },
  { key: "branch", label: "支行", type: "text" },
  { key: "fullName", label: "网点全名", type: "text", required: true },
  { key: "shortName", label: "网点简称", type: "text", required: true },
];

const networkTargetColumns: ColumnDef[] = [
  { key: "networkName", label: "网点名称", type: "text", required: true },
  { key: "bankName", label: "银行渠道", type: "text" },
  { key: "deptManager", label: "营业部经理", type: "text" },
  { key: "customerManager", label: "客户经理", type: "text" },
  { key: "qjTarget", label: "期交目标", type: "number" },
  { key: "dcTarget", label: "趸交目标", type: "number" },
];

export default function NetworkTab() {
  const coreNetworks = useSettingsData<CoreNetwork>("core-networks");
  const networkShorts = useSettingsData<NetworkShort>("network-shorts");
  const networkTargets = useSettingsData<NetworkTarget>("network-targets");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const { regenerateReport, monthStart, monthEnd, dataStatus } = useReport();

  const handleImportBranch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      // 动态导入 xlsx 库
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);

      if (rows.length === 0) {
        toast.error("Excel 文件中没有数据");
        return;
      }

      // 自动识别列名：支持 "网点"/"网点全名"/"代理机构名称" 和 "支行"/"銀行支行"
      const firstRow = rows[0];
      const keys = Object.keys(firstRow);
      const fullNameKey = keys.find(k => k === "网点" || k === "网点全名" || k === "代理机构名称" || k === "fullName") || keys[0];
      const branchKey = keys.find(k => k === "支行" || k === "銀行支行" || k === "branch") || keys[1];
      const totalBankKey = keys.find(k => k === "总行" || k === "銀行总行" || k === "totalBank");
      const shortNameKey = keys.find(k => k === "网点简称" || k === "简称" || k === "shortName");

      const items = rows.map(row => ({
        totalBank: totalBankKey ? String(row[totalBankKey] || "") : "",
        branch: String(row[branchKey] || ""),
        fullName: String(row[fullNameKey] || ""),
        shortName: shortNameKey ? String(row[shortNameKey] || "") : "",
      })).filter(item => item.fullName);

      if (items.length === 0) {
        toast.error("未识别到有效的网点数据");
        return;
      }

      const res = await fetch("/api/settings/network-shorts/import-branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      });
      const result = await res.json();
      if (result.ok) {
        const filledMsg = result.filled > 0 ? `，自动识别总行 ${result.filled} 条` : '';
        toast.success(`成功导入 ${result.count} 条支行-网点映射${filledMsg}，正在同步报表数据...`);
        networkShorts.refresh();
        // 如果已有报表数据，触发重新生成以同步支行数据到渠道页面
        if (dataStatus?.hasReport) {
          try {
            await regenerateReport(monthStart, monthEnd);
            toast.success("报表数据已同步，支行信息已更新");
          } catch (e) {
            // 重生失败不影响导入结果
          }
        }
      } else {
        toast.error(result.error || "导入失败");
      }
    } catch (err: any) {
      toast.error("导入失败: " + (err.message || "未知错误"));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        管理核心网点列表、网点定义（总行—支行—网点层级）和网点业绩目标。
      </div>

      <SettingsTable
        title="网点目标"
        description="设定每个网点的期交目标和趸交目标"
        columns={networkTargetColumns}
        data={networkTargets.data}
        onAdd={networkTargets.add}
        onUpdate={networkTargets.update}
        onDelete={networkTargets.remove}
        loading={networkTargets.loading}
      />

      <SettingsTable
        title="核心网点"
        description="维护核心网点列表及其归属关系"
        columns={coreNetworkColumns}
        data={coreNetworks.data}
        onAdd={coreNetworks.add}
        onUpdate={coreNetworks.update}
        onDelete={coreNetworks.remove}
        loading={coreNetworks.loading}
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold">网点定义</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              维护总行—支行—网点的三级层级关系和网点简称映射
            </p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportBranch}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {importing ? "导入中..." : "导入支行-网点映射"}
            </Button>
          </div>
        </div>
        <SettingsTable
          title=""
          columns={networkShortColumns}
          data={networkShorts.data}
          onAdd={networkShorts.add}
          onUpdate={networkShorts.update}
          onDelete={networkShorts.remove}
          loading={networkShorts.loading}
        />
      </div>
    </div>
  );
}
