"use client";

import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Mono } from "@/components/manufacturing/common";
import { itemById } from "@/lib/data/masters";
import { useApp } from "@/lib/store/app";
import { type Bom, itemName, stdCost, useMfg } from "@/lib/store/manufacturing";
import { formatDate, formatINR } from "@/lib/utils";

export default function BomsPage() {
  const boms = useMfg((s) => s.boms);
  const lang = useApp((s) => s.lang);

  const columns: Column<Bom>[] = [
    { key: "code", header: "BOM", value: (b) => `${b.code} ${b.version}`, cell: (b) => <Mono>{b.code}</Mono> },
    {
      key: "item",
      header: "Product",
      className: "py-1.5",
      value: (b) => itemById(b.itemId).name,
      cell: (b) => (
        <div>
          <div className="font-medium">{itemName(b.itemId, lang)}</div>
          <div className="font-mono text-2xs text-ink-3">{itemById(b.itemId).code}</div>
        </div>
      ),
    },
    { key: "version", header: "Version", align: "center", value: (b) => b.version, cell: (b) => <Badge tone="brand" dot={false}>v{b.version}</Badge> },
    { key: "type", header: "Type", value: (b) => itemById(b.itemId).type, cell: (b) => (itemById(b.itemId).type === "wip" ? <Badge tone="progress" dot={false}>Sub-assembly</Badge> : <Badge tone="neutral" dot={false}>Finished good</Badge>) },
    { key: "lines", header: "Components", align: "right", value: (b) => b.lines.length, cell: (b) => b.lines.length },
    { key: "ops", header: "Operations", align: "right", value: (b) => b.routing.length, cell: (b) => b.routing.length },
    { key: "byp", header: "By-products", align: "right", value: (b) => b.outputs.filter((o) => !o.isMain).length, cell: (b) => b.outputs.filter((o) => !o.isMain).length || "—" },
    { key: "cost", header: "Std cost / unit", align: "right", cost: true, value: (b) => stdCost(b, boms).total, cell: (b) => formatINR(stdCost(b, boms).total) },
    { key: "eff", header: "Effective from", value: (b) => b.effectiveFrom, cell: (b) => formatDate(b.effectiveFrom) },
    { key: "status", header: "Status", value: (b) => b.status, cell: (b) => <StatusBadge status={b.status} /> },
  ];

  return (
    <ListPage
      title="Bills of materials"
      crumbs={[{ label: "Manufacturing", href: "/manufacturing/work-orders" }, { label: "Bills of materials" }]}
      rows={boms}
      columns={columns}
      search={(b) => `${b.code} ${itemById(b.itemId).name} ${itemById(b.itemId).code}`}
      placeholder="Search BOM, product…"
      href={(b) => `/manufacturing/boms/${b.id}`}
      defaultFilters={["active"]}
      filters={[
        { key: "active", label: "Active versions", group: "s", test: (b) => b.status === "active" },
        { key: "draft", label: "Draft versions", group: "s", test: (b) => b.status === "draft" },
        { key: "obs", label: "Obsolete", group: "s", test: (b) => b.status === "obsolete" },
        { key: "byp", label: "Has by-products", group: "x", test: (b) => b.outputs.some((o) => !o.isMain) },
        { key: "jw", label: "Has job-work operation", group: "x", test: (b) => b.routing.some((r) => r.wcId === "jw") },
      ]}
      groups={[
        { key: "item", label: "Product", by: (b) => itemById(b.itemId).name },
        { key: "status", label: "Status", by: (b) => b.status },
      ]}
    />
  );
}
