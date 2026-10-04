"use client";

import * as React from "react";
import Link from "next/link";
import { Download, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PlatformPage } from "@/components/platform/platform-shell";
import { Avatar, downloadCsv, StatCard, useTenantName } from "@/components/platform/p2-ui";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { usePlatform } from "@/lib/store/platform";
import { formatDateTime } from "@/lib/utils";

const AREA_TONE: Record<string, Tone> = { tenant: "brand", support: "warning", billing: "progress", plan: "info", staff: "neutral" };
const area = (action: string) => action.split(".")[0];

export default function PlatformAuditPage() {
  const audit = usePlatform((s) => s.audit);
  const tenants = usePlatform((s) => s.tenants);
  const tenantName = useTenantName();
  const [q, setQ] = React.useState("");
  const [staff, setStaff] = React.useState("");
  const [areaF, setAreaF] = React.useState("");
  const [tenant, setTenant] = React.useState("");

  const staffList = [...new Set(audit.map((a) => a.staff))].sort();
  const areas = [...new Set(audit.map((a) => area(a.action)))].sort();

  const rows = audit.filter((a) => {
    const s = q.trim().toLowerCase();
    return (
      (!staff || a.staff === staff) &&
      (!areaF || area(a.action) === areaF) &&
      (!tenant || a.tenantId === tenant) &&
      (!s || `${a.action} ${a.detail} ${a.staff} ${tenantName(a.tenantId)}`.toLowerCase().includes(s))
    );
  });

  const today = audit.filter((a) => a.at.startsWith("2026-10-02")).length;
  const supportEvents = audit.filter((a) => a.action.startsWith("support.")).length;

  return (
    <PlatformPage
      title="Platform audit log"
      subtitle="Every staff action across tenants — insert-only, retained 8 years. Tenant-side actions also appear in each tenant's own audit log."
      crumbs={[{ label: "Platform", href: "/platform" }, { label: "Platform audit log" }]}
      actions={
        <Button
          onClick={() => {
            downloadCsv("platform-audit.csv", ["Time", "Staff", "Action", "Tenant", "Detail"], rows.map((a) => [a.at, a.staff, a.action, tenantName(a.tenantId), a.detail]));
            toast.success(`Exported ${rows.length} entries`);
          }}
        >
          <Download /> Export CSV
        </Button>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Entries" value={audit.length} hint="All time (demo)" />
        <StatCard label="Today" value={today} hint="02-Oct-2026" />
        <StatCard label="Support events" value={supportEvents} hint="Requests, sessions, revocations" tone="warning" />
        <StatCard label="Integrity" value={<span className="flex items-center gap-1.5 text-success"><ShieldCheck className="size-5" /> Verified</span>} hint="Hash chain checked 02:00 IST" />
      </div>

      <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-3" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search action or detail…" className="pl-8" aria-label="Search audit log" />
          </div>
          <Select aria-label="Staff" value={staff} onChange={(e) => setStaff(e.target.value)} className="w-44">
            <option value="">All staff</option>
            {staffList.map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Select aria-label="Area" value={areaF} onChange={(e) => setAreaF(e.target.value)} className="w-36">
            <option value="">All areas</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
          <Select aria-label="Tenant" value={tenant} onChange={(e) => setTenant(e.target.value)} className="w-48">
            <option value="">All tenants</option>
            {tenants.map((t) => <option key={t.id} value={t.id}>{t.shortName}</option>)}
          </Select>
          <span className="ml-auto text-xs text-ink-3">{rows.length} entries</span>
        </div>
        {rows.length === 0 ? (
          <div className="px-5 py-14 text-center text-sm text-ink-3">No entries match these filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-surface-2 text-xs text-ink-3">
                  {["Time", "Staff", "Action", "Tenant", "Detail"].map((h) => <th key={h} className="h-10 border-b border-line px-4 text-left font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-b border-line last:border-b-0 hover:bg-surface-2/60">
                    <td className="px-4 py-2.5 whitespace-nowrap text-ink-2">{formatDateTime(a.at)}</td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <Avatar name={a.staff} className={a.staff === "System" ? "bg-surface-3 text-ink-3" : undefined} />
                        {a.staff}
                      </span>
                    </td>
                    <td className="px-4 py-2.5"><Badge tone={AREA_TONE[area(a.action)] ?? "neutral"} dot={false} className="font-mono">{a.action}</Badge></td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {a.tenantId ? <Link href={`/platform/tenants/${a.tenantId}`} className="hover:text-primary-700 hover:underline">{tenantName(a.tenantId)}</Link> : <span className="text-ink-3">Platform</span>}
                    </td>
                    <td className="px-4 py-2.5 text-ink-2">{a.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PlatformPage>
  );
}
