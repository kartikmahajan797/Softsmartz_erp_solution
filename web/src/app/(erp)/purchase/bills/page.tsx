"use client";

import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { PartyCell } from "@/components/inventory/shared";
import { partyById } from "@/lib/data/masters";
import { type PurchaseBill, billMatched, billTotals, usePurchase } from "@/lib/store/purchase";
import { cn, daysBetween, formatDate, formatINR, formatLakh, TODAY } from "@/lib/utils";

export default function BillsPage() {
  const bills = usePurchase((s) => s.bills);
  const orders = usePurchase((s) => s.orders);
  const poNo = (b: PurchaseBill) => orders.find((o) => o.id === b.poId)?.number ?? "—";

  const columns: Column<PurchaseBill>[] = [
    { key: "number", header: "Number", value: (b) => b.number, cell: (b) => <span className="font-mono text-[12.5px] font-medium">{b.number}</span> },
    { key: "vbill", header: "Vendor bill no.", value: (b) => b.vendorBillNo, cell: (b) => <span className="font-mono text-xs">{b.vendorBillNo}</span> },
    { key: "vendor", header: "Vendor", value: (b) => partyById(b.vendorId).name, cell: (b) => <PartyCell id={b.vendorId} /> },
    { key: "date", header: "Bill date", value: (b) => b.date, cell: (b) => formatDate(b.date) },
    {
      key: "due",
      header: "Due",
      value: (b) => b.dueDate,
      cell: (b) => {
        const d = daysBetween(TODAY, b.dueDate);
        return <span className={cn(b.status === "posted" && d <= 7 && "font-medium text-warning")}>{formatDate(b.dueDate)}</span>;
      },
    },
    { key: "docs", header: "PO / GRN", sortable: false, cell: (b) => <div className="font-mono text-2xs text-ink-2"><div>{poNo(b)}</div><div>{b.grnNumbers.join(", ")}</div></div> },
    {
      key: "match",
      header: "3-way match",
      value: (b) => (billMatched(b) ? 1 : 0),
      cell: (b) => (billMatched(b) ? <Badge tone="success">Matched</Badge> : <Badge tone="danger">Mismatch</Badge>),
    },
    { key: "total", header: "Total", align: "right", cost: true, value: (b) => billTotals(b).total, cell: (b) => formatINR(billTotals(b).total), total: (rs) => formatLakh(rs.reduce((a, b) => a + billTotals(b).total, 0)) },
    { key: "status", header: "Status", value: (b) => b.status, cell: (b) => <StatusBadge status={b.status} /> },
  ];

  return (
    <ListPage
      title="Purchase bills"
      crumbs={[{ label: "Purchase", href: "/purchase/orders" }, { label: "Purchase bills" }]}
      rows={bills}
      columns={columns}
      search={(b) => `${b.number} ${b.vendorBillNo} ${partyById(b.vendorId).name} ${poNo(b)} ${b.grnNumbers.join(" ")}`}
      placeholder="Search bill, vendor bill no., vendor, PO…"
      href={(b) => `/purchase/bills/${b.id}`}
      filters={[
        { key: "mismatch", label: "Match exceptions", group: "m", test: (b) => !billMatched(b) },
        { key: "hold", label: "Held for approval", group: "s", test: (b) => b.status === "pending_approval" },
        { key: "draft", label: "To post", group: "s", test: (b) => ["draft", "matched", "mismatch"].includes(b.status) },
        { key: "posted", label: "Posted", group: "s", test: (b) => b.status === "posted" },
      ]}
      groups={[
        { key: "vendor", label: "Vendor", by: (b) => partyById(b.vendorId).name },
        { key: "status", label: "Status", by: (b) => b.status.replace(/_/g, " ") },
      ]}
    />
  );
}
