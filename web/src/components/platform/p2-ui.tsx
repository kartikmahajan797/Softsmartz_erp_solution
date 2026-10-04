"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { usePlatform } from "@/lib/store/platform";

export function StatCard({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "success" | "warning" | "danger" | "info";
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3 shadow-xs">
      <div className="flex items-center gap-1.5 text-xs font-medium text-ink-3 [&_svg]:size-3.5">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "tabular mt-1 truncate text-xl font-semibold tracking-tight",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
          tone === "danger" && "text-danger",
          tone === "info" && "text-info",
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 truncate text-xs text-ink-3">{hint}</div>}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: React.ReactNode; count?: number }[];
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-line">
      {options.map((o) => (
        <button
          key={o.key}
          role="tab"
          aria-selected={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "relative -mb-px flex h-9 items-center gap-1.5 border-b-2 px-3 text-sm font-medium whitespace-nowrap",
            value === o.key ? "border-primary-600 text-ink" : "border-transparent text-ink-3 hover:text-ink",
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="rounded-full bg-surface-3 px-1.5 text-xs text-ink-3">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Tenant short name lookup from the platform store. */
export function useTenantName() {
  const tenants = usePlatform((s) => s.tenants);
  return React.useCallback((id?: string) => tenants.find((t) => t.id === id)?.shortName ?? "—", [tenants]);
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-2xs font-semibold text-primary-800", className)}>
      {initials}
    </span>
  );
}

export function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const csv = [header.join(","), ...rows.map((r) => r.map((v) => JSON.stringify(v ?? "")).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename;
  a.click();
}
