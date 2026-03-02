/**
 * 通用导出按钮组件
 */
interface ExportButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export default function ExportButton({ onClick, label = "导出", className = "" }: ExportButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium 
        bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200
        transition-colors ${className}`}
      title="导出Excel"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {label}
    </button>
  );
}
