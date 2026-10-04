"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarRange,
  Check,
  CheckCheck,
  CircleAlert,
  CreditCard,
  Database,
  FileDown,
  FileText,
  FileUp,
  KeyRound,
  LifeBuoy,
  Mail,
  Phone,
  ScrollText,
  ShieldCheck,
  Tablet,
  UserPlus,
  Users,
} from "lucide-react";
import { Section, SettingsShell } from "@/components/settings/settings-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { company } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { useApprovals } from "@/lib/store/approvals";
import { onboardingProgress, PLANS, planPrice, usePlatform } from "@/lib/store/platform";
import { useSettings } from "@/lib/store/settings";
import { cn, formatDate, formatINR0 } from "@/lib/utils";

/** Where each go-live checklist step is completed in the tenant app. */
const CHECK_LINK: Record<string, { href: string; cta: string }> = {
  invite: { href: "/profile", cta: "Security" },
  company: { href: "/settings", cta: "Company" },
  template: { href: "/onboarding", cta: "Onboarding" },
  masters: { href: "/settings/import", cta: "Import" },
  opening: { href: "/settings/fiscal", cta: "Opening balances" },
  gsp: { href: "/settings", cta: "GST settings" },
  terminals: { href: "/settings/terminals", cta: "Terminals" },
  training: { href: "/settings/users", cta: "Users" },
  golive: { href: "/finance/invoices", cta: "Invoices" },
};

const QUICK = [
  { href: "/settings", label: "Company", desc: "Legal entity, GSTIN, number series", icon: Building2 },
  { href: "/settings/fiscal", label: "Financial year & locks", desc: "Periods, lock date, opening balances", icon: CalendarRange },
  { href: "/settings/billing", label: "Plan & billing", desc: "Usage, invoices, plan changes", icon: CreditCard },
  { href: "/settings/users", label: "Users & roles", desc: "Invite users, permissions, field rules", icon: Users },
  { href: "/settings/terminals", label: "Terminals & operators", desc: "Shop-floor devices and PINs", icon: Tablet },
  { href: "/settings/audit-log", label: "Audit log", desc: "Who changed what, from which device", icon: ScrollText },
  { href: "/settings/support-access", label: "Support access", desc: "Approve or revoke platform support", icon: LifeBuoy },
  { href: "/settings/masters", label: "Master data", desc: "UoM, reason codes, HSN, shifts", icon: Database },
  { href: "/settings/approval-rules", label: "Approval rules", desc: "Limits for POs, discounts, payments", icon: CheckCheck },
  { href: "/settings/templates", label: "Document templates", desc: "Invoice, challan, PO, job card", icon: FileText },
  { href: "/settings/notifications", label: "Notifications", desc: "WhatsApp, SMS, email preferences", icon: Bell },
  { href: "/settings/import", label: "Data import", desc: "Excel, CSV and Tally masters", icon: FileUp },
  { href: "/settings/data-export", label: "Data export", desc: "Full export and backups", icon: FileDown },
];

const STAFF_CONTACT: Record<string, { email: string; phone: string }> = {
  "Pooja Nair": { email: "pooja@factoryerp.in", phone: "+91 80 4718 2201" },
  "Arjun Mehta": { email: "arjun@factoryerp.in", phone: "+91 80 4718 2202" },
};

