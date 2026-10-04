"use client";

import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { PartyCell, WarehouseChip, useItemName } from "@/components/inventory/shared";
import { partyById } from "@/lib/data/masters";
import { type GRN, usePurchase } from "@/lib/store/purchase";
import { formatDate, formatNum, TODAY } from "@/lib/utils";

export default function ReceiptsPage() {
  const receipts = usePurchase((s) => s.receipts);
  const orders = usePurchase((s) => s.orders);
  const name = useItemName();
  const poNo = (g: GRN) => orders.find((o) => o.id === g.poId)?.number ?? "—";

  const columns: Column<GRN>[] = [
    { key: "number", header: "Number", value: (g) => g.number, cell: (g) => <span className="font-mono text-[12.5px] font-medium">{g.number}</span> },
    { key: "date", header: "Date", value: (g) => g.date, cell: (g) => formatDate(g.date) },
    { key: "vendor", header: "Vendor", value: (g) => partyById(g.vendorId).name, cell: (g) => <PartyCell id={g.vendorId} sub={`Challan ${g.vendorChallan || "—"}`} /> },
    { key: "po", header: "Purchase order", value: poNo, cell: (g) => <span className="font-mono text-xs">{poNo(g)}</span> },
    { key: "items", header: "Items", sortable: false, cell: (g) => <span className="text-ink-2">{g.lines.map((l) => name(l.itemId)).join(", ")}</span> },
    { key: "wh", header: "Into", value: (g) => g.warehouseId, cell: (g) => <WarehouseChip id={g.warehouseId} /> },
    { key: "acc", header: "Accepted", align: "right", value: (g) => g.lines.reduce((a, l) => a + l.accepted, 0), cell: (g) => formatNum(g.lines.reduce((a, l) => a + l.accepted, 0)) },
    {
      key: "rej",
      header: "Rejected",
      align: "right",
      value: (g) => g.lines.reduce((a, l) => a + l.rejected, 0),
      cell: (g) => {
        const r = g.lines.reduce((a, l) => a + l.rejected, 0);
        return <span className={r ? "font-medium text-danger" : "text-ink-3"}>{r ? formatNum(r) : "—"}</span>;
      },
    },
    { key: "status", header: "Status", value: (g) => g.status, cell: (g) => <StatusBadge status={g.status} /> },
  ];

  return (
    <ListPage
      title="Goods receipts"
      crumbs={[{ label: "Purchase", href: "/purchase/orders" }, { label: "Goods receipts (GRN)" }]}
      rows={receipts}
      columns={columns}
      search={(g) => `${g.number} ${partyById(g.vendorId).name} ${poNo(g)} ${g.vendorChallan} ${g.vehicle}`}
      placeholder="Search GRN, vendor, PO, challan, vehicle…"
      href={(g) => `/purchase/receipts/${g.id}`}
      filters={[
        { key: "draft", label: "Drafts", group: "s", test: (g) => g.status === "draft" },
        { key: "posted", label: "Posted", group: "s", test: (g) => g.status === "posted" },
        { key: "today", label: "Today", group: "d", test: (g) => g.date === TODAY },
        { key: "rej", label: "With rejections", group: "r", test: (g) => g.lines.some((l) => l.rejected > 0) },
      ]}
      groups={[
        { key: "vendor", label: "Vendor", by: (g) => partyById(g.vendorId).name },
        { key: "date", label: "Date", by: (g) => formatDate(g.date) },
      ]}
    />
  );
}
