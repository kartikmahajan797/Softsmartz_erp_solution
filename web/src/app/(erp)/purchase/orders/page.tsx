"use client";

import { toast } from "sonner";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { PartyCell } from "@/components/inventory/shared";
import { partyById } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { type PurchaseOrder, PO_APPROVAL_LIMIT, poTotals, usePurchase } from "@/lib/store/purchase";
import { cn, daysBetween, formatDate, formatINR, formatLakh, TODAY } from "@/lib/utils";

const open = (o: PurchaseOrder) => ["approved", "partially_received"].includes(o.status);

export default function PurchaseOrdersPage() {
  const role = useRole();
  const orders = usePurchase((s) => s.orders);
  const setStatus = usePurchase((s) => s.setPOStatus);

  const columns: Column<PurchaseOrder>[] = [
    { key: "number", header: "Number", value: (o) => o.number, cell: (o) => <span className="font-mono text-[12.5px] font-medium">{o.number}</span> },
    { key: "date", header: "Order date", value: (o) => o.date, cell: (o) => formatDate(o.date) },
    { key: "vendor", header: "Vendor", value: (o) => partyById(o.vendorId).name, cell: (o) => <PartyCell id={o.vendorId} sub={o.prNumbers.length ? `From ${o.prNumbers.join(", ")}` : partyById(o.vendorId).city} /> },
    {
      key: "expected",
      header: "Expected",
      value: (o) => o.expectedDate,
      cell: (o) => {
        const d = daysBetween(TODAY, o.expectedDate);
        return <span className={cn(open(o) && d < 0 && "font-medium text-danger")}>{formatDate(o.expectedDate)}{open(o) && d < 0 && <span className="ml-1 text-xs">({-d}d late)</span>}</span>;
      },
    },
    {
      key: "received",
      header: "Received",
      sortable: false,
      cell: (o) => {
        const q = o.lines.reduce((a, l) => a + l.qty, 0);
        const r = o.lines.reduce((a, l) => a + l.received, 0);
        return (
          <div className="flex w-28 items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-primary-600" style={{ width: `${(r / q) * 100}%` }} />
            </div>
            <span className="tabular text-xs text-ink-3">{Math.round((r / q) * 100)}%</span>
          </div>
        );
      },
    },
    { key: "total", header: "Total", align: "right", cost: true, value: (o) => poTotals(o).total, cell: (o) => formatINR(poTotals(o).total), total: (rs) => formatLakh(rs.reduce((a, o) => a + poTotals(o).total, 0)) },
    { key: "status", header: "Status", value: (o) => o.status, cell: (o) => <StatusBadge status={o.status} /> },
  ];

  return (
    <ListPage
      title="Purchase orders"
      subtitle="Vendor orders with approval limits and 3-way match against GRN and bill"
      stats={[
        { label: "To receive", value: orders.filter(open).length, hint: formatLakh(orders.filter(open).reduce((a, o) => a + poTotals(o).total, 0)) + " on order", filter: "open" },
        { label: "Late from vendor", value: orders.filter((o) => open(o) && daysBetween(TODAY, o.expectedDate) < 0).length, hint: "Past expected date", tone: "danger", filter: "late" },
        { label: "Waiting approval", value: orders.filter((o) => o.status === "pending_approval").length, hint: `Above ${formatLakh(PO_APPROVAL_LIMIT)}`, tone: "warning", filter: "approval" },
        { label: "Drafts", value: orders.filter((o) => o.status === "draft").length, hint: "Not yet sent", filter: "draft" },
      ]}
      crumbs={[{ label: "Purchase", href: "/purchase/orders" }, { label: "Purchase orders" }]}
      rows={orders}
      columns={columns}
      search={(o) => `${o.number} ${partyById(o.vendorId).name} ${o.prNumbers.join(" ")}`}
      placeholder="Search number, vendor, requisition…"
      newHref="/purchase/orders/new"
      href={(o) => `/purchase/orders/${o.id}`}
      filters={[
        { key: "approval", label: "Waiting approval", group: "s", test: (o) => o.status === "pending_approval" },
        { key: "open", label: "To receive", group: "s", test: open },
        { key: "draft", label: "Drafts", group: "s", test: (o) => o.status === "draft" },
        { key: "late", label: "Late", group: "d", test: (o) => open(o) && daysBetween(TODAY, o.expectedDate) < 0 },
        { key: "msme", label: "MSME vendors", group: "v", test: (o) => !!partyById(o.vendorId).msme },
      ]}
      groups={[
        { key: "vendor", label: "Vendor", by: (o) => partyById(o.vendorId).name },
        { key: "status", label: "Status", by: (o) => o.status.replace(/_/g, " ") },
      ]}
      kanban={{
        columns: [
          { key: "draft", label: "Draft", tone: "bg-neutral" },
          { key: "pending_approval", label: "Waiting approval", tone: "bg-warning" },
          { key: "approved", label: "Approved", tone: "bg-info" },
          { key: "partially_received", label: "Partly received", tone: "bg-progress" },
          { key: "received", label: "Received", tone: "bg-success" },
        ],
        columnOf: (o) => o.status,
        card: (o) => (
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-medium">{o.number}</span>
              <span className="text-2xs text-ink-3">{formatDate(o.expectedDate)}</span>
            </div>
            <div className="mt-1 text-sm font-medium">{partyById(o.vendorId).name}</div>
            <div className="mt-2 flex items-center justify-between text-xs text-ink-3">
              <span>{o.lines.length} line{o.lines.length > 1 ? "s" : ""}</span>
              {role.seesCost && <span className="tabular font-medium text-ink">{formatLakh(poTotals(o).total)}</span>}
            </div>
          </div>
        ),
      }}
      bulkActions={
        role.approves
          ? [
              {
                label: "Approve",
                variant: "primary",
                run: (rows) => {
                  const pend = rows.filter((r) => r.status === "pending_approval");
                  pend.forEach((r) => setStatus(r.id, "approved", role.user, `Approved (above ${formatINR(PO_APPROVAL_LIMIT)} limit)`, "approved"));
                  toast.success(`${pend.length} PO(s) approved`, { description: pend.length < rows.length ? "Only POs waiting approval were changed" : undefined });
                },
              },
            ]
          : []
      }
    />
  );
}
