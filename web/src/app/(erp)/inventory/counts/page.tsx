"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/form";
import { Dialog } from "@/components/ui/overlay";
import { WarehouseChip } from "@/components/inventory/shared";
import { warehouses, whById } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { type CountSession, useInventory } from "@/lib/store/inventory";
import { formatDate, formatINR } from "@/lib/utils";

function countVarianceValue(c: CountSession, avgCost: (id: string) => number) {
  return c.lines.reduce((a, l) => a + ((l.counted ?? l.system) - l.system) * avgCost(l.itemId), 0);
}

export default function CountsPage() {
  const role = useRole();
  const router = useRouter();
  const counts = useInventory((s) => s.counts);
  const items = useInventory((s) => s.items);
  const newCount = useInventory((s) => s.newCount);
  const [open, setOpen] = React.useState(false);
  const [wh, setWh] = React.useState("w1");
  const cost = (id: string) => items.find((i) => i.id === id)?.avgCost ?? 0;

  const columns: Column<CountSession>[] = [
    { key: "number", header: "Number", value: (c) => c.number, cell: (c) => <span className="font-mono text-[12.5px] font-medium">{c.number}</span> },
    { key: "date", header: "Date", value: (c) => c.date, cell: (c) => formatDate(c.date) },
    { key: "wh", header: "Warehouse", value: (c) => whById(c.warehouseId).name, cell: (c) => <div className="flex items-center gap-2"><WarehouseChip id={c.warehouseId} /><span className="text-ink-2">{whById(c.warehouseId).name}</span></div> },
    {
      key: "progress",
      header: "Counted",
      sortable: false,
      cell: (c) => {
        const done = c.lines.filter((l) => l.counted !== null).length;
        return (
          <div className="flex w-32 items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-primary-600" style={{ width: `${(done / Math.max(1, c.lines.length)) * 100}%` }} />
            </div>
            <span className="tabular text-xs text-ink-3">{done}/{c.lines.length}</span>
          </div>
        );
      },
    },
    { key: "mode", header: "Mode", value: (c) => (c.blind ? "Blind" : "Open"), cell: (c) => <span className="text-ink-2">{c.blind ? "Blind count" : "Open count"}</span> },
    {
      key: "variance",
      header: "Variance value",
      align: "right",
      cost: true,
      value: (c) => countVarianceValue(c, cost),
      cell: (c) => {
        const v = countVarianceValue(c, cost);
        return <span className={v < 0 ? "text-danger" : v > 0 ? "text-success" : "text-ink-3"}>{formatINR(v)}</span>;
      },
    },
    { key: "by", header: "Counted by", value: (c) => c.countedBy, cell: (c) => <span className="text-ink-2">{c.countedBy}</span> },
    { key: "status", header: "Status", value: (c) => c.status, cell: (c) => <StatusBadge status={c.status} /> },
  ];

  return (
    <>
      <ListPage
        title="Stock counts"
        crumbs={[{ label: "Inventory", href: "/inventory/stock" }, { label: "Stock counts" }]}
        rows={counts}
        columns={columns}
        search={(c) => `${c.number} ${whById(c.warehouseId).name} ${c.countedBy}`}
        href={(c) => `/inventory/counts/${c.id}`}
        onNew={() => setOpen(true)}
        newLabel="Start count"
        filters={[
          { key: "open", label: "In progress", group: "s", test: (c) => c.status === "counting" },
          { key: "review", label: "Waiting review", group: "s", test: (c) => c.status === "submitted" || c.status === "approved" },
          { key: "posted", label: "Posted", group: "s", test: (c) => c.status === "posted" },
        ]}
        groups={[{ key: "wh", label: "Warehouse", by: (c) => whById(c.warehouseId).name }]}
      />
      <Dialog
        open={open}
        onOpenChange={setOpen}
        size="sm"
        title="Start a stock count"
        description="Creates count lines for every batch in the warehouse with its current system quantity."
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                const c = newCount(wh, role.user);
                toast.success(`${c.number} started`, { description: `${c.lines.length} lines · blind count on` });
                setOpen(false);
                router.push(`/inventory/counts/${c.id}`);
              }}
            >
              <ClipboardList /> Start counting
            </Button>
          </>
        }
      >
        <Field label="Warehouse" layout="vertical" htmlFor="cnt-wh">
          <Select id="cnt-wh" value={wh} onChange={(e) => setWh(e.target.value)}>
            {warehouses.filter((w) => w.type !== "jobwork").map((w) => (
              <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
            ))}
          </Select>
        </Field>
      </Dialog>
    </>
  );
}
