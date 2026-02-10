import { useState } from "react";
import SettingsTable, { ColumnDef } from "@/components/SettingsTable";
import { useSettingsData } from "@/hooks/useSettings";

// ===== 数据类型 =====
interface DirectorTarget {
  id: string;
  name: string;
  month: number;
  qjTarget: number;
  dcTarget: number;
}

interface DeptManagerTarget {
  id: string;
  name: string;
  director: string;
  month: number;
  qjTarget: number;
  dcTarget: number;
}

interface CustomerManagerTarget {
  id: string;
  name: string;
  deptManager: string;
  month: number;
  qjTarget: number;
  dcTarget: number;
}

interface DeptTarget {
  id: string;
  deptName: string;
  month: number;
  qjTarget: number;
  dcTarget: number;
}

interface NetworkTarget {
  id: string;
  networkName: string;
  bankName: string;
  deptManager: string;
  customerManager: string;
  month: number;
  qjTarget: number;
  dcTarget: number;
}

interface PersonTarget {
  id: string;
  name: string;
  zhiji: string;
  weichi: number;
}

interface DailyTarget {
  id: string;
  deptName: string;
  dailyTarget: number;
}

// ===== 月份选项 =====
const monthOptions = [
  { value: "0", label: "全年" },
  { value: "1", label: "1月" },
  { value: "2", label: "2月" },
  { value: "3", label: "3月" },
  { value: "4", label: "4月" },
  { value: "5", label: "5月" },
  { value: "6", label: "6月" },
  { value: "7", label: "7月" },
  { value: "8", label: "8月" },
  { value: "9", label: "9月" },
  { value: "10", label: "10月" },
  { value: "11", label: "11月" },
  { value: "12", label: "12月" },
];

// ===== 列定义 =====
const directorTargetColumns: ColumnDef[] = [
  { key: "name", label: "总监姓名", type: "text", required: true },
  { key: "month", label: "月份", type: "select", options: monthOptions },
  { key: "qjTarget", label: "期交目标（元）", type: "number" },
  { key: "dcTarget", label: "趸交目标（元）", type: "number" },
];

const deptManagerTargetColumns: ColumnDef[] = [
  { key: "name", label: "营业部经理姓名", type: "text", required: true },
  { key: "director", label: "所属总监", type: "text" },
  { key: "month", label: "月份", type: "select", options: monthOptions },
  { key: "qjTarget", label: "期交目标（元）", type: "number" },
  { key: "dcTarget", label: "趸交目标（元）", type: "number" },
];

const customerManagerTargetColumns: ColumnDef[] = [
  { key: "name", label: "客户经理姓名", type: "text", required: true },
  { key: "deptManager", label: "所属营业部经理", type: "text" },
  { key: "month", label: "月份", type: "select", options: monthOptions },
  { key: "qjTarget", label: "期交目标（元）", type: "number" },
  { key: "dcTarget", label: "趸交目标（元）", type: "number" },
];

const deptTargetColumns: ColumnDef[] = [
  { key: "deptName", label: "营业部（经理姓名）", type: "text", required: true },
  { key: "month", label: "月份", type: "select", options: monthOptions },
  { key: "qjTarget", label: "期交目标（元）", type: "number" },
  { key: "dcTarget", label: "趸交目标（元）", type: "number" },
];

const networkTargetColumns: ColumnDef[] = [
  { key: "networkName", label: "网点名称", type: "text", required: true },
  { key: "bankName", label: "银行渠道", type: "text" },
  { key: "deptManager", label: "营业部经理", type: "text" },
  { key: "customerManager", label: "客户经理", type: "text" },
  { key: "month", label: "月份", type: "select", options: monthOptions },
  { key: "qjTarget", label: "期交目标（元）", type: "number" },
  { key: "dcTarget", label: "趸交目标（元）", type: "number" },
];

const personTargetColumns: ColumnDef[] = [
  { key: "name", label: "姓名", type: "text", required: true },
  { key: "zhiji", label: "职级", type: "text" },
  { key: "weichi", label: "维持标保（元）", type: "number" },
];

const dailyTargetColumns: ColumnDef[] = [
  { key: "deptName", label: "营业部（经理姓名）", type: "text", required: true },
  { key: "dailyTarget", label: "日保费底线目标（元）", type: "number" },
];

// ===== 子Tab定义 =====
const subTabs = [
  { id: "director", label: "总监目标", color: "bg-purple-500" },
  { id: "deptManager", label: "营业部经理目标", color: "bg-blue-500" },
  { id: "customerManager", label: "客户经理目标", color: "bg-green-500" },
  { id: "dept", label: "营业部目标", color: "bg-orange-500" },
  { id: "network", label: "网点目标", color: "bg-cyan-500" },
  { id: "person", label: "职级维持标保", color: "bg-gray-500" },
  { id: "daily", label: "日保费底线", color: "bg-red-500" },
];

