"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarCheck2, CheckCircle2, CircleDashed, FileUp, History, Info, Lock, LockOpen, Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Section, SettingsShell } from "@/components/settings/settings-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Dialog } from "@/components/ui/overlay";
import { useRole } from "@/lib/store/app";
import { type FiscalYear, type OpeningBalance, type PeriodStatus, useAdminSettings } from "@/lib/store/admin-settings";
import { cn, formatDate, formatDateTime, formatLakh, formatNum, TODAY } from "@/lib/utils";

const PERIOD_STYLE: Record<PeriodStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  open: { label: "Open", cls: "border-success/30 bg-success-bg text-success", icon: <LockOpen className="size-3.5" /> },
  closed: { label: "Closed", cls: "border-warning/30 bg-warning-bg text-warning", icon: <CalendarCheck2 className="size-3.5" /> },
  locked: { label: "Locked", cls: "border-line-strong bg-surface-3 text-ink-2", icon: <Lock className="size-3.5" /> },
};

const NEXT_STATUS: Record<PeriodStatus, PeriodStatus> = { open: "closed", closed: "open", locked: "locked" };

export default function FiscalSettingsPage() {
  const role = useRole();
  const canEdit = role.key === "owner" || role.key === "accountant";
  const years = useAdminSettings((s) => s.years);
  const lockDate = useAdminSettings((s) => s.lockDate);
  const history = useAdminSettings((s) => s.lockHistory);
  const openings = useAdminSettings((s) => s.openings);
  const setPeriod = useAdminSettings((s) => s.setPeriodStatus);
  const [fyId, setFyId] = React.useState("fy26");
  const [lockOpen, setLockOpen] = React.useState(false);
  const fy = years.find((y) => y.id === fyId)!;
  const current = years.find((y) => y.status === "open")!;

  return (
    <SettingsShell
      title="Financial year & locks"
      actions={canEdit && (
        <Button onClick={() => toast("FY 2027-28 can be created from 1-Mar-2027", { description: "Number series reset automatically on 1 April" })}>
          <Plus /> New financial year
        </Button>
      )}
    >
      <div className="mx-auto max-w-5xl">
        {!canEdit && <p className="mb-4 rounded-lg bg-surface-3 px-4 py-2.5 text-sm text-ink-2">Only the Owner or Accountant can change periods and the lock date.</p>}

        {/* Summary strip */}
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <SummaryTile label="Current financial year" value={current.label} hint={`${formatDate(current.start)} → ${formatDate(current.end)}`} />
          <SummaryTile label="Posting lock date" value={formatDate(lockDate)} hint="No postings on or before this date" icon={<Lock className="size-4 text-ink-3" />} />
          <SummaryTile
            label="Opening balances"
            value={`${openings.filter((o) => o.status === "verified").length} of ${openings.length} verified`}
            hint={openings.some((o) => o.status !== "verified") ? "Review before first month close" : "Ready"}
            tone={openings.some((o) => o.status !== "verified") ? "warning" : "success"}
          />
        </div>

        <Section
          title="Financial years and periods"
          desc="Indian FY runs April to March. Closed periods accept only Owner/Accountant postings; locked periods accept none."
          action={
            <div className="flex rounded-md border border-line-strong p-0.5 shadow-xs" role="group" aria-label="Financial year">
              {years.map((y) => (
                <button
                  key={y.id}
                  onClick={() => setFyId(y.id)}
                  aria-pressed={y.id === fyId}
                  className={cn("rounded px-2.5 py-1 text-xs font-medium", y.id === fyId ? "bg-primary-600 text-white" : "text-ink-2 hover:bg-surface-3")}
                >
                  {y.label}
                </button>
              ))}
            </div>
          }
        >
          <FyHeader fy={fy} />
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {fy.periods.map((p) => {
              const st = PERIOD_STYLE[p.status];
              const lockedByDate = `${p.key}-31` <= lockDate || p.status === "locked";
              const isCurrent = TODAY.startsWith(p.key);
              return (
                <div key={p.key} className={cn("rounded-lg border bg-surface p-3", isCurrent ? "border-primary-500 ring-3 ring-primary-500/10" : "border-line")}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{p.label}</span>
                    {isCurrent && <span className="text-2xs font-medium text-primary-700">Current</span>}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className={cn("inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs font-medium", st.cls)}>
                      {st.icon}
                      {st.label}
                    </span>
                    {canEdit && fy.status === "open" && !lockedByDate && (
                      <button
                        className="text-xs font-medium text-primary-700 hover:underline"
                        onClick={() => {
                          const to = NEXT_STATUS[p.status];
                          setPeriod(fy.id, p.key, to);
                          toast.success(`${p.label} ${to === "closed" ? "closed" : "re-opened"}`, { description: "Recorded in the audit log" });
                        }}
                      >
                        {p.status === "open" ? "Close" : "Re-open"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-3">
            <span className="flex items-center gap-1.5"><LockOpen className="size-3.5 text-success" /> Open — everyone with permission can post</span>
            <span className="flex items-center gap-1.5"><CalendarCheck2 className="size-3.5 text-warning" /> Closed — Owner / Accountant only</span>
            <span className="flex items-center gap-1.5"><Lock className="size-3.5" /> Locked — by lock date, reversal in an open period only</span>
          </div>
        </Section>

        <Section
          title="Posting lock date"
          desc="Stops back-dated invoices, stock movements and payments into filed GST periods. Moving it back needs a reason and is audited."
          action={canEdit && <Button size="sm" onClick={() => setLockOpen(true)}><Lock /> Change lock date</Button>}
        >
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-surface-2 p-4">
            <span className="flex size-10 items-center justify-center rounded-full bg-surface-3 text-ink-2"><Lock className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-ink-3">Books locked up to and including</div>
              <div className="text-lg font-semibold">{formatDate(lockDate)}</div>
            </div>
            <div className="text-xs text-ink-3">
              Last changed {formatDateTime(history[0].at)} by <span className="font-medium text-ink-2">{history[0].user}</span>
            </div>
          </div>
          <h3 className="mt-5 mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-2"><History className="size-3.5" /> Change history</h3>
          <ol className="relative ml-2 border-l border-line">
            {history.map((h) => (
              <li key={h.id} className="relative pb-4 pl-5 last:pb-0">
                <span className="absolute top-1 -left-[5px] size-2.5 rounded-full border-2 border-surface bg-primary-600" />
                <div className="text-sm">
                  <span className="font-medium">{formatDate(h.from)}</span>
                  <span className="mx-1.5 text-ink-3">→</span>
                  <span className="font-medium">{formatDate(h.to)}</span>
                  {h.to < h.from && <Badge tone="warning" className="ml-2">Moved back</Badge>}
                </div>
                <div className="mt-0.5 text-sm text-ink-2">{h.reason}</div>
                <div className="mt-0.5 text-2xs text-ink-3">{h.user} · {formatDateTime(h.at)}</div>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          title="Opening balances"
          desc="Every go-live starts mid-year. Load balances as of the go-live date from Tally or Excel, then verify against the trial balance."
          action={<Link href="/settings/import"><Button size="sm"><FileUp /> Import balances</Button></Link>}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-ink-3">Go-live date</span>
            <span className="font-medium">01-Apr-2026</span>
            <span className="text-ink-3">·</span>
            <span className="text-ink-3">Balances as of</span>
            <span className="font-medium">31-Mar-2026</span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-surface-2 text-xs text-ink-3">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Balance type</th>
                  <th className="px-4 py-2 text-right font-semibold">Records</th>
                  <th className="px-4 py-2 text-right font-semibold">Value</th>
                  <th className="px-4 py-2 text-left font-semibold">Status</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {openings.map((o) => <OpeningRow key={o.key} o={o} canEdit={canEdit} />)}
              </tbody>
            </table>
          </div>
        </Section>

        <div className="mb-4 flex gap-3 rounded-xl border border-info/20 bg-info-bg px-4 py-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-info" />
          <div className="text-ink">
            <span className="font-medium">Costing repost boundary.</span> Back-dated stock movements re-value FIFO layers and weighted-average cost only from the
            first open period ({formatDate(firstOpen(years))}) forward. Movements in locked periods are never re-costed — corrections post in the current period.
          </div>
        </div>
      </div>

      <LockDialog open={lockOpen} onClose={() => setLockOpen(false)} />
    </SettingsShell>
  );
}

function firstOpen(years: FiscalYear[]) {
  const p = years.flatMap((y) => y.periods).find((x) => x.status !== "locked");
  return p ? `${p.key}-01` : TODAY;
}

function SummaryTile({ label, value, hint, icon, tone }: { label: string; value: string; hint: string; icon?: React.ReactNode; tone?: "warning" | "success" }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3 shadow-xs">
      <div className="flex items-center justify-between text-xs font-medium text-ink-3">{label}{icon}</div>
      <div className={cn("mt-1 text-lg font-semibold tracking-tight", tone === "warning" && "text-warning", tone === "success" && "text-success")}>{value}</div>
      <div className="mt-0.5 text-xs text-ink-3">{hint}</div>
    </div>
  );
}

function FyHeader({ fy }: { fy: FiscalYear }) {
  const counts = fy.periods.reduce<Record<string, number>>((a, p) => ({ ...a, [p.status]: (a[p.status] ?? 0) + 1 }), {});
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="text-base font-semibold">{fy.label}</div>
      <Badge tone={fy.status === "open" ? "success" : "neutral"}>{fy.status === "open" ? "Open" : "Closed"}</Badge>
      <span className="text-sm text-ink-3">{formatDate(fy.start)} – {formatDate(fy.end)}</span>
      <span className="ml-auto text-xs text-ink-3">
        {counts.open ?? 0} open · {counts.closed ?? 0} closed · {counts.locked ?? 0} locked
      </span>
    </div>
  );
}

const OB_STATUS: Record<OpeningBalance["status"], React.ReactNode> = {
  verified: <Badge tone="success">Verified</Badge>,
  imported: <Badge tone="warning">Imported · review</Badge>,
  not_started: <Badge tone="neutral">Not started</Badge>,
};

function OpeningRow({ o, canEdit }: { o: OpeningBalance; canEdit: boolean }) {
  const role = useRole();
  const setOpening = useAdminSettings((s) => s.setOpening);
  return (
    <tr className="border-t border-line">
      <td className="px-4 py-3">
        <div className="flex items-start gap-2.5">
          {o.status === "verified" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-ink-3" />}
          <div>
            <div className="font-medium">{o.label}</div>
            <div className="text-xs text-ink-3">{o.detail}</div>
            {o.updatedAt && <div className="mt-0.5 text-2xs text-ink-3">{o.by} · {formatDateTime(o.updatedAt)}</div>}
          </div>
        </div>
      </td>
      <td className="tabular px-4 py-3 text-right">{o.records ? formatNum(o.records) : "—"}</td>
      <td className="tabular px-4 py-3 text-right whitespace-nowrap">{role.seesCost && o.value ? formatLakh(o.value) : "—"}</td>
      <td className="px-4 py-3">{OB_STATUS[o.status]}</td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        {o.status === "not_started" && <Link href="/settings/import" className="text-xs font-medium text-primary-700 hover:underline">Import</Link>}
        {o.status === "imported" && canEdit && (
          <button
            className="text-xs font-medium text-primary-700 hover:underline"
            onClick={() => {
              setOpening(o.key, { status: "verified", updatedAt: new Date().toISOString().slice(0, 19), by: role.user });
              toast.success(`${o.label} marked verified`, { description: "Matched against the 31-Mar-2026 trial balance" });
            }}
          >
            Review & verify
          </button>
        )}
        {o.status === "verified" && <span className="text-xs text-ink-3">Locked</span>}
      </td>
    </tr>
  );
}

function LockDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const role = useRole();
  const lockDate = useAdminSettings((s) => s.lockDate);
  const setLock = useAdminSettings((s) => s.setLockDate);
  const [date, setDate] = React.useState(lockDate);
  const [reason, setReason] = React.useState("");
  const [err, setErr] = React.useState("");
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setDate(lockDate);
      setReason("");
      setErr("");
    }
  }
  const backward = date < lockDate;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Change posting lock date"
      description="Postings dated on or before the lock date are rejected for every user."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!date) return setErr("Choose a date");
              if (date >= TODAY) return setErr("Lock date must be before today");
              if (date === lockDate) return setErr("Lock date is unchanged");
              if (reason.trim().length < 10) return setErr("Give a reason of at least 10 characters — it is stored in the audit log");
              setLock(date, reason.trim(), role.user);
              toast.success(`Books locked up to ${formatDate(date)}`, { description: "Recorded in the audit log" });
              onClose();
            }}
          >
            <Lock /> Confirm lock date
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Current lock date" layout="vertical"><Input value={formatDate(lockDate)} disabled /></Field>
          <Field label="New lock date" required layout="vertical" htmlFor="ld">
            <Input id="ld" type="date" value={date} max={TODAY} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        {backward && (
          <div className="flex gap-2 rounded-md bg-warning-bg px-3 py-2 text-sm text-warning">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <span className="text-ink">Moving the lock date back re-opens filed periods. GST returns already filed for those months cannot be changed — corrections must go through credit/debit notes.</span>
          </div>
        )}
        <Field label="Reason" required layout="vertical" htmlFor="lr" hint="E.g. “August GSTR-3B filed and reconciled”">
          <Textarea id="lr" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is the lock date changing?" />
        </Field>
        {err && <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{err}</p>}
      </div>
    </Dialog>
  );
}
