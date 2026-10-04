"use client";

import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { Mono } from "@/components/manufacturing/common";
import { explodePlan, flatten, type Plan, useMfg } from "@/lib/store/manufacturing";
import { formatDate, formatNum } from "@/lib/utils";

export default function PlansPage() {
  const plans = useMfg((s) => s.plans);
  const boms = useMfg((s) => s.boms);

  const shortages = (p: Plan) => flatten(explodePlan(p, boms)).filter((n) => n.shortage > 0).length;

  const columns: Column<Plan>[] = [
    { key: "number", header: "Plan", value: (p) => p.number, cell: (p) => <Mono>{p.number}</Mono> },
    { key: "date", header: "Date", value: (p) => p.date, cell: (p) => formatDate(p.date) },
    {
      key: "orders",
      header: "Sales orders",
      className: "py-1.5",
      value: (p) => [...new Set(p.lines.map((l) => l.soNumber))].join(", "),
      cell: (p) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{[...new Set(p.lines.map((l) => l.customer))].join(", ")}</div>
          <div className="font-mono text-xs text-ink-3">{[...new Set(p.lines.map((l) => l.soNumber))].join(", ")}</div>
        </div>
      ),
    },
    { key: "lines", header: "Demand lines", align: "right", value: (p) => p.lines.length, cell: (p) => p.lines.length },
    { key: "qty", header: "Total qty", align: "right", value: (p) => p.lines.reduce((a, l) => a + l.qty, 0), cell: (p) => formatNum(p.lines.reduce((a, l) => a + l.qty, 0)) },
    {
      key: "short",
      header: "Shortages",
      align: "right",
      value: shortages,
      cell: (p) => {
        const n = shortages(p);
        const raised = Object.keys(p.requisitions).length;
        return n ? (
          <span className="text-danger">
            {n} <span className="text-xs text-ink-3">({raised} PR)</span>
          </span>
        ) : (
          <span className="text-ink-3">None</span>
        );
      },
    },
    { key: "wos", header: "Work orders", align: "right", value: (p) => p.workOrders.length, cell: (p) => p.workOrders.length || "—" },
    { key: "by", header: "Planner", value: (p) => p.createdBy, cell: (p) => p.createdBy },
    { key: "status", header: "Status", value: (p) => p.status, cell: (p) => <StatusBadge status={p.status} /> },
  ];

  return (
    <ListPage
      title="Production plans"
      crumbs={[{ label: "Manufacturing", href: "/manufacturing/work-orders" }, { label: "Production plans" }]}
      rows={plans}
      columns={columns}
      search={(p) => `${p.number} ${p.lines.map((l) => `${l.soNumber} ${l.customer}`).join(" ")}`}
      placeholder="Search plan, sales order, customer…"
      href={(p) => `/manufacturing/plans/${p.id}`}
      filters={[
        { key: "draft", label: "Draft", group: "s", test: (p) => p.status === "draft" },
        { key: "confirmed", label: "Confirmed", group: "s", test: (p) => p.status === "confirmed" },
        { key: "short", label: "With shortages", group: "x", test: (p) => shortages(p) > 0 },
      ]}
      groups={[{ key: "status", label: "Status", by: (p) => p.status }]}
    />
  );
}
