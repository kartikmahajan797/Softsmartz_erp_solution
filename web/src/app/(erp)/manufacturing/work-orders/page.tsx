"use client";

import { toast } from "sonner";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { Mono, Progress } from "@/components/manufacturing/common";
import { itemById } from "@/lib/data/masters";
import { useApp, useRole } from "@/lib/store/app";
import { itemName, useMfg, type WorkOrder } from "@/lib/store/manufacturing";
import { cn, daysBetween, formatDate, formatNum, TODAY } from "@/lib/utils";

const active = (w: WorkOrder) => ["released", "in_progress"].includes(w.status);
const late = (w: WorkOrder) => active(w) && daysBetween(TODAY, w.plannedEnd) < 0;

export default function WorkOrdersPage() {
  const wos = useMfg((s) => s.wos);
  const jcs = useMfg((s) => s.jcs);
  const boms = useMfg((s) => s.boms);
  const { releaseWo } = useMfg.getState();
  const lang = useApp((s) => s.lang);
  const role = useRole();

  const wcsOf = (w: WorkOrder) => jcs.filter((j) => j.woId === w.id).map((j) => j.wcId);

  const columns: Column<WorkOrder>[] = [
    { key: "number", header: "Reference", value: (w) => w.number, cell: (w) => <Mono>{w.number}</Mono> },
    {
      key: "item",
      header: "Product",
      className: "py-1.5",
      value: (w) => itemById(w.itemId).name,
      cell: (w) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{itemName(w.itemId, lang)}</div>
          <div className="font-mono text-2xs text-ink-3">{itemById(w.itemId).code} · {boms.find((b) => b.id === w.bomId)?.code} v{boms.find((b) => b.id === w.bomId)?.version}</div>
        </div>
      ),
    },
    { key: "so", header: "Source", value: (w) => w.soNumber ?? w.parentWo ?? "", cell: (w) => <span className="font-mono text-xs text-ink-2">{w.soNumber ?? (w.parentWo ? `for ${w.parentWo}` : "Make to stock")}</span> },
    { key: "qty", header: "Qty", align: "right", value: (w) => w.qty, cell: (w) => formatNum(w.qty) },
    {
      key: "progress",
      header: "Produced",
      sortable: false,
      cell: (w) => (
        <div className="flex w-32 items-center gap-2">
          <Progress value={w.produced} max={w.qty} className="flex-1" />
          <span className="tabular text-xs text-ink-3">{Math.round((w.produced / w.qty) * 100)}%</span>
        </div>
      ),
    },
    { key: "start", header: "Start", value: (w) => w.plannedStart, cell: (w) => formatDate(w.plannedStart) },
    {
      key: "end",
      header: "Deadline",
      value: (w) => w.plannedEnd,
      cell: (w) => (
        <span className={cn(late(w) && "font-medium text-danger")}>
          {formatDate(w.plannedEnd)}
          {late(w) && <span className="ml-1 text-xs">({-daysBetween(TODAY, w.plannedEnd)}d late)</span>}
        </span>
      ),
    },
    { key: "status", header: "Status", value: (w) => w.status, cell: (w) => <StatusBadge status={w.status} /> },
  ];

  return (
    <ListPage
      title="Work orders"
      subtitle="Released against pinned BOM and routing versions; progress from shop-floor events"
      stats={[
        { label: "In production", value: wos.filter(active).length, hint: `${formatNum(wos.filter(active).reduce((a, w) => a + w.produced, 0))} pcs produced so far`, filter: "active" },
        { label: "Late", value: wos.filter(late).length, hint: "Past planned end", tone: "danger", filter: "late" },
        { label: "Due in 7 days", value: wos.filter((w) => active(w) && daysBetween(TODAY, w.plannedEnd) >= 0 && daysBetween(TODAY, w.plannedEnd) <= 7).length, hint: "Watch capacity", tone: "info", filter: "wk" },
        { label: "Drafts", value: wos.filter((w) => w.status === "draft").length, hint: "Ready to release", filter: "draft" },
      ]}
      crumbs={[{ label: "Manufacturing", href: "/manufacturing/work-orders" }, { label: "Work orders" }]}
      rows={wos}
      columns={columns}
      search={(w) => `${w.number} ${itemById(w.itemId).name} ${itemById(w.itemId).code} ${w.soNumber ?? ""}`}
      placeholder="Search WO, product, sales order…"
      href={(w) => `/manufacturing/work-orders/${w.id}`}
      newLabel="New"
      onNew={() => toast("Create work orders from a production plan", { description: "Manufacturing → Production plans → Create work orders" })}
      defaultFilters={[]}
      filters={[
        { key: "active", label: "In production", group: "s", test: active },
        { key: "draft", label: "Draft", group: "s", test: (w) => w.status === "draft" },
        { key: "done", label: "Completed or closed", group: "s", test: (w) => ["completed", "closed"].includes(w.status) },
        { key: "late", label: "Late", group: "d", test: late },
        { key: "wk", label: "Due in 7 days", group: "d", test: (w) => active(w) && daysBetween(TODAY, w.plannedEnd) <= 7 },
        { key: "cnc", label: "Uses CNC lathes", group: "wc", test: (w) => wcsOf(w).some((c) => c === "wc1" || c === "wc2") },
        { key: "press", label: "Uses press shop", group: "wc", test: (w) => wcsOf(w).includes("wc4") },
        { key: "jw", label: "Has job-work operation", group: "wc", test: (w) => wcsOf(w).includes("jw") },
      ]}
      groups={[
        { key: "status", label: "Status", by: (w) => w.status.replace(/_/g, " ") },
        { key: "item", label: "Product", by: (w) => itemById(w.itemId).name },
        { key: "so", label: "Sales order", by: (w) => w.soNumber ?? "No sales order" },
      ]}
      kanban={{
        columns: [
          { key: "draft", label: "Draft", tone: "bg-neutral" },
          { key: "released", label: "Released", tone: "bg-info" },
          { key: "in_progress", label: "In progress", tone: "bg-progress" },
          { key: "completed", label: "Completed", tone: "bg-success" },
          { key: "closed", label: "Closed", tone: "bg-ink-3" },
        ],
        columnOf: (w) => w.status,
        card: (w) => (
          <div>
            <div className="flex items-center justify-between">
              <Mono className="text-xs">{w.number}</Mono>
              <span className={cn("text-2xs", late(w) ? "font-medium text-danger" : "text-ink-3")}>{formatDate(w.plannedEnd)}</span>
            </div>
            <div className="mt-1 text-sm font-medium">{itemName(w.itemId, lang)}</div>
            <div className="mt-0.5 font-mono text-2xs text-ink-3">{w.soNumber ?? w.parentWo ?? "Make to stock"}</div>
            <div className="mt-2 flex items-center gap-2">
              <Progress value={w.produced} max={w.qty} className="flex-1" />
              <span className="tabular text-2xs text-ink-2">{formatNum(w.produced)}/{formatNum(w.qty)}</span>
            </div>
          </div>
        ),
      }}
      bulkActions={
        role.key === "owner" || role.key === "production"
          ? [
              {
                label: "Release drafts",
                variant: "primary",
                run: (rows) => {
                  const drafts = rows.filter((r) => r.status === "draft");
                  drafts.forEach((r) => releaseWo(r.id, role.user));
                  toast.success(`${drafts.length} work order(s) released`, { description: drafts.length < rows.length ? "Only drafts can be released" : "Job cards created" });
                },
              },
            ]
          : []
      }
    />
  );
}
