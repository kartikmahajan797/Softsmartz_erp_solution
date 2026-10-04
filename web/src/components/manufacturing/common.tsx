"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function Progress({ value, max, tone = "primary", className }: { value: number; max: number; tone?: "primary" | "danger" | "warning" | "success"; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const c = { primary: "bg-primary-600", danger: "bg-danger", warning: "bg-accent-500", success: "bg-success" }[tone];
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-surface-3", className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full", c)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Odoo-style component availability. */
export function Availability({ remaining, available }: { remaining: number; available: number }) {
  if (remaining <= 0) return <Badge tone="success">Issued</Badge>;
  if (available >= remaining) return <Badge tone="info">Available</Badge>;
  if (available > 0) return <Badge tone="warning">Partly available</Badge>;
  return <Badge tone="danger">Short</Badge>;
}

export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[12.5px] font-medium", className)}>{children}</span>;
}

/** Variance cell: green when under standard, red when over. */
export function Variance({ std, act }: { std: number; act: number }) {
  if (std === 0 && act === 0) return <span className="text-ink-3">—</span>;
  const v = act - std;
  const pct = std ? (v / std) * 100 : 0;
  return (
    <span className={cn("tabular", v > 0.005 * Math.max(1, std) ? "text-danger" : v < 0 ? "text-success" : "text-ink-2")}>
      {v >= 0 ? "+" : "−"}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export const fmtMin = (m: number) => {
  if (m <= 0) return "—";
  const h = Math.floor(m / 60);
  const mm = Math.round(m % 60);
  return h ? `${h}h ${mm}m` : `${mm}m`;
};
