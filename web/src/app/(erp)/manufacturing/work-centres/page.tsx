"use client";

import * as React from "react";
import { AlertTriangle, LayoutGrid, List, Power, User, Wrench } from "lucide-react";
import { toast } from "sonner";
import { ControlPanel } from "@/components/erp/control-panel";
import { DataTable, type Column } from "@/components/erp/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/form";
import { Dialog, Tip } from "@/components/ui/overlay";
import { Progress } from "@/components/manufacturing/common";
import type { WorkCentre } from "@/lib/data/masters";
import { useApp, useRole } from "@/lib/store/app";
import { useMfg } from "@/lib/store/manufacturing";
import { cn, formatINR } from "@/lib/utils";

const DOWN_REASONS = ["Machine breakdown", "Spindle / electrical fault", "Tool change / setup", "Power cut", "Preventive maintenance", "No operator"];

export default function WorkCentresPage() {
  const wcs = useMfg((s) => s.wcs);
  const jcs = useMfg((s) => s.jcs);
  const { setWcStatus } = useMfg.getState();
  const lang = useApp((s) => s.lang);
  const role = useRole();
  const [view, setView] = React.useState<"board" | "list">("board");
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState<string[]>([]);
  const [down, setDown] = React.useState<WorkCentre | null>(null);
  const [reason, setReason] = React.useState(DOWN_REASONS[0]);
  const [note, setNote] = React.useState("");

  const rows = wcs.filter(
    (w) =>
      (!q || `${w.name} ${w.code} ${w.type} ${w.operator ?? ""}`.toLowerCase().includes(q.toLowerCase())) &&
      (!active.length || active.includes(w.status)),
  );
  const openJobs = (id: string) => jcs.filter((j) => j.wcId === id && j.status !== "completed").length;

  const toggleDown = (w: WorkCentre) => {
    if (w.status === "down") {
      setWcStatus(w.id, "idle");
      toast.success(`${w.name} is back up`, { description: "Downtime closed · status set to idle until an operator starts a job" });
    } else {
      setDown(w);
      setReason(DOWN_REASONS[0]);
      setNote("");
    }
  };

  const columns: Column<WorkCentre>[] = [
    { key: "code", header: "Code", value: (w) => w.code, cell: (w) => <span className="font-mono text-[12.5px] font-medium">{w.code}</span> },
    { key: "name", header: "Work centre", value: (w) => w.name, cell: (w) => <span className="font-medium">{lang === "hi" ? w.nameHi : w.name}</span> },
    { key: "type", header: "Type", value: (w) => w.type, cell: (w) => w.type },
    { key: "job", header: "Current job", value: (w) => w.currentJob ?? "", cell: (w) => (w.status === "down" ? <span className="text-danger">{w.downReason}</span> : <span className="font-mono text-xs">{w.currentJob ?? "—"}</span>) },
    { key: "op", header: "Operator", value: (w) => w.operator ?? "", cell: (w) => w.operator ?? "—" },
    { key: "open", header: "Open jobs", align: "right", value: (w) => openJobs(w.id), cell: (w) => openJobs(w.id) },
    { key: "util", header: "Utilisation today", value: (w) => w.utilisationToday, cell: (w) => <div className="flex w-32 items-center gap-2"><Progress value={w.utilisationToday} max={100} className="flex-1" tone={w.utilisationToday < 50 ? "warning" : "primary"} /><span className="tabular text-xs text-ink-3">{w.utilisationToday}%</span></div> },
    { key: "lab", header: "Labour ₹/h", align: "right", cost: true, value: (w) => w.labourRate, cell: (w) => formatINR(w.labourRate) },
    { key: "oh", header: "Overhead ₹/h", align: "right", cost: true, value: (w) => w.overheadRate, cell: (w) => formatINR(w.overheadRate) },
    { key: "status", header: "Status", value: (w) => w.status, cell: (w) => <StatusBadge status={w.status} /> },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <ControlPanel
        title="Work centres"
        subtitle="Machines and lines — status is derived from operator job events"
        crumbs={[{ label: "Manufacturing", href: "/manufacturing/work-orders" }, { label: "Work centres" }]}
        query={q}
        onQuery={setQ}
        placeholder="Search machine, type, operator…"
        filters={[
          { key: "running", label: "Running", group: "s" },
          { key: "idle", label: "Idle", group: "s" },
          { key: "down", label: "Down", group: "s" },
        ]}
        activeFilters={active}
        onToggleFilter={(k) => setActive((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]))}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-line-strong p-0.5 shadow-xs" role="group" aria-label="View">
              <Tip label="Status board">
                <button aria-pressed={view === "board"} onClick={() => setView("board")} className={cn("flex size-6 items-center justify-center rounded", view === "board" ? "bg-primary-600 text-white" : "text-ink-3 hover:bg-surface-3")}>
                  <LayoutGrid className="size-3.5" />
                </button>
              </Tip>
              <Tip label="List">
                <button aria-pressed={view === "list"} onClick={() => setView("list")} className={cn("flex size-6 items-center justify-center rounded", view === "list" ? "bg-primary-600 text-white" : "text-ink-3 hover:bg-surface-3")}>
                  <List className="size-3.5" />
                </button>
              </Tip>
            </div>
          </div>
        }
      />

      <div className="flex items-center gap-4 border-b border-line bg-surface px-4 py-2 text-sm sm:px-6">
        {(["running", "idle", "down"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", s === "running" ? "bg-success" : s === "down" ? "bg-danger" : "bg-ink-3")} />
            <span className="tabular font-semibold">{wcs.filter((w) => w.status === s).length}</span>
            <span className="text-ink-3 capitalize">{s}</span>
          </span>
        ))}
        <span className="ml-auto text-xs text-ink-3">Status derived from operator start / pause / stop events</span>
      </div>

      {view === "list" ? (
        <div className="flex-1 bg-surface">
          <DataTable rows={rows} columns={columns.filter((c) => !(c.cost && !role.seesCost))} selectable={false} />
        </div>
      ) : (
        <div className="grid flex-1 content-start gap-3 bg-bg p-4 sm:grid-cols-2 sm:px-6 xl:grid-cols-3 2xl:grid-cols-4">
          {rows.map((w) => (
            <article
              key={w.id}
              className={cn(
                "flex flex-col rounded-xl border bg-surface shadow-xs",
                w.status === "down" ? "border-danger/40" : "border-line",
              )}
            >
              <header className="flex items-start gap-3 border-b border-line px-4 py-3">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                    w.status === "running" ? "bg-success-bg text-success" : w.status === "down" ? "bg-danger-bg text-danger" : "bg-neutral-bg text-neutral",
                  )}
                >
                  {w.code.split("-")[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{lang === "hi" ? w.nameHi : w.name}</div>
                  <div className="font-mono text-2xs text-ink-3">{w.code} · {w.type}</div>
                </div>
                <StatusBadge status={w.status} />
              </header>
              <div className="flex-1 space-y-3 px-4 py-3 text-sm">
                {w.status === "down" ? (
                  <div className="flex items-start gap-2 rounded-md bg-danger-bg px-3 py-2 text-danger">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span className="text-ink">{w.downReason}</span>
                  </div>
                ) : w.status === "running" ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs">{w.currentJob}</span>
                    <span className="flex items-center gap-1 text-xs text-ink-2"><User className="size-3.5" /> {w.operator}</span>
                  </div>
                ) : (
                  <div className="text-xs text-ink-3">No job running · {openJobs(w.id)} open job card(s) queued</div>
                )}
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-ink-3">Utilisation today</span>
                    <span className="tabular font-medium">{w.utilisationToday}%</span>
                  </div>
                  <Progress value={w.utilisationToday} max={100} tone={w.status === "down" ? "danger" : w.utilisationToday < 50 ? "warning" : "primary"} />
                </div>
                {role.seesCost && (
                  <div className="flex justify-between text-xs text-ink-3">
                    <span>Labour {formatINR(w.labourRate)}/h</span>
                    <span>Overhead {formatINR(w.overheadRate)}/h</span>
                  </div>
                )}
              </div>
              <footer className="flex gap-2 border-t border-line px-4 py-2.5">
                <Button size="sm" variant={w.status === "down" ? "primary" : "danger"} onClick={() => toggleDown(w)}>
                  {w.status === "down" ? <><Power /> Mark back up</> : <><Wrench /> Report down</>}
                </Button>
                <span className="ml-auto self-center text-2xs text-ink-3">{openJobs(w.id)} open jobs</span>
              </footer>
            </article>
          ))}
        </div>
      )}

      <Dialog
        open={!!down}
        onOpenChange={(o) => !o && setDown(null)}
        title={`Report ${down?.name} down`}
        description="Running job cards are paused. Downtime feeds utilisation and, from R2, MTTR/MTBF."
        size="sm"
        footer={
          <>
            <Button onClick={() => setDown(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                setWcStatus(down!.id, "down", note ? `${reason} — ${note}` : reason);
                toast.error(`${down!.name} marked down`, { description: "Owner and production head notified on WhatsApp" });
                setDown(null);
              }}
            >
              <Wrench /> Mark down
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Reason" layout="vertical" required htmlFor="reason">
            <Select id="reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              {DOWN_REASONS.map((r) => <option key={r}>{r}</option>)}
            </Select>
          </Field>
          <Field label="Note" layout="vertical" htmlFor="note">
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. maintenance called, ETA 2 hours" />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
