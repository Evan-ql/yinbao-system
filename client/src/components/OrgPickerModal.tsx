import { useState } from "react";
import { X, ChevronRight, Building2, Users, Briefcase } from "lucide-react";

interface StaffItem {
  id: string;
  name: string;
  code: string;
  role: string;
  parentId: string;
  status: string;
}

interface OrgPickerModalProps {
  /** 弹窗标题 */
  title?: string;
  /** 当前选中的值 */
  currentValue?: string;
  /** 所有人员数据 */
  allStaff: StaffItem[];
  /** 要展示的类别列表，默认全部 */
  categories?: ("director" | "deptManager" | "direct")[];
  /** 选择回调 */
  onSelect: (value: string) => void;
  /** 关闭回调 */
  onClose: () => void;
}

interface CategoryConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  director: {
    key: "director",
    label: "总监",
    icon: <Briefcase className="w-5 h-5" />,
    color: "text-indigo-700",
    bgColor: "bg-indigo-50 hover:bg-indigo-100",
    borderColor: "border-indigo-200",
    description: "选择所属总监",
  },
  deptManager: {
    key: "deptManager",
    label: "营业部经理",
    icon: <Users className="w-5 h-5" />,
    color: "text-emerald-700",
    bgColor: "bg-emerald-50 hover:bg-emerald-100",
    borderColor: "border-emerald-200",
    description: "选择所属营业部经理",
  },
  direct: {
    key: "direct",
    label: "公司直营",
    icon: <Building2 className="w-5 h-5" />,
    color: "text-blue-700",
    bgColor: "bg-blue-50 hover:bg-blue-100",
    borderColor: "border-blue-200",
    description: "不归属任何上级，直接归入公司直营",
  },
};

export default function OrgPickerModal({
  title = "选择上级",
  currentValue,
  allStaff,
  categories = ["director", "deptManager", "direct"],
  onSelect,
  onClose,
}: OrgPickerModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  // 获取某个类别下的在职人员
  const getStaffByCategory = (cat: string): StaffItem[] => {
    if (cat === "direct") return [];
    return allStaff
      .filter((s) => s.role === cat && s.status === "active")
      .filter((v, i, a) => a.findIndex((x) => x.name === v.name) === i); // 按姓名去重
  };

  // 搜索过滤
  const filteredStaff = selectedCategory
    ? getStaffByCategory(selectedCategory).filter(
        (s) =>
          !searchText ||
          s.name.includes(searchText) ||
          s.code.includes(searchText)
      )
    : [];

  const handleSelectDirect = () => {
    onSelect("公司直营");
  };

  const handleSelectPerson = (name: string) => {
    onSelect(name);
  };

  const handleBack = () => {
    setSelectedCategory(null);
    setSearchText("");
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-[480px] max-w-[90vw] max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div className="flex items-center gap-2">
            {selectedCategory && (
              <button
                onClick={handleBack}
                className="p-1 text-muted-foreground hover:bg-muted rounded mr-1"
                title="返回"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
            )}
            <div>
              <h3 className="text-base font-semibold">{title}</h3>
              {currentValue && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  当前：
                  <span className="font-medium text-foreground">
                    {currentValue}
                  </span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:bg-muted rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="px-5 py-4 overflow-y-auto max-h-[60vh]">
          {!selectedCategory ? (
            /* 第一层：类别选择 */
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground mb-2">
                请选择归属类型：
              </p>
              {categories.map((catKey) => {
                const config = CATEGORY_CONFIGS[catKey];
                if (!config) return null;
                const staffCount =
                  catKey === "direct"
                    ? null
                    : getStaffByCategory(catKey).length;

                return (
                  <button
                    key={catKey}
                    onClick={() => {
                      if (catKey === "direct") {
                        handleSelectDirect();
                      } else {
                        setSelectedCategory(catKey);
                      }
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all ${config.bgColor} ${config.borderColor}`}
                  >
                    <div className={`${config.color}`}>{config.icon}</div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-semibold ${config.color}`}
                        >
                          {config.label}
                        </span>
                        {staffCount !== null && (
                          <span className="text-[10px] text-muted-foreground bg-white/80 px-1.5 py-0.5 rounded">
                            {staffCount} 人
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {config.description}
                      </p>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 ${config.color} opacity-50`}
                    />
                  </button>
                );
              })}
            </div>
          ) : (
            /* 第二层：人员列表 */
            <div>
              {/* 搜索框 */}
              <div className="mb-3">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="搜索姓名或工号..."
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  autoFocus
                />
              </div>

              {/* 人员列表 */}
              <div className="space-y-1">
                {filteredStaff.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    {searchText ? "未找到匹配的人员" : "该类别下暂无在职人员"}
                  </div>
                ) : (
                  filteredStaff.map((s) => {
                    const isSelected = currentValue === s.name;
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleSelectPerson(s.name)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          isSelected
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted/50 border border-transparent"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                            isSelected
                              ? "bg-primary text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {s.name.slice(0, 1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium ${
                                isSelected ? "text-primary" : ""
                              }`}
                            >
                              {s.name}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                当前
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {s.code}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="px-5 py-3 border-t border-border/60 bg-muted/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded-md"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
