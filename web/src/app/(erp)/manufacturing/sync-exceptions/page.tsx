"use client";

import * as React from "react";
import { ArrowRightLeft, CheckCircle2, CloudOff, Info, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Banner } from "@/components/erp/form-view";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/form";
import { Sheet } from "@/components/ui/overlay";
import { Mono } from "@/components/manufacturing/common";
import { useRole } from "@/lib/store/app";
import { type ExceptionCode, operatorName, type SyncException, useMfg } from "@/lib/store/manufacturing";
import { cn, formatDateTime } from "@/lib/utils";

const CODES: Record<ExceptionCode, { label: string; help: string }> = {
  QTY_OVER_RELEASED: { label: "Qty over released", help: "Reported good quantity exceeds the released quantity plus tolerance." },
  WO_CLOSED: { label: "Work order closed", help: "The event arrived after its work order was closed; cost is frozen." },
  SEQ_GAP: { label: "Sequence gap", help: "An earlier event from this terminal has not arrived yet; later events are held." },
  CLOCK_DRIFT: { label: "Clock drift", help: "Device time differs from server time beyond the allowed limit." },
};

const lagMin = (x: SyncException) => Math.round((Date.parse(x.receivedAt) - Date.parse(x.deviceTime)) / 60000);
const fmtLag = (m: number) => (m >= 1440 ? `${Math.round(m / 1440)}d` : m >= 60 ? `${Math.round(m / 60)}h` : `${m}m`);

