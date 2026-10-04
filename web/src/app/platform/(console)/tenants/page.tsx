"use client";

import { MailWarning, PauseCircle } from "lucide-react";
import { toast } from "sonner";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { HealthBadge, StageBadge, stageLabel, TenantAvatar, TenantStatusBadge } from "@/components/platform/p1-common";
import { Badge } from "@/components/ui/badge";
import { mrrOf, onboardingProgress, PLANS, PLATFORM_USER, STAGES, type Tenant, TEMPLATES, usePlatform } from "@/lib/store/platform";
import { cn, daysBetween, formatDate, formatINR0, formatLakh, TODAY } from "@/lib/utils";

export default function TenantsPage() {
  const tenants = usePlatform((s) => s.tenants);
  const updateTenant = usePlatform((s) => s.updateTenant);
  const log = usePlatform((s) => s.log);

  const inOnboarding = (t: Tenant) => t.stage !== "live" && t.stage !== "churned";

  const columns: Column<Tenant>[] = [
    {
      key: "name", header: "Tenant", value: (t) => t.shortName,
      cell: (t) => (
        <span className="flex items-center gap-2.5">
          <TenantAvatar t={t} />
          <span className="min-w-0">
            <span className="block font-medium">{t.shortName}</span>
            <span className="block font-mono text-xs text-ink-3">{t.code} · {t.gstin}</span>
          </span>
        </span>
      ),
    },
    { key: "city", header: "Location", value: (t) => t.city, cell: (t) => <span className="text-ink-2">{t.city}, {t.state}</span> },
    {
      key: "plan", header: "Plan", value: (t) => t.plan,
      cell: (t) => (
        <span>
          <span className="font-medium">{PLANS[t.plan].name}</span>
          <span className="block text-xs text-ink-3">{t.cycle === "annual" ? "Annual" : "Monthly"}</span>
        </span>
      ),
    },
    { key: "mrr", header: "MRR", align: "right", value: (t) => mrrOf(t), cell: (t) => formatINR0(mrrOf(t)), total: (rows) => formatLakh(rows.reduce((a, t) => a + mrrOf(t), 0)) },
    {
      key: "stage", header: "Onboarding", value: (t) => STAGES.findIndex((s) => s.key === t.stage),
      cell: (t) => (
        <span className="flex flex-col gap-1">
          <StageBadge stage={t.stage} />
          {inOnboarding(t) && (
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-16 overflow-hidden rounded-full bg-surface-3">
                <span className="block h-full rounded-full bg-primary-600" style={{ width: `${onboardingProgress(t)}%` }} />
              </span>
              <span className="text-2xs text-ink-3">{onboardingProgress(t)}%</span>
            </span>
          )}
        </span>
      ),
    },
    {
      key: "golive", header: "Go-live", value: (t) => t.wentLiveOn ?? t.goLiveTarget,
      cell: (t) => {
        if (t.wentLiveOn) return <span className="text-ink-2">{formatDate(t.wentLiveOn)}</span>;
        const d = daysBetween(TODAY, t.goLiveTarget);
        return (
          <span className={cn(d < 0 ? "text-danger" : d <= 3 ? "text-warning" : "text-ink-2")}>
            {formatDate(t.goLiveTarget)}
            <span className="block text-xs text-ink-3">{d < 0 ? `${-d}d late` : `target · ${d}d left`}</span>
          </span>
        );
      },
    },
    { key: "users", header: "Users", align: "right", value: (t) => t.usage.users, cell: (t) => `${t.usage.users}/${PLANS[t.plan].limits.users}` },
    { key: "health", header: "Health", value: (t) => t.health, cell: (t) => <HealthBadge health={t.health} /> },
    { key: "status", header: "Status", value: (t) => t.status, cell: (t) => <TenantStatusBadge status={t.status} /> },
  ];

  const mrr = tenants.reduce((a, t) => a + mrrOf(t), 0);

  return (
    <ListPage
      title="Tenants"
      subtitle="Every factory on the platform — plan, onboarding stage, health and billing status"
      crumbs={[{ label: "Platform", href: "/platform" }, { label: "Tenants" }]}
      rows={tenants}
      columns={columns}
      search={(t) => `${t.name} ${t.shortName} ${t.code} ${t.gstin} ${t.city} ${t.owner.name} ${t.owner.email}`}
      placeholder="Search name, code, GSTIN, city, owner…"
      href={(t) => `/platform/tenants/${t.id}`}
      newHref="/platform/tenants/new"
      newLabel="Onboard tenant"
      stats={[
        { label: "MRR", value: formatLakh(mrr), hint: `ARR ${formatLakh(mrr * 12)}` },
        { label: "Live", value: tenants.filter((t) => t.stage === "live").length, hint: "Posting invoices", tone: "success", filter: "live" },
        { label: "In onboarding", value: tenants.filter(inOnboarding).length, hint: "Signed → training", tone: "info", filter: "onboarding" },
        { label: "Need attention", value: tenants.filter((t) => t.health !== "healthy" || t.status === "past_due").length, hint: "At risk, critical or past due", tone: "danger", filter: "attention" },
      ]}
      filters={[
        { key: "live", label: "Live", group: "stage", test: (t) => t.stage === "live" },
        { key: "onboarding", label: "In onboarding", group: "stage", test: inOnboarding },
        { key: "trial", label: "Trial", group: "status", test: (t) => t.status === "trial" },
        { key: "active", label: "Active", group: "status", test: (t) => t.status === "active" },
        { key: "pastdue", label: "Past due", group: "status", test: (t) => t.status === "past_due" },
        { key: "suspended", label: "Suspended", group: "status", test: (t) => t.status === "suspended" },
        { key: "starter", label: "Starter plan", group: "plan", test: (t) => t.plan === "starter" },
        { key: "growth", label: "Growth plan", group: "plan", test: (t) => t.plan === "growth" },
        { key: "pro", label: "Pro plan", group: "plan", test: (t) => t.plan === "pro" },
        { key: "attention", label: "Needs attention", group: "health", test: (t) => t.health !== "healthy" || t.status === "past_due" },
        { key: "invite", label: "Invite pending", group: "health", test: (t) => t.inviteStatus === "pending" },
      ]}
      groups={[
        { key: "plan", label: "Plan", by: (t) => PLANS[t.plan].name },
        { key: "stage", label: "Onboarding stage", by: (t) => stageLabel(t.stage) },
        { key: "template", label: "Industry template", by: (t) => TEMPLATES[t.template].label },
        { key: "manager", label: "Onboarding manager", by: (t) => t.onboardingManager },
      ]}
      kanban={{
        columns: STAGES.map((s) => ({ key: s.key, label: s.label })),
        columnOf: (t) => t.stage,
        card: (t) => (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TenantAvatar t={t} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{t.shortName}</div>
                <div className="text-xs text-ink-3">{PLANS[t.plan].name} · {t.city}</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-ink-3">
              <span>{t.onboardingManager}</span>
              <span>{onboardingProgress(t)}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-primary-600" style={{ width: `${onboardingProgress(t)}%` }} />
            </div>
            {t.inviteStatus === "pending" && <Badge tone="info">Invite pending</Badge>}
          </div>
        ),
      }}
      bulkActions={[
        {
          label: "Resend invite",
          icon: <MailWarning className="size-3.5" />,
          run: (rows) => {
            const pending = rows.filter((t) => t.inviteStatus === "pending");
            pending.forEach((t) => log(PLATFORM_USER.name, "tenant.invite.resent", `Owner invite re-sent to ${t.owner.email}`, t.id));
            toast.success(pending.length ? `Invite re-sent to ${pending.length} owner(s)` : "No pending invites in selection");
          },
        },
        {
          label: "Suspend",
          variant: "danger",
          icon: <PauseCircle className="size-3.5" />,
          run: (rows) => {
            rows.forEach((t) => updateTenant(t.id, { status: "suspended" }, PLATFORM_USER.name, "tenant.suspend", `Suspended ${t.shortName}`));
            toast(`${rows.length} tenant(s) suspended`, { description: "Users see a read-only banner; data is retained" });
          },
        },
      ]}
    />
  );
}
