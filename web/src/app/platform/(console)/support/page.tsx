"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Eye, Hourglass, KeyRound, LogIn, ShieldAlert, ShieldCheck, Wrench, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Banner } from "@/components/erp/form-view";
import { PlatformPage } from "@/components/platform/platform-shell";
import { Avatar, Segmented, StatCard, useTenantName } from "@/components/platform/p2-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/form";
import { Dialog } from "@/components/ui/overlay";
import { PLATFORM_USER, type SupportGrant, usePlatform } from "@/lib/store/platform";
import { cn, formatDateTime } from "@/lib/utils";

/** Demo clock aligned with the app's TODAY. */
const NOW = "2026-10-02T14:15:00";

const minutesBetween = (a: string, b: string) => Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 60000));
const fmtDuration = (min: number) => (min >= 60 * 24 ? `${Math.floor(min / 1440)}d ${Math.floor((min % 1440) / 60)}h` : min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`);

function ScopeBadge({ scope }: { scope: SupportGrant["scope"] }) {
  return scope === "read_only" ? (
    <Badge tone="info" dot={false}><Eye className="size-3" /> Read-only</Badge>
  ) : (
    <Badge tone="warning" dot={false}><Wrench className="size-3" /> Configure</Badge>
  );
}

export default function SupportAccessPage() {
  const router = useRouter();
  const grants = usePlatform((s) => s.grants);
  const sessions = usePlatform((s) => s.sessions);
  const impersonating = usePlatform((s) => s.impersonating);
  const start = usePlatform((s) => s.startImpersonation);
  const end = usePlatform((s) => s.endImpersonation);
  const revoke = usePlatform((s) => s.revokeGrant);
  const tenantName = useTenantName();
  const [tab, setTab] = React.useState<"requests" | "active" | "sessions" | "closed">("active");
  const [open, setOpen] = React.useState(false);

  // An "active" grant whose window has passed is treated as expired.
  const live = (g: SupportGrant) => g.status === "active" && g.until > NOW;
  const requests = grants.filter((g) => g.status === "requested");
  const active = grants.filter(live);
  const closed = grants.filter((g) => !live(g) && g.status !== "requested");
  const actions30 = sessions.reduce((a, s) => a + s.actions, 0);

  const openSession = (g: SupportGrant) => {
    start(g.id, PLATFORM_USER.name);
    toast.success(`Support session started in ${tenantName(g.tenantId)}`, { description: `${g.scope === "read_only" ? "Read-only" : "Configure"} access until ${formatDateTime(g.until)} · every action is audited` });
    router.push("/dashboard");
  };

  return (
    <PlatformPage
      title="Support access"
      subtitle="Staff can enter a tenant only with the tenant owner's time-boxed consent (G17). Sessions are recorded action by action."
      crumbs={[{ label: "Platform", href: "/platform" }, { label: "Support access" }]}
      actions={<Button variant="primary" onClick={() => setOpen(true)}><KeyRound /> Request access</Button>}
    >
      {impersonating && (
        <div className="mb-4 overflow-hidden rounded-xl border border-warning/30">
          <Banner
            tone="warning"
            icon={<ShieldAlert />}
            action={
              <div className="flex gap-2">
                <Button size="sm" onClick={() => router.push("/dashboard")}>Return to session</Button>
                <Button size="sm" variant="danger" onClick={() => { end(); toast("Support session ended"); }}>End session</Button>
              </div>
            }
          >
            You are in a {impersonating.scope === "read_only" ? "read-only" : "configure"} session for <strong>{tenantName(impersonating.tenantId)}</strong> until {formatDateTime(impersonating.until)}.
          </Banner>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Waiting for tenant" value={requests.length} hint="Owner must approve in their app" tone={requests.length ? "warning" : undefined} icon={<Hourglass />} />
        <StatCard label="Active grants" value={active.length} hint={`${active.filter((g) => g.scope === "configure").length} with configure scope`} icon={<ShieldCheck />} />
        <StatCard label="Sessions (30 days)" value={sessions.length} hint={`${actions30} audited actions`} icon={<LogIn />} />
        <StatCard label="Median session" value={fmtDuration(medianMinutes(sessions.filter((s) => s.endedAt).map((s) => minutesBetween(s.startedAt, s.endedAt!))))} hint="Ended sessions" icon={<Clock />} />
      </div>

      <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        <div className="px-3 pt-1">
          <Segmented
            label="Support access views"
            value={tab}
            onChange={setTab}
            options={[
              { key: "active", label: "Active grants", count: active.length },
              { key: "requests", label: "Requests", count: requests.length },
              { key: "sessions", label: "Session history", count: sessions.length },
              { key: "closed", label: "Expired & revoked", count: closed.length },
            ]}
          />
        </div>

        {tab === "requests" && (
          <GrantList
            grants={requests}
            empty="No pending requests."
            render={() => (
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="warning"><Hourglass className="size-3" /> Waiting for tenant owner</Badge>
                <Button size="sm" variant="ghost" onClick={() => toast.success("Reminder sent to the tenant owner", { description: "In-app approval request + WhatsApp" })}>Nudge owner</Button>
              </div>
            )}
            note="Platform staff cannot approve on a tenant's behalf. The owner approves in Settings → Support access."
          />
        )}

        {tab === "active" && (
          <GrantList
            grants={active}
            empty="No active grants. Request access to work inside a tenant."
            render={(g) => (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-ink-3">ends in {fmtDuration(minutesBetween(NOW, g.until))}</span>
                <Button size="sm" variant="primary" onClick={() => openSession(g)}><LogIn /> Open session</Button>
                <Button size="sm" variant="danger" onClick={() => { revoke(g.id, PLATFORM_USER.name); toast(`Grant for ${tenantName(g.tenantId)} revoked`); }}><XCircle /> Revoke</Button>
              </div>
            )}
          />
        )}

        {tab === "closed" && (
          <GrantList
            grants={closed}
            empty="Nothing here yet."
            render={(g) => <Badge tone={g.status === "denied" ? "danger" : "neutral"}>{g.status === "active" ? "Expired" : g.status[0].toUpperCase() + g.status.slice(1)}</Badge>}
          />
        )}

        {tab === "sessions" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="bg-surface-2 text-xs text-ink-3">
                  {["Started", "Tenant", "Staff", "Purpose", "Duration", "Actions"].map((h, i) => (
                    <th key={h} className={cn("h-10 border-y border-line px-4 font-semibold", i >= 4 ? "text-right" : "text-left")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const g = grants.find((x) => x.id === s.grantId);
                  return (
                    <tr key={s.id} className="border-b border-line last:border-b-0">
                      <td className="px-4 py-2.5 whitespace-nowrap">{formatDateTime(s.startedAt)}</td>
                      <td className="px-4 py-2.5"><Link href={`/platform/tenants/${s.tenantId}`} className="font-medium hover:text-primary-700 hover:underline">{tenantName(s.tenantId)}</Link></td>
                      <td className="px-4 py-2.5"><span className="flex items-center gap-2"><Avatar name={s.staff} />{s.staff}</span></td>
                      <td className="px-4 py-2.5">
                        <div className="text-ink-2">{s.reason}</div>
                        {g && <div className="mt-0.5"><ScopeBadge scope={g.scope} /></div>}
                      </td>
                      <td className="tabular px-4 py-2.5 text-right">{s.endedAt ? fmtDuration(minutesBetween(s.startedAt, s.endedAt)) : <Badge tone="success">Live</Badge>}</td>
                      <td className="tabular px-4 py-2.5 text-right font-medium">{s.actions}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <RequestDialog open={open} onOpenChange={setOpen} />
    </PlatformPage>
  );
}

function medianMinutes(xs: number[]) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function GrantList({ grants, render, empty, note }: { grants: SupportGrant[]; render: (g: SupportGrant) => React.ReactNode; empty: string; note?: string }) {
  const tenantName = useTenantName();
  return (
    <div>
      {note && <p className="border-b border-line bg-surface-2 px-5 py-2 text-xs text-ink-3">{note}</p>}
      {grants.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-ink-3">{empty}</div>
      ) : (
        <ul className="divide-y divide-line">
          {grants.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/platform/tenants/${g.tenantId}`} className="font-semibold hover:text-primary-700 hover:underline">{tenantName(g.tenantId)}</Link>
                  <ScopeBadge scope={g.scope} />
                </div>
                <div className="mt-0.5 text-sm text-ink-2">{g.reason}</div>
                <div className="mt-0.5 text-xs text-ink-3">
                  Requested by {g.requestedBy}
                  {g.grantedBy && <> · granted by {g.grantedBy}</>} · {formatDateTime(g.from)} → {formatDateTime(g.until)}
                </div>
              </div>
              {render(g)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const DURATIONS = [
  { key: "4h", label: "4 hours", ms: 4 * 3600e3 },
  { key: "24h", label: "24 hours", ms: 24 * 3600e3 },
  { key: "7d", label: "7 days", ms: 7 * 24 * 3600e3 },
];

function RequestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const tenants = usePlatform((s) => s.tenants);
  const request = usePlatform((s) => s.requestGrant);
  const [tenantId, setTenantId] = React.useState("");
  const [scope, setScope] = React.useState<SupportGrant["scope"]>("read_only");
  const [duration, setDuration] = React.useState("24h");
  const [reason, setReason] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const reset = () => { setTenantId(""); setScope("read_only"); setDuration("24h"); setReason(""); setErrors({}); };

  const submit = () => {
    const e: Record<string, string> = {};
    if (!tenantId) e.tenant = "Choose a tenant";
    if (reason.trim().length < 10) e.reason = "Describe why you need access (at least 10 characters)";
    setErrors(e);
    if (Object.keys(e).length) return;
    const ms = DURATIONS.find((d) => d.key === duration)!.ms;
    const until = new Date(Date.parse(NOW) + ms).toISOString().slice(0, 19);
    request({ tenantId, scope, reason: reason.trim(), from: NOW, until, requestedBy: PLATFORM_USER.name });
    const t = tenants.find((x) => x.id === tenantId)!;
    toast.success("Access requested", { description: `${t.owner.name} gets an approval request in-app and on WhatsApp` });
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title="Request support access"
      description="The tenant owner must approve. You will see nothing inside the tenant until they do."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Send request</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Tenant" required layout="vertical" error={errors.tenant} htmlFor="ra-t">
          <Select id="ra-t" value={tenantId} onChange={(e) => setTenantId(e.target.value)} aria-invalid={!!errors.tenant}>
            <option value="">Select tenant…</option>
            {tenants.map((t) => <option key={t.id} value={t.id}>{t.shortName} · owner {t.owner.name}</option>)}
          </Select>
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink-2">Scope</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {([
              { key: "read_only", title: "Read-only", body: "View screens and reports. No changes possible.", icon: <Eye /> },
              { key: "configure", title: "Configure", body: "Change settings, masters and imports. Cannot post documents.", icon: <Wrench /> },
            ] as const).map((o) => (
              <label key={o.key} className={cn("flex cursor-pointer gap-3 rounded-lg border p-3", scope === o.key ? "border-primary-500 bg-primary-50/60 ring-3 ring-primary-500/10" : "border-line hover:border-line-strong")}>
                <input type="radio" name="scope" className="sr-only" checked={scope === o.key} onChange={() => setScope(o.key)} />
                <span className="mt-0.5 text-primary-600 [&_svg]:size-4">{o.icon}</span>
                <span>
                  <span className="block text-sm font-medium">{o.title}</span>
                  <span className="block text-xs text-ink-3">{o.body}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Duration" layout="vertical" htmlFor="ra-d">
          <Select id="ra-d" value={duration} onChange={(e) => setDuration(e.target.value)}>
            {DURATIONS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </Select>
        </Field>
        <Field label="Reason" required layout="vertical" error={errors.reason} hint="Shown to the tenant owner and kept in both audit logs" htmlFor="ra-r">
          <Textarea id="ra-r" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Investigate IRN failures on INV/26-27/0412" aria-invalid={!!errors.reason} />
        </Field>
      </div>
    </Dialog>
  );
}
