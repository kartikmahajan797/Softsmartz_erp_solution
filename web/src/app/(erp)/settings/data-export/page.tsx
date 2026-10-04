"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Clock, Database, Download, FileSpreadsheet, FileText, HardDrive, Loader2, PackageOpen, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Section, SettingsShell } from "@/components/settings/settings-shell";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Dialog } from "@/components/ui/overlay";
import { company } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { type ExportJob, useAdmin } from "@/lib/store/admin";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

const MODULES = [
  { key: "Masters", desc: "Items, parties, BOMs, warehouses, work centres", rows: "4,812" },
  { key: "Sales", desc: "Quotations, orders, challans, returns", rows: "6,140" },
  { key: "Purchase", desc: "Requisitions, POs, GRNs, bills", rows: "5,377" },
  { key: "Inventory", desc: "Stock ledger, batches, counts", rows: "61,208" },
  { key: "Manufacturing", desc: "Plans, work orders, job cards, production entries", rows: "38,915" },
  { key: "Job-work", desc: "Challans out and in, ITC-04 data", rows: "1,026" },
  { key: "Finance & GST", desc: "Invoices, notes, payments, ledger, e-invoice log", rows: "12,664" },
  { key: "Audit log", desc: "Every change with user, device and hash", rows: "48,229" },
];

const FORMATS: { key: ExportJob["format"]; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: "Excel", label: "Excel (.xlsx)", desc: "One workbook per module, one sheet per table", icon: <FileSpreadsheet /> },
  { key: "CSV", label: "CSV (zip)", desc: "Plain files for any database or BI tool", icon: <FileText /> },
  { key: "Tally XML", label: "Tally XML", desc: "Masters and vouchers for Tally Prime import", icon: <Database /> },
];

const JOB_STATUS: Record<ExportJob["status"], { tone: Tone; label: string }> = {
  queued: { tone: "neutral", label: "Queued" },
  running: { tone: "progress", label: "Preparing" },
  ready: { tone: "success", label: "Ready" },
  expired: { tone: "neutral", label: "Expired" },
  failed: { tone: "danger", label: "Failed" },
};

