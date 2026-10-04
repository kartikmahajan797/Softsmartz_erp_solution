"use client";

import * as React from "react";
import { Check, Clock, Eye, LifeBuoy, Lock, ShieldCheck, Wrench, X } from "lucide-react";
import { toast } from "sonner";
import { Section, SettingsShell } from "@/components/settings/settings-shell";
import { ToggleRow } from "@/components/settings/toggle";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form";
import { Dialog } from "@/components/ui/overlay";
import { company } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { type SupportGrant, usePlatform } from "@/lib/store/platform";
import { cn, formatDateTime } from "@/lib/utils";

const DURATIONS = [
  { hours: 2, label: "2 hours" },
  { hours: 24, label: "24 hours" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "7 days" },
];

const GRANT_TONE: Record<SupportGrant["status"], { tone: Tone; label: string }> = {
  requested: { tone: "warning", label: "Waiting for you" },
  active: { tone: "success", label: "Active" },
  expired: { tone: "neutral", label: "Expired" },
  revoked: { tone: "neutral", label: "Revoked" },
  denied: { tone: "danger", label: "Denied" },
};

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 19);

function duration(from: string, to?: string) {
  if (!to) return "In progress";
  const m = Math.round((Date.parse(to) - Date.parse(from)) / 6e4);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

export default function SupportAccessPage() {
  const role = useRole();
  const isOwner = role.key === "owner";
  const allGrants = usePlatform((s) => s.grants);
  const allSessions = usePlatform((s) => s.sessions);
  const decide = usePlatform((s) => s.decideGrant);
  const revoke = usePlatform((s) => s.revokeGrant);
  const grants = allGrants.filter((g) => g.tenantId === company.tenantId);
  const sessions = allSessions.filter((x) => x.tenantId === company.tenantId);
  const [allowRequests, setAllowRequests] = React.useState(true);
  const [notifyOnSession, setNotifyOnSession] = React.useState(true);
  const [approveId, setApproveId] = React.useState<string | null>(null);
  const [hours, setHours] = React.useState(24);
  const [denyId, setDenyId] = React.useState<string | null>(null);
  const [denyReason, setDenyReason] = React.useState("");
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setHydrated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const pending = grants.filter((g) => g.status === "requested");
  const active = grants.filter((g) => g.status === "active");
  const history = grants.filter((g) => !["requested", "active"].includes(g.status));
  const approving = grants.find((g) => g.id === approveId);

  const approve = () => {
    if (!approving) return;
    const from = new Date();
    const until = new Date(from.getTime() + hours * 36e5);
    usePlatform.setState((s) => ({ grants: s.grants.map((g) => (g.id === approving.id ? { ...g, from: iso(from), until: iso(until) } : g)) }));
    decide(approving.id, true, role.user);
    toast.success(`Access granted to ${approving.requestedBy}`, { description: `${approving.scope === "read_only" ? "Read-only" : "Configure"} · ends ${formatDateTime(iso(until))}` });
    setApproveId(null);
  };

  const deny = () => {
    const g = grants.find((x) => x.id === denyId);
    if (!g) return;
    decide(g.id, false, role.user);
    toast(`Request from ${g.requestedBy} denied`, { description: denyReason || undefined });
    setDenyId(null);
    setDenyReason("");
  };

  return (
    <SettingsShell title="Support access">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary-600" />
          <div>
            <div className="font-medium text-primary-800">Factory ERP staff cannot see your data unless you allow it</div>
            <p className="mt-0.5 text-ink-2">
              Support and onboarding staff must request access with a reason. You choose how long it lasts; every session and action is recorded in your audit log and you can revoke access at any time.
            </p>
          </div>
        </div>

        {!isOwner && (
          <p className="mb-4 flex items-center gap-2 rounded-lg bg-surface-3 px-4 py-2.5 text-sm text-ink-2">
            <Lock className="size-4 text-ink-3" /> Only the Owner can approve, deny or revoke support access. You are viewing this page read-only.
          </p>
        )}

        {!hydrated ? (
          <div className="h-48 animate-pulse rounded-xl bg-surface-3" />
        ) : (
          <>
            <Section title="Requests waiting for you" desc="Approve with a time limit, or deny." action={pending.length > 0 ? <Badge tone="warning">{pending.length} pending</Badge> : undefined}>
              {pending.length === 0 ? (
                <Empty text="No pending requests" />
              ) : (
                <ul className="-my-2 divide-y divide-line">
                  {pending.map((g) => (
                    <li key={g.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                      <Avatar name={g.requestedBy} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium">{g.requestedBy}</span>
                          <span className="text-ink-3">· Factory ERP</span>
                          <ScopeBadge scope={g.scope} />
                        </div>
                        <div className="mt-0.5 text-sm text-ink-2">&ldquo;{g.reason}&rdquo;</div>
                        <div className="mt-0.5 text-xs text-ink-3">Requested {formatDateTime(g.from)}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="danger" disabled={!isOwner} onClick={() => setDenyId(g.id)}><X /> Deny</Button>
                        <Button variant="primary" disabled={!isOwner} onClick={() => { setHours(g.scope === "read_only" ? 24 : 72); setApproveId(g.id); }}><Check /> Approve</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Active access" desc="Staff who can open your workspace right now.">
              {active.length === 0 ? (
                <Empty text="No one from Factory ERP has access" />
              ) : (
                <ul className="-my-2 divide-y divide-line">
                  {active.map((g) => (
                    <li key={g.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                      <Avatar name={g.requestedBy} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium">{g.requestedBy}</span>
                          <ScopeBadge scope={g.scope} />
                        </div>
                        <div className="mt-0.5 text-sm text-ink-2">{g.reason}</div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-ink-3">
                          <Clock className="size-3" /> Until {formatDateTime(g.until)} · approved by {g.grantedBy || "—"}
                        </div>
                      </div>
                      <Button
                        variant="danger"
                        disabled={!isOwner}
                        onClick={() => {
                          revoke(g.id, role.user);
                          toast.success(`Access revoked for ${g.requestedBy}`, { description: "Any open session is ended immediately" });
                        }}
                      >
                        Revoke now
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Support sessions" desc="Every time staff entered your workspace.">
              {sessions.length === 0 ? (
                <Empty text="No sessions yet" />
              ) : (
                <div className="-mx-5 -my-5 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line bg-surface-2 text-left text-xs font-semibold text-ink-3">
                        <th className="h-9 px-5">Staff</th>
                        <th className="px-3">Started</th>
                        <th className="px-3">Duration</th>
                        <th className="px-3 text-right">Actions</th>
                        <th className="px-5">Purpose</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((x) => (
                        <tr key={x.id} className="border-b border-line last:border-0">
                          <td className="h-11 px-5 font-medium">{x.staff}</td>
                          <td className="px-3 whitespace-nowrap text-ink-2">{formatDateTime(x.startedAt)}</td>
                          <td className="px-3 whitespace-nowrap">{x.endedAt ? duration(x.startedAt, x.endedAt) : <Badge tone="success">Live now</Badge>}</td>
                          <td className="tabular px-3 text-right">{x.actions}</td>
                          <td className="px-5 text-ink-2">{x.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            {history.length > 0 && (
              <Section title="Past requests">
                <ul className="-my-2 divide-y divide-line">
                  {history.map((g) => (
                    <li key={g.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                      <span className="font-medium">{g.requestedBy}</span>
                      <ScopeBadge scope={g.scope} />
                      <span className="min-w-0 flex-1 truncate text-ink-2">{g.reason}</span>
                      <span className="text-xs text-ink-3">{formatDateTime(g.from)}</span>
                      <Badge tone={GRANT_TONE[g.status].tone}>{GRANT_TONE[g.status].label}</Badge>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="Policy">
              <div className="-my-2 divide-y divide-line">
                <ToggleRow title="Allow support to request access" desc="When off, staff can still email you but cannot raise in-app requests." checked={allowRequests} onChange={(v) => { setAllowRequests(v); toast.success(v ? "Support can request access" : "Support access requests turned off"); }} disabled={!isOwner} />
                <ToggleRow title="Notify me when a session starts" desc="WhatsApp and email to the Owner." checked={notifyOnSession} onChange={setNotifyOnSession} disabled={!isOwner} />
              </div>
            </Section>
          </>
        )}
      </div>

      <Dialog
        open={!!approving}
        onOpenChange={(o) => !o && setApproveId(null)}
        title="Approve support access"
        description={approving ? `${approving.requestedBy} · ${approving.scope === "read_only" ? "read-only" : "configure"} access` : undefined}
        footer={
          <>
            <Button onClick={() => setApproveId(null)}>Cancel</Button>
            <Button variant="primary" onClick={approve}><Check /> Approve for {DURATIONS.find((d) => d.hours === hours)?.label}</Button>
          </>
        }
      >
        {approving && (
          <div className="space-y-4">
            <div className="rounded-lg bg-surface-3 px-3 py-2.5 text-sm">&ldquo;{approving.reason}&rdquo;</div>
            <Field label="Access lasts for" layout="vertical">
              <div className="grid grid-cols-4 gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d.hours}
                    onClick={() => setHours(d.hours)}
                    aria-pressed={hours === d.hours}
                    className={cn("h-9 rounded-md border text-sm font-medium transition-colors", hours === d.hours ? "border-primary-600 bg-primary-50 text-primary-800" : "border-line-strong hover:bg-surface-3")}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </Field>
            <ul className="space-y-1.5 text-sm text-ink-2">
              {approving.scope === "read_only" ? (
                <li className="flex gap-2"><Eye className="mt-0.5 size-4 text-ink-3" /> Can view documents and settings, cannot change or post anything.</li>
              ) : (
                <li className="flex gap-2"><Wrench className="mt-0.5 size-4 text-ink-3" /> Can change settings, masters and imports. Cannot post invoices, payments or approve documents.</li>
              )}
              <li className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 text-ink-3" /> Every action is logged in your audit log under their name.</li>
            </ul>
          </div>
        )}
      </Dialog>

      <Dialog
        open={!!denyId}
        onOpenChange={(o) => !o && setDenyId(null)}
        title="Deny request"
        size="sm"
        footer={
          <>
            <Button onClick={() => setDenyId(null)}>Cancel</Button>
            <Button variant="danger" onClick={deny}>Deny request</Button>
          </>
        }
      >
        <Field label="Message to support (optional)" layout="vertical" htmlFor="dr">
          <Textarea id="dr" value={denyReason} onChange={(e) => setDenyReason(e.target.value)} placeholder="e.g. Please call me first" />
        </Field>
      </Dialog>
    </SettingsShell>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#0b1216] text-xs font-semibold text-[#f5b971]" aria-hidden>
      {name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
    </span>
  );
}

function ScopeBadge({ scope }: { scope: SupportGrant["scope"] }) {
  return scope === "read_only" ? <Badge tone="info" dot={false}><Eye className="size-3" /> Read-only</Badge> : <Badge tone="progress" dot={false}><Wrench className="size-3" /> Configure</Badge>;
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 py-1 text-sm text-ink-3">
      <LifeBuoy className="size-4" /> {text}
    </div>
  );
}