export default function SyncExceptionsPage() {
  const exceptions = useMfg((s) => s.exceptions);
  const jcs = useMfg((s) => s.jcs);
  const role = useRole();
  const [sel, setSel] = React.useState<SyncException | null>(null);
  const [mode, setMode] = React.useState<"apply" | "void" | "reassign" | null>(null);
  const [target, setTarget] = React.useState("");
  const [note, setNote] = React.useState("");
  const [err, setErr] = React.useState("");

  const open = exceptions.filter((x) => x.status === "exception").length;
  const canResolve = role.key === "owner" || role.key === "production";

  const columns: Column<SyncException>[] = [
    { key: "code", header: "Exception", value: (x) => x.code, cell: (x) => <Badge tone={x.status === "exception" ? "danger" : "neutral"} dot={false}>{CODES[x.code].label}</Badge> },
    { key: "jc", header: "Job card", value: (x) => x.jcNumber, cell: (x) => <Mono>{x.jcNumber}</Mono> },
    { key: "type", header: "Event", className: "py-1.5", value: (x) => x.eventType, cell: (x) => <div><div className="text-sm">{x.eventType.replace("_", " ")}</div><div className="text-xs text-ink-3">{x.payload}</div></div> },
    { key: "term", header: "Terminal · seq", value: (x) => x.terminal, cell: (x) => <span className="font-mono text-xs">{x.terminal} · #{x.deviceSeq}</span> },
    { key: "op", header: "Operator", value: (x) => operatorName(x.operatorId), cell: (x) => operatorName(x.operatorId) },
    { key: "dev", header: "Device time", value: (x) => x.deviceTime, cell: (x) => <span className="text-xs">{formatDateTime(x.deviceTime)}</span> },
    { key: "rcv", header: "Received", value: (x) => x.receivedAt, cell: (x) => <span className="text-xs">{formatDateTime(x.receivedAt)} <span className={cn("ml-1", lagMin(x) > 1440 ? "text-danger" : "text-ink-3")}>+{fmtLag(lagMin(x))}</span></span> },
    { key: "status", header: "Status", value: (x) => x.status, cell: (x) => <StatusBadge status={x.status} /> },
  ];

  const pick = (x: SyncException) => {
    setSel(x);
    setMode(null);
    setNote("");
    setTarget("");
    setErr("");
  };

  const resolve = () => {
    if (!sel || !mode) return;
    if (mode === "reassign" && !target) return setErr("Choose the job card to move this event to");
    if (mode !== "apply" && !note.trim() && mode === "void") return setErr("A reason is required to void an event");
    const text =
      mode === "apply" ? `Applied anyway by ${role.user}${note ? ` — ${note}` : ""}` : mode === "void" ? `Voided by ${role.user} — ${note}` : `Reassigned to ${target} by ${role.user}`;
    useMfg.getState().resolveException(sel.id, mode === "void" ? "voided" : "applied", text, mode === "reassign" ? target : undefined);
    toast.success(mode === "void" ? "Event voided" : "Event applied", { description: mode === "void" ? "Kept in the event log, no stock or cost posted" : "Production entry, stock and cost posted" });
    setSel(null);
  };

  return (
    <>
      <ListPage
        title="Sync exceptions"
        crumbs={[{ label: "Manufacturing", href: "/manufacturing/work-orders" }, { label: "Sync exceptions" }]}
        rows={exceptions}
        columns={columns}
        search={(x) => `${x.jcNumber} ${x.terminal} ${operatorName(x.operatorId)} ${CODES[x.code].label} ${x.eventId}`}
        placeholder="Search job card, terminal, operator…"
        onRowClick={pick}
        defaultFilters={["open"]}
        filters={[
          { key: "open", label: "Needs action", group: "s", test: (x) => x.status === "exception" },
          { key: "done", label: "Resolved", group: "s", test: (x) => x.status !== "exception" },
          ...(Object.keys(CODES) as ExceptionCode[]).map((c) => ({ key: c, label: CODES[c].label, group: "c", test: (x: SyncException) => x.code === c })),
        ]}
        groups={[
          { key: "term", label: "Terminal", by: (x) => x.terminal },
          { key: "code", label: "Exception type", by: (x) => CODES[x.code].label },
        ]}
        banner={
          <Banner tone={open ? "warning" : "success"} icon={open ? <CloudOff /> : <CheckCircle2 />}>
            {open
              ? `${open} offline event(s) could not be applied automatically. They are kept, never dropped — apply, void or reassign each one.`
              : "All offline events are applied. Nothing needs action."}
          </Banner>
        }
      />
      <Sheet
        open={!!sel}
        onOpenChange={(o) => !o && setSel(null)}
        title={sel ? CODES[sel.code].label : ""}
        width={520}
        footer={
          sel?.status === "exception" && canResolve ? (
            mode ? (
              <>
                <Button onClick={() => setMode(null)}>Back</Button>
                <Button variant={mode === "void" ? "danger" : "primary"} onClick={resolve}>
                  Confirm {mode === "apply" ? "apply" : mode === "void" ? "void" : "reassign"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="primary" onClick={() => setMode("apply")}><CheckCircle2 /> Apply anyway</Button>
                <Button onClick={() => setMode("reassign")}><ArrowRightLeft /> Reassign</Button>
                <Button variant="danger" onClick={() => setMode("void")}><XCircle /> Void</Button>
              </>
            )
          ) : undefined
        }
      >
        {sel && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg bg-info-bg px-3 py-2.5 text-sm">
              <Info className="mt-0.5 size-4 shrink-0 text-info" />
              <div>
                <div className="text-ink">{sel.detail}</div>
                <div className="mt-0.5 text-xs text-ink-3">{CODES[sel.code].help}</div>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Row label="Event">{sel.eventType.replace("_", " ")}</Row>
              <Row label="Payload">{sel.payload}</Row>
              <Row label="Job card"><Mono>{sel.jcNumber}</Mono></Row>
              <Row label="Operator">{operatorName(sel.operatorId)}</Row>
              <Row label="Terminal">{sel.terminal}</Row>
              <Row label="Device sequence">#{sel.deviceSeq}</Row>
              <Row label="Device time">{formatDateTime(sel.deviceTime)}</Row>
              <Row label="Received">{formatDateTime(sel.receivedAt)}</Row>
              <div className="col-span-2">
                <dt className="text-xs text-ink-3">Event ID (idempotency key)</dt>
                <dd className="mt-0.5 font-mono text-xs break-all">{sel.eventId}</dd>
              </div>
            </dl>
            {sel.resolution && (
              <div className="rounded-lg border border-line px-3 py-2 text-sm">
                <div className="text-xs text-ink-3">Resolution</div>
                <div>{sel.resolution}</div>
              </div>
            )}
            {mode === "reassign" && (
              <Field label="Move to job card" layout="vertical" required htmlFor="tjc">
                <Select id="tjc" value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value="">Select…</option>
                  {jcs.filter((j) => j.status !== "completed" && j.number !== sel.jcNumber && j.wcId !== "jw").map((j) => (
                    <option key={j.id} value={j.number}>{j.number} · op {j.seq}</option>
                  ))}
                </Select>
              </Field>
            )}
            {mode && (
              <Field label={mode === "void" ? "Reason for voiding" : "Note (optional)"} layout="vertical" required={mode === "void"} htmlFor="xnote">
                <Textarea id="xnote" value={note} onChange={(e) => setNote(e.target.value)} placeholder={mode === "void" ? "e.g. duplicate entry, operator confirmed" : "Recorded in the audit log"} />
              </Field>
            )}
            {err && <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{err}</p>}
            {!canResolve && sel.status === "exception" && <p className="text-xs text-ink-3">Only the production head or owner can resolve exceptions.</p>}
          </div>
        )}
      </Sheet>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
