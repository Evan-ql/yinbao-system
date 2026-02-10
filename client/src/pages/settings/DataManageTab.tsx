import { useState } from "react";
import { AlertTriangle, Trash2, Database, FileSpreadsheet, Users, CalendarDays, CheckCircle, Package, Building, Hash, Network, MapPin } from "lucide-react";

interface ClearItem {
  id: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  api: string;
  danger: boolean; // 是否高危操作
}

const CLEAR_ITEMS: ClearItem[] = [
  {
    id: "report",
    label: "清空全部报表数据",
    desc: "清空所有已上传的数据文件（2026数据、人网数据、日清单）和已生成的报表缓存，清空后需要重新上传数据。",
    icon: Database,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    api: "/api/report/clear-report",
    danger: true,
  },
  {
    id: "source",
    label: "清空2026业务数据",
    desc: "仅清空已上传的2026业务数据Excel文件，不影响人网数据和日清单。清空后需要重新上传2026数据。",
    icon: FileSpreadsheet,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    api: "/api/report/clear-source",
    danger: false,
  },
  {
    id: "renwang",
    label: "清空人网数据",
    desc: "仅清空已上传的人网数据Excel文件，不影响业务数据和日清单。清空后需要重新上传人网数据。",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    api: "/api/report/clear-renwang",
    danger: false,
  },
  {
    id: "daily",
    label: "清空日清单数据",
    desc: "仅清空已上传的日清单Excel文件，不影响业务数据和人网数据。清空后需要重新上传日清单。",
    icon: CalendarDays,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    api: "/api/report/clear-daily",
    danger: false,
  },
  {
    id: "settings-targets",
    label: "清空全部业绩目标",
    desc: "清空系统设置中所有层级的业绩目标数据（总监目标、营业部经理目标、客户经理目标、营业部目标、网点目标、职级维持标保、日保费底线）。",
    icon: AlertTriangle,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    api: "/api/settings/clear-targets",
    danger: true,
  },
  {
    id: "settings-org",
    label: "清空组织架构",
    desc: "清空系统设置中的全部组织架构人员数据（总监、营业部经理、客户经理）。",
    icon: Users,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    api: "/api/settings/clear-org",
    danger: true,
  },
  {
    id: "settings-products",
    label: "清空产品简称",
    desc: "清空系统设置中的全部产品简称映射数据（产品全名、简称、方案保费分类）。清空后需要重新配置或从模板导入。",
    icon: Package,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    api: "/api/settings/clear-products",
    danger: false,
  },
  {
    id: "settings-banks",
    label: "清空银行渠道",
    desc: "清空系统设置中的全部银行渠道简称数据（银行全名、简称、排序）。清空后需要重新配置。",
    icon: Building,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    api: "/api/settings/clear-banks",
    danger: false,
  },
  {
    id: "settings-zhebiao",
    label: "清空折标系数",
    desc: "清空系统设置中的全部折标系数配置（险种、年限、系数）。清空后需要重新配置或从模板导入。",
    icon: Hash,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
    api: "/api/settings/clear-zhebiao",
    danger: false,
  },
  {
    id: "settings-core-networks",
    label: "清空核心网点",
    desc: "清空系统设置中的全部核心网点配置数据。",
    icon: Network,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    api: "/api/settings/clear-core-networks",
    danger: false,
  },
  {
    id: "settings-network-shorts",
    label: "清空网点简称",
    desc: "清空系统设置中的全部网点简称映射数据。",
    icon: MapPin,
    color: "text-lime-600",
    bgColor: "bg-lime-50",
    borderColor: "border-lime-200",
    api: "/api/settings/clear-network-shorts",
    danger: false,
  },
];

export default function DataManageTab() {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { success: boolean; message: string }>>({});

  const handleClear = async (item: ClearItem) => {
    if (confirmId !== item.id) {
      // 第一次点击：进入确认状态
      setConfirmId(item.id);
      return;
    }
    // 第二次点击：执行清空
    setLoading(item.id);
    setConfirmId(null);
    try {
      const res = await fetch(item.api, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setResults(prev => ({ ...prev, [item.id]: { success: true, message: data.message || "清空成功" } }));
      } else {
        setResults(prev => ({ ...prev, [item.id]: { success: false, message: data.error || "清空失败" } }));
      }
    } catch (err: any) {
      setResults(prev => ({ ...prev, [item.id]: { success: false, message: err.message || "网络错误" } }));
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = () => {
    setConfirmId(null);
  };

  return (
    <div className="space-y-6">
      {/* 标题和说明 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-800 mb-1">数据管理</h3>
            <p className="text-sm text-amber-700">
              以下操作将永久删除对应的数据，删除后无法恢复。请在操作前确认已做好数据备份。
              点击按钮后需要再次确认才会执行清空操作。
            </p>
          </div>
        </div>
      </div>

      {/* 清空按钮列表 */}
      <div className="grid gap-4">
        {CLEAR_ITEMS.map((item) => {
          const Icon = item.icon;
          const isConfirming = confirmId === item.id;
          const isLoading = loading === item.id;
          const result = results[item.id];

          return (
            <div
              key={item.id}
              className={`border rounded-lg p-5 transition-all ${
                isConfirming ? "border-red-400 bg-red-50 shadow-md" : `${item.borderColor} ${item.bgColor}`
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${isConfirming ? "bg-red-100" : "bg-white/80"}`}>
                    <Icon className={`w-5 h-5 ${isConfirming ? "text-red-600" : item.color}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-semibold text-sm ${isConfirming ? "text-red-800" : "text-gray-800"}`}>
                      {item.label}
                      {item.danger && (
                        <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">高危</span>
                      )}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                    {/* 确认提示 */}
                    {isConfirming && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-red-700 font-medium">
                        <AlertTriangle className="w-4 h-4" />
                        确定要执行此操作吗？此操作不可撤销！
                      </div>
                    )}
                    {/* 操作结果 */}
                    {result && (
                      <div className={`mt-2 flex items-center gap-1.5 text-xs ${result.success ? "text-green-600" : "text-red-600"}`}>
                        <CheckCircle className="w-3.5 h-3.5" />
                        {result.message}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isConfirming ? (
                    <>
                      <button
                        onClick={handleCancel}
                        className="px-3 py-1.5 text-xs rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleClear(item)}
                        disabled={isLoading}
                        className="px-3 py-1.5 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        {isLoading ? (
                          <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        确认清空
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleClear(item)}
                      disabled={isLoading}
                      className={`px-4 py-2 text-xs rounded-md border transition-colors flex items-center gap-1.5 ${
                        item.danger
                          ? "border-red-300 text-red-600 hover:bg-red-100"
                          : "border-gray-300 text-gray-600 hover:bg-white"
                      } disabled:opacity-50`}
                    >
                      {isLoading ? (
                        <span className="inline-block w-3 h-3 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      清空
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
