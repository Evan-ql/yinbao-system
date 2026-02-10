export function fmt(v: number): string {
  if (v === 0) return "0";
  if (Math.abs(v) >= 10000) return (v / 10000).toFixed(1) + "万";
  return v.toLocaleString();
}

export function pct(v: number): string {
  return (v * 100).toFixed(0) + "%";
}

export const thCls = "py-2 px-2 text-muted-foreground font-medium text-xs whitespace-nowrap";
export const tdCls = "py-1.5 px-2 text-xs";
export const monoR = "py-1.5 px-2 text-right font-mono text-xs";
export const rowHover = "border-b border-border/50 hover:bg-accent/50 transition-colors";
export const totalRow = "border-t-2 border-primary/30 font-bold bg-primary/5";

// Light-theme friendly colors
export const colorPositive = "text-emerald-600";
export const colorNegative = "text-rose-600";
export const colorHighlight = "text-amber-600";
export const colorInfo = "text-blue-600";
