import { useState } from "react";
import { useReport } from "@/contexts/ReportContext";
import MonthSelector from "@/components/MonthSelector";
import ChannelSummaryTab from "./channel/ChannelSummaryTab";
import ChannelProductTab from "./channel/ChannelProductTab";
import MonthlyTrendTab from "./channel/MonthlyTrendTab";
import ProductDetailTab from "./channel/ProductDetailTab";
import DcProductTab from "./channel/DcProductTab";
import NetworkOpenTab from "./channel/NetworkOpenTab";
import NetworkPerfTab from "./channel/NetworkPerfTab";

const tabs = [
  { key: "summary", label: "业务数据—渠道" },
  { key: "channel-product", label: "渠道产品分布" },
  { key: "monthly-trend", label: "月度趋势" },
  { key: "product-detail", label: "业务数据—产品" },
  { key: "dc-product", label: "趸交产品数据" },
  { key: "network-open", label: "网点数据—开单网点" },
  { key: "network-perf", label: "网点业绩明细" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const tabComponents: Record<TabKey, React.ComponentType> = {
  "summary": ChannelSummaryTab,
  "channel-product": ChannelProductTab,
  "monthly-trend": MonthlyTrendTab,
  "product-detail": ProductDetailTab,
  "dc-product": DcProductTab,
  "network-open": NetworkOpenTab,
  "network-perf": NetworkPerfTab,
};

export default function ChannelPage() {
  const { reportData } = useReport();
  const [activeTab, setActiveTab] = useState<TabKey>("summary");

  if (!reportData) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">请先导入数据</p>
      </div>
    );
  }

  const ActiveComponent = tabComponents[activeTab];

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card/50 px-4 pt-3 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold tracking-tight">渠道</h2>
          <MonthSelector />
        </div>
        <div className="flex gap-0.5 overflow-x-auto pb-0 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ActiveComponent />
      </div>
    </div>
  );
}
