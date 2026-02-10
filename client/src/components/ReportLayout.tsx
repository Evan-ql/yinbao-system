import { ReactNode, useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
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
} from "lucide-react";
import { useReport } from "@/contexts/ReportContext";

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
  const { reportData } = useReport();
  const [exporting, setExporting] = useState(false);

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
                    className={`w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
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
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${
                            isExpanded ? "" : "-rotate-90"
                          }`}
                        />
                      </>
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
                className={`w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
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
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
