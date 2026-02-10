import SettingsTable, { ColumnDef } from "@/components/SettingsTable";
import { useSettingsData } from "@/hooks/useSettings";

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

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        管理核心网点列表、网点简称映射和网点业绩目标。
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

      <SettingsTable
        title="网点简称"
        description="维护网点全名到简称的对应关系"
        columns={networkShortColumns}
        data={networkShorts.data}
        onAdd={networkShorts.add}
        onUpdate={networkShorts.update}
        onDelete={networkShorts.remove}
        loading={networkShorts.loading}
      />
    </div>
  );
}
