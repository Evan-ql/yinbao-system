import { ReactNode } from "react";
import { useReport } from "@/contexts/ReportContext";

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
  /** Extra controls to show at the top, e.g., mode toggle */
  extraControls?: ReactNode;
}

export default function DeptSubPageWrapper({ title, description, children, extraControls }: Props) {
  const { reportData } = useReport();

  if (!reportData) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p className="text-sm">请先导入数据</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {(description || extraControls) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {extraControls && (
            <div className="flex items-center gap-3 flex-wrap">
              {extraControls}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
