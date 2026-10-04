"use client";

import type { SearchDoc } from "@/lib/search";
import { partyById } from "@/lib/data/masters";
import { useFinance } from "@/lib/store/finance";

/** Invoices and payments for the ⌘K palette. */
export function useFinanceSearchDocs(): SearchDoc[] {
  const invoices = useFinance((s) => s.invoices);
  const payments = useFinance((s) => s.payments);
  return [
    ...invoices.map((i) => ({
      group: "Invoices",
      title: i.number,
      subtitle: partyById(i.customerId).name,
      href: `/finance/invoices/${i.id}`,
    })),
    ...payments.map((p) => ({
      group: p.kind === "receipt" ? "Receipts" : "Payments",
      title: p.number,
      subtitle: `${partyById(p.partyId).name} · ${p.reference}`,
      href: `/finance/payments`,
    })),
  ];
}
