"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileOutput, X } from "lucide-react";
import { toast } from "sonner";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ItemCell, useItemName } from "@/components/inventory/shared";
import { partyById } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { useInventory } from "@/lib/store/inventory";
import { type Requisition, usePurchase } from "@/lib/store/purchase";
import { cn, daysBetween, formatDate, formatINR, formatNum, TODAY } from "@/lib/utils";

const SOURCE = {
  shortage: { label: "Shortage list", tone: "danger" as const },
  reorder: { label: "Reorder alert", tone: "warning" as const },
  manual: { label: "Manual", tone: "neutral" as const },
};

export default function RequisitionsPage() {
  const role = useRole();
  const router = useRouter();
  const prs = usePurchase((s) => s.requisitions);
  const orders = usePurchase((s) => s.orders);
  const items = useInventory((s) => s.items);
  const { convertPRs, cancelPR } = usePurchase.getState();
  const name = useItemName();
  const it = (id: string) => items.find((i) => i.id === id)!;

  const columns: Column<Requisition>[] = [
    { key: "number", header: "Number", value: (r) => r.number, cell: (r) => <span className="font-mono text-[12.5px] font-medium">{r.number}</span> },
    { key: "date", header: "Raised", value: (r) => r.date, cell: (r) => formatDate(r.date) },
    { key: "item", header: "Item", value: (r) => name(r.itemId), cell: (r) => <ItemCell id={r.itemId} /> },
    { key: "qty", header: "Quantity", align: "right", value: (r) => r.qty, cell: (r) => <span>{formatNum(r.qty)} <span className="text-xs text-ink-3">{it(r.itemId).uom}</span></span> },
    { key: "est", header: "Est. value", align: "right", cost: true, value: (r) => r.qty * it(r.itemId).standardCost, cell: (r) => <span className="text-ink-2">{formatINR(r.qty * it(r.itemId).standardCost)}</span> },
    {
      key: "req",
      header: "Required by",
      value: (r) => r.requiredBy,
      cell: (r) => {
        const d = daysBetween(TODAY, r.requiredBy);
        return <span className={cn(r.status === "open" && d <= 5 && "font-medium text-warning")}>{formatDate(r.requiredBy)}</span>;
      },
    },
    {
      key: "source",
      header: "Source",
      value: (r) => r.source,
      cell: (r) => (
        <div className="flex flex-col items-start gap-0.5">
          <Badge tone={SOURCE[r.source].tone} dot={false}>{SOURCE[r.source].label}</Badge>
          <span className="text-2xs text-ink-3">{r.sourceRef}</span>
        </div>
      ),
    },
    { key: "vendor", header: "Suggested vendor", value: (r) => partyById(r.vendorId).name, cell: (r) => <span className="text-ink-2">{partyById(r.vendorId).name}</span> },
    { key: "by", header: "Requested by", value: (r) => r.requestedBy, cell: (r) => <span className="text-ink-2">{r.requestedBy}</span> },
    {
      key: "status",
      header: "Status",
      value: (r) => r.status,
      cell: (r) =>
        r.status === "converted" ? (
          <Link
            href={`/purchase/orders/${orders.find((o) => o.number === r.poNumber)?.id ?? ""}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success hover:underline"
          >
            {r.poNumber}
          </Link>
        ) : (
          <StatusBadge status={r.status} />
        ),
    },
  ];

  const convert = (rows: Requisition[]) => {
    const open = rows.filter((r) => r.status === "open");
    if (!open.length) return toast.error("Only open requisitions can be converted");
    const created = convertPRs(open.map((r) => r.id), role.user);
    toast.success(`${created.length} draft PO${created.length > 1 ? "s" : ""} created`, {
      description: `${created.join(", ")} · grouped by suggested vendor`,
      action: { label: "Open", onClick: () => router.push("/purchase/orders") },
    });
  };

  return (
    <ListPage
      title="Purchase requisitions"
      crumbs={[{ label: "Purchase", href: "/purchase/orders" }, { label: "Requisitions" }]}
      rows={prs}
      columns={columns}
      search={(r) => `${r.number} ${name(r.itemId)} ${it(r.itemId).code} ${partyById(r.vendorId).name} ${r.sourceRef}`}
      placeholder="Search number, item, vendor, source…"
      defaultFilters={["open"]}
      filters={[
        { key: "open", label: "Open", group: "s", test: (r) => r.status === "open" },
        { key: "converted", label: "Converted to PO", group: "s", test: (r) => r.status === "converted" },
        { key: "cancelled", label: "Cancelled", group: "s", test: (r) => r.status === "cancelled" },
        { key: "short", label: "From shortage list", group: "src", test: (r) => r.source === "shortage" },
        { key: "reorder", label: "From reorder alerts", group: "src", test: (r) => r.source === "reorder" },
      ]}
      groups={[
        { key: "vendor", label: "Suggested vendor", by: (r) => partyById(r.vendorId).name },
        { key: "source", label: "Source", by: (r) => SOURCE[r.source].label },
      ]}
      bulkActions={[
        { label: "Convert to PO", variant: "primary", icon: <FileOutput />, run: convert },
        {
          label: "Cancel",
          variant: "danger",
          icon: <X />,
          run: (rows) => {
            const open = rows.filter((r) => r.status === "open");
            open.forEach((r) => cancelPR(r.id));
            toast(`${open.length} requisition(s) cancelled`);
          },
        },
      ]}
      banner={
        <div className="border-b border-line bg-surface-2 px-4 py-2 text-xs text-ink-3 sm:px-6">
          Select open requisitions and choose <span className="font-medium text-ink-2">Convert to PO</span> — one draft PO is created per suggested vendor.
        </div>
      }
    />
  );
}
