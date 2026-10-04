"use client";

import * as React from "react";
import { Badge, type Tone } from "@/components/ui/badge";
import { itemById, partyById, whById } from "@/lib/data/masters";
import { useApp } from "@/lib/store/app";
import { useInventory } from "@/lib/store/inventory";
import { cn, formatNum } from "@/lib/utils";

/** Item name in the user's language (masters carry a Hindi name, arch G19). */
export function useItemName() {
  const lang = useApp((s) => s.lang);
  const items = useInventory((s) => s.items);
  return React.useCallback(
    (id: string) => {
      const it = items.find((i) => i.id === id) ?? itemById(id);
      return lang === "hi" ? it.nameHi : it.name;
    },
    [lang, items],
  );
}

export function ItemCell({ id, description }: { id: string; description?: string }) {
  const name = useItemName();
  const it = useInventory((s) => s.items.find((i) => i.id === id)) ?? itemById(id);
  return (
    <div className="min-w-0">
      <div className="truncate font-medium">{description ?? name(id)}</div>
      <div className="font-mono text-2xs text-ink-3">{it.code}</div>
    </div>
  );
}

export function PartyCell({ id, sub }: { id: string; sub?: React.ReactNode }) {
  const p = partyById(id);
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="truncate font-medium">{p.name}</span>
        {p.msme && <MsmeBadge />}
      </div>
      <div className="text-xs text-ink-3">{sub ?? p.city}</div>
    </div>
  );
}

export function MsmeBadge() {
  return (
    <span className="rounded border border-progress/25 bg-progress-bg px-1 text-[10px] leading-4 font-semibold tracking-wide text-progress" title="MSME supplier (Udyam registered)">
      MSME
    </span>
  );
}

export function WarehouseChip({ id }: { id: string }) {
  const w = whById(id);
  const jw = w.type === "jobwork";
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded px-1.5 font-mono text-[11px] font-medium",
        jw ? "bg-accent-100 text-[#9a5410]" : w.type === "hold" ? "bg-warning-bg text-warning" : w.type === "scrap" ? "bg-danger-bg text-danger" : "bg-surface-3 text-ink-2",
      )}
      title={w.name}
    >
      {w.code}
    </span>
  );
}

export function SignedQty({ v, uom }: { v: number; uom?: string }) {
  return (
    <span className={cn("tabular font-medium", v > 0 ? "text-success" : v < 0 ? "text-danger" : "text-ink-3")}>
      {v > 0 ? "+" : v < 0 ? "−" : ""}
      {formatNum(Math.abs(v))}
      {uom && <span className="ml-1 text-xs font-normal text-ink-3">{uom}</span>}
    </span>
  );
}

export function StockStatus({ free, reorder }: { free: number; reorder: number }) {
  let tone: Tone = "success";
  let label = "OK";
  if (free < 0) {
    tone = "danger";
    label = "Short";
  } else if (reorder > 0 && free < reorder) {
    tone = "warning";
    label = "Below reorder";
  }
  return <Badge tone={tone}>{label}</Badge>;
}

/** Bordered line table used inside document sheets. */
export function LineTable({ head, children, minWidth = 640 }: { head: React.ReactNode; children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead className="bg-surface-2 text-xs text-ink-2 [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold">{head}</thead>
        <tbody className="[&_td]:px-3 [&_td]:py-2 [&_tr]:border-b [&_tr]:border-line [&_tr:last-child]:border-0">{children}</tbody>
      </table>
    </div>
  );
}

export function DueChip({ days, alertDays = 30 }: { days: number; alertDays?: number }) {
  if (days < 0) return <Badge tone="danger">{-days}d overdue</Badge>;
  if (days <= alertDays) return <Badge tone="warning">{days}d left</Badge>;
  return <Badge tone="neutral" dot={false}>{days > 90 ? `${Math.round(days / 30.4)} mo left` : `${days}d left`}</Badge>;
}
