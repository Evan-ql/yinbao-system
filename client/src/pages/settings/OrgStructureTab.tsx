import { useState, useEffect, useCallback } from "react";
import SettingsTable, { ColumnDef } from "@/components/SettingsTable";
import { useSettingsData } from "@/hooks/useSettings";
import { ArrowRightLeft } from "lucide-react";

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
  { value: 1, label: "1月" },
  { value: 2, label: "2月" },
  { value: 3, label: "3月" },
  { value: 4, label: "4月" },
  { value: 5, label: "5月" },
  { value: 6, label: "6月" },
  { value: 7, label: "7月" },
  { value: 8, label: "8月" },
  { value: 9, label: "9月" },
  { value: 10, label: "10月" },
  { value: 11, label: "11月" },
  { value: 12, label: "12月" },
];

const columns: ColumnDef[] = [
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
  { key: "parentId", label: "上级姓名", type: "text" },
  {
    key: "status",
    label: "在岗状态",
    type: "select",
    options: [
      { value: "active", label: "在职" },
      { value: "resigned", label: "离职" },
      { value: "transferred", label: "调岗" },
    ],
  },
  {
    key: "month",
    label: "生效月份",
    type: "select",
    options: MONTH_OPTIONS.map((m) => ({
      value: String(m.value),
      label: m.label,
    })),
  },
];

// 状态标签颜色
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    resigned: "bg-red-100 text-red-700",
    transferred: "bg-yellow-100 text-yellow-700",
  };
  const labels: Record<string, string> = {
    active: "在职",
    resigned: "离职",
    transferred: "调岗",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-700"}`}
    >
      {labels[status] || status}
    </span>
  );
}

export default function OrgStructureTab() {
  const { data, loading, add, update, remove, refresh } =
    useSettingsData<Staff>("staff");
  const [viewMonth, setViewMonth] = useState<number>(0); // 0 = 查看全部
  const [transferModal, setTransferModal] = useState<{
    staff: Staff;
    newParentId: string;
    month: number;
  } | null>(null);
  const [effectiveStaff, setEffectiveStaff] = useState<Staff[]>([]);
  const [loadingEffective, setLoadingEffective] = useState(false);

  // 当选择了具体月份时，加载该月份的有效人员
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

  // 执行调岗
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

  // 根据视图模式筛选数据
  const getDisplayData = () => {
    if (viewMonth === 0) {
      // 查看全部记录
      return data;
    }
    // 查看某月份的有效人员
    return effectiveStaff;
  };

  const displayData = getDisplayData();
  const directors = displayData.filter((s) => s.role === "director");
  const deptManagers = displayData.filter((s) => s.role === "deptManager");
  const customerManagers = displayData.filter(
    (s) => s.role === "customerManager"
  );

  // 统计各月份的人员变动数量
  const monthChanges: Record<number, number> = {};
  for (const s of data) {
    if (s.month > 0) {
      monthChanges[s.month] = (monthChanges[s.month] || 0) + 1;
    }
  }

  return (
    <div className="space-y-6">
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
        columns={columns}
        data={directors}
        onAdd={(item) => add({ ...item, month: Number(item.month) || 0 })}
        onUpdate={(id, item) =>
          update(id, { ...item, month: Number(item.month) || 0 })
        }
        onDelete={remove}
        loading={viewMonth === 0 ? loading : loadingEffective}
      />

      <SettingsTable
        title="营业部经理"
        description="管理各营业部经理信息，上级姓名填写所属总监姓名"
        columns={columns}
        data={deptManagers}
        onAdd={(item) => add({ ...item, month: Number(item.month) || 0 })}
        onUpdate={(id, item) =>
          update(id, { ...item, month: Number(item.month) || 0 })
        }
        onDelete={remove}
        loading={viewMonth === 0 ? loading : loadingEffective}
      />

      <SettingsTable
        title="客户经理"
        description="管理各客户经理信息，上级姓名填写所属营业部经理姓名。点击调岗按钮可快速调岗。"
        columns={columns}
        data={customerManagers}
        onAdd={(item) => add({ ...item, month: Number(item.month) || 0 })}
        onUpdate={(id, item) =>
          update(id, { ...item, month: Number(item.month) || 0 })
        }
        onDelete={remove}
        loading={viewMonth === 0 ? loading : loadingEffective}
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
                <label className="text-sm text-muted-foreground">
                  调岗人员
                </label>
                <p className="text-sm font-medium">
                  {transferModal.staff.name}（{transferModal.staff.code}）
                </p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">
                  当前上级
                </label>
                <p className="text-sm font-medium">
                  {transferModal.staff.parentId || "无"}
                </p>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  调入新上级（营业部经理姓名）
                </label>
                <input
                  type="text"
                  value={transferModal.newParentId}
                  onChange={(e) =>
                    setTransferModal({
                      ...transferModal,
                      newParentId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                  placeholder="请输入新上级的姓名"
                />
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
    </div>
  );
}