export default function DataExportPage() {
  const role = useRole();
  const isOwner = role.key === "owner";
  const exports = useAdmin((s) => s.exports);
  const queueExport = useAdmin((s) => s.queueExport);
  const updateExport = useAdmin((s) => s.updateExport);
  const offboarding = useAdmin((s) => s.offboarding);
  const cancelOffboarding = useAdmin((s) => s.cancelOffboarding);
  const [format, setFormat] = React.useState<ExportJob["format"]>("Excel");
  const [mods, setMods] = React.useState<string[]>(MODULES.map((m) => m.key));
  const [period, setPeriod] = React.useState("all");
  const [attachments, setAttachments] = React.useState(true);
  const [offOpen, setOffOpen] = React.useState(false);
  const timers = React.useRef<ReturnType<typeof setInterval>[]>([]);

  React.useEffect(() => () => timers.current.forEach(clearInterval), []);

  const allOn = mods.length === MODULES.length;
  const tallyOnly = format === "Tally XML";

  const start = () => {
    const chosen = tallyOnly ? ["Masters", "Finance & GST"] : mods;
    if (!chosen.length) return toast.error("Choose at least one module");
    const id = `ex${Date.now()}`;
    queueExport({ id, at: new Date().toISOString().slice(0, 19), by: role.user, format, modules: chosen, status: "running", progress: 4 });
    toast.success("Export started", { description: "You'll get an in-app and email notification when the file is ready." });
    let p = 4;
    const t = setInterval(() => {
      p = Math.min(100, p + 12 + Math.round(Math.random() * 14));
      if (p >= 100) {
        clearInterval(t);
        updateExport(id, { status: "ready", progress: 100, sizeMb: Math.round((chosen.length * 4.6 + (attachments ? 12 : 0)) * 10) / 10, expiresAt: "2026-10-09" });
        toast.success("Your export is ready to download");
      } else updateExport(id, { progress: p });
    }, 700);
    timers.current.push(t);
  };

  return (
    <SettingsShell title="Data export">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary-600" />
          <div className="text-ink-2">
            <span className="font-medium text-ink">Your data is yours.</span> Export everything at any time in open formats — no lock-in, no fees. Exports are encrypted, logged in the audit trail and links expire after 7 days.
          </div>
        </div>

        <Section title="Full company export" desc={`${company.name} · all plants and financial years`}>
          <fieldset disabled={!isOwner && role.key !== "accountant"}>
            <div className="mb-2 text-xs font-semibold text-ink-2">Format</div>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Export format">
              {FORMATS.map((f) => (
                <button
                  key={f.key}
                  role="radio"
                  aria-checked={format === f.key}
                  onClick={() => setFormat(f.key)}
                  className={cn("flex items-start gap-3 rounded-lg border p-3 text-left transition-colors", format === f.key ? "border-primary-500 bg-primary-50/60 ring-3 ring-primary-500/15" : "border-line hover:border-line-strong")}
                >
                  <span className={cn("[&_svg]:size-5", format === f.key ? "text-primary-600" : "text-ink-3")}>{f.icon}</span>
                  <span>
                    <span className="block text-sm font-semibold">{f.label}</span>
                    <span className="block text-xs text-ink-3">{f.desc}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-2">Modules</span>
              {!tallyOnly && (
                <button className="text-xs font-medium text-primary-700 hover:underline" onClick={() => setMods(allOn ? [] : MODULES.map((m) => m.key))}>
                  {allOn ? "Clear all" : "Select all"}
                </button>
              )}
            </div>
            {tallyOnly ? (
              <p className="rounded-lg bg-surface-3 px-3 py-2.5 text-sm text-ink-2">Tally XML always contains ledgers, stock items and all accounting vouchers. Use Excel or CSV for production and audit data.</p>
            ) : (
              <div className="grid gap-x-6 sm:grid-cols-2">
                {MODULES.map((m) => (
                  <label key={m.key} className="flex cursor-pointer items-start gap-2.5 border-b border-line py-2.5">
                    <Checkbox className="mt-0.5" checked={mods.includes(m.key)} onChange={() => setMods((x) => (x.includes(m.key) ? x.filter((k) => k !== m.key) : [...x, m.key]))} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{m.key}</span>
                      <span className="block text-xs text-ink-3">{m.desc}</span>
                    </span>
                    <span className="tabular text-xs text-ink-3">{m.rows} rows</span>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Period" layout="vertical" htmlFor="exp-period">
                <Select id="exp-period" value={period} onChange={(e) => setPeriod(e.target.value)}>
                  <option value="all">All data since go-live</option>
                  <option value="fy">FY 2026-27 (current)</option>
                  <option value="fy-prev">FY 2025-26 (opening balances only)</option>
                  <option value="month">September 2026</option>
                </Select>
              </Field>
              <label className="flex items-start gap-2.5 pt-6 text-sm">
                <Checkbox className="mt-0.5" checked={attachments} disabled={tallyOnly} onChange={(e) => setAttachments(e.target.checked)} />
                <span>Include PDFs and attachments <span className="block text-xs text-ink-3">Invoices, challans, photos — adds about 12 MB</span></span>
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <span className="text-xs text-ink-3">Large exports run in the background; you can leave this page.</span>
              <Button variant="primary" onClick={start}><Download /> Start export</Button>
            </div>
          </fieldset>
        </Section>

        <Section title="Export history" desc="Download links expire after 7 days.">
          <ul className="-my-2 divide-y divide-line">
            {exports.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4", j.status === "failed" ? "bg-danger-bg text-danger" : "bg-surface-3 text-ink-2")}>
                  {j.format === "Excel" ? <FileSpreadsheet /> : j.format === "CSV" ? <FileText /> : <Database />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{j.format} · {j.modules.length === MODULES.length ? "Full export" : j.modules.join(", ")}</span>
                    <Badge tone={JOB_STATUS[j.status].tone}>{JOB_STATUS[j.status].label}</Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-ink-3">
                    {formatDateTime(j.at)} · {j.by}
                    {j.sizeMb !== undefined && j.status === "ready" && ` · ${j.sizeMb} MB`}
                    {j.expiresAt && j.status === "ready" && ` · expires ${formatDate(j.expiresAt)}`}
                    {j.status === "failed" && " · worker timed out while packing attachments"}
                  </div>
                  {j.status === "running" && (
                    <div className="mt-2 h-1.5 max-w-sm overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={j.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Export progress">
                      <div className="h-full rounded-full bg-primary-600 transition-[width] duration-500" style={{ width: `${j.progress}%` }} />
                    </div>
                  )}
                </div>
                {j.status === "ready" && <Button size="sm" onClick={() => toast.success("Download started", { description: `factory-erp-export-${j.at.slice(0, 10)}.zip` })}><Download /> Download</Button>}
                {j.status === "running" && <span className="flex items-center gap-1.5 text-xs text-ink-3"><Loader2 className="size-3.5 animate-spin" /> {j.progress}%</span>}
                {j.status === "failed" && <Button size="sm" onClick={() => { updateExport(j.id, { status: "ready", progress: 100, sizeMb: 31.2, expiresAt: "2026-10-09" }); toast.success("Export retried and completed"); }}>Retry</Button>}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Backups" desc="Managed by Factory ERP — nothing to configure.">
          <div className="grid gap-4 sm:grid-cols-3">
            <BackupFact icon={<Clock />} title="Continuous" body="Point-in-time recovery to any second in the last 35 days" />
            <BackupFact icon={<HardDrive />} title="Daily snapshot" body="Last taken 02-Oct-2026 02:00 IST · Mumbai + Hyderabad regions" />
            <BackupFact icon={<CheckCircle2 />} title="Restore tested" body="Quarterly restore drill passed on 15-Sep-2026" />
          </div>
        </Section>

        <section className="mb-4 rounded-xl border border-danger/30 bg-surface shadow-xs">
          <header className="flex items-center gap-2 border-b border-danger/20 px-5 py-3">
            <AlertTriangle className="size-4 text-danger" />
            <h2 className="text-sm font-semibold text-danger">Danger zone</h2>
          </header>
          <div className="p-5">
            {offboarding ? (
              <div className="flex flex-wrap items-start gap-3">
                <PackageOpen className="mt-0.5 size-5 text-warning" />
                <div className="min-w-0 flex-1 text-sm">
                  <div className="font-semibold">Offboarding requested on {formatDateTime(offboarding.requestedAt)} by {offboarding.by}</div>
                  <p className="mt-0.5 text-ink-2">A final full export will be emailed to the owner. The account becomes read-only on 02-Nov-2026 and data is deleted 30 days after that, except records we must retain by law.</p>
                </div>
                <Button onClick={() => { cancelOffboarding(); toast.success("Offboarding request withdrawn"); }}><XCircle /> Withdraw request</Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="max-w-xl text-sm">
                  <div className="font-semibold">Close this company account</div>
                  <p className="mt-0.5 text-ink-2">Request offboarding: we prepare a complete export, keep the account read-only for 30 days, then permanently delete all data.</p>
                </div>
                <Button variant="danger" disabled={!isOwner} onClick={() => setOffOpen(true)}>Request offboarding</Button>
              </div>
            )}
          </div>
        </section>
      </div>

      <OffboardDialog open={offOpen} onClose={() => setOffOpen(false)} />
    </SettingsShell>
  );
}

function BackupFact({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success-bg text-success [&_svg]:size-4">{icon}</span>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="mt-0.5 text-xs text-ink-3">{body}</div>
      </div>
    </div>
  );
}

function OffboardDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const role = useRole();
  const request = useAdmin((s) => s.requestOffboarding);
  const [typed, setTyped] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [ack, setAck] = React.useState(false);
  const target = company.shortName;
  const ok = typed.trim() === target && ack;

  const close = () => {
    setTyped("");
    setReason("");
    setAck(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && close()}
      title="Request offboarding"
      description="This starts closing the company account. You can withdraw within 30 days."
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button
            variant="primary"
            className="border-danger bg-danger hover:bg-danger/90 active:bg-danger"
            disabled={!ok}
            onClick={() => {
              request(role.user);
              toast.success("Offboarding requested", { description: "A confirmation was sent to the owner's email and WhatsApp." });
              close();
            }}
          >
            Request offboarding
          </Button>
        </>
      }
    >
      <ul className="mb-4 space-y-1.5 rounded-lg bg-danger-bg px-4 py-3 text-sm text-ink">
        <li>• All users, terminals and integrations are disabled after 30 days.</li>
        <li>• e-Invoice, e-way bill and WhatsApp connections are revoked.</li>
        <li>• GST records required under law are retained for 8 years, encrypted.</li>
      </ul>
      <div className="space-y-4">
        <Field label="Reason (optional)" layout="vertical" htmlFor="off-reason">
          <Textarea id="off-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Help us improve…" className="min-h-16" />
        </Field>
        <Field label={`Type "${target}" to confirm`} layout="vertical" htmlFor="off-typed">
          <Input id="off-typed" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </Field>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox className="mt-0.5" checked={ack} onChange={(e) => setAck(e.target.checked)} />
          <span>I understand that after the grace period this cannot be undone.</span>
        </label>
      </div>
    </Dialog>
  );
}
