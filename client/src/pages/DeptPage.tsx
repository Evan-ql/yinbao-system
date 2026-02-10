import { useState } from "react";
import { useReport } from "@/contexts/ReportContext";
import MonthSelector from "@/components/MonthSelector";
import TargetAchievementPage from "./dept/TargetAchievementPage";
import BusinessDataPage from "./dept/BusinessDataPage";
import DailyPremiumPage from "./dept/DailyPremiumPage";
import HrDataPage from "./dept/HrDataPage";
import TieganPage from "./dept/TieganPage";
import DadanPage from "./dept/DadanPage";
import PremiumDistPage from "./dept/PremiumDistPage";
import PersonalTop10Page from "./dept/PersonalTop10Page";
import PersonalCountPage from "./dept/PersonalCountPage";
import BankDadanPage from "./dept/BankDadanPage";
import NetworkDistPage from "./dept/NetworkDistPage";
import ProductDistPage from "./dept/ProductDistPage";

const tabs = [
  { key: "target-achievement", label: "目标达成" },
  { key: "business", label: "业务数据" },
  { key: "daily-premium", label: "日保费数据" },
  { key: "hr", label: "人力数据" },
  { key: "tiegan", label: "铁杆网点" },
  { key: "dadan", label: "部门大单分布" },
  { key: "premium-dist", label: "保费分布图" },
  { key: "personal-top", label: "个人业绩前10" },
  { key: "personal-count", label: "个人件数前10" },
  { key: "bank-dadan", label: "全渠道大单" },
  { key: "network-dist", label: "网点分布" },
  { key: "product-dist", label: "险种分布" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const tabComponents: Record<TabKey, React.ComponentType> = {
  "target-achievement": TargetAchievementPage,
  "business": BusinessDataPage,
  "daily-premium": DailyPremiumPage,
  "hr": HrDataPage,
  "tiegan": TieganPage,
  "dadan": DadanPage,
  "premium-dist": PremiumDistPage,
  "personal-top": PersonalTop10Page,
  "personal-count": PersonalCountPage,
  "bank-dadan": BankDadanPage,
  "network-dist": NetworkDistPage,
  "product-dist": ProductDistPage,
};

export default function DeptPage() {
  const { reportData } = useReport();
  const [activeTab, setActiveTab] = useState<TabKey>("target-achievement");

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
      {/* Top bar: tabs + month selector */}
      <div className="border-b border-border bg-card/50 px-4 pt-3 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold tracking-tight">部门</h2>
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

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        <ActiveComponent />
      </div>
    </div>
  );
}
