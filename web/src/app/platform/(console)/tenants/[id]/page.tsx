"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  Check,
  CircleCheck,
  CreditCard,
  Download,
  LifeBuoy,
  LogIn,
  Mail,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, Notebook } from "@/components/erp/form-view";
import { PlatformPage } from "@/components/platform/platform-shell";
import { HealthBadge, Meter, StageBadge, TenantAvatar, TenantStatusBadge } from "@/components/platform/p1-common";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Dialog, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/overlay";
import {
  featureOn,
  FEATURES,
  mrrOf,
  onboardingProgress,
  type PlanKey,
  PLANS,
  planPrice,
  PLATFORM_USER,
  STAGES,
  type SubscriptionInvoice,
  type SupportGrant,
  type TenantStage,
  TEMPLATES,
  usePlatform,
} from "@/lib/store/platform";
import { cn, daysBetween, formatDate, formatDateTime, formatINR, formatINR0, TODAY } from "@/lib/utils";

const INV_TONE: Record<SubscriptionInvoice["status"], Tone> = { paid: "success", due: "warning", overdue: "danger", draft: "neutral", void: "neutral" };
const GRANT_TONE: Record<SupportGrant["status"], Tone> = { requested: "warning", active: "success", expired: "neutral", revoked: "neutral", denied: "danger" };

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = usePlatform((s) => s.tenants.find((x) => x.id === id));
  const allInvoices = usePlatform((s) => s.invoices);
  const allGrants = usePlatform((s) => s.grants);
  const allSessions = usePlatform((s) => s.sessions);
  const allAudit = usePlatform((s) => s.audit);
  const updateTenant = usePlatform((s) => s.updateTenant);
  const setStage = usePlatform((s) => s.setStage);
  const toggleChecklist = usePlatform((s) => s.toggleChecklist);
  const setOverride = usePlatform((s) => s.setOverride);
  const requestGrant = usePlatform((s) => s.requestGrant);
  const startImpersonation = usePlatform((s) => s.startImpersonation);
  const log = usePlatform((s) => s.log);

  const [planOpen, setPlanOpen] = React.useState(false);
  const [suspendOpen, setSuspendOpen] = React.useState(false);
  const [offboardOpen, setOffboardOpen] = React.useState(false);
  const [grantOpen, setGrantOpen] = React.useState(false);

  if (!t) {
    return (
      <PlatformPage title="Tenant not found" crumbs={[{ label: "Platform", href: "/platform" }, { label: "Tenants", href: "/platform/tenants" }]}>
        <EmptyState icon={<Building2 />} title="This tenant does not exist" body="It may have been offboarded or the link is wrong." action={<Link href="/platform/tenants" className="text-sm text-primary-700 hover:underline">Back to tenants</Link>} />
      </PlatformPage>
    );
  }

  const invoices = allInvoices.filter((i) => i.tenantId === t.id);
  const grants = allGrants.filter((g) => g.tenantId === t.id);
  const sessions = allSessions.filter((s) => s.tenantId === t.id);
  const audit = allAudit.filter((a) => a.tenantId === t.id);
  const progress = onboardingProgress(t);
  const limits = PLANS[t.plan].limits;
  const suspended = t.status === "suspended";

  const resendInvite = () => {
    log(PLATFORM_USER.name, "tenant.invite.resent", `Owner invite re-sent to ${t.owner.email}`, t.id);
    toast.success("Invite re-sent", { description: `${t.owner.email} · also on WhatsApp ${t.owner.phone}` });
  };

  const openSession = (g: SupportGrant) => {
    startImpersonation(g.id, PLATFORM_USER.name);
    toast(`Support session started in ${t.shortName}`, { description: `${g.scope === "read_only" ? "Read-only" : "Configure"} access until ${formatDateTime(g.until)} · every action is audited` });
    router.push("/dashboard");
  };

  return (
    <PlatformPage
      crumbs={[{ label: "Platform", href: "/platform" }, { label: "Tenants", href: "/platform/tenants" }, { label: t.shortName }]}
      title={
        <span className="flex flex-wrap items-center gap-3">
          <TenantAvatar t={t} size="lg" />
          <span className="min-w-0">
            <span className="block">{t.name}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-2 text-sm font-normal text-ink-3">
              <span className="font-mono">{t.code}</span>·<span className="font-mono">{t.gstin}</span>·<span>{t.city}, {t.state}</span>
            </span>
          </span>
        </span>
      }
      actions={
        <>
          <TenantStatusBadge status={t.status} />
          <StageBadge stage={t.stage} />
          <HealthBadge health={t.health} />
          {t.inviteStatus === "pending" && (
            <Button onClick={resendInvite}><Mail /> Resend invite</Button>
          )}
          <Button onClick={() => setPlanOpen(true)}><Sparkles /> Change plan</Button>
          <Menu>
            <MenuTrigger asChild>
              <Button size="icon" aria-label="More actions"><MoreHorizontal /></Button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem icon={<LifeBuoy />} onSelect={() => setGrantOpen(true)}>Request support access</MenuItem>
              <MenuItem icon={<Download />} onSelect={() => toast.success("Full export queued", { description: "CSV + Tally XML; link emailed to the owner" })}>Export tenant data</MenuItem>
              <MenuSeparator />
              {suspended ? (
                <MenuItem icon={<PlayCircle />} onSelect={() => setSuspendOpen(true)}>Reactivate</MenuItem>
              ) : (
                <MenuItem icon={<PauseCircle />} onSelect={() => setSuspendOpen(true)}>Suspend</MenuItem>
              )}
              <MenuItem icon={<UserX />} danger onSelect={() => setOffboardOpen(true)} disabled={t.status === "offboarding"}>Start offboarding</MenuItem>
            </MenuContent>
          </Menu>
        </>
      }
    >
      {suspended && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-warning/20 bg-warning-bg px-4 py-2.5 text-sm text-ink">
          <PauseCircle className="size-4 text-warning" /> Suspended — users can sign in read-only; shop-floor terminals and integrations are paused.
        </div>
      )}
      {t.status === "offboarding" && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-danger/20 bg-danger-bg px-4 py-2.5 text-sm text-ink">
          <UserX className="size-4 text-danger" /> Offboarding — final export delivered to the owner; data is deleted 30 days after the export is confirmed.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Summary label="MRR" value={formatINR0(mrrOf(t))} hint={`${PLANS[t.plan].name} · ${t.cycle}`} />
        <Summary label="Onboarding" value={`${progress}%`} hint={t.wentLiveOn ? `Live since ${formatDate(t.wentLiveOn)}` : `Target ${formatDate(t.goLiveTarget)}`} />
        <Summary label="Office users" value={`${t.usage.users} / ${limits.users}`} hint={`${t.usage.terminals} terminals`} />
        <Summary label="Invoices this month" value={String(t.usage.invoicesMtd)} hint={`${t.usage.productionEventsMtd.toLocaleString("en-IN")} production events`} />
      </div>

      <div className="mt-4 rounded-xl border border-line bg-surface px-5 pb-5 shadow-xs">
        <Notebook
          tabs={[
            {
              key: "overview",
              label: "Overview",
              content: (
                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="space-y-4 xl:col-span-2">
                    <Card title="Company">
                      <dl className="grid gap-x-8 gap-y-2.5 text-sm sm:grid-cols-2">
                        <Info k="Legal name" v={t.name} />
                        <Info k="GSTIN" v={<span className="font-mono">{t.gstin}</span>} />
                        <Info k="Location" v={`${t.city}, ${t.state}`} />
                        <Info k="Turnover band" v={t.turnoverBand} />
                        <Info k="Industry template" v={TEMPLATES[t.template].label} />
                        <Info k="Region" v={`${t.region} (Mumbai)`} />
                        <Info k="Signed on" v={formatDate(t.signedOn)} />
                        <Info k="Onboarding fee" v={t.onboardingFee ? formatINR0(t.onboardingFee) : "Waived"} />
                      </dl>
                    </Card>
                    <Card title="People">
                      <dl className="grid gap-x-8 gap-y-2.5 text-sm sm:grid-cols-2">
                        <Info k="Owner" v={t.owner.name} />
                        <Info k="Owner invite" v={<Badge tone={t.inviteStatus === "accepted" ? "success" : t.inviteStatus === "pending" ? "warning" : "danger"}>{t.inviteStatus === "accepted" ? "Accepted" : t.inviteStatus === "pending" ? "Pending" : "Expired"}</Badge>} />
                        <Info k="Email" v={t.owner.email} />
                        <Info k="Mobile" v={t.owner.phone} />
                        <Info k="Onboarding manager" v={t.onboardingManager} />
                        <Info k="Last active" v={t.lastActive ? formatDateTime(t.lastActive) : "Never signed in"} />
                      </dl>
                    </Card>
                    <NotesCard
                      key={t.notes}
                      notes={t.notes}
                      onSave={(n) => { updateTenant(t.id, { notes: n }, PLATFORM_USER.name, "tenant.note", "Updated internal notes"); toast.success("Notes saved"); }}
                    />
                  </div>
                  <Card
                    title="Go-live checklist"
                    action={<span className="tabular text-xs font-medium text-ink-2">{progress}%</span>}
                  >
                    <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full bg-primary-600 transition-[width]" style={{ width: `${progress}%` }} />
                    </div>
                    <Field label="Stage" layout="vertical" htmlFor="stg" className="mb-3">
                      <Select id="stg" value={t.stage} onChange={(e) => { setStage(t.id, e.target.value as TenantStage, PLATFORM_USER.name); toast.success("Stage updated"); }}>
                        {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                        <option value="churned">Churned</option>
                      </Select>
                    </Field>
                    <ul className="space-y-1">
                      {t.checklist.map((c) => (
                        <li key={c.key}>
                          <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-surface-2">
                            <Checkbox className="mt-0.5" checked={c.done} onChange={() => toggleChecklist(t.id, c.key)} />
                            <span className={cn("text-sm", c.done ? "text-ink-3 line-through" : "text-ink")}>{c.label}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              ),
            },
            {
              key: "plan",
              label: "Plan & features",
              content: (
                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="xl:col-span-2">
                    <div className="overflow-hidden rounded-xl border border-line">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-surface-2 text-left text-xs text-ink-3">
                            <th className="h-9 px-3 font-semibold">Feature</th>
                            <th className="h-9 px-3 font-semibold">{PLANS[t.plan].name} plan</th>
                            <th className="h-9 px-3 font-semibold">Override</th>
                            <th className="h-9 px-3 text-right font-semibold">Effective</th>
                          </tr>
                        </thead>
                        <tbody>
                          {FEATURES.map((f) => {
                            const inPlan = PLANS[t.plan].features.includes(f.key);
                            const ov = f.key in t.overrides ? t.overrides[f.key] : null;
                            const on = featureOn(t, f.key);
                            return (
                              <tr key={f.key} className="border-t border-line">
                                <td className="px-3 py-2.5">
                                  <div className="font-medium">{f.label}</div>
                                  <div className="font-mono text-xs text-ink-3">{f.key}</div>
                                </td>
                                <td className="px-3 py-2.5">{inPlan ? <span className="inline-flex items-center gap-1 text-success"><Check className="size-4" /> Included</span> : <span className="text-ink-3">Not included</span>}</td>
                                <td className="px-3 py-2.5">
                                  <div className="inline-flex rounded-md border border-line-strong p-0.5" role="group" aria-label={`Override for ${f.label}`}>
                                    {([["Plan", null], ["On", true], ["Off", false]] as const).map(([label, val]) => (
                                      <button
                                        key={label}
                                        aria-pressed={ov === val}
                                        onClick={() => {
                                          if (ov === val) return;
                                          setOverride(t.id, f.key, val, PLATFORM_USER.name);
                                          toast.success(`${f.label}: ${val === null ? "follows plan" : val ? "forced on" : "forced off"}`);
                                        }}
                                        className={cn("h-6 rounded px-2 text-xs font-medium", ov === val ? (val === null ? "bg-surface-3 text-ink" : val ? "bg-success text-white" : "bg-danger text-white") : "text-ink-3 hover:bg-surface-3")}
                                      >
                                        {label}
                                      </button>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  <Badge tone={on ? "success" : "neutral"}>{on ? "Enabled" : "Disabled"}</Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 text-xs text-ink-3">Overrides sit on top of plan entitlements (arch §9.5) and take effect on the tenant&apos;s next request. Every change is audited.</p>
                  </div>
                  <Card title="Usage vs plan limits" action={<Button size="sm" onClick={() => setPlanOpen(true)}>Change plan</Button>}>
                    <div className="space-y-4">
                      <Meter label="Office users" used={t.usage.users} limit={limits.users} />
                      <Meter label="Shop-floor terminals" used={t.usage.terminals} limit={limits.terminals} />
                      <Meter label="WhatsApp messages (month)" used={t.usage.whatsapp} limit={limits.whatsapp} />
                      <Meter label="Document storage" used={t.usage.storageGb} limit={limits.storageGb} unit=" GB" />
                      <div className="flex justify-between border-t border-line pt-3 text-sm">
                        <span className="text-ink-2">e-Invoices this month</span>
                        <span className="tabular font-medium">{t.usage.invoicesMtd} <span className="text-ink-3">· unlimited</span></span>
                      </div>
                    </div>
                  </Card>
                </div>
              ),
            },
            {
              key: "users",
              label: "Users",
              count: t.users.length,
              content:
                t.users.length === 0 ? (
                  <EmptyState icon={<Mail />} title="No users yet" body={`The owner invite to ${t.owner.email} has not been accepted.`} action={<Button size="sm" onClick={resendInvite}>Resend invite</Button>} />
                ) : (
                  <div className="overflow-hidden rounded-xl border border-line">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface-2 text-left text-xs text-ink-3">
                          <th className="h-9 px-3 font-semibold">Name</th>
                          <th className="h-9 px-3 font-semibold">Role</th>
                          <th className="h-9 px-3 font-semibold">2FA</th>
                          <th className="h-9 px-3 font-semibold">Last active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.users.map((u) => (
                          <tr key={u.email} className="border-t border-line">
                            <td className="px-3 py-2.5">
                              <div className="font-medium">{u.name}</div>
                              <div className="text-xs text-ink-3">{u.email}</div>
                            </td>
                            <td className="px-3 py-2.5">{u.role}</td>
                            <td className="px-3 py-2.5">
                              {u.twoFactor ? (
                                <span className="inline-flex items-center gap-1 text-success"><ShieldCheck className="size-4" /> On</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-warning"><ShieldOff className="size-4" /> Off</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-ink-2">{formatDateTime(u.lastActive)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="border-t border-line bg-surface-2 px-3 py-2 text-xs text-ink-3">
                      Users are managed by the tenant owner. Platform staff see names and roles only — no business data.
                    </p>
                  </div>
                ),
            },
            {
              key: "billing",
              label: "Billing",
              count: invoices.length,
              content:
                invoices.length === 0 ? (
                  <EmptyState icon={<CreditCard />} title="No invoices yet" />
                ) : (
                  <div className="overflow-hidden rounded-xl border border-line">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface-2 text-left text-xs text-ink-3">
                          <th className="h-9 px-3 font-semibold">Invoice</th>
                          <th className="h-9 px-3 font-semibold">Period</th>
                          <th className="h-9 px-3 font-semibold">Due</th>
                          <th className="h-9 px-3 text-right font-semibold">Amount incl. GST</th>
                          <th className="h-9 px-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((i) => (
                          <tr key={i.id} className="border-t border-line">
                            <td className="px-3 py-2.5">
                              <div className="font-mono text-[12.5px] font-medium">{i.number}</div>
                              <div className="text-xs text-ink-3">{i.description}</div>
                            </td>
                            <td className="px-3 py-2.5">{i.period}</td>
                            <td className={cn("px-3 py-2.5", i.status === "overdue" && "text-danger")}>
                              {formatDate(i.dueDate)}
                              {i.status === "overdue" && <span className="block text-xs">{daysBetween(i.dueDate, TODAY)}d overdue</span>}
                            </td>
                            <td className="tabular px-3 py-2.5 text-right">{formatINR(i.amount + i.gst)}</td>
                            <td className="px-3 py-2.5"><Badge tone={INV_TONE[i.status]}>{i.status[0].toUpperCase() + i.status.slice(1)}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex justify-end border-t border-line bg-surface-2 px-3 py-2">
                      <Link href="/platform/billing" className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline">
                        Open subscription billing <ArrowUpRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                ),
            },
            {
              key: "support",
              label: "Support",
              count: grants.filter((g) => g.status === "active" || g.status === "requested").length,
              content: (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 px-4 py-3">
                    <p className="flex items-center gap-2 text-sm text-ink-2">
                      <ShieldCheck className="size-4 text-success" /> Support can enter a tenant only with a time-boxed grant approved by the tenant owner (G17).
                    </p>
                    <Button size="sm" onClick={() => setGrantOpen(true)}><LifeBuoy /> Request access</Button>
                  </div>
                  {grants.length === 0 ? (
                    <EmptyState icon={<LifeBuoy />} title="No support grants" body="Request access when the tenant needs help configuring or troubleshooting." />
                  ) : (
                    <ul className="space-y-2">
                      {grants.map((g) => (
                        <li key={g.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium">{g.reason}</span>
                              <Badge tone={GRANT_TONE[g.status]}>{g.status[0].toUpperCase() + g.status.slice(1)}</Badge>
                              <Badge tone="neutral" dot={false}>{g.scope === "read_only" ? "Read-only" : "Configure"}</Badge>
                            </div>
                            <div className="mt-0.5 text-xs text-ink-3">
                              Requested by {g.requestedBy}
                              {g.grantedBy && ` · granted by ${g.grantedBy}`} · {formatDateTime(g.from)} → {formatDateTime(g.until)}
                            </div>
                          </div>
                          {g.status === "active" && (
                            <Button variant="primary" size="sm" onClick={() => openSession(g)}><LogIn /> Open support session</Button>
                          )}
                          {g.status === "requested" && <span className="text-xs text-ink-3">Waiting for {t.owner.name} to approve</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {sessions.length > 0 && (
                    <Card title="Session history" bodyClassName="p-0">
                      <ul>
                        {sessions.map((s) => (
                          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5 text-sm last:border-b-0">
                            <span>
                              <span className="font-medium">{s.staff}</span> <span className="text-ink-2">· {s.reason}</span>
                            </span>
                            <span className="text-xs text-ink-3">
                              {formatDateTime(s.startedAt)} → {s.endedAt ? formatDateTime(s.endedAt) : "active"} · {s.actions} actions
                            </span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}
                </div>
              ),
            },
            {
              key: "activity",
              label: "Activity",
              count: audit.length,
              content:
                audit.length === 0 ? (
                  <EmptyState icon={<CircleCheck />} title="No platform activity yet" />
                ) : (
                  <ol className="relative ml-3 border-l border-line">
                    {audit.map((a) => (
                      <li key={a.id} className="relative pb-4 pl-5 last:pb-0">
                        <span className="absolute top-1.5 -left-[5px] size-2.5 rounded-full border-2 border-surface bg-primary-600" />
                        <div className="text-sm">
                          <span className="font-medium">{a.staff}</span> <span className="text-ink-2">{a.detail}</span>
                        </div>
                        <div className="mt-0.5 flex gap-2 text-xs text-ink-3">
                          <span className="font-mono">{a.action}</span>
                          <span>{formatDateTime(a.at)}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                ),
            },
          ]}
        />
      </div>

      <ChangePlanDialog
        open={planOpen}
        onOpenChange={setPlanOpen}
        current={t.plan}
        cycle={t.cycle}
        usersUsed={t.usage.users}
        onConfirm={(plan, cycle) => {
          updateTenant(t.id, { plan, cycle }, PLATFORM_USER.name, "tenant.plan", `Changed plan to ${PLANS[plan].name} (${cycle})`);
          toast.success(`Plan changed to ${PLANS[plan].name}`, { description: "Entitlements applied immediately; proration on next invoice" });
          setPlanOpen(false);
        }}
      />

      <Dialog
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        title={suspended ? `Reactivate ${t.shortName}?` : `Suspend ${t.shortName}?`}
        description={suspended ? "Users regain full access and terminals resume syncing." : "Users keep read-only access. Terminals, integrations and posting stop until reactivated."}
        size="sm"
        footer={
          <>
            <Button onClick={() => setSuspendOpen(false)}>Cancel</Button>
            <Button
              variant={suspended ? "primary" : "danger"}
              onClick={() => {
                updateTenant(t.id, { status: suspended ? "active" : "suspended" }, PLATFORM_USER.name, suspended ? "tenant.reactivate" : "tenant.suspend", `${suspended ? "Reactivated" : "Suspended"} ${t.shortName}`);
                toast.success(suspended ? "Tenant reactivated" : "Tenant suspended");
                setSuspendOpen(false);
              }}
            >
              {suspended ? "Reactivate" : "Suspend tenant"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">The owner is notified by email and WhatsApp. This action is recorded in the platform audit log.</p>
      </Dialog>

      <OffboardDialog
        open={offboardOpen}
        onOpenChange={setOffboardOpen}
        name={t.shortName}
        onConfirm={() => {
          updateTenant(t.id, { status: "offboarding" }, PLATFORM_USER.name, "tenant.offboard", `Started offboarding ${t.shortName}`);
          toast("Offboarding started", { description: "Full export generated for the owner; deletion scheduled 30 days after confirmation" });
          setOffboardOpen(false);
        }}
      />

      <RequestGrantDialog
        open={grantOpen}
        onOpenChange={setGrantOpen}
        owner={t.owner.name}
        onSubmit={(scope, reason, hours) => {
          const from = new Date(`${TODAY}T14:15:00`);
          const until = new Date(from.getTime() + hours * 3600e3);
          requestGrant({ tenantId: t.id, scope, reason, from: from.toISOString().slice(0, 19), until: until.toISOString().slice(0, 19), requestedBy: PLATFORM_USER.name });
          toast.success("Access requested", { description: `${t.owner.name} gets an in-app and WhatsApp prompt to approve` });
          setGrantOpen(false);
        }}
      />
    </PlatformPage>
  );
}

/* ---------------- Pieces ---------------- */

function Summary({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3 shadow-xs">
      <div className="text-xs font-medium text-ink-3">{label}</div>
      <div className="tabular mt-1 text-xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 truncate text-xs text-ink-3">{hint}</div>}
    </div>
  );
}

function Info({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2">
      <dt className="text-ink-3">{k}</dt>
      <dd className="min-w-0 break-words">{v}</dd>
    </div>
  );
}

function NotesCard({ notes, onSave }: { notes: string; onSave: (n: string) => void }) {
  const [text, setText] = React.useState(notes);
  return (
    <Card title="Internal notes" action={text !== notes ? <Button size="sm" variant="primary" onClick={() => onSave(text)}>Save</Button> : <span className="text-xs text-ink-3">Platform staff only</span>}>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Context, risks, promises made to the customer…" aria-label="Internal notes" />
    </Card>
  );
}

function ChangePlanDialog({
  open,
  onOpenChange,
  current,
  cycle,
  usersUsed,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  current: PlanKey;
  cycle: "monthly" | "annual";
  usersUsed: number;
  onConfirm: (p: PlanKey, c: "monthly" | "annual") => void;
}) {
  const [plan, setPlan] = React.useState<PlanKey>(current);
  const [cyc, setCyc] = React.useState(cycle);
  const over = usersUsed > PLANS[plan].limits.users;
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (o) { setPlan(current); setCyc(cycle); } }}
      title="Change plan"
      description="Entitlements switch immediately. The difference is prorated on the next subscription invoice."
      size="lg"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" disabled={(plan === current && cyc === cycle) || over} onClick={() => onConfirm(plan, cyc)}>Apply change</Button>
        </>
      }
    >
      <div className="mb-3 flex justify-end">
        <div className="flex rounded-md border border-line-strong p-0.5" role="group" aria-label="Billing cycle">
          {(["monthly", "annual"] as const).map((c) => (
            <button key={c} onClick={() => setCyc(c)} aria-pressed={cyc === c} className={cn("h-7 rounded px-3 text-xs font-medium", cyc === c ? "bg-primary-600 text-white" : "text-ink-2 hover:bg-surface-3")}>
              {c === "monthly" ? "Monthly" : "Annual −15%"}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(PLANS) as PlanKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setPlan(k)}
            aria-pressed={plan === k}
            className={cn("rounded-xl border p-3 text-left", plan === k ? "border-primary-500 ring-3 ring-primary-500/15" : "border-line hover:border-line-strong")}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{PLANS[k].name}</span>
              {k === current && <Badge tone="brand" dot={false}>Current</Badge>}
            </div>
            <div className="tabular mt-1 text-lg font-semibold">{formatINR0(planPrice(k, cyc))}<span className="text-xs font-normal text-ink-3"> /mo</span></div>
            <div className="mt-1 text-xs text-ink-3">{PLANS[k].limits.users} users · {PLANS[k].limits.terminals} terminals</div>
          </button>
        ))}
      </div>
      {over && (
        <p className="mt-3 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
          The tenant has {usersUsed} office users; {PLANS[plan].name} allows {PLANS[plan].limits.users}. Ask the owner to deactivate users first.
        </p>
      )}
    </Dialog>
  );
}

function OffboardDialog({ open, onOpenChange, name, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; name: string; onConfirm: () => void }) {
  const [typed, setTyped] = React.useState("");
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) setTyped(""); }}
      title="Start offboarding"
      description="Generates a full export (CSV, Excel, Tally XML) for the owner, stops billing and schedules deletion 30 days after the export is confirmed (G16)."
      size="sm"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="danger" disabled={typed !== name} onClick={onConfirm}>Start offboarding</Button>
        </>
      }
    >
      <Field layout="vertical" label={`Type "${name}" to confirm`} htmlFor="conf">
        <Input id="conf" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      </Field>
    </Dialog>
  );
}

function RequestGrantDialog({
  open,
  onOpenChange,
  owner,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  owner: string;
  onSubmit: (scope: SupportGrant["scope"], reason: string, hours: number) => void;
}) {
  const [scope, setScope] = React.useState<SupportGrant["scope"]>("read_only");
  const [reason, setReason] = React.useState("");
  const [hours, setHours] = React.useState(24);
  const [err, setErr] = React.useState("");
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) { setReason(""); setErr(""); } }}
      title="Request support access"
      description={`${owner} must approve before anyone from the platform can open the tenant.`}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (reason.trim().length < 10) return setErr("Describe why access is needed (at least 10 characters)");
              onSubmit(scope, reason.trim(), hours);
              setReason("");
              setErr("");
            }}
          >
            Send request
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {([["read_only", "Read-only", "View screens and data; cannot post or change"], ["configure", "Configure", "Change settings, masters and imports; cannot post vouchers"]] as const).map(([k, l, d]) => (
            <label key={k} className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg border p-3", scope === k ? "border-primary-500 bg-primary-50/40" : "border-line")}>
              <input type="radio" name="scope" className="mt-1 accent-primary-600" checked={scope === k} onChange={() => setScope(k)} />
              <span>
                <span className="block text-sm font-medium">{l}</span>
                <span className="block text-xs text-ink-3">{d}</span>
              </span>
            </label>
          ))}
        </div>
        <Field layout="vertical" label="Reason" required error={err} htmlFor="rsn">
          <Textarea id="rsn" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Fix opening stock import errors reported on call" />
        </Field>
        <Field layout="vertical" label="Duration" htmlFor="dur">
          <Select id="dur" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            {[[4, "4 hours"], [24, "24 hours"], [72, "3 days"], [168, "7 days"]].map(([h, l]) => <option key={h} value={h}>{l}</option>)}
          </Select>
        </Field>
      </div>
    </Dialog>
  );
}