export default function AdminHomePage() {
  const role = useRole();
  const tenant = usePlatform((s) => s.tenants.find((t) => t.id === company.tenantId));
  const allGrants = usePlatform((s) => s.grants);
  const toggleChecklist = usePlatform((s) => s.toggleChecklist);
  const users = useSettings((s) => s.users);
  const terminals = useSettings((s) => s.terminals);
  const requests = useApprovals((s) => s.requests);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setHydrated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!hydrated || !tenant) {
    return (
      <SettingsShell title="Admin home">
        <div className="mx-auto max-w-6xl animate-pulse space-y-4">
          <div className="h-40 rounded-xl bg-surface-3" />
          <div className="h-64 rounded-xl bg-surface-3" />
        </div>
      </SettingsShell>
    );
  }

  const grants = allGrants.filter((g) => g.tenantId === company.tenantId);
  const approvals = requests.filter((r) => r.status === "pending");
  const plan = PLANS[tenant.plan];
  const pct = onboardingProgress(tenant);
  const activeUsers = users.filter((u) => u.status !== "disabled");
  const invited = users.filter((u) => u.status === "invited");
  // External users (e.g. the CA, arch §5.1) get read-only, time-boxed access and don't consume an office seat.
  const ownDomain = tenant.owner.email.split("@")[1];
  const seatUsers = activeUsers.filter((u) => u.email.endsWith(`@${ownDomain}`));
  const withoutTwoFa = activeUsers.filter((u) => u.status === "active" && !u.twoFactor);
  const twoFaPct = Math.round((activeUsers.filter((u) => u.twoFactor).length / Math.max(activeUsers.length, 1)) * 100);
  const liveTerminals = terminals.filter((t) => t.status !== "revoked");
  const pendingGrants = grants.filter((g) => g.status === "requested");
  const contact = STAFF_CONTACT[tenant.onboardingManager] ?? { email: "onboarding@factoryerp.in", phone: "+91 80 4718 2200" };
  const isOwner = role.key === "owner";

  return (
    <SettingsShell
      title="Admin home"
      actions={
        <>
          <Link href="/settings/users"><Button><UserPlus /> Invite user</Button></Link>
          <Link href="/settings/billing"><Button variant="primary"><CreditCard /> Plan & billing</Button></Link>
        </>
      }
    >
      <div className="mx-auto max-w-6xl space-y-4">
        {/* Hero */}
        <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
          <div className="flex flex-col gap-6 p-5 md:flex-row md:items-center">
            <ProgressRing pct={pct} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">{tenant.shortName}</h1>
                {tenant.stage === "live" ? <Badge tone="success">Live since {formatDate(tenant.wentLiveOn)}</Badge> : <Badge tone="warning">Go-live target {formatDate(tenant.goLiveTarget)}</Badge>}
                <Badge tone="brand" dot={false}>{plan.name} plan</Badge>
              </div>
              <p className="mt-1 text-sm text-ink-2">
                {pct === 100
                  ? "Setup is complete. Keep users, rules and masters tidy from here."
                  : `${tenant.checklist.filter((c) => !c.done).length} setup steps left before go-live.`}{" "}
                Workspace <span className="font-mono text-[13px]">{tenant.code.toLowerCase()}.factoryerp.in</span> · GSTIN <span className="font-mono text-[13px]">{tenant.gstin}</span>
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Kpi label="Office users" value={`${seatUsers.length} / ${plan.limits.users}`} warn={seatUsers.length > plan.limits.users} />
                <Kpi label="Terminals" value={`${liveTerminals.length} / ${plan.limits.terminals}`} warn={liveTerminals.length >= plan.limits.terminals} />
                <Kpi label="2FA coverage" value={`${twoFaPct}%`} warn={twoFaPct < 100} />
                <Kpi label="Pending approvals" value={String(approvals.length)} warn={approvals.length > 0} />
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          {/* Checklist */}
          <Section title="Go-live checklist" desc="Shared with your onboarding manager — they see the same progress.">
            <ul className="-my-2 divide-y divide-line">
              {tenant.checklist.map((c) => {
                const link = CHECK_LINK[c.key];
                return (
                  <li key={c.key} className="flex items-center gap-3 py-2.5">
                    <button
                      onClick={() => isOwner && toggleChecklist(tenant.id, c.key)}
                      disabled={!isOwner}
                      aria-pressed={c.done}
                      aria-label={`Mark "${c.label}" ${c.done ? "not done" : "done"}`}
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                        c.done ? "border-success bg-success text-white" : "border-line-strong bg-surface hover:border-primary-500",
                      )}
                    >
                      {c.done && <Check className="size-3" />}
                    </button>
                    <span className={cn("flex-1 text-sm", c.done ? "text-ink-3 line-through decoration-ink-3/40" : "font-medium")}>{c.label}</span>
                    {link && !c.done && (
                      <Link href={link.href} className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline">
                        {link.cta} <ArrowRight className="size-3" />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>

          <div className="space-y-4">
            {/* Needs attention */}
            <Section title="Needs your attention">
              <ul className="-my-1 space-y-1">
                <Attention
                  show={pendingGrants.length > 0}
                  tone="warning"
                  icon={<LifeBuoy />}
                  text={`${pendingGrants.length} support access request${pendingGrants.length > 1 ? "s" : ""} from Factory ERP`}
                  href="/settings/support-access"
                />
                <Attention show={approvals.length > 0} tone="warning" icon={<CheckCheck />} text={`${approvals.length} documents waiting for approval`} href="/approvals" />
                <Attention show={withoutTwoFa.length > 0} tone="danger" icon={<KeyRound />} text={`${withoutTwoFa.length} users without 2FA: ${withoutTwoFa.map((u) => u.name.split(" ")[0]).join(", ")}`} href="/settings/users" />
                <Attention show={invited.length > 0} tone="info" icon={<Mail />} text={`${invited.length} invitations not yet accepted`} href="/settings/users" />
                {pendingGrants.length === 0 && approvals.length === 0 && withoutTwoFa.length === 0 && invited.length === 0 && (
                  <li className="flex items-center gap-2 py-2 text-sm text-success"><Check className="size-4" /> All clear</li>
                )}
              </ul>
            </Section>

            {/* Security */}
            <Section title="Security posture" desc="Owner and Accountant must use 2FA (enforced).">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-ink-2">Users with 2FA</span>
                <span className="tabular font-semibold">{activeUsers.filter((u) => u.twoFactor).length} of {activeUsers.length}</span>
              </div>
              <div className="h-2 rounded-full bg-surface-3">
                <div className={cn("h-2 rounded-full", twoFaPct === 100 ? "bg-success" : twoFaPct >= 50 ? "bg-warning" : "bg-danger")} style={{ width: `${twoFaPct}%` }} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-ink-3">Password policy</dt><dd className="text-right">12+ chars, mixed</dd>
                <dt className="text-ink-3">Session timeout</dt><dd className="text-right">8 hours idle</dd>
                <dt className="text-ink-3">Terminal sign-in</dt><dd className="text-right">PIN / QR badge</dd>
                <dt className="text-ink-3">Data region</dt><dd className="text-right">India (Mumbai)</dd>
              </dl>
            </Section>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Section title="Plan" action={<Link href="/settings/billing" className="text-xs font-medium text-primary-700 hover:underline">Manage</Link>}>
            <div className="flex items-baseline gap-1">
              <span className="tabular text-2xl font-semibold">{formatINR0(planPrice(tenant.plan, tenant.cycle))}</span>
              <span className="text-sm text-ink-3">/ month + GST</span>
            </div>
            <p className="mt-1 text-sm text-ink-2">{plan.name} · {plan.tagline}</p>
            <div className="mt-4 space-y-2.5">
              <Meter label="WhatsApp messages" used={tenant.usage.whatsapp} limit={plan.limits.whatsapp} />
              <Meter label="Storage (GB)" used={tenant.usage.storageGb} limit={plan.limits.storageGb} />
            </div>
          </Section>

          <Section title="Your onboarding manager">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-800">
                {tenant.onboardingManager.split(" ").map((p) => p[0]).join("")}
              </span>
              <div>
                <div className="text-sm font-semibold">{tenant.onboardingManager}</div>
                <div className="text-xs text-ink-3">Factory ERP onboarding team</div>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-ink-2 hover:text-primary-700"><Mail className="size-4 text-ink-3" /> {contact.email}</a>
              <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 text-ink-2 hover:text-primary-700"><Phone className="size-4 text-ink-3" /> {contact.phone}</a>
            </div>
            <p className="mt-4 rounded-md bg-surface-3 px-3 py-2 text-xs text-ink-2">
              Support can only open your workspace after you approve a time-boxed request in <Link href="/settings/support-access" className="font-medium text-primary-700 hover:underline">Support access</Link>.
            </p>
          </Section>

          <Section title="Seats">
            <div className="space-y-2.5">
              <Meter label="Office users" used={seatUsers.length} limit={plan.limits.users} />
              <Meter label="Shop-floor terminals" used={liveTerminals.length} limit={plan.limits.terminals} />
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-md bg-success-bg px-3 py-2 text-xs text-success">
              <ShieldCheck className="size-4" /> Operators are unlimited on every plan
            </div>
          </Section>
        </div>

        <section>
          <h2 className="mb-2 px-1 text-sm font-semibold">All admin settings</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {QUICK.map((q) => {
              const Icon = q.icon;
              return (
                <Link key={q.href} href={q.href} className="group flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-xs transition hover:border-line-strong hover:shadow-sm">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700"><Icon className="size-[18px]" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{q.label}</span>
                    <span className="block truncate text-xs text-ink-3">{q.desc}</span>
                  </span>
                  <ArrowRight className="mt-1 size-4 text-ink-3 opacity-0 transition group-hover:opacity-100" />
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </SettingsShell>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-28 shrink-0" role="img" aria-label={`Setup ${pct}% complete`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="9" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={pct === 100 ? "var(--success)" : "var(--primary-600)"} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular text-2xl font-semibold">{pct}%</span>
        <span className="text-2xs text-ink-3">setup</span>
      </div>
    </div>
  );
}

function Kpi({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2">
      <div className="text-xs text-ink-3">{label}</div>
      <div className={cn("tabular mt-0.5 text-base font-semibold", warn && "text-warning")}>{value}</div>
    </div>
  );
}

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, (used / Math.max(limit, 1)) * 100);
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-ink-2">{label}</span>
        <span className="tabular font-medium">{used.toLocaleString("en-IN")} <span className="text-ink-3">/ {limit.toLocaleString("en-IN")}</span></span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-surface-3">
        <div className={cn("h-1.5 rounded-full", pct >= 90 ? "bg-danger" : pct >= 75 ? "bg-warning" : "bg-primary-600")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Attention({ show, tone, icon, text, href }: { show: boolean; tone: "warning" | "danger" | "info"; icon: React.ReactNode; text: string; href: string }) {
  if (!show) return null;
  const t = { warning: "bg-warning-bg text-warning", danger: "bg-danger-bg text-danger", info: "bg-info-bg text-info" }[tone];
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2">
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", t)}>{icon}</span>
        <span className="min-w-0 flex-1 text-sm">{text}</span>
        <CircleAlert className="size-3.5 text-ink-3" />
      </Link>
    </li>
  );
}
