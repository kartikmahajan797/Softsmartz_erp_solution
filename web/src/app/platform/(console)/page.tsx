"use client";

import * as React from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowRight, Building2, CircleDollarSign, Clock, CreditCard, LifeBuoy, MailWarning, Rocket } from "lucide-react";
import { Card } from "@/components/erp/form-view";
import { PlatformPage } from "@/components/platform/platform-shell";
import { HealthBadge, KpiCard, STAGE_TONE, TenantAvatar } from "@/components/platform/p1-common";
import { mrrOf, PLANS, PLATFORM_USER, type PlanKey, STAGES, usePlatform } from "@/lib/store/platform";
import { cn, daysBetween, formatDateTime, formatINR, formatLakh, TODAY } from "@/lib/utils";

export default function PlatformOverviewPage() {
  const tenants = usePlatform((s) => s.tenants);
  const invoices = usePlatform((s) => s.invoices);
  const grants = usePlatform((s) => s.grants);
  const audit = usePlatform((s) => s.audit);

  const mrr = tenants.reduce((a, t) => a + mrrOf(t), 0);
  const active = tenants.filter((t) => t.stage === "live" && t.status !== "suspended");
  const onboarding = tenants.filter((t) => t.stage !== "live" && t.stage !== "churned");
  const live = tenants.filter((t) => t.wentLiveOn);
  const avgDays = live.length ? Math.round(live.reduce((a, t) => a + daysBetween(t.signedOn, t.wentLiveOn!), 0) / live.length) : 0;
  const overdue = invoices.filter((i) => i.status === "overdue");
  const overdueAmt = overdue.reduce((a, i) => a + i.amount + i.gst, 0);
  const pendingGrants = grants.filter((g) => g.status === "requested");

  const byPlan = (Object.keys(PLANS) as PlanKey[]).map((k) => ({
    name: PLANS[k].name,
    mrr: tenants.filter((t) => t.plan === k).reduce((a, t) => a + mrrOf(t), 0),
    tenants: tenants.filter((t) => t.plan === k).length,
  }));

  const funnel = STAGES.map((s) => ({ ...s, count: tenants.filter((t) => t.stage === s.key).length }));
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.count));
  const tenantName = (id?: string) => tenants.find((t) => t.id === id)?.shortName ?? "";

  const attention: { key: string; icon: React.ReactNode; title: string; body: string; href: string; tone: string }[] = [
    ...tenants
      .filter((t) => t.health !== "healthy")
      .map((t) => ({
        key: `h-${t.id}`, icon: <AlertTriangle />, title: `${t.shortName} is ${t.health === "critical" ? "critical" : "at risk"}`,
        body: t.notes || "Usage or billing signals need a look", href: `/platform/tenants/${t.id}`, tone: t.health === "critical" ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning",
      })),
    ...tenants
      .filter((t) => t.inviteStatus === "pending")
      .map((t) => ({
        key: `i-${t.id}`, icon: <MailWarning />, title: `Owner invite pending · ${t.shortName}`,
        body: `${t.owner.email} has not accepted yet`, href: `/platform/tenants/${t.id}`, tone: "bg-info-bg text-info",
      })),
    ...overdue.map((i) => ({
      key: `o-${i.id}`, icon: <CreditCard />, title: `${i.number} overdue · ${tenantName(i.tenantId)}`,
      body: `${formatINR(i.amount + i.gst)} was due ${daysBetween(i.dueDate, TODAY)} days ago`, href: "/platform/billing", tone: "bg-danger-bg text-danger",
    })),
    ...pendingGrants.map((g) => ({
      key: `g-${g.id}`, icon: <LifeBuoy />, title: `Support access requested · ${tenantName(g.tenantId)}`,
      body: `${g.requestedBy}: ${g.reason} — waiting for tenant consent`, href: "/platform/support", tone: "bg-progress-bg text-progress",
    })),
  ];

  return (
    <PlatformPage
      title={`Good afternoon, ${PLATFORM_USER.name.split(" ")[0]}`}
      subtitle={`${tenants.length} tenants on the platform · data as of ${formatDateTime(`${TODAY}T14:10:00`)}`}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard icon={<CircleDollarSign />} label="MRR" value={formatLakh(mrr)} hint={`ARR ${formatLakh(mrr * 12)}`} />
        <KpiCard icon={<Building2 />} label="Live tenants" value={active.length} hint={`${tenants.filter((t) => t.status === "trial").length} on trial`} tone="success" />
        <KpiCard icon={<Rocket />} label="In onboarding" value={onboarding.length} hint="Signed → training" tone="info" />
        <KpiCard
          icon={<Clock />}
          label="Avg days to go-live"
          value={`${avgDays} d`}
          hint={avgDays <= 14 ? "Within 14-day goal" : "Above 14-day goal"}
          tone={avgDays <= 14 ? "success" : "warning"}
        />
        <KpiCard icon={<CreditCard />} label="Overdue billing" value={formatLakh(overdueAmt)} hint={`${overdue.length} invoices`} tone={overdue.length ? "danger" : undefined} />
        <KpiCard icon={<LifeBuoy />} label="Support requests" value={pendingGrants.length} hint="Awaiting tenant consent" tone={pendingGrants.length ? "warning" : undefined} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="MRR by plan" className="xl:col-span-2" action={<Link href="/platform/billing" className="text-xs font-medium text-primary-700 hover:underline">Billing</Link>}>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byPlan} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--text-3)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-3)" }} tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => formatLakh(v)} />
                <Tooltip
                  cursor={{ fill: "var(--surface-3)" }}
                  formatter={(v) => formatINR(Number(v))}
                  contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
                />
                <Bar dataKey="mrr" name="MRR" fill="var(--primary-600)" radius={[4, 4, 0, 0]} maxBarSize={72} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-line pt-3 text-sm">
            {byPlan.map((p) => (
              <div key={p.name}>
                <div className="text-xs text-ink-3">{p.name}</div>
                <div className="tabular font-semibold">{formatLakh(p.mrr)}</div>
                <div className="text-xs text-ink-3">{p.tenants} tenants</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Go-live pipeline" action={<Link href="/platform/pipeline" className="text-xs font-medium text-primary-700 hover:underline">Open board</Link>}>
          <ul className="space-y-2.5">
            {funnel.map((f) => (
              <li key={f.key}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-ink-2">
                    <span className={cn("size-2 rounded-full", STAGE_TONE[f.key])} />
                    {f.label}
                  </span>
                  <span className="tabular font-semibold">{f.count}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-3">
                  <div className={cn("h-full rounded-full", STAGE_TONE[f.key])} style={{ width: `${(f.count / maxFunnel) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-md bg-surface-3 px-3 py-2 text-xs text-ink-2">Goal: every tenant live within 14 days of signing (PRD goal 2).</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card title="Needs attention" bodyClassName="p-0" action={<span className="text-xs text-ink-3">{attention.length} items</span>}>
          {attention.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-ink-3">All clear.</div>
          ) : (
            <ul>
              {attention.map((a) => (
                <li key={a.key} className="border-b border-line last:border-b-0">
                  <Link href={a.href} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4", a.tone)}>{a.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{a.title}</span>
                      <span className="block truncate text-xs text-ink-3">{a.body}</span>
                    </span>
                    <ArrowRight className="size-4 text-ink-3" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card title="Tenant health" bodyClassName="p-0" action={<Link href="/platform/tenants" className="text-xs font-medium text-primary-700 hover:underline">All tenants</Link>}>
            <ul>
              {tenants.slice(0, 5).map((t) => (
                <li key={t.id} className="border-b border-line last:border-b-0">
                  <Link href={`/platform/tenants/${t.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
                    <TenantAvatar t={t} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{t.shortName}</span>
                      <span className="block text-xs text-ink-3">
                        {PLANS[t.plan].name} · {t.city} · {t.usage.users} users
                      </span>
                    </span>
                    <HealthBadge health={t.health} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Recent platform activity" bodyClassName="p-0" action={<Link href="/platform/audit" className="text-xs font-medium text-primary-700 hover:underline">Audit log</Link>}>
            <ol>
              {audit.slice(0, 6).map((a) => (
                <li key={a.id} className="flex gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-2xs font-semibold text-ink-2">
                    {a.staff
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">
                      <span className="font-medium">{a.staff}</span> <span className="text-ink-2">{a.detail}</span>
                    </div>
                    <div className="mt-0.5 flex gap-2 text-2xs text-ink-3">
                      <span className="font-mono">{a.action}</span>
                      <span>{formatDateTime(a.at)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </PlatformPage>
  );
}
