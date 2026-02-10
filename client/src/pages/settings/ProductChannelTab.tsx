import SettingsTable, { ColumnDef } from "@/components/SettingsTable";
import { useSettingsData } from "@/hooks/useSettings";

interface ProductShort {
  id: string;
  fullName: string;
  shortName: string;
  category: string;
}

interface BankShort {
  id: string;
  fullName: string;
  shortName: string;
  sortOrder: number;
}

interface ZhebiaoCof {
  id: string;
  xianzhong: string;
  nianxian: string;
  xishu: number;
}

const productColumns: ColumnDef[] = [
  { key: "fullName", label: "产品全名", type: "text", required: true },
  { key: "shortName", label: "产品简称", type: "text", required: true },
  {
    key: "category",
    label: "分类",
    type: "select",
    options: [
      { value: "normal", label: "普通" },
      { value: "fangan1", label: "方案保费×1" },
      { value: "fangan05", label: "方案保费×0.5" },
    ],
  },
];

const bankColumns: ColumnDef[] = [
  { key: "fullName", label: "银行全名", type: "text", required: true },
  { key: "shortName", label: "银行简称", type: "text", required: true },
  { key: "sortOrder", label: "排序", type: "number" },
];

const zhebiaoColumns: ColumnDef[] = [
  { key: "xianzhong", label: "险种", type: "text", required: true },
  { key: "nianxian", label: "年限", type: "text", required: true },
  { key: "xishu", label: "折标系数", type: "number" },
];

export default function ProductChannelTab() {
  const products = useSettingsData<ProductShort>("product-shorts");
  const banks = useSettingsData<BankShort>("bank-shorts");
  const zhebiao = useSettingsData<ZhebiaoCof>("zhebiao-cofs");

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        管理产品简称映射、银行渠道简称和折标系数等配置数据。
      </div>

      <SettingsTable
        title="产品简称"
        description="维护产品全名到简称的对应关系，以及方案保费分类"
        columns={productColumns}
        data={products.data}
        onAdd={products.add}
        onUpdate={products.update}
        onDelete={products.remove}
        loading={products.loading}
      />

      <SettingsTable
        title="银行渠道"
        description="维护银行全名到简称的对应关系及排序"
        columns={bankColumns}
        data={banks.data}
        onAdd={banks.add}
        onUpdate={banks.update}
        onDelete={banks.remove}
        loading={banks.loading}
      />

      <SettingsTable
        title="折标系数"
        description="维护不同险种、不同缴费年限对应的折标系数"
        columns={zhebiaoColumns}
        data={zhebiao.data}
        onAdd={zhebiao.add}
        onUpdate={zhebiao.update}
        onDelete={zhebiao.remove}
        loading={zhebiao.loading}
      />
    </div>
  );
}
