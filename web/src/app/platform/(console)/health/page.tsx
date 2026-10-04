"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Cpu, Plug, RefreshCw, Rows3, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PlatformPage } from "@/components/platform/platform-shell";
import { useTenantName } from "@/components/platform/p2-ui";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type ServiceHealth, usePlatform } from "@/lib/store/platform";
import { cn, formatDateTime } from "@/lib/utils";

const TONE: Record<ServiceHealth["status"], { tone: Tone; label: string; dot: string }> = {
  operational: { tone: "success", label: "Operational", dot: "bg-success" },
  degraded: { tone: "warning", label: "Degraded", dot: "bg-warning" },
  down: { tone: "danger", label: "Down", dot: "bg-danger" },
};

const KINDS: { key: ServiceHealth["kind"]; label: string; icon: React.ReactNode }[] = [
  { key: "integration", label: "Integrations", icon: <Plug /> },
  { key: "queue", label: "Queues & workers", icon: <Rows3 /> },
  { key: "infra", label: "Infrastructure", icon: <Cpu /> },
];

/** Per-tenant GST portal results over the last 24 h (mock aggregate from einvoice_requests). */
const GSP_BY_TENANT = [
  { tenantId: "t_03", requests: 412, failed: 16, lastError: "IRP timeout after 30 s (attempt 3)", retrying: 3 },
  { tenantId: "t_01", requests: 214, failed: 1, lastError: "GSP timeout after 3 attempts", retrying: 1 },
  { tenantId: "t_02", requests: 98, failed: 0, lastError: "", retrying: 0 },
  { tenantId: "t_07", requests: 31, failed: 2, lastError: "2150: Duplicate IRN", retrying: 0 },
  { tenantId: "t_04", requests: 0, failed: 0, lastError: "", retrying: 0 },
];

const INCIDENTS = [
  { at: "2026-10-02T09:05:00", title: "IRP latency elevated", status: "monitoring", body: "NIC IRP p95 latency above 20 s. Retries with backoff are succeeding; no data loss.", tone: "warning" as Tone },
  { at: "2026-09-27T22:40:00", title: "WhatsApp template delivery delayed", status: "resolved", body: "BSP queue backlog for 18 minutes. All reminders delivered by 23:10.", tone: "success" as Tone },
  { at: "2026-09-18T02:00:00", title: "Scheduled maintenance: PostgreSQL minor upgrade", status: "completed", body: "Multi-AZ failover, 41 s of read-only mode. Offline terminals queued events and synced afterwards.", tone: "neutral" as Tone },
];