export default function TargetsTab() {
  const [activeSubTab, setActiveSubTab] = useState("director");

  const directorTargets = useSettingsData<DirectorTarget>("director-targets");
  const deptManagerTargets = useSettingsData<DeptManagerTarget>("dept-manager-targets");
  const customerManagerTargets = useSettingsData<CustomerManagerTarget>("customer-manager-targets");
  const deptTargets = useSettingsData<DeptTarget>("dept-targets");
  const networkTargets = useSettingsData<NetworkTarget>("network-targets");
  const personTargets = useSettingsData<PersonTarget>("person-targets");
  const dailyTargets = useSettingsData<DailyTarget>("daily-targets");

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        管理各层级的业绩目标，支持按月设定期交和趸交目标。层级从上到下依次为：总监 → 营业部经理 → 客户经理 → 营业部 → 网点。
      </div>

      {/* 子Tab导航 */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-border/40">
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                isActive
                  ? `${tab.color} text-white shadow-sm`
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
              {/* 显示数量 */}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                isActive ? "bg-white/20" : "bg-muted-foreground/10"
              }`}>
                {tab.id === "director" && directorTargets.data.length}
                {tab.id === "deptManager" && deptManagerTargets.data.length}
                {tab.id === "customerManager" && customerManagerTargets.data.length}
                {tab.id === "dept" && deptTargets.data.length}
                {tab.id === "network" && networkTargets.data.length}
                {tab.id === "person" && personTargets.data.length}
                {tab.id === "daily" && dailyTargets.data.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* 子Tab内容 */}
      {activeSubTab === "director" && (
        <SettingsTable
          title="总监目标"
          description="设定各总监的月度期交和趸交保费目标，月份选'全年'表示年度总目标"
          columns={directorTargetColumns}
          data={directorTargets.data}
          onAdd={directorTargets.add}
          onUpdate={directorTargets.update}
          onDelete={directorTargets.remove}
          loading={directorTargets.loading}
        />
      )}

      {activeSubTab === "deptManager" && (
        <SettingsTable
          title="营业部经理目标"
          description="设定各营业部经理的月度期交和趸交保费目标，需填写所属总监"
          columns={deptManagerTargetColumns}
          data={deptManagerTargets.data}
          onAdd={deptManagerTargets.add}
          onUpdate={deptManagerTargets.update}
          onDelete={deptManagerTargets.remove}
          loading={deptManagerTargets.loading}
        />
      )}

      {activeSubTab === "customerManager" && (
        <SettingsTable
          title="客户经理目标"
          description="设定各客户经理的月度期交和趸交保费目标，需填写所属营业部经理"
          columns={customerManagerTargetColumns}
          data={customerManagerTargets.data}
          onAdd={customerManagerTargets.add}
          onUpdate={customerManagerTargets.update}
          onDelete={customerManagerTargets.remove}
          loading={customerManagerTargets.loading}
        />
      )}

      {activeSubTab === "dept" && (
        <SettingsTable
          title="营业部目标"
          description="设定各营业部的期交和趸交保费目标，月份选'全年'表示年度目标"
          columns={deptTargetColumns}
          data={deptTargets.data}
          onAdd={deptTargets.add}
          onUpdate={deptTargets.update}
          onDelete={deptTargets.remove}
          loading={deptTargets.loading}
        />
      )}

      {activeSubTab === "network" && (
        <SettingsTable
          title="网点目标"
          description="设定每个网点的月度期交和趸交目标，需填写银行渠道、营业部经理和客户经理"
          columns={networkTargetColumns}
          data={networkTargets.data}
          onAdd={networkTargets.add}
          onUpdate={networkTargets.update}
          onDelete={networkTargets.remove}
          loading={networkTargets.loading}
        />
      )}

      {activeSubTab === "person" && (
        <SettingsTable
          title="个人职级与维持标保"
          description="设定每个人的职级和对应的维持标保要求"
          columns={personTargetColumns}
          data={personTargets.data}
          onAdd={personTargets.add}
          onUpdate={personTargets.update}
          onDelete={personTargets.remove}
          loading={personTargets.loading}
        />
      )}

      {activeSubTab === "daily" && (
        <SettingsTable
          title="日保费底线目标"
          description="设定各营业部的每日保费底线目标（默认10万元）"
          columns={dailyTargetColumns}
          data={dailyTargets.data}
          onAdd={dailyTargets.add}
          onUpdate={dailyTargets.update}
          onDelete={dailyTargets.remove}
          loading={dailyTargets.loading}
        />
      )}
    </div>
  );
}
