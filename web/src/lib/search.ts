"use client";

import { items, parties, workCentres } from "@/lib/data/masters";
import { useSales } from "@/lib/store/sales";

export interface SearchDoc {
  group: string;
  title: string;
  subtitle: string;
  href: string;
}

/** Documents and masters searchable from ⌘K. Domain stores add their documents here. */
export function useSearchDocs(): SearchDoc[] {
  const orders = useSales((s) => s.orders);
  return [
    ...orders.map((o) => ({
      group: "Sales orders",
      title: o.number,
      subtitle: parties.find((p) => p.id === o.customerId)?.name ?? "",
      href: `/sales/orders/${o.id}`,
    })),
    ...items.map((i) => ({ group: "Items", title: i.code, subtitle: i.name, href: `/inventory/items/${i.id}` })),
    ...parties.map((p) => ({
      group: "Parties",
      title: p.name,
      subtitle: `${p.code} · ${p.gstin}`,
      href: p.type.includes("customer") ? `/sales/customers` : `/purchase/vendors`,
    })),
    ...workCentres.map((w) => ({ group: "Work centres", title: w.name, subtitle: w.code, href: `/manufacturing/work-centres` })),
  ];
}
