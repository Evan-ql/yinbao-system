import { ReactNode, useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FileSpreadsheet,
  Network,
  TrendingUp,
  Upload,
  Users,
  Clock,
  CalendarDays,
  Settings,
  X,
  ArrowRight,
} from "lucide-react";
import { useReport } from "@/contexts/ReportContext";
import { APP_VERSION } from "@shared/const";

interface SubItem {
  icon: any;
  label: string;
  path: string;
}

interface MenuItem {
  icon: any;
  label: string;
  path: string;
  requiresData?: boolean;
  children?: SubItem[];
}

const menuItems: MenuItem[] = [
  {
    icon: Upload,
    label: "导入数据",
    path: "/import",
    children: [
      { icon: FileSpreadsheet, label: "2026数据", path: "/import/source" },
      { icon: Users, label: "人网数据", path: "/import/renwang" },
      { icon: CalendarDays, label: "日清单", path: "/import/daily" },
    ],
  },
  { icon: Building2, label: "部门", path: "/dept", requiresData: true },
  { icon: TrendingUp, label: "渠道", path: "/channel", requiresData: true },
  { icon: Users, label: "人力", path: "/hr", requiresData: true },
  { icon: BarChart3, label: "追踪报表", path: "/tracking", requiresData: true },
  { icon: Network, label: "核心网点", path: "/core-network", requiresData: true },
  { icon: Database, label: "数据来源", path: "/data-source", requiresData: true },
  { icon: Settings, label: "系统设置", path: "/settings" },
];