export default function HealthPage() {
  const health = usePlatform((s) => s.health);
  const tenantName = useTenantName();
  const [checkedAt, setCheckedAt] = React.useState("2026-10-02T14:14:00");

  const worst: ServiceHealth["status"] = health.some((h) => h.status === "down") ? "down" : health.some((h) => h.status === "degraded") ? "degraded" : "operational";
  const affected = health.filter((h) => h.status !== "operational");

  return (
    <PlatformPage
      title="System health"
      subtitle="Integrations, background queues and infrastructure across all tenants"
      crumbs={[{ label: "Platform", href: "/platform" }, { label: "System health" }]}
      actions={
        <Button
          onClick={() => {
            setCheckedAt("2026-10-02T14:15:00");
            toast.success("Health checks re-run", { description: `${health.length} services probed` });
          }}
        >
          <RefreshCw /> Re-run checks
        </Button>
      }
    >
      <div
        className={cn(
          "mb-4 flex flex-wrap items-center gap-3 rounded-xl border px-5 py-4",
          worst === "operational" ? "border-success/25 bg-success-bg" : worst === "degraded" ? "border-warning/25 bg-warning-bg" : "border-danger/25 bg-danger-bg",
        )}
        role="status"
      >
        {worst === "operational" ? <CheckCircle2 className="size-6 text-success" /> : worst === "degraded" ? <AlertTriangle className="size-6 text-warning" /> : <XCircle className="size-6 text-danger" />}
        <div className="flex-1">
          <div className="font-semibold">
            {worst === "operational" ? "All systems operational" : worst === "degraded" ? `Partial degradation · ${affected.length} service${affected.length > 1 ? "s" : ""}` : "Major outage"}
          </div>
          <div className="text-sm text-ink-2">
            {affected.length ? affected.map((a) => `${a.name}: ${a.detail}`).join(" · ") : "No customer-facing impact."}
          </div>
        </div>
        <span className="text-xs text-ink-3">Checked {formatDateTime(checkedAt)}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {KINDS.map((k) => (
          <section key={k.key} className="rounded-xl border border-line bg-surface shadow-xs">
            <header className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-semibold [&_svg]:size-4 [&_svg]:text-ink-3">
              {k.icon}
              {k.label}
            </header>
            <ul className="divide-y divide-line">
              {health.filter((h) => h.kind === k.key).map((h) => (
                <li key={h.key} className="flex items-start gap-3 px-4 py-3">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", TONE[h.status].dot, h.status !== "operational" && "animate-pulse")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{h.name}</span>
                      <Badge tone={TONE[h.status].tone} dot={false}>{TONE[h.status].label}</Badge>
                    </div>
                    <div className="tabular mt-0.5 text-xs text-ink-2">{h.metric}</div>
                    {h.detail && <div className="mt-0.5 text-xs text-ink-3">{h.detail}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
          <header className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">e-Invoice / e-way bill by tenant · last 24 h</h2>
            <p className="mt-0.5 text-xs text-ink-3">Failures retry with exponential backoff; tenants see status on each invoice.</p>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="bg-surface-2 text-xs text-ink-3">
                  <th className="h-9 px-4 text-left font-semibold">Tenant</th>
                  <th className="h-9 px-3 text-right font-semibold">Requests</th>
                  <th className="h-9 px-3 text-right font-semibold">Failed</th>
                  <th className="h-9 px-3 text-right font-semibold">Success</th>
                  <th className="h-9 px-4 text-left font-semibold">Last error</th>
                </tr>
              </thead>
              <tbody>
                {GSP_BY_TENANT.map((r) => {
                  const rate = r.requests ? ((r.requests - r.failed) / r.requests) * 100 : 100;
                  return (
                    <tr key={r.tenantId} className="border-t border-line">
                      <td className="px-4 py-2.5"><Link href={`/platform/tenants/${r.tenantId}`} className="font-medium hover:text-primary-700 hover:underline">{tenantName(r.tenantId)}</Link></td>
                      <td className="tabular px-3 py-2.5 text-right">{r.requests}</td>
                      <td className={cn("tabular px-3 py-2.5 text-right", r.failed && "font-semibold text-danger")}>{r.failed}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={cn("tabular", rate < 97 ? "text-danger" : rate < 99.5 ? "text-warning" : "text-success")}>{r.requests ? `${rate.toFixed(1)}%` : "—"}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-ink-2">
                        {r.lastError || <span className="text-ink-3">—</span>}
                        {r.retrying > 0 && <Badge tone="warning" dot={false} className="ml-2">{r.retrying} retrying</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-surface shadow-xs">
          <header className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">Incidents</h2>
            <p className="mt-0.5 text-xs text-ink-3">Published to the status page and in-app banner</p>
          </header>
          <ol className="relative px-4 py-3">
            {INCIDENTS.map((i, idx) => (
              <li key={i.at} className="relative flex gap-3 pb-4 last:pb-0">
                {idx < INCIDENTS.length - 1 && <span className="absolute top-4 bottom-0 left-[5px] w-px bg-line" aria-hidden />}
                <span className={cn("relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-surface", i.tone === "warning" ? "bg-warning" : i.tone === "success" ? "bg-success" : "bg-ink-3")} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{i.title}</span>
                    <Badge tone={i.tone} dot={false}>{i.status}</Badge>
                  </div>
                  <div className="text-2xs text-ink-3">{formatDateTime(i.at)}</div>
                  <p className="mt-1 text-xs text-ink-2">{i.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </PlatformPage>
  );
}
