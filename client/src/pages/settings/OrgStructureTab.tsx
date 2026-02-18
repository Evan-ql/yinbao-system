import { useState, useEffect, useCallback, useMemo } from "react";
import SettingsTable, { ColumnDef, RowHighlight } from "@/components/SettingsTable";
import OrgPickerModal from "@/components/OrgPickerModal";
import { useSettingsData } from "@/hooks/useSettings";
import { useReport } from "@/contexts/ReportContext";
import { ArrowRightLeft, AlertTriangle } from "lucide-react";

interface Staff {
  id: string;
  name: string;
  code: string;
  role: string;
  parentId: string;
  status: string;
  month: number;
}

const MONTH_OPTIONS = [
  { value: 0, label: "全年默认" },
  ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}月` })),
];

const STATUS_COLUMN: ColumnDef = {
  key: "status",
  label: "在岗状态",
  type: "select",
  sortable: true,
  options: [
    { value: "active", label: "在职" },
    { value: "resigned", label: "离职" },
    { value: "transferred", label: "调岗" },
  ],
};

const MONTH_COLUMN: ColumnDef = {
  key: "month",
  label: "生效月份",
  type: "select",
  options: MONTH_OPTIONS.map((m) => ({
    value: String(m.value),
    label: m.label,
  })),
};

const BASE_COLUMNS: ColumnDef[] = [
  { key: "name", label: "姓名", type: "text", required: true },
  { key: "code", label: "工号", type: "text" },
  {
    key: "role",
    label: "角色",
    type: "select",
    options: [
      { value: "director", label: "总监" },
      { value: "deptManager", label: "营业部经理" },
      { value: "customerManager", label: "客户经理" },
    ],
  },
];

export default function OrgStructureTab() {
  const { data, loading, add, update, remove, refresh } =
    useSettingsData<Staff>("staff");
  const { integrityAlert } = useReport();
  const [viewMonth, setViewMonth] = useState<number>(0);
  const [transferModal, setTransferModal] = useState<{
    staff: Staff;
    newParentId: string;
    month: number;
  } | null>(null);
  const [showTransferPicker, setShowTransferPicker] = useState(false);
  const [effectiveStaff, setEffectiveStaff] = useState<Staff[]>([]);
  const [loadingEffective, setLoadingEffective] = useState(false);

  // 构建缺失人员名单
  const missingPersonNames = useMemo(() => {
    if (!integrityAlert?.missingByPerson) return new Set<string>();
    return new Set(integrityAlert.missingByPerson.map(p => p.name));
  }, [integrityAlert]);

  const missingPersonDetails = useMemo(() => {
    if (!integrityAlert?.missingByPerson) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const p of integrityAlert.missingByPerson) {
      const roleLabel = p.role === "customerManager" ? "客户经理" : "营业部经理";
      map.set(p.name, `${roleLabel} ${p.name}：${p.count}条保单缺失${p.missingField}归属（${p.months.map(m => m + "月").join("、")}）`);
    }
    return map;
  }, [integrityAlert]);

  const getRowHighlight = useCallback((item: Staff): RowHighlight => {
    if (item.status === "active" && !item.parentId && item.role !== "director") {
      return { highlighted: true, reason: `${item.name} 的上级姓名为空，请补全` };
    }
    if (missingPersonNames.has(item.name)) {
      return {
        highlighted: true,
        reason: missingPersonDetails.get(item.name) || `${item.name} 存在数据缺失`
      };
    }
    return { highlighted: false };
  }, [missingPersonNames, missingPersonDetails]);

  const fetchEffective = useCallback(async (month: number) => {
    if (month === 0) return;
    setLoadingEffective(true);
    try {
      const res = await fetch(`/api/settings/staff/effective/${month}`);
      if (res.ok) {
        setEffectiveStaff(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch effective staff:", e);
    } finally {
      setLoadingEffective(false);
    }
  }, []);

  useEffect(() => {
    if (viewMonth > 0) {
      fetchEffective(viewMonth);
    }
  }, [viewMonth, data, fetchEffective]);

  const handleTransfer = async () => {
    if (!transferModal) return;
    try {
      const res = await fetch("/api/settings/staff/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: transferModal.staff.id,
          newParentId: transferModal.newParentId,
          month: transferModal.month,
        }),
      });
      if (res.ok) {
        setTransferModal(null);
        refresh();
      }
    } catch (e) {
      console.error("Transfer failed:", e);
    }
  };

  const displayData = viewMonth === 0 ? data : effectiveStaff;
  const directors = displayData.filter((s) => s.role === "director");
  const deptManagers = displayData.filter((s) => s.role === "deptManager");
  const customerManagers = displayData.filter(
    (s) => s.role === "customerManager" && s.parentId !== "公司直营"
  );
  const directSalesManagers = displayData.filter(
    (s) => s.role === "customerManager" && s.parentId === "公司直营"
  );

  const monthChanges: Record<number, number> = {};
  for (const s of data) {
    if (s.month > 0) {
      monthChanges[s.month] = (monthChanges[s.month] || 0) + 1;
    }
  }

  // 列定义：parentId 使用 org-picker 类型
  const directorColumns: ColumnDef[] = useMemo(() => [
    ...BASE_COLUMNS,
    { key: "parentId", label: "上级姓名", type: "text" as const, sortable: true },
    STATUS_COLUMN,
    MONTH_COLUMN,
  ], []);

  const deptManagerColumns: ColumnDef[] = useMemo(() => [
    ...BASE_COLUMNS,
    { key: "parentId", label: "上级姓名", type: "org-picker" as const, sortable: true, orgCategories: ["director", "direct"] as ("director" | "deptManager" | "direct")[] },
    STATUS_COLUMN,
    MONTH_COLUMN,
  ], []);

  const customerManagerColumns: ColumnDef[] = useMemo(() => [
    ...BASE_COLUMNS,
    { key: "parentId", label: "上级姓名", type: "org-picker" as const, sortable: true, orgCategories: ["deptManager", "direct"] as ("director" | "deptManager" | "direct")[] },
    STATUS_COLUMN,
    MONTH_COLUMN,
  ], []);

  // 统计各表格的缺失数量
  const directorAlertCount = directors.filter(s => getRowHighlight(s).highlighted).length;
  const deptManagerAlertCount = deptManagers.filter(s => getRowHighlight(s).highlighted).length;
  const customerManagerAlertCount = customerManagers.filter(s => getRowHighlight(s).highlighted).length;

  return (
    <div className="space-y-6">
      {/* 全局缺失提醒横幅 */}
      {integrityAlert?.hasMissing && (
        <div className="bg-orange-50 border border-orange-300 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-orange-800">人事数据需要补全</h4>
            <p className="text-xs text-orange-700 mt-1">
              当前有 <strong>{integrityAlert.totalMissing}</strong> 条保单的人事归属数据缺失
              （缺营业部经理 {integrityAlert.missingManagerCount} 条，
              缺总监 {integrityAlert.missingDirectorCount} 条，
              两者都缺 {integrityAlert.missingBothCount} 条）。
              请在下方表格中补全标橙的人员信息，补全后报表数据将自动更新。
            </p>
            <p className="text-xs text-orange-600 mt-1">
              标橙行表示该人员的保单数据存在归属缺失，请检查其上级姓名是否正确。
            </p>
          </div>
        </div>
      )}

      {/* 月份选择器 */}
      <div className="bg-card border border-border/60 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">按月查看人员状态</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              选择"全部记录"查看所有月份的原始数据，选择具体月份查看该月的有效在岗人员
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setViewMonth(0)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMonth === 0
                ? "bg-primary text-white"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            全部记录
          </button>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <button
              key={m}
              onClick={() => setViewMonth(m)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors relative ${
                viewMonth === m
                  ? "bg-primary text-white"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {m}月
              {monthChanges[m] && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {monthChanges[m]}
                </span>
              )}
            </button>
          ))}
        </div>
        {viewMonth > 0 && (
          <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
            当前查看 <strong>{viewMonth}月</strong> 的有效在岗人员（共{" "}
            {effectiveStaff.filter((s) => s.status === "active").length} 人在职）
          </div>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        管理组织架构中的人员信息。支持按月记录人员状态变动：
        <strong>生效月份</strong>
        设为"全年默认"表示该记录在所有月份生效，设为具体月份则仅在该月及之后生效并覆盖之前的记录。
        点击人员行的
        <ArrowRightLeft className="w-3.5 h-3.5 inline mx-1" />
        按钮可执行调岗操作。
      </div>

      <SettingsTable
        title="总监"
        description="管理区域总监信息"
        columns={directorColumns}
        data={directors}
        allStaff={displayData}
        onAdd={(item) => add({ ...item, month: Number(item.month) || 0 })}
        onUpdate={(id, item) =>
          update(id, { ...item, month: Number(item.month) || 0 })
        }
        onDelete={remove}
        loading={viewMonth === 0 ? loading : loadingEffective}
        rowHighlight={getRowHighlight}
        alertCount={directorAlertCount}
      />

      {/* 公司直营区域 */}
      {directSalesManagers.length > 0 && (
        <div className="bg-card border border-border/60 rounded-lg">
          <div className="px-4 py-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  公司直营
                  <span className="text-[10px] font-normal px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                    不统计到总监
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  公司直营渠道的客户经理，不归属任何营业部经理和总监
                </p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">姓名</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">工号</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">角色</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">归属</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">在岗状态</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">生效月份</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {directSalesManagers.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium">{s.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.code || "-"}</td>
                    <td className="px-4 py-2.5">客户经理</td>
                    <td className="px-4 py-2.5">
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">公司直营</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs ${s.status === "active" ? "text-emerald-600" : "text-gray-400"}`}>
                        {s.status === "active" ? "在职" : s.status === "resigned" ? "离职" : "调岗"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {s.month === 0 ? "-" : `${s.month}月`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border/40">
            共 {directSalesManagers.length} 条记录
          </div>
        </div>
      )}

      <SettingsTable
        title="营业部经理"
        description="管理各营业部经理信息，点击上级姓名可选择所属总监或公司直营"
        columns={deptManagerColumns}
        data={deptManagers}
        allStaff={displayData}
        onAdd={(item) => add({ ...item, month: Number(item.month) || 0 })}
        onUpdate={(id, item) =>
          update(id, { ...item, month: Number(item.month) || 0 })
        }
        onDelete={remove}
        loading={viewMonth === 0 ? loading : loadingEffective}
        rowHighlight={getRowHighlight}
        alertCount={deptManagerAlertCount}
        alertMessage={deptManagerAlertCount > 0 ? `${deptManagerAlertCount} 名营业部经理的下属保单存在归属缺失，请检查` : undefined}
      />

      <SettingsTable
        title="客户经理"
        description="管理各客户经理信息，点击上级姓名可选择所属营业部经理或公司直营。点击调岗按钮可快速调岗。"
        columns={customerManagerColumns}
        data={customerManagers}
        allStaff={displayData}
        onAdd={(item) => add({ ...item, month: Number(item.month) || 0 })}
        onUpdate={(id, item) =>
          update(id, { ...item, month: Number(item.month) || 0 })
        }
        onDelete={remove}
        loading={viewMonth === 0 ? loading : loadingEffective}
        rowHighlight={getRowHighlight}
        alertCount={customerManagerAlertCount}
        alertMessage={customerManagerAlertCount > 0 ? `${customerManagerAlertCount} 名客户经理的保单存在归属缺失，请检查其上级姓名` : undefined}
        extraActions={(item) => (
          <button
            onClick={() =>
              setTransferModal({
                staff: item,
                newParentId: "",
                month: viewMonth > 0 ? viewMonth : new Date().getMonth() + 1,
              })
            }
            className="p-1 text-orange-600 hover:bg-orange-50 rounded"
            title="调岗"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>
        )}
      />

      {/* 调岗弹窗 */}
      {transferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-[420px] max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4">调岗操作</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">调岗人员</label>
                <p className="text-sm font-medium">
                  {transferModal.staff.name}（{transferModal.staff.code}）
                </p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">当前上级</label>
                <p className="text-sm font-medium">
                  {transferModal.staff.parentId || "无"}
                </p>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  调入新上级
                </label>
                <button
                  type="button"
                  onClick={() => setShowTransferPicker(true)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                >
                  <span className={transferModal.newParentId ? "" : "text-muted-foreground"}>
                    {transferModal.newParentId === "公司直营" ? (
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">公司直营</span>
                    ) : (
                      transferModal.newParentId || "点击选择新上级..."
                    )}
                  </span>
                  <span className="text-muted-foreground text-xs">选择</span>
                </button>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  生效月份
                </label>
                <select
                  value={transferModal.month}
                  onChange={(e) =>
                    setTransferModal({
                      ...transferModal,
                      month: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {m}月
                    </option>
                  ))}
                </select>
              </div>
              <div className="p-3 bg-amber-50 rounded text-xs text-amber-700">
                <strong>调岗说明：</strong>
                系统将自动执行以下操作：
                <br />
                1. 在原上级（{transferModal.staff.parentId}）下添加一条"
                {transferModal.month}月调岗"记录
                <br />
                2. 在新上级（{transferModal.newParentId || "..."}
                ）下添加一条"{transferModal.month}月在职"记录
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setTransferModal(null)}
                className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md"
              >
                取消
              </button>
              <button
                onClick={handleTransfer}
                disabled={!transferModal.newParentId}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
              >
                确认调岗
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 调岗弹窗的 OrgPicker */}
      {showTransferPicker && transferModal && (
        <OrgPickerModal
          title="选择调入新上级"
          currentValue={transferModal.newParentId}
          allStaff={displayData}
          categories={["deptManager", "direct"]}
          onSelect={(value) => {
            setTransferModal({ ...transferModal, newParentId: value });
            setShowTransferPicker(false);
          }}
          onClose={() => setShowTransferPicker(false)}
        />
      )}
    </div>
  );
}
