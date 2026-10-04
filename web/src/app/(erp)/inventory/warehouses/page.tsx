"use client";

import * as React from "react";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { Badge } from "@/components/ui/badge";
import { WarehouseChip } from "@/components/inventory/shared";
import { warehouses } from "@/lib/data/masters";
import { useInventory } from "@/lib/store/inventory";
import { formatINR, formatLakh } from "@/lib/utils";

const TYPE: Record<string, { label: string; tone: "info" | "progress" | "warning" | "danger" | "brand" }> = {
  stores: { label: "Stores", tone: "info" },
  wip: { label: "Work in progress", tone: "progress" },
  hold: { label: "Quality hold", tone: "warning" },
  scrap: { label: "Scrap", tone: "danger" },
  jobwork: { label: "Job-worker (virtual)", tone: "brand" },
};

type Row = (typeof warehouses)[number] & { items: number; batches: number; value: number };

export default function WarehousesPage() {
  const lots = useInventory((s) => s.lots);
  const rows: Row[] = React.useMemo(
    () =>
      warehouses.map((w) => {
        const mine = lots.filter((l) => l.warehouseId === w.id && l.qty !== 0);
        return { ...w, items: new Set(mine.map((l) => l.itemId)).size, batches: mine.length, value: mine.reduce((a, l) => a + l.qty * l.unitCost, 0) };
      }),
    [lots],
  );

  const columns: Column<Row>[] = [
    { key: "code", header: "Code", value: (w) => w.code, cell: (w) => <WarehouseChip id={w.id} /> },
    { key: "name", header: "Name", value: (w) => w.name, cell: (w) => <span className="font-medium">{w.name}</span> },
    { key: "type", header: "Type", value: (w) => w.type, cell: (w) => <Badge tone={TYPE[w.type].tone} dot={false}>{TYPE[w.type].label}</Badge> },
    { key: "items", header: "Items", align: "right", value: (w) => w.items, cell: (w) => w.items },
    { key: "batches", header: "Stock lines", align: "right", value: (w) => w.batches, cell: (w) => w.batches },
    { key: "value", header: "Stock value", align: "right", cost: true, value: (w) => w.value, cell: (w) => formatINR(w.value), total: (rs) => formatLakh(rs.reduce((a, w) => a + w.value, 0)) },
    {
      key: "note",
      header: "Notes",
      sortable: false,
      cell: (w) => (
        <span className="text-xs text-ink-3">
          {w.type === "jobwork" ? "Stock sent on challan; still owned by you (ITC-04)" : w.type === "hold" ? "Excluded from free stock until accepted" : w.type === "scrap" ? "Valued at recoverable scrap rate" : "Counts towards free stock"}
        </span>
      ),
    },
  ];

  return (
    <ListPage
      title="Warehouses"
      crumbs={[{ label: "Inventory", href: "/inventory/stock" }, { label: "Warehouses" }]}
      rows={rows}
      columns={columns}
      search={(w) => `${w.code} ${w.name} ${w.type}`}
      filters={[
        { key: "own", label: "Own locations", group: "t", test: (w) => w.type !== "jobwork" },
        { key: "jw", label: "Job-worker locations", group: "t", test: (w) => w.type === "jobwork" },
      ]}
      groups={[{ key: "type", label: "Type", by: (w) => TYPE[w.type].label }]}
    />
  );
}
