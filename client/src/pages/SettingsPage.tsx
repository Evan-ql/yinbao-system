import { useState } from "react";
import { Building2, Target, Package, MapPin, Trash2 } from "lucide-react";
import OrgStructureTab from "./settings/OrgStructureTab";
import TargetsTab from "./settings/TargetsTab";
import ProductChannelTab from "./settings/ProductChannelTab";
import NetworkTab from "./settings/NetworkTab";
import DataManageTab from "./settings/DataManageTab";

const tabs = [
  { id: "org", label: "组织架构", icon: Building2 },
  { id: "targets", label: "业绩目标", icon: Target },
  { id: "product", label: "产品与渠道", icon: Package },
  { id: "network", label: "网点定义", icon: MapPin },
  { id: "data", label: "数据管理", icon: Trash2 },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("org");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 border-b border-border/60 bg-card px-6 pt-4 pb-0">
        <h2 className="text-lg font-semibold mb-3">系统设置</h2>
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-t-lg border border-b-0 transition-colors ${
                  isActive
                    ? "bg-background text-foreground font-medium border-border/60"
                    : "bg-transparent text-muted-foreground hover:text-foreground border-transparent"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "org" && <OrgStructureTab />}
        {activeTab === "targets" && <TargetsTab />}
        {activeTab === "product" && <ProductChannelTab />}
        {activeTab === "network" && <NetworkTab />}
        {activeTab === "data" && <DataManageTab />}
      </div>
    </div>
  );
}
