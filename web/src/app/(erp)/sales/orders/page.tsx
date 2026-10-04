"use client";

import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { partyById } from "@/lib/data/masters";
import { type SalesOrder, soTotals, useSales } from "@/lib/store/sales";
import { cn, daysBetween, formatDate, formatINR, formatLakh, TODAY } from "@/lib/utils";
import { toast } from "sonner";
import { useRole } from "@/lib/store/app";

const open = (o: SalesOrder) => ["confirmed", "partially_delivered", "pending_approval"].includes(o.status);

export default function SalesOrdersPage() {
  const orders = useSales((s) => s.orders);
  const setStatus = useSales((s) => s.setStatus);
  const role = useRole();

  const columns: Column<SalesOrder>[] = [
    { key: "number", header: "Number", value: (o) => o.number, cell: (o) => <span className="font-mono text-[12.5px] font-medium">{o.number}</span> },
    { key: "date", header: "Order date", value: (o) => o.date, cell: (o) => formatDate(o.date) },
    {
      key: "customer",
      header: "Customer",
      value: (o) => partyById(o.customerId).name,
      cell: (o) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{partyById(o.customerId).name}</div>
          <div className="text-xs text-ink-3">{o.customerPo || "No customer PO"}</div>
        </div>
      ),
    },
    {
      key: "due",
      header: "Delivery date",
      value: (o) => o.deliveryDate,
      cell: (o) => {
        const d = daysBetween(TODAY, o.deliveryDate);
        return (
          <span className={cn(open(o) && d < 0 && "font-medium text-danger", open(o) && d >= 0 && d <= 7 && "text-warning")}>
            {formatDate(o.deliveryDate)}
            {open(o) && d < 0 && <span className="ml-1 text-xs">({-d}d late)</span>}
          </span>
        );
      },
    },
    {
      key: "progress",
      header: "Delivered",
      sortable: false,
      cell: (o) => {
        const q = o.lines.reduce((a, l) => a + l.qty, 0);
        const d = o.lines.reduce((a, l) => a + l.delivered, 0);
        return (
          <div className="flex w-28 items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-primary-600" style={{ width: `${(d / q) * 100}%` }} />
            </div>
            <span className="tabular text-xs text-ink-3">{Math.round((d / q) * 100)}%</span>
          </div>
        );
      },
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      value: (o) => soTotals(o).total,
      cell: (o) => formatINR(soTotals(o).total),
      total: (rows) => formatLakh(rows.reduce((a, o) => a + soTotals(o).total, 0)),
    },
    { key: "status", header: "Status", value: (o) => o.status, cell: (o) => <StatusBadge status={o.status} /> },
  ];

  return (
    <ListPage
      title="Sales orders"
      subtitle="Customer orders from confirmation to dispatch — credit limit checked on confirm"
      stats={[
        { label: "Open orders", value: orders.filter(open).length, hint: formatLakh(orders.filter(open).reduce((a, o) => a + soTotals(o).total, 0)) + " order value", filter: "open" },
        { label: "Due in 7 days", value: orders.filter((o) => open(o) && daysBetween(TODAY, o.deliveryDate) >= 0 && daysBetween(TODAY, o.deliveryDate) <= 7).length, hint: "Plan dispatch", tone: "info", filter: "week" },
        { label: "Late", value: orders.filter((o) => open(o) && daysBetween(TODAY, o.deliveryDate) < 0).length, hint: "Past delivery date", tone: "danger", filter: "late" },
        { label: "Waiting approval", value: orders.filter((o) => o.status === "pending_approval").length, hint: "Credit or discount rule", tone: "warning", filter: "approval" },
      ]}
      crumbs={[{ label: "Sales", href: "/sales/orders" }, { label: "Sales orders" }]}
      rows={orders}
      columns={columns}
      search={(o) => `${o.number} ${partyById(o.customerId).name} ${o.customerPo}`}
      placeholder="Search number, customer, customer PO…"
      newHref="/sales/orders/new"
      href={(o) => `/sales/orders/${o.id}`}
      filters={[
        { key: "open", label: "Open orders", group: "state", test: open },
        { key: "draft", label: "Drafts", group: "state", test: (o) => o.status === "draft" },
        { key: "approval", label: "Waiting approval", group: "state", test: (o) => o.status === "pending_approval" },
        { key: "late", label: "Late", group: "due", test: (o) => open(o) && daysBetween(TODAY, o.deliveryDate) < 0 },
        { key: "week", label: "Due in 7 days", group: "due", test: (o) => open(o) && daysBetween(TODAY, o.deliveryDate) <= 7 },
        { key: "interstate", label: "Inter-state (IGST)", group: "tax", test: (o) => soTotals(o).interstate },
      ]}
      groups={[
        { key: "customer", label: "Customer", by: (o) => partyById(o.customerId).name },
        { key: "status", label: "Status", by: (o) => o.status.replace(/_/g, " ") },
        { key: "month", label: "Order month", by: (o) => o.date.slice(0, 7) },
      ]}
      kanban={{
        columns: [
          { key: "draft", label: "Draft", tone: "bg-neutral" },
          { key: "pending_approval", label: "Waiting approval", tone: "bg-warning" },
          { key: "confirmed", label: "Confirmed", tone: "bg-info" },
          { key: "partially_delivered", label: "Partly delivered", tone: "bg-progress" },
          { key: "delivered", label: "Delivered", tone: "bg-success" },
        ],
        columnOf: (o) => o.status,
        card: (o) => {
          const d = daysBetween(TODAY, o.deliveryDate);
          return (
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-medium">{o.number}</span>
                <span className={cn("text-2xs", open(o) && d < 0 ? "font-medium text-danger" : "text-ink-3")}>{formatDate(o.deliveryDate)}</span>
              </div>
              <div className="mt-1 text-sm font-medium">{partyById(o.customerId).name}</div>
              <div className="mt-2 flex items-center justify-between text-xs text-ink-3">
                <span>{o.lines.length} line{o.lines.length > 1 ? "s" : ""}</span>
                <span className="tabular font-medium text-ink">{formatLakh(soTotals(o).total)}</span>
              </div>
            </div>
          );
        },
      }}
      bulkActions={
        role.approves
          ? [
              {
                label: "Confirm drafts",
                variant: "primary",
                run: (rows) => {
                  const drafts = rows.filter((r) => r.status === "draft");
                  drafts.forEach((r) => setStatus(r.id, "confirmed", role.user, "Confirmed (bulk)"));
                  toast.success(`${drafts.length} order(s) confirmed`, { description: drafts.length < rows.length ? "Only drafts can be confirmed" : undefined });
                },
              },
            ]
          : []
      }
    />
  );
}