export default function ReportLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "/import": true,
  });
  const { reportData, integrityAlert } = useReport();
  const hasIntegrityIssue = integrityAlert?.hasMissing ?? false;
  const [exporting, setExporting] = useState(false);
  const [showAlertDetail, setShowAlertDetail] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭弹出详情
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (alertRef.current && !alertRef.current.contains(e.target as Node)) {
        setShowAlertDetail(false);
      }
    }
    if (showAlertDetail) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAlertDetail]);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch('/api/report/export-excel');
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '导出失败' }));
        alert(err.error || '导出失败');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `银保报表_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('导出失败: ' + (e.message || '网络错误'));
    } finally {
      setExporting(false);
    }
  }, [exporting]);

  const toggleGroup = (path: string) => {
    setExpandedGroups((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? "w-16" : "w-56"
        } flex flex-col border-r border-border/60 bg-sidebar text-sidebar-foreground transition-all duration-200 shrink-0`}
      >
        {/* Logo / Header */}
        <div className="h-14 flex items-center gap-2.5 px-3 border-b border-sidebar-border shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-semibold tracking-tight truncate">银保报表系统</h1>
              <p className="text-[10px] text-muted-foreground truncate">大家人寿邯郸中支</p>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isActive = hasChildren
              ? location.startsWith(item.path)
              : location.startsWith(item.path);
            const isDisabled = item.requiresData && !reportData;
            const isExpanded = expandedGroups[item.path] ?? false;

            // 判断是否需要在此菜单项上显示报警
            const showMenuAlert =
              hasIntegrityIssue && (item.path === "/settings" || item.path === "/import");

            if (hasChildren) {
              return (
                <div key={item.path}>
                  <button
                    onClick={() => {
                      if (isDisabled) return;
                      if (collapsed) {
                        setCollapsed(false);
                        setExpandedGroups((prev) => ({ ...prev, [item.path]: true }));
                        setLocation(item.children![0].path);
                      } else {
                        toggleGroup(item.path);
                      }
                    }}
                    disabled={isDisabled}
                    className={`w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors relative ${
                      isActive
                        ? "text-sidebar-foreground font-medium"
                        : isDisabled
                        ? "text-muted-foreground/40 cursor-not-allowed"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                    {!collapsed && (
                      <>
                        <span className="truncate flex-1 text-left">{item.label}</span>
                        {showMenuAlert && (
                          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0" />
                        )}
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${
                            isExpanded ? "" : "-rotate-90"
                          }`}
                        />
                      </>
                    )}
                    {collapsed && showMenuAlert && (
                      <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </button>
                  {!collapsed && isExpanded && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border/40 pl-2">
                      {item.children!.map((child) => {
                        const childActive = location === child.path;
                        return (
                          <button
                            key={child.path}
                            onClick={() => setLocation(child.path)}
                            className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                              childActive
                                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                            }`}
                          >
                            <child.icon className={`w-3.5 h-3.5 shrink-0 ${childActive ? "text-primary" : ""}`} />
                            <span className="truncate">{child.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.path}
                onClick={() => {
                  if (!isDisabled) setLocation(item.path);
                }}
                disabled={isDisabled}
                className={`w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors relative ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : isDisabled
                    ? "text-muted-foreground/40 cursor-not-allowed"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && showMenuAlert && (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse ml-auto shrink-0" />
                )}
                {collapsed && showMenuAlert && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-sidebar-border px-2 py-2 space-y-1 shrink-0">
          {reportData && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full flex items-center justify-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
              title="导出总表Excel"
            >
              <Download className={`w-4 h-4 shrink-0 ${exporting ? 'animate-bounce' : ''}`} />
              {!collapsed && <span>{exporting ? '导出中...' : '导出总表'}</span>}
            </button>
          )}
          {reportData && !collapsed && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3 shrink-0" />
              <span className="truncate">
                更新于 {new Date(reportData.summary.generatedAt).toLocaleString("zh-CN", {
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
          {reportData && collapsed && (
            <div className="flex justify-center py-1.5" title={`更新于 ${new Date(reportData.summary.generatedAt).toLocaleString("zh-CN")}`}>
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent/60 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>收起</span>
              </>
            )}
          </button>
          {!collapsed && (
            <div className="text-center text-[10px] text-muted-foreground/50 py-1">
              v{APP_VERSION}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {/* 右上角数据完整性报警 */}
        {hasIntegrityIssue && (
          <div ref={alertRef} className="absolute top-3 right-4 z-50">
            <button
              onClick={() => setShowAlertDetail(!showAlertDetail)}
              className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 shadow-sm hover:bg-red-100 transition-colors"
            >
              <span className="relative">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
              </span>
              <span className="text-xs text-red-700 font-medium">
                {integrityAlert!.totalMissing} 条数据缺失人事归属
              </span>
            </button>

            {/* 弹出详情面板 */}
            {showAlertDetail && (
              <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-red-200 overflow-hidden">
                <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-semibold text-red-800">人事数据缺失报警</span>
                  </div>
                  <button onClick={() => setShowAlertDetail(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-orange-50 rounded-lg p-2">
                      <div className="text-lg font-bold text-orange-700">{integrityAlert!.missingManagerCount}</div>
                      <div className="text-[10px] text-orange-600">缺营业部经理</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2">
                      <div className="text-lg font-bold text-red-700">{integrityAlert!.missingDirectorCount}</div>
                      <div className="text-[10px] text-red-600">缺总监</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-2">
                      <div className="text-lg font-bold text-purple-700">{integrityAlert!.missingBothCount}</div>
                      <div className="text-[10px] text-purple-600">两者都缺</div>
                    </div>
                  </div>

                  {integrityAlert!.missingByPerson.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-500 mb-1.5 font-medium">缺失人员明细：</div>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {integrityAlert!.missingByPerson.slice(0, 20).map((p, i) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2.5 py-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-orange-700">{p.name}</span>
                              <span className="text-gray-400">
                                {p.role === "customerManager" ? "客户经理" : "营业部经理"}
                              </span>
                            </div>
                            <div className="text-gray-500">
                              {p.count}单 · {p.months.map(m => `${m}月`).join("、")}
                            </div>
                          </div>
                        ))}
                        {integrityAlert!.missingByPerson.length > 20 && (
                          <div className="text-center text-[10px] text-gray-400 py-1">
                            还有 {integrityAlert!.missingByPerson.length - 20} 人...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-4 py-3 border-t bg-gray-50">
                  <button
                    onClick={() => {
                      setShowAlertDetail(false);
                      setLocation("/settings");
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    前往组织架构补全数据
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
