"use client";

import { itemById } from "@/lib/data/masters";
import type { SearchDoc } from "@/lib/search";
import { useMfg } from "@/lib/store/manufacturing";

/** Manufacturing documents for the ⌘K palette. */
export function useManufacturingSearchDocs(): SearchDoc[] {
  const wos = useMfg((s) => s.wos);
  const boms = useMfg((s) => s.boms);
  const plans = useMfg((s) => s.plans);
  return [
    ...wos.map((w) => ({
      group: "Work orders",
      title: w.number,
      subtitle: `${itemById(w.itemId).name} × ${w.qty}${w.soNumber ? ` · ${w.soNumber}` : ""}`,
      href: `/manufacturing/work-orders/${w.id}`,
    })),
    ...boms.map((b) => ({
      group: "Bills of materials",
      title: `${b.code} v${b.version}`,
      subtitle: `${itemById(b.itemId).name} · ${b.status}`,
      href: `/manufacturing/boms/${b.id}`,
    })),
    ...plans.map((p) => ({
      group: "Production plans",
      title: p.number,
      subtitle: [...new Set(p.lines.map((l) => l.soNumber))].join(", "),
      href: `/manufacturing/plans/${p.id}`,
    })),
  ];
}
