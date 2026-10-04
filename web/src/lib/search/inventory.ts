"use client";

import type { SearchDoc } from "@/lib/search";
import { partyById } from "@/lib/data/masters";
import { useInventory } from "@/lib/store/inventory";
import { useJobwork } from "@/lib/store/jobwork";
import { usePurchase } from "@/lib/store/purchase";

/** ⌘K documents for Inventory, Purchase and Job-work. */
export function useInventorySearchDocs(): SearchDoc[] {
  const orders = usePurchase((s) => s.orders);
  const receipts = usePurchase((s) => s.receipts);
  const bills = usePurchase((s) => s.bills);
  const challans = useJobwork((s) => s.challans);
  const items = useInventory((s) => s.items);
  return [
    ...orders.map((o) => ({ group: "Purchase orders", title: o.number, subtitle: partyById(o.vendorId).name, href: `/purchase/orders/${o.id}` })),
    ...receipts.map((g) => ({ group: "Goods receipts", title: g.number, subtitle: partyById(g.vendorId).name, href: `/purchase/receipts/${g.id}` })),
    ...bills.map((b) => ({ group: "Purchase bills", title: b.number, subtitle: `${b.vendorBillNo} · ${partyById(b.vendorId).name}`, href: `/purchase/bills/${b.id}` })),
    ...challans.map((c) => ({ group: "Job-work challans", title: c.number, subtitle: `${partyById(c.jobWorkerId).name} · ${c.process}`, href: `/jobwork/challans/${c.id}` })),
    ...items.map((i) => ({ group: "Items", title: i.code, subtitle: i.name, href: `/inventory/items/${i.id}` })),
  ];
}
