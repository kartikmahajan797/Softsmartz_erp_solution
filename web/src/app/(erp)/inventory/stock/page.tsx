"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, History, SlidersHorizontal } from "lucide-react";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/overlay";
import { ItemCell, StockStatus, WarehouseChip, useItemName } from "@/components/inventory/shared";
import { whById } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { type Lot, stockByItem, useInventory } from "@/lib/store/inventory";
import { cn, formatDate, formatINR, formatLakh, formatNum } from "@/lib/utils";

type Row = ReturnType<typeof stockByItem>[number] & { id: string };
type LotRow = Lot & { code: string; category: string; uom: string };

export default function StockOverviewPage() {
  const role = useRole();
  const router = useRouter();
  const items = useInventory((s) => s.items);
  const lots = useInventory((s) => s.lots);
  const name = useItemName();
  const [mode, setMode] = React.useState<"item" | "lot">("item");
  const [open, setOpen] = React.useState<Row | null>(null);

  const rows: Row[] = React.useMemo(() => stockByItem(lots, items).map((r) => ({ ...r, id: r.item.id })), [lots, items]);
  const lotRows: LotRow[] = React.useMemo(
    () =>
      lots
        .filter((l) => l.qty !== 0)
        .map((l) => {
          const it = items.find((i) => i.id === l.itemId)!;
          return { ...l, code: it.code, category: it.category, uom: it.uom };
        }),
    [lots, items],
  );

  const toggle = (
    <div className="flex rounded-md border border-line-strong p-0.5 text-xs shadow-xs" role="group" aria-label="View by">
      {(["item", "lot"] as const).map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          aria-pressed={mode === m}
          className={cn("h-6 rounded px-2 font-medium", mode === m ? "bg-primary-600 text-white" : "text-ink-2 hover:bg-surface-3")}
        >
          {m === "item" ? "By item" : "By warehouse & batch"}
        </button>
      ))}
    </div>
  );

  const extra = (
    <>
      {toggle}
      <Button size="md" className="hidden md:inline-flex" onClick={() => router.push("/inventory/adjustments")}><ArrowLeftRight /> Transfer</Button>
    </>
  );

  const itemCols: Column<Row>[] = [
    { key: "item", header: "Item", value: (r) => r.item.code, cell: (r) => <ItemCell id={r.item.id} /> },
    { key: "category", header: "Category", value: (r) => r.item.category, cell: (r) => <span className="text-ink-2">{r.item.category}</span> },
    {
      key: "where",
      header: "Locations",
      sortable: false,
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {[...new Set(r.lots.map((l) => l.warehouseId))].map((w) => (
            <WarehouseChip key={w} id={w} />
          ))}
        </div>
      ),
    },
    { key: "onhand", header: "On hand", align: "right", value: (r) => r.onHand, cell: (r) => <span>{formatNum(r.onHand)} <span className="text-xs text-ink-3">{r.item.uom}</span></span> },
    { key: "reserved", header: "Reserved", align: "right", value: (r) => r.reserved, cell: (r) => <span className="text-ink-2">{formatNum(r.reserved)}</span> },
    {
      key: "free",
      header: "Free",
      align: "right",
      value: (r) => r.free,
      cell: (r) => <span className={cn("font-semibold", r.free < 0 ? "text-danger" : r.item.reorderLevel && r.free < r.item.reorderLevel ? "text-warning" : "")}>{formatNum(r.free)}</span>,
    },
    { key: "reorder", header: "Reorder at", align: "right", value: (r) => r.item.reorderLevel, cell: (r) => <span className="text-ink-3">{r.item.reorderLevel ? formatNum(r.item.reorderLevel) : "—"}</span> },
    { key: "qc", header: "QC hold", align: "right", value: (r) => r.qcHold, cell: (r) => (r.qcHold ? <span className="text-warning">{formatNum(r.qcHold)}</span> : <span className="text-ink-3">—</span>) },
    { key: "jw", header: "At job-worker", align: "right", value: (r) => r.atJw, cell: (r) => (r.atJw ? <span className="text-[#9a5410]">{formatNum(r.atJw)}</span> : <span className="text-ink-3">—</span>) },
    { key: "value", header: "Value", align: "right", cost: true, value: (r) => r.value, cell: (r) => formatINR(r.value), total: (rs) => formatLakh(rs.reduce((a, r) => a + r.value, 0)) },
    { key: "status", header: "Status", value: (r) => (r.free < 0 ? 0 : r.item.reorderLevel && r.free < r.item.reorderLevel ? 1 : 2), cell: (r) => <StockStatus free={r.free} reorder={r.item.reorderLevel} /> },
  ];

  const lotCols: Column<LotRow>[] = [
    { key: "wh", header: "Warehouse", value: (l) => whById(l.warehouseId).name, cell: (l) => <div className="flex items-center gap-2"><WarehouseChip id={l.warehouseId} /><span className="text-ink-2">{whById(l.warehouseId).name}</span></div> },
    { key: "item", header: "Item", value: (l) => l.code, cell: (l) => <ItemCell id={l.itemId} /> },
    { key: "batch", header: "Batch / lot", value: (l) => l.batch, cell: (l) => <span className="font-mono text-xs">{l.batch}</span> },
    { key: "received", header: "Received on", value: (l) => l.receivedOn, cell: (l) => formatDate(l.receivedOn) },
    { key: "qty", header: "Quantity", align: "right", value: (l) => l.qty, cell: (l) => <span>{formatNum(l.qty)} <span className="text-xs text-ink-3">{l.uom}</span></span> },
    { key: "cost", header: "Unit cost", align: "right", cost: true, value: (l) => l.unitCost, cell: (l) => formatINR(l.unitCost) },
    { key: "value", header: "Value", align: "right", cost: true, value: (l) => l.qty * l.unitCost, cell: (l) => formatINR(l.qty * l.unitCost), total: (rs) => formatLakh(rs.reduce((a, l) => a + l.qty * l.unitCost, 0)) },
  ];

  return (
    <>
      {mode === "item" ? (
        <ListPage
          key="item"
          title="Stock overview"
          crumbs={[{ label: "Inventory", href: "/inventory/stock" }, { label: "Stock overview" }]}
          rows={rows}
          columns={itemCols}
          search={(r) => `${r.item.code} ${r.item.name} ${r.item.nameHi} ${r.item.category}`}
          placeholder="Search item code, name, category…"
          onRowClick={setOpen}
          extraActions={extra}
          filters={[
            { key: "short", label: "Short for orders", group: "s", test: (r) => r.free < 0 },
            { key: "below", label: "Below reorder level", group: "s", test: (r) => r.item.reorderLevel > 0 && r.free < r.item.reorderLevel },
            { key: "jw", label: "Stock at job-workers", group: "w", test: (r) => r.atJw > 0 },
            { key: "raw", label: "Raw material", group: "t", test: (r) => r.item.type === "raw" },
            { key: "wip", label: "Semi-finished", group: "t", test: (r) => r.item.type === "wip" },
            { key: "fg", label: "Finished goods", group: "t", test: (r) => r.item.type === "fg" },
            { key: "cons", label: "Consumables", group: "t", test: (r) => r.item.type === "consumable" },
          ]}
          groups={[
            { key: "category", label: "Category", by: (r) => r.item.category },
            { key: "type", label: "Item type", by: (r) => ({ raw: "Raw material", wip: "Semi-finished", fg: "Finished goods", consumable: "Consumables" })[r.item.type] },
          ]}
        />
      ) : (
        <ListPage
          key="lot"
          title="Stock overview"
          crumbs={[{ label: "Inventory", href: "/inventory/stock" }, { label: "Stock by warehouse & batch" }]}
          rows={lotRows}
          columns={lotCols}
          search={(l) => `${l.code} ${name(l.itemId)} ${l.batch} ${whById(l.warehouseId).name}`}
          placeholder="Search item, batch, warehouse…"
          extraActions={extra}
          filters={[
            { key: "own", label: "Own stores", group: "w", test: (l) => ["stores", "wip"].includes(whById(l.warehouseId).type) },
            { key: "hold", label: "QC hold", group: "w", test: (l) => l.warehouseId === "w4" },
            { key: "jw", label: "At job-workers", group: "w", test: (l) => whById(l.warehouseId).type === "jobwork" },
            { key: "scrap", label: "Scrap yard", group: "w", test: (l) => l.warehouseId === "w5" },
          ]}
          groups={[
            { key: "wh", label: "Warehouse", by: (l) => whById(l.warehouseId).name },
            { key: "category", label: "Category", by: (l) => l.category },
          ]}
        />
      )}

      <Sheet
        open={!!open}
        onOpenChange={(o) => !o && setOpen(null)}
        width={520}
        title={open ? <span className="font-mono">{open.item.code}</span> : ""}
        footer={
          open && (
            <>
              <Button onClick={() => router.push("/inventory/movements")}><History /> Stock ledger</Button>
              <Button variant="primary" onClick={() => router.push(`/inventory/items/${open.item.id}`)}><SlidersHorizontal /> Open item</Button>
            </>
          )
        }
      >
        {open && (
          <div className="space-y-5">
            <div>
              <div className="text-lg font-semibold">{name(open.item.id)}</div>
              <div className="text-sm text-ink-3">{open.item.category} · HSN {open.item.hsn} · {open.item.valuation}</div>
            </div>
            <dl className="grid grid-cols-3 overflow-hidden rounded-lg border border-line text-center">
              {[
                ["On hand", open.onHand],
                ["Reserved", open.reserved],
                ["Free", open.free],
              ].map(([l, v]) => (
                <div key={l as string} className="border-r border-line p-3 last:border-0">
                  <dt className="text-xs text-ink-3">{l}</dt>
                  <dd className={cn("tabular mt-0.5 text-lg font-semibold", l === "Free" && (v as number) < 0 && "text-danger")}>{formatNum(v as number)}</dd>
                </div>
              ))}
            </dl>
            <div>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">By warehouse and batch</h3>
              <table className="w-full text-sm">
                <thead className="text-xs text-ink-3">
                  <tr className="border-b border-line">
                    <th className="py-1.5 text-left font-medium">Warehouse</th>
                    <th className="py-1.5 text-left font-medium">Batch</th>
                    <th className="py-1.5 text-right font-medium">Qty</th>
                    {role.seesCost && <th className="py-1.5 text-right font-medium">Value</th>}
                  </tr>
                </thead>
                <tbody>
                  {open.lots.map((l) => (
                    <tr key={l.id} className="border-b border-line">
                      <td className="py-2"><div className="flex items-center gap-2"><WarehouseChip id={l.warehouseId} /><span className="text-xs text-ink-2">{whById(l.warehouseId).name}</span></div></td>
                      <td className="py-2 font-mono text-xs">{l.batch}</td>
                      <td className="tabular py-2 text-right font-medium">{formatNum(l.qty)}</td>
                      {role.seesCost && <td className="tabular py-2 text-right text-ink-2">{formatINR(l.qty * l.unitCost)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
              {open.item.valuation === "FIFO" && open.lots.length > 1 && (
                <p className="mt-2 text-xs text-ink-3">FIFO: issues consume the oldest batch first.</p>
              )}
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}
