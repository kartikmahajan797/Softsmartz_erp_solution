"use client";

import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { Badge } from "@/components/ui/badge";
import { ItemCell, useItemName } from "@/components/inventory/shared";
import { type StockItem, stockByItem, useInventory } from "@/lib/store/inventory";
import { formatINR, formatNum } from "@/lib/utils";

const TYPE: Record<StockItem["type"], { label: string; tone: "info" | "progress" | "success" | "neutral" }> = {
  raw: { label: "Raw material", tone: "info" },
  wip: { label: "Semi-finished", tone: "progress" },
  fg: { label: "Finished good", tone: "success" },
  consumable: { label: "Consumable", tone: "neutral" },
};

export default function ItemsPage() {
  const items = useInventory((s) => s.items);
  const lots = useInventory((s) => s.lots);
  const name = useItemName();
  const stock = new Map(stockByItem(lots, items).map((r) => [r.item.id, r]));

  const columns: Column<StockItem>[] = [
    { key: "item", header: "Item", value: (i) => i.code, cell: (i) => <ItemCell id={i.id} /> },
    { key: "type", header: "Type", value: (i) => i.type, cell: (i) => <Badge tone={TYPE[i.type].tone} dot={false}>{TYPE[i.type].label}</Badge> },
    { key: "category", header: "Category", value: (i) => i.category, cell: (i) => <span className="text-ink-2">{i.category}</span> },
    { key: "uom", header: "UoM", value: (i) => i.uom, cell: (i) => <span className="text-ink-2">{i.uom}{i.uoms.length > 1 && <span className="ml-1 text-2xs text-ink-3">+{i.uoms.length - 1}</span>}</span> },
    { key: "hsn", header: "HSN", value: (i) => i.hsn, cell: (i) => <span className="font-mono text-xs">{i.hsn}</span> },
    { key: "gst", header: "GST", align: "right", value: (i) => i.gstRate, cell: (i) => `${i.gstRate}%` },
    { key: "valuation", header: "Valuation", value: (i) => i.valuation, cell: (i) => <span className="text-ink-2">{i.valuation}</span> },
    { key: "batch", header: "Batch", value: (i) => (i.batchTracked ? 1 : 0), cell: (i) => (i.batchTracked ? <span className="text-ink-2">Tracked</span> : <span className="text-ink-3">—</span>) },
    { key: "onhand", header: "On hand", align: "right", value: (i) => stock.get(i.id)?.onHand ?? 0, cell: (i) => <span>{formatNum(stock.get(i.id)?.onHand ?? 0)} <span className="text-xs text-ink-3">{i.uom}</span></span> },
    { key: "std", header: "Std cost", align: "right", cost: true, value: (i) => i.standardCost, cell: (i) => formatINR(i.standardCost) },
  ];

  return (
    <ListPage
      title="Items"
      crumbs={[{ label: "Inventory", href: "/inventory/stock" }, { label: "Items" }]}
      rows={items}
      columns={columns}
      search={(i) => `${i.code} ${i.name} ${i.nameHi} ${i.category} ${i.hsn}`}
      placeholder="Search code, name (English / हिन्दी), HSN…"
      href={(i) => `/inventory/items/${i.id}`}
      newHref="/inventory/items/new"
      filters={[
        { key: "raw", label: "Raw material", group: "t", test: (i) => i.type === "raw" },
        { key: "wip", label: "Semi-finished", group: "t", test: (i) => i.type === "wip" },
        { key: "fg", label: "Finished goods", group: "t", test: (i) => i.type === "fg" },
        { key: "cons", label: "Consumables", group: "t", test: (i) => i.type === "consumable" },
        { key: "batch", label: "Batch tracked", group: "b", test: (i) => i.batchTracked },
        { key: "fifo", label: "FIFO", group: "v", test: (i) => i.valuation === "FIFO" },
        { key: "wa", label: "Weighted average", group: "v", test: (i) => i.valuation === "Weighted avg" },
        { key: "hsn4", label: "HSN shorter than 6 digits", group: "h", test: (i) => i.hsn.length < 6 },
      ]}
      groups={[
        { key: "type", label: "Item type", by: (i) => TYPE[i.type].label },
        { key: "category", label: "Category", by: (i) => i.category },
        { key: "gst", label: "GST rate", by: (i) => `${i.gstRate}%` },
      ]}
      kanban={{
        columns: [
          { key: "raw", label: "Raw material", tone: "bg-info" },
          { key: "wip", label: "Semi-finished", tone: "bg-progress" },
          { key: "fg", label: "Finished goods", tone: "bg-success" },
          { key: "consumable", label: "Consumables", tone: "bg-neutral" },
        ],
        columnOf: (i) => i.type,
        card: (i) => (
          <div>
            <div className="font-mono text-xs text-ink-3">{i.code}</div>
            <div className="mt-0.5 text-sm font-medium">{name(i.id)}</div>
            <div className="mt-2 flex items-center justify-between text-xs text-ink-3">
              <span>HSN {i.hsn} · {i.gstRate}%</span>
              <span className="tabular font-medium text-ink">{formatNum(stock.get(i.id)?.onHand ?? 0)} {i.uom}</span>
            </div>
          </div>
        ),
      }}
    />
  );
}
