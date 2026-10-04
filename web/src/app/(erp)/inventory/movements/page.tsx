"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { Banner } from "@/components/erp/form-view";
import { Badge, type Tone } from "@/components/ui/badge";
import { ItemCell, SignedQty, WarehouseChip, useItemName } from "@/components/inventory/shared";
import { whById } from "@/lib/data/masters";
import { MOVEMENT_LABEL, type Movement, type MovementType, useInventory } from "@/lib/store/inventory";
import { daysBetween, formatDateTime, formatINR, formatNum, TODAY } from "@/lib/utils";

const TONE: Record<MovementType, Tone> = {
  opening: "neutral",
  grn: "success",
  issue: "info",
  backflush: "info",
  fg_receipt: "success",
  scrap: "danger",
  transfer_out: "progress",
  transfer_in: "progress",
  jw_out: "brand",
  jw_in: "brand",
  adjustment: "warning",
  count_variance: "warning",
  dispatch: "info",
};

type Row = Movement & { balance: number };

export default function StockLedgerPage() {
  const movements = useInventory((s) => s.movements);
  const lots = useInventory((s) => s.lots);
  const items = useInventory((s) => s.items);
  const name = useItemName();

  // Running balance per item × warehouse, derived backwards from the current balance so it always ties to stock.
  const rows: Row[] = React.useMemo(() => {
    const sorted = [...movements].sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id));
    const bal = new Map<string, number>();
    return sorted.map((m) => {
      const k = `${m.itemId}|${m.warehouseId}`;
      if (!bal.has(k)) bal.set(k, lots.filter((l) => l.itemId === m.itemId && l.warehouseId === m.warehouseId).reduce((a, l) => a + l.qty, 0));
      const after = bal.get(k)!;
      bal.set(k, after - m.qty);
      return { ...m, balance: after };
    });
  }, [movements, lots]);

  const uom = (id: string) => items.find((i) => i.id === id)?.uom ?? "";

  const columns: Column<Row>[] = [
    { key: "at", header: "Posted", value: (m) => m.at, cell: (m) => <span className="tabular whitespace-nowrap text-ink-2">{formatDateTime(m.at)}</span> },
    {
      key: "type",
      header: "Type",
      value: (m) => m.type,
      cell: (m) => (
        <div className="flex flex-col items-start gap-0.5">
          <Badge tone={TONE[m.type]} dot={false}>{MOVEMENT_LABEL[m.type]}</Badge>
          {m.reverses && <span className="text-2xs text-ink-3">Reversal of {m.reverses}</span>}
        </div>
      ),
    },
    { key: "doc", header: "Source document", value: (m) => m.doc, cell: (m) => <span className="font-mono text-xs">{m.doc}</span> },
    { key: "item", header: "Item", value: (m) => name(m.itemId), cell: (m) => <ItemCell id={m.itemId} /> },
    { key: "wh", header: "Warehouse", value: (m) => whById(m.warehouseId).code, cell: (m) => <WarehouseChip id={m.warehouseId} /> },
    { key: "batch", header: "Batch", value: (m) => m.batch, cell: (m) => <span className="font-mono text-xs whitespace-nowrap text-ink-2">{m.batch}</span> },
    { key: "qty", header: "Quantity", align: "right", value: (m) => m.qty, cell: (m) => <span className="whitespace-nowrap"><SignedQty v={m.qty} uom={uom(m.itemId)} /></span> },
    { key: "balance", header: "Balance", align: "right", value: (m) => m.balance, cell: (m) => <span className="tabular text-ink-2">{formatNum(m.balance)}</span> },
    { key: "cost", header: "Unit cost", align: "right", cost: true, value: (m) => m.unitCost, cell: (m) => <span className="text-ink-2">{formatINR(m.unitCost)}</span> },
    { key: "value", header: "Value", align: "right", cost: true, value: (m) => m.qty * m.unitCost, cell: (m) => <span className={m.qty < 0 ? "whitespace-nowrap text-danger" : "whitespace-nowrap"}>{formatINR(m.qty * m.unitCost)}</span> },
    { key: "by", header: "Posted by", value: (m) => m.by, cell: (m) => <span className="whitespace-nowrap text-ink-2">{m.by}</span> },
  ];

  const typeFilters = (Object.keys(MOVEMENT_LABEL) as MovementType[]).map((t) => ({
    key: `t-${t}`,
    label: MOVEMENT_LABEL[t],
    group: "type",
    test: (m: Row) => m.type === t,
  }));

  return (
    <ListPage
      title="Stock ledger"
      crumbs={[{ label: "Inventory", href: "/inventory/stock" }, { label: "Stock ledger" }]}
      rows={rows}
      columns={columns}
      pageSize={25}
      search={(m) => `${m.doc} ${name(m.itemId)} ${items.find((i) => i.id === m.itemId)?.code} ${m.batch} ${m.by}`}
      placeholder="Search document, item, batch, user…"
      banner={
        <Banner tone="info" icon={<ShieldCheck />}>
          Append-only ledger — the single source of stock truth (FR-IN-03). Entries are never edited or deleted; corrections are posted as reversal rows.
        </Banner>
      }
      filters={[
        { key: "today", label: "Today", group: "date", test: (m) => m.at.startsWith(TODAY) },
        { key: "week", label: "Last 7 days", group: "date", test: (m) => daysBetween(m.at, TODAY) <= 7 },
        { key: "in", label: "Inward (+)", group: "dir", test: (m) => m.qty > 0 },
        { key: "out", label: "Outward (−)", group: "dir", test: (m) => m.qty < 0 },
        ...typeFilters,
        { key: "w-rms", label: "Raw Material Stores", group: "wh", test: (m) => m.warehouseId === "w1" },
        { key: "w-fgs", label: "Finished Goods Stores", group: "wh", test: (m) => m.warehouseId === "w3" },
        { key: "w-jw", label: "Job-work warehouses", group: "wh", test: (m) => whById(m.warehouseId).type === "jobwork" },
      ]}
      groups={[
        { key: "item", label: "Item", by: (m) => name(m.itemId) },
        { key: "type", label: "Movement type", by: (m) => MOVEMENT_LABEL[m.type] },
        { key: "wh", label: "Warehouse", by: (m) => whById(m.warehouseId).name },
        { key: "day", label: "Day", by: (m) => m.at.slice(0, 10) },
      ]}
    />
  );
}
