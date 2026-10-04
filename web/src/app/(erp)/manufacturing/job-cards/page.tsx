"use client";

import Link from "next/link";
import * as React from "react";
import { ExternalLink, Pause, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/overlay";
import { fmtMin, Mono, Progress } from "@/components/manufacturing/common";
import { itemById } from "@/lib/data/masters";
import { useApp } from "@/lib/store/app";
import { itemName, type JobCard, operatorName, useMfg, wcName } from "@/lib/store/manufacturing";
import { formatDateTime, formatNum } from "@/lib/utils";

export default function JobCardsPage() {
  const jcs = useMfg((s) => s.jcs);
  const wos = useMfg((s) => s.wos);
  const wcs = useMfg((s) => s.wcs);
  const boms = useMfg((s) => s.boms);
  const lang = useApp((s) => s.lang);
  const [open, setOpen] = React.useState<JobCard | null>(null);

  const woOf = (j: JobCard) => wos.find((w) => w.id === j.woId)!;
  const opName = (j: JobCard) => {
    const w = woOf(j);
    const r = boms.find((b) => b.id === w.bomId)?.routing.find((x) => x.seq === j.seq);
    return r ? (lang === "hi" ? r.nameHi : r.name) : `Op ${j.seq}`;
  };

  const columns: Column<JobCard>[] = [
    { key: "number", header: "Job card", value: (j) => j.number, cell: (j) => <Mono>{j.number}</Mono> },
    {
      key: "op",
      header: "Operation",
      className: "py-1.5",
      value: (j) => opName(j),
      cell: (j) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{j.seq} · {opName(j)}</div>
          <div className="truncate text-xs text-ink-3">{itemName(woOf(j).itemId, lang)} · {woOf(j).number}</div>
        </div>
      ),
    },
    { key: "wc", header: "Work centre", value: (j) => wcName(j.wcId, wcs), cell: (j) => wcName(j.wcId, wcs, lang) },
    { key: "op2", header: "Operator", value: (j) => operatorName(j.operatorId), cell: (j) => <span className="text-ink-2">{operatorName(j.operatorId)}</span> },
    { key: "good", header: "Good", align: "right", value: (j) => j.good, cell: (j) => formatNum(j.good) },
    { key: "reject", header: "Reject", align: "right", value: (j) => j.reject, cell: (j) => <span className={j.reject ? "text-danger" : "text-ink-3"}>{j.reject}</span> },
    {
      key: "prog",
      header: "Progress",
      sortable: false,
      cell: (j) => (
        <div className="flex w-28 items-center gap-2">
          <Progress value={j.good} max={j.qtyPlanned} className="flex-1" />
          <span className="tabular text-xs text-ink-3">{Math.round((j.good / j.qtyPlanned) * 100)}%</span>
        </div>
      ),
    },
    { key: "time", header: "Time (act/plan)", align: "right", value: (j) => j.actualMin, cell: (j) => <span className="text-xs text-ink-2">{fmtMin(j.actualMin)} / {fmtMin(j.plannedMin)}</span> },
    { key: "status", header: "Status", value: (j) => j.status, cell: (j) => <StatusBadge status={j.status} /> },
  ];

  const setStatus = (j: JobCard, status: JobCard["status"]) => {
    useMfg.setState((s) => ({ jcs: s.jcs.map((x) => (x.id === j.id ? { ...x, status, lastEventAt: `2026-10-02T${new Date().toTimeString().slice(0, 8)}` } : x)) }));
    setOpen((o) => (o ? { ...o, status } : o));
    toast.success(`${j.number} ${status === "running" ? "started" : status === "paused" ? "paused" : "completed"}`, { description: "Supervisor entry · recorded in audit log" });
  };

  return (
    <>
      <ListPage
        title="Job cards"
        crumbs={[{ label: "Manufacturing", href: "/manufacturing/work-orders" }, { label: "Job cards" }]}
        rows={jcs}
        columns={columns}
        search={(j) => `${j.number} ${woOf(j).number} ${operatorName(j.operatorId)} ${wcName(j.wcId, wcs)} ${itemById(woOf(j).itemId).name}`}
        placeholder="Search job card, WO, operator, machine…"
        onRowClick={setOpen}
        defaultFilters={["live"]}
        filters={[
          { key: "live", label: "Open or running", group: "s", test: (j) => j.status !== "completed" },
          { key: "running", label: "Running now", group: "s", test: (j) => j.status === "running" },
          { key: "done", label: "Completed", group: "s", test: (j) => j.status === "completed" },
          { key: "rej", label: "With rejects", group: "q", test: (j) => j.reject > 0 },
        ]}
        groups={[
          { key: "wc", label: "Work centre", by: (j) => wcName(j.wcId, wcs) },
          { key: "wo", label: "Work order", by: (j) => woOf(j).number },
          { key: "op", label: "Operator", by: (j) => operatorName(j.operatorId) },
        ]}
        extraActions={
          <Button onClick={() => window.open("/shopfloor", "_blank")}>
            <ExternalLink /> Operator terminal
          </Button>
        }
      />
      <Sheet
        open={!!open}
        onOpenChange={(o) => !o && setOpen(null)}
        title={open ? <span className="font-mono">{open.number}</span> : ""}
        footer={
          open && open.status !== "completed" ? (
            <>
              {open.status !== "running" && <Button variant="primary" onClick={() => setStatus(open, "running")}><Play /> Start</Button>}
              {open.status === "running" && <Button onClick={() => setStatus(open, "paused")}><Pause /> Pause</Button>}
              <Button onClick={() => setStatus(open, "completed")}><Square /> Complete</Button>
            </>
          ) : undefined
        }
      >
        {open && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{open.seq} · {opName(open)}</div>
                <div className="text-sm text-ink-3">{itemName(woOf(open).itemId, lang)}</div>
              </div>
              <StatusBadge status={open.status} />
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Item label="Work order"><Link className="font-mono text-primary-700 hover:underline" href={`/manufacturing/work-orders/${open.woId}`}>{woOf(open).number}</Link></Item>
              <Item label="Work centre">{wcName(open.wcId, wcs, lang)}</Item>
              <Item label="Operator">{operatorName(open.operatorId)}</Item>
              <Item label="Last event">{open.lastEventAt ? formatDateTime(open.lastEventAt) : "—"}</Item>
              <Item label="Planned time">{fmtMin(open.plannedMin)}</Item>
              <Item label="Actual time">{fmtMin(open.actualMin)}</Item>
            </dl>
            <div className="rounded-lg border border-line p-3">
              <div className="flex justify-between text-sm">
                <span><span className="tabular text-lg font-semibold">{formatNum(open.good)}</span> <span className="text-ink-3">/ {formatNum(open.qtyPlanned)} good</span></span>
                <span className="text-sm text-danger">{open.reject} rejected</span>
              </div>
              <Progress value={open.good} max={open.qtyPlanned} className="mt-2" />
            </div>
            <p className="text-xs text-ink-3">Operators report from the shop-floor terminal. Quantities are append-only events; supervisors correct them with a reversing entry, never by editing.</p>
          </div>
        )}
      </Sheet>
    </>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
