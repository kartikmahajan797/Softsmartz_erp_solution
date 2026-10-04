"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Download, Link2, Loader2, Search, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { SettingsShell } from "@/components/settings/settings-shell";
import { type Column, DataTable } from "@/components/erp/data-table";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Sheet } from "@/components/ui/overlay";
import { type AuditEntry, useAdmin, verifyChain } from "@/lib/store/admin";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

const ACTION: Record<AuditEntry["action"], { tone: Tone; label: string }> = {
  create: { tone: "info", label: "Create" },
  update: { tone: "neutral", label: "Update" },
  post: { tone: "success", label: "Post" },
  approve: { tone: "success", label: "Approve" },
  reject: { tone: "danger", label: "Reject" },
  delete: { tone: "danger", label: "Delete" },
  cancel: { tone: "warning", label: "Cancel" },
  login: { tone: "brand", label: "Sign-in" },
  export: { tone: "progress", label: "Export" },
};

const RANGES = [
  { key: "all", label: "All time" },
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 days" },
];

export default function AuditLogPage() {
  const audit = useAdmin((s) => s.audit);
  const [q, setQ] = React.useState("");
  const [user, setUser] = React.useState("");
  const [mod, setMod] = React.useState("");
  const [action, setAction] = React.useState("");
  const [range, setRange] = React.useState("all");
  const [open, setOpen] = React.useState<AuditEntry | null>(null);
  const [verify, setVerify] = React.useState<"idle" | "running" | { ok: boolean; checked: number; brokenAt?: number }>("idle");

  const users = [...new Set(audit.map((a) => a.user))].sort();
  const modules = [...new Set(audit.map((a) => a.module))].sort();

  const rows = audit.filter((a) => {
    const day = a.at.slice(0, 10);
    if (range === "today" && day !== "2026-10-02") return false;
    if (range === "yesterday" && day !== "2026-10-01") return false;
    if (range === "7d" && day < "2026-09-26") return false;
    if (user && a.user !== user) return false;
    if (mod && a.module !== mod) return false;
    if (action && a.action !== action) return false;
    const s = q.trim().toLowerCase();
    return !s || `${a.summary} ${a.doc ?? ""} ${a.user} ${a.device}`.toLowerCase().includes(s);
  });
  const filtered = !!(q || user || mod || action || range !== "all");

  const runVerify = () => {
    setVerify("running");
    setTimeout(() => setVerify(verifyChain(audit)), 1100);
  };

  const exportCsv = () => {
    const head = ["seq", "time", "user", "role", "device", "ip", "module", "action", "document", "summary", "hash", "prev_hash"];
    const csv = [head.join(","), ...rows.map((a) => [a.seq, a.at, a.user, a.role, a.device, a.ip, a.module, a.action, a.doc ?? "", a.summary, a.hash, a.prevHash].map((v) => JSON.stringify(String(v))).join(","))].join("\n");
    const el = document.createElement("a");
    el.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    el.download = "audit-log.csv";
    el.click();
    toast.success(`Exported ${rows.length} audit entries`, { description: "Export itself is recorded in the audit log" });
  };

  const columns: Column<AuditEntry>[] = [
    { key: "at", header: "Time", width: "150px", cell: (a) => <span className="tabular whitespace-nowrap text-ink-2">{formatDateTime(a.at)}</span> },
    {
      key: "user", header: "User", cell: (a) => (
        <div className="flex items-center gap-2">
          <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-2xs font-semibold", a.user === "System" ? "bg-surface-3 text-ink-3" : "bg-primary-100 text-primary-800")}>
            {a.user.split(" ").map((p) => p[0]).join("").slice(0, 2)}
          </span>
          <div className="min-w-0">
            <div className="truncate font-medium">{a.user}</div>
            <div className="truncate text-xs text-ink-3">{a.device}</div>
          </div>
        </div>
      ),
    },
    { key: "module", header: "Module", cell: (a) => <span className="text-ink-2">{a.module}</span> },
    { key: "action", header: "Action", cell: (a) => <Badge tone={ACTION[a.action].tone}>{ACTION[a.action].label}</Badge> },
    {
      key: "summary", header: "Details", cell: (a) => (
        <div className="min-w-0 max-w-[420px]">
          {a.doc && <div className="font-mono text-xs font-medium text-primary-700">{a.doc}</div>}
          <div className="truncate text-ink-2">{a.summary}</div>
        </div>
      ),
    },
    { key: "hash", header: "Hash", cell: (a) => <span className="font-mono text-xs text-ink-3">{a.hash.slice(0, 10)}…</span> },
  ];

  return (
    <SettingsShell
      title="Audit log"
      actions={
        <>
          <Button onClick={exportCsv}><Download /> Export</Button>
          <Button variant="primary" onClick={runVerify} disabled={verify === "running"}>
            {verify === "running" ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Verify chain integrity
          </Button>
        </>
      }
    >
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Entries retained" value="48,229" hint="Since go-live · 01-Apr-2026" />
          <Stat label="Today" value={String(audit.filter((a) => a.at.startsWith("2026-10-02")).length)} hint="Across 6 users and 3 terminals" />
          <Stat label="Retention" value="8 years" hint="Insert-only · monthly partitions" />
        </div>

        {verify === "running" && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-xs">
            <Loader2 className="size-4 animate-spin text-primary-600" /> Recomputing SHA-256 chain across all partitions…
          </div>
        )}
        {typeof verify === "object" && (
          <div className={cn("mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", verify.ok ? "border-success/25 bg-success-bg" : "border-danger/25 bg-danger-bg")}>
            {verify.ok ? <ShieldCheck className="mt-0.5 size-5 text-success" /> : <ShieldAlert className="mt-0.5 size-5 text-danger" />}
            <div className="flex-1">
              <div className={cn("font-semibold", verify.ok ? "text-success" : "text-danger")}>{verify.ok ? "Chain intact — no tampering detected" : `Chain broken at entry #${verify.brokenAt}`}</div>
              <div className="mt-0.5 text-ink-2">
                {verify.ok ? `Verified ${verify.checked} recent entries plus 48,209 archived entries against anchored checkpoints. Checked ${formatDate("2026-10-02")} by you.` : "Contact support immediately — the log has been altered outside the application."}
              </div>
            </div>
            <button onClick={() => setVerify("idle")} className="rounded p-1 text-ink-3 hover:bg-white/60" aria-label="Dismiss"><X className="size-4" /></button>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-3" />
              <Input aria-label="Search audit log" placeholder="Search document, summary, device…" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select aria-label="User" className="w-44" value={user} onChange={(e) => setUser(e.target.value)}>
              <option value="">All users</option>
              {users.map((u) => <option key={u}>{u}</option>)}
            </Select>
            <Select aria-label="Module" className="w-40" value={mod} onChange={(e) => setMod(e.target.value)}>
              <option value="">All modules</option>
              {modules.map((m) => <option key={m}>{m}</option>)}
            </Select>
            <Select aria-label="Action" className="w-36" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">All actions</option>
              {Object.entries(ACTION).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
            <Select aria-label="Date range" className="w-36" value={range} onChange={(e) => setRange(e.target.value)}>
              {RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </Select>
            {filtered && <Button variant="ghost" size="sm" onClick={() => { setQ(""); setUser(""); setMod(""); setAction(""); setRange("all"); }}>Clear</Button>}
            <span className="ml-auto text-xs text-ink-3 tabular">{rows.length} entries</span>
          </div>
          <DataTable rows={rows} columns={columns} selectable={false} onRowClick={setOpen} />
        </div>
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)} width={500} title={open ? <span>Entry <span className="font-mono">#{open.seq}</span></span> : ""}>
        {open && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={ACTION[open.action].tone}>{ACTION[open.action].label}</Badge>
              <span className="text-sm text-ink-2">{open.module}</span>
            </div>
            <p className="text-sm font-medium">{open.summary}</p>
            <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-sm">
              <dt className="text-ink-3">When</dt><dd>{formatDateTime(open.at)}:{open.at.slice(17, 19)} IST</dd>
              <dt className="text-ink-3">User</dt><dd>{open.user} <span className="text-ink-3">· {open.role}</span></dd>
              <dt className="text-ink-3">Device</dt><dd>{open.device}</dd>
              <dt className="text-ink-3">IP address</dt><dd className="font-mono text-[13px]">{open.ip}</dd>
              {open.doc && (
                <>
                  <dt className="text-ink-3">Document</dt>
                  <dd>{open.href ? <Link href={open.href} className="inline-flex items-center gap-1 font-mono text-[13px] text-primary-700 hover:underline">{open.doc} <ArrowRight className="size-3" /></Link> : <span className="font-mono">{open.doc}</span>}</dd>
                </>
              )}
            </dl>

            {open.changes && open.changes.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">Changes</div>
                <div className="overflow-hidden rounded-lg border border-line">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-2 text-xs text-ink-2">
                      <tr><th className="px-3 py-1.5 text-left font-semibold">Field</th><th className="px-3 py-1.5 text-left font-semibold">Before</th><th className="px-3 py-1.5 text-left font-semibold">After</th></tr>
                    </thead>
                    <tbody>
                      {open.changes.map((c) => (
                        <tr key={c.field} className="border-t border-line">
                          <td className="px-3 py-2 font-mono text-xs text-ink-2">{c.field}</td>
                          <td className="px-3 py-2"><span className="rounded bg-danger-bg px-1.5 py-0.5 text-danger line-through decoration-danger/40">{c.before}</span></td>
                          <td className="px-3 py-2"><span className="rounded bg-success-bg px-1.5 py-0.5 text-success">{c.after}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-3 uppercase"><Link2 className="size-3.5" /> Hash chain</div>
              <div className="space-y-1.5 rounded-lg bg-surface-3 p-3 font-mono text-[11.5px] break-all">
                <div><span className="text-ink-3">prev </span>{open.prevHash}</div>
                <div><span className="text-ink-3">hash </span><span className="text-ink">{open.hash}</span></div>
              </div>
              <p className="mt-2 text-xs text-ink-3">Each entry hashes the previous one. Entries cannot be edited or deleted — corrections are new entries.</p>
            </div>
          </div>
        )}
      </Sheet>
    </SettingsShell>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3 shadow-xs">
      <div className="text-xs font-medium text-ink-3">{label}</div>
      <div className="tabular mt-1 text-xl font-semibold tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs text-ink-3">{hint}</div>
    </div>
  );
}
