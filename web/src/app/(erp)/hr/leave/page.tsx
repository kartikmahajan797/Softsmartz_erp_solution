"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { Avatar, EmpCell } from "@/components/hr/common";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Dialog, Sheet as SidePanel, Tip } from "@/components/ui/overlay";
import { useRole } from "@/lib/store/app";
import { type Employee, isActive, LEAVE_TYPES, type LeaveRequest, type LeaveType, useHr } from "@/lib/store/hr";
import { cn, daysBetween, formatDate, TODAY } from "@/lib/utils";

const STATUS: Record<LeaveRequest["status"], { tone: Tone; label: string }> = {
  pending: { tone: "warning", label: "Pending" },
  approved: { tone: "success", label: "Approved" },
  rejected: { tone: "danger", label: "Rejected" },
};

const TYPE_TONE: Record<LeaveType, string> = { CL: "bg-info", SL: "bg-danger", EL: "bg-success", LWP: "bg-neutral" };

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

export default function LeavePage() {
  const role = useRole();
  const leave = useHr((s) => s.leave);
  const employees = useHr((s) => s.employees);
  const leaveUsed = useHr((s) => s.leaveUsed);
  const decide = useHr((s) => s.decideLeave);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [comment, setComment] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const emp = (id: string) => employees.find((e) => e.id === id)!;
  const sel = leave.find((l) => l.id === openId);

  const act = (l: LeaveRequest, status: "approved" | "rejected", note?: string) => {
    if (!role.approves) return toast.error("Your role cannot approve leave");
    if (status === "rejected" && !note?.trim()) return toast.error("Add a comment to reject — the employee sees it on WhatsApp");
    decide(l.id, status, role.user, note?.trim() || undefined);
    toast.success(`${l.number} ${status}`, { description: `${emp(l.empId).name} notified on WhatsApp` });
  };

  const onLeaveOn = (d: string) => leave.filter((l) => l.status !== "rejected" && l.from <= d && l.to >= d);
  const pending = leave.filter((l) => l.status === "pending");
  const next30 = leave.filter((l) => l.status === "approved" && l.to >= TODAY && l.from <= addDays(TODAY, 30));

  const columns: Column<LeaveRequest>[] = [
    { key: "number", header: "Request", value: (l) => l.number, cell: (l) => <span className="font-mono text-[12.5px] font-medium">{l.number}</span> },
    { key: "emp", header: "Employee", value: (l) => emp(l.empId).name, cell: (l) => <EmpCell e={emp(l.empId)} sub={emp(l.empId).department} /> },
    { key: "type", header: "Type", value: (l) => l.type, cell: (l) => <span className="inline-flex items-center gap-1.5"><span className={cn("size-2 rounded-full", TYPE_TONE[l.type])} />{LEAVE_TYPES[l.type].label}</span> },
    { key: "dates", header: "Dates", value: (l) => l.from, cell: (l) => <span>{formatDate(l.from)}{l.to !== l.from && <> → {formatDate(l.to)}</>}</span> },
    { key: "days", header: "Days", align: "right", value: (l) => l.days, cell: (l) => l.days },
    { key: "applied", header: "Applied", value: (l) => l.appliedOn, cell: (l) => <span className="text-ink-2">{formatDate(l.appliedOn)}</span> },
    { key: "status", header: "Status", value: (l) => l.status, cell: (l) => <Badge tone={STATUS[l.status].tone}>{STATUS[l.status].label}</Badge> },
    {
      key: "act",
      header: "",
      align: "right",
      sortable: false,
      cell: (l) =>
        l.status === "pending" && role.approves ? (
          <span className="inline-flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Tip label="Approve"><Button size="icon-sm" variant="ghost" className="text-success hover:bg-success-bg" aria-label={`Approve ${l.number}`} onClick={() => act(l, "approved")}><Check /></Button></Tip>
            <Tip label="Reject (needs comment)"><Button size="icon-sm" variant="ghost" className="text-danger hover:bg-danger-bg" aria-label={`Reject ${l.number}`} onClick={() => { setOpenId(l.id); setComment(""); }}><X /></Button></Tip>
          </span>
        ) : null,
    },
  ];

  const strip = Array.from({ length: 21 }, (_, i) => addDays(TODAY, i));

  return (
    <>
      <ListPage
        title="Leave"
        subtitle="Requests from WhatsApp and the office app; approvals notify the employee and update the roster"
        crumbs={[{ label: "People", href: "/hr/employees" }, { label: "Leave" }]}
        rows={leave}
        columns={columns}
        search={(l) => `${l.number} ${emp(l.empId).name} ${emp(l.empId).nameHi} ${l.reason}`}
        placeholder="Search request, employee, reason…"
        onRowClick={(l) => { setOpenId(l.id); setComment(""); }}
        onNew={() => setCreating(true)}
        newLabel="New request"
        stats={[
          { label: "Waiting for approval", value: pending.length, hint: `${pending.reduce((a, l) => a + l.days, 0)} days requested`, tone: "warning", filter: "pending" },
          { label: "Off today", value: onLeaveOn(TODAY).filter((l) => l.status === "approved").length, hint: formatDate(TODAY), filter: "today" },
          { label: "Approved · next 30 days", value: next30.length, hint: `${next30.reduce((a, l) => a + l.days, 0)} person-days`, tone: "success" },
          { label: "Diwali week clash", value: leave.filter((l) => l.status !== "rejected" && l.from <= "2026-10-24" && l.to >= "2026-10-19").length, hint: "19–24 Oct · plan capacity", tone: "info" },
        ]}
        filters={[
          { key: "pending", label: "Pending", group: "s", test: (l) => l.status === "pending" },
          { key: "approved", label: "Approved", group: "s", test: (l) => l.status === "approved" },
          { key: "rejected", label: "Rejected", group: "s", test: (l) => l.status === "rejected" },
          { key: "today", label: "Covers today", group: "d", test: (l) => l.from <= TODAY && l.to >= TODAY && l.status === "approved" },
          { key: "upcoming", label: "Upcoming", group: "d", test: (l) => l.from > TODAY },
        ]}
        groups={[
          { key: "type", label: "Leave type", by: (l) => LEAVE_TYPES[l.type].label },
          { key: "dept", label: "Department", by: (l) => emp(l.empId).department },
          { key: "status", label: "Status", by: (l) => STATUS[l.status].label },
        ]}
        bulkActions={role.approves ? [{ label: "Approve", variant: "primary", icon: <Check className="size-3.5" />, run: (rows) => { const p = rows.filter((r) => r.status === "pending"); p.forEach((l) => decide(l.id, "approved", role.user)); toast.success(`${p.length} request${p.length === 1 ? "" : "s"} approved`); } }] : []}
        banner={
          <div className="border-b border-line bg-surface px-4 py-3 sm:px-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold tracking-wide text-ink-3 uppercase">Team calendar · next 3 weeks</h2>
              <div className="flex gap-3">
                {(["CL", "SL", "EL"] as LeaveType[]).map((t) => <span key={t} className="flex items-center gap-1 text-2xs text-ink-3"><span className={cn("size-2 rounded-full", TYPE_TONE[t])} />{t}</span>)}
                <span className="flex items-center gap-1 text-2xs text-ink-3"><span className="size-2 rounded-full border border-warning bg-warning-bg" />Pending</span>
              </div>
            </div>
            <div className="scroll-thin flex gap-1 overflow-x-auto pb-1">
              {strip.map((d) => {
                const off = onLeaveOn(d);
                const sun = new Date(`${d}T00:00:00Z`).getUTCDay() === 0;
                return (
                  <div key={d} className={cn("flex w-[58px] shrink-0 flex-col rounded-lg border px-1.5 py-1.5", d === TODAY ? "border-primary-500 bg-primary-50/60" : sun ? "border-line bg-surface-3/60" : "border-line")}>
                    <div className={cn("text-center text-2xs", d === TODAY ? "font-semibold text-primary-700" : "text-ink-3")}>
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(`${d}T00:00:00Z`).getUTCDay()]}
                    </div>
                    <div className="text-center text-sm font-semibold">{Number(d.slice(8))}</div>
                    <div className="mt-1 flex min-h-6 flex-wrap justify-center gap-0.5">
                      {off.slice(0, 3).map((l) => (
                        <Tip key={l.id} label={`${emp(l.empId).name} · ${l.type}${l.status === "pending" ? " (pending)" : ""}`}>
                          <span className={cn("rounded-full", l.status === "pending" && "ring-2 ring-warning ring-offset-1")}><Avatar e={emp(l.empId)} size="sm" /></span>
                        </Tip>
                      ))}
                      {off.length > 3 && <span className="text-2xs text-ink-3">+{off.length - 3}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        }
      />

      <SidePanel
        open={!!sel}
        onOpenChange={(o) => !o && setOpenId(null)}
        width={460}
        title={sel ? <span className="font-mono">{sel.number}</span> : ""}
        footer={
          sel?.status === "pending" && role.approves ? (
            <>
              <Button variant="danger" onClick={() => { act(sel, "rejected", comment); if (comment.trim()) setOpenId(null); }}><X /> Reject</Button>
              <Button variant="primary" onClick={() => { act(sel, "approved", comment); setOpenId(null); }}><Check /> Approve</Button>
            </>
          ) : undefined
        }
      >
        {sel && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <EmpCell e={emp(sel.empId)} />
              <Badge tone={STATUS[sel.status].tone}>{STATUS[sel.status].label}</Badge>
            </div>
            <dl className="grid grid-cols-[110px_1fr] gap-y-2.5 text-sm">
              <dt className="text-ink-3">Type</dt><dd>{LEAVE_TYPES[sel.type].label}</dd>
              <dt className="text-ink-3">Dates</dt><dd>{formatDate(sel.from)} → {formatDate(sel.to)} <span className="text-ink-3">· {sel.days} day{sel.days > 1 ? "s" : ""}</span></dd>
              <dt className="text-ink-3">Applied</dt><dd>{formatDate(sel.appliedOn)} <span className="text-ink-3">· {daysBetween(sel.appliedOn, sel.from)} days notice</span></dd>
              <dt className="text-ink-3">Reason</dt><dd>{sel.reason}</dd>
              {sel.decidedBy && (<><dt className="text-ink-3">Decided by</dt><dd>{sel.decidedBy}{sel.comment && <div className="mt-1 rounded-md bg-surface-3 px-2.5 py-1.5 text-xs">{sel.comment}</div>}</dd></>)}
            </dl>
            <Balances e={emp(sel.empId)} used={leaveUsed[sel.empId] ?? {}} highlight={sel.type} />
            <Clash l={sel} others={onLeaveOn} emp={emp} />
            {sel.status === "pending" && role.approves && (
              <Field layout="vertical" label="Comment" hint="Required to reject · sent to the employee" htmlFor="lv-c">
                <Textarea id="lv-c" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="e.g. Approved — hand over VMC jobs to Imran" />
              </Field>
            )}
          </div>
        )}
      </SidePanel>

      <NewLeaveDialog open={creating} onOpenChange={setCreating} employees={employees.filter(isActive)} />
    </>
  );
}

function Balances({ e, used, highlight }: { e: Employee; used: Partial<Record<LeaveType, number>>; highlight: LeaveType }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">Balance · FY 2026-27</div>
      <div className="grid grid-cols-3 gap-2">
        {(["CL", "SL", "EL"] as LeaveType[]).map((t) => {
          const q = LEAVE_TYPES[t].quota;
          const left = q - (used[t] ?? 0);
          return (
            <div key={t} className={cn("rounded-lg border px-3 py-2", t === highlight ? "border-primary-500 bg-primary-50/50" : "border-line")}>
              <div className="text-2xs text-ink-3">{t}</div>
              <div className={cn("tabular text-lg font-semibold", left <= 1 && "text-danger")}>{left}<span className="text-xs font-normal text-ink-3">/{q}</span></div>
            </div>
          );
        })}
      </div>
      {e.type === "contract" && <p className="mt-2 text-xs text-warning">Contract labour — leave is unpaid unless the agency contract says otherwise.</p>}
    </div>
  );
}

function Clash({ l, others, emp }: { l: LeaveRequest; others: (d: string) => LeaveRequest[]; emp: (id: string) => Employee }) {
  const me = emp(l.empId);
  const clash = new Map<string, LeaveRequest>();
  for (let d = l.from; d <= l.to; d = addDays(d, 1)) {
    others(d).filter((o) => o.id !== l.id && emp(o.empId).workCentres.some((w) => me.workCentres.includes(w))).forEach((o) => clash.set(o.id, o));
  }
  if (!me.workCentres.length) return null;
  return clash.size ? (
    <div className="rounded-lg border border-warning/30 bg-warning-bg px-3 py-2 text-sm">
      <span className="font-medium text-warning">Overlap on same machines:</span>{" "}
      {[...clash.values()].map((o) => `${emp(o.empId).name} (${formatDate(o.from)})`).join(", ")}
    </div>
  ) : (
    <div className="rounded-lg border border-success/20 bg-success-bg px-3 py-2 text-sm text-success">No one else certified on the same work centres is off in this period.</div>
  );
}

function NewLeaveDialog({ open, onOpenChange, employees }: { open: boolean; onOpenChange: (o: boolean) => void; employees: Employee[] }) {
  const apply = useHr((s) => s.applyLeave);
  const [f, setF] = React.useState({ empId: employees[0]?.id ?? "", type: "CL" as LeaveType, from: addDays(TODAY, 3), to: addDays(TODAY, 3), reason: "" });
  const [err, setErr] = React.useState<Record<string, string>>({});
  const days = Math.max(0, daysBetween(f.from, f.to) + 1);

  const submit = () => {
    const e: Record<string, string> = {};
    if (f.to < f.from) e.to = "End date is before start date";
    if (f.reason.trim().length < 4) e.reason = "Add a short reason";
    setErr(e);
    if (Object.keys(e).length) return;
    const r = apply({ empId: f.empId, type: f.type, from: f.from, to: f.to, days, reason: f.reason.trim() });
    toast.success(`${r.number} submitted`, { description: "Sent to the production head for approval" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="New leave request" description="On behalf of an employee (operators can also apply on WhatsApp)." footer={<><Button onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="primary" onClick={submit}>Submit request</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field layout="vertical" label="Employee" htmlFor="nl-e" className="sm:col-span-2">
          <Select id="nl-e" value={f.empId} onChange={(e) => setF((x) => ({ ...x, empId: e.target.value }))}>{employees.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.code}</option>)}</Select>
        </Field>
        <Field layout="vertical" label="Leave type" htmlFor="nl-t" className="sm:col-span-2">
          <Select id="nl-t" value={f.type} onChange={(e) => setF((x) => ({ ...x, type: e.target.value as LeaveType }))}>{(Object.keys(LEAVE_TYPES) as LeaveType[]).map((t) => <option key={t} value={t}>{LEAVE_TYPES[t].label} ({t})</option>)}</Select>
        </Field>
        <Field layout="vertical" label="From" htmlFor="nl-f"><Input id="nl-f" type="date" value={f.from} onChange={(e) => setF((x) => ({ ...x, from: e.target.value, to: x.to < e.target.value ? e.target.value : x.to }))} /></Field>
        <Field layout="vertical" label="To" error={err.to} hint={`${days} day${days === 1 ? "" : "s"}`} htmlFor="nl-to"><Input id="nl-to" type="date" aria-invalid={!!err.to} value={f.to} onChange={(e) => setF((x) => ({ ...x, to: e.target.value }))} /></Field>
        <Field layout="vertical" label="Reason" required error={err.reason} htmlFor="nl-r" className="sm:col-span-2"><Textarea id="nl-r" aria-invalid={!!err.reason} value={f.reason} onChange={(e) => setF((x) => ({ ...x, reason: e.target.value }))} /></Field>
      </div>
    </Dialog>
  );
}
