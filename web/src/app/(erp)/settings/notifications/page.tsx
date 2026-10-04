"use client";

import * as React from "react";
import { Bell, CheckCircle2, Clock, Mail, MessageCircle, MessageSquareText, Plus, RefreshCw, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Section, SettingsShell } from "@/components/settings/settings-shell";
import { Toggle, ToggleRow } from "@/components/settings/toggle";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Menu, MenuCheckItem, MenuContent, MenuLabel, MenuTrigger } from "@/components/ui/overlay";
import { ROLES, type RoleKey, useRole } from "@/lib/store/app";
import { type Channel, type ReminderStep, type WaTemplate, useAdmin } from "@/lib/store/admin";
import { cn } from "@/lib/utils";

const CHANNELS: { key: Channel; label: string; icon: React.ReactNode }[] = [
  { key: "inapp", label: "In-app", icon: <Bell /> },
  { key: "whatsapp", label: "WhatsApp", icon: <MessageCircle /> },
  { key: "sms", label: "SMS", icon: <Smartphone /> },
  { key: "email", label: "Email", icon: <Mail /> },
];

const WA_STATUS: Record<WaTemplate["status"], { tone: Tone; label: string }> = {
  approved: { tone: "success", label: "Approved" },
  pending: { tone: "warning", label: "In review" },
  rejected: { tone: "danger", label: "Rejected" },
};

export default function NotificationSettingsPage() {
  const role = useRole();
  const canEdit = role.key === "owner";
  const events = useAdmin((s) => s.events);
  const toggle = useAdmin((s) => s.toggleChannel);
  const setRoles = useAdmin((s) => s.setEventRoles);
  const wa = useAdmin((s) => s.waTemplates);
  const reminders = useAdmin((s) => s.reminders);
  const setReminders = useAdmin((s) => s.setReminders);
  const reminderEnabled = useAdmin((s) => s.reminderEnabled);
  const digestTime = useAdmin((s) => s.digestTime);
  const quietHours = useAdmin((s) => s.quietHours);
  const setPrefs = useAdmin((s) => s.setPrefs);
  const [preview, setPreview] = React.useState<string>(wa[0].id);
  const groups = [...new Set(events.map((e) => e.group))];
  const pv = wa.find((w) => w.id === preview)!;
  const approved = wa.filter((w) => w.status === "approved");

  const updateStep = (id: string, patch: Partial<ReminderStep>) => setReminders(reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <SettingsShell
      title="Notifications"
      actions={<Button onClick={() => toast.success("Test notification sent", { description: `In-app and WhatsApp to ${role.user}` })}><MessageSquareText /> Send test</Button>}
    >
      <div className="mx-auto max-w-6xl">
        {!canEdit && <p className="mb-4 rounded-lg bg-surface-3 px-4 py-2.5 text-sm text-ink-2">Only the Owner / Admin can change company-wide notification rules.</p>}

        {/* Channel status */}
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <ChannelCard
            icon={<MessageCircle />}
            name="WhatsApp Business"
            status={<Badge tone="success">Connected</Badge>}
            lines={["+91 20 6712 4400 · Shakti Precision", "Via BSP · quality rating High", "1,284 of 10,000 conversations this month"]}
            usage={12.8}
          />
          <ChannelCard
            icon={<Smartphone />}
            name="SMS (DLT)"
            status={<Badge tone="success">Active</Badge>}
            lines={["Sender ID SHKTPR · 4 DLT templates", "Used for OTP and machine-down alerts", "312 of 2,000 SMS this month"]}
            usage={15.6}
          />
          <ChannelCard
            icon={<Mail />}
            name="Email"
            status={<Badge tone="warning">Verify domain</Badge>}
            lines={["noreply@shaktiprecision.in", "SPF verified · DKIM pending", "Falls back to factoryerp.in sender"]}
            action={<Button size="xs" variant="subtle" onClick={() => toast("DNS records copied", { description: "Add the DKIM TXT record at your domain registrar" })}>Show DNS</Button>}
          />
        </div>

        <Section title="Events and channels" desc="Who is told what, and where. Each user can mute channels for themselves under My profile.">
          <div className="-mx-5 -my-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-surface-2 text-xs text-ink-2">
                <tr>
                  <th className="px-5 py-2 text-left font-semibold">Event</th>
                  {CHANNELS.map((c) => (
                    <th key={c.key} className="w-24 px-2 py-2 text-center font-semibold">
                      <span className="inline-flex items-center gap-1 [&_svg]:size-3.5 [&_svg]:text-ink-3">{c.icon}{c.label}</span>
                    </th>
                  ))}
                  <th className="px-5 py-2 text-left font-semibold">Recipients</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <React.Fragment key={g}>
                    <tr className="border-t border-line bg-surface-3/50">
                      <td colSpan={6} className="px-5 py-1.5 text-2xs font-semibold tracking-wider text-ink-3 uppercase">{g}</td>
                    </tr>
                    {events.filter((e) => e.group === g).map((e) => (
                      <tr key={e.key} className="border-t border-line">
                        <td className="px-5 py-2.5">
                          <div className="font-medium">{e.label}</div>
                          <div className="text-xs text-ink-3">{e.desc}</div>
                        </td>
                        {CHANNELS.map((c) => (
                          <td key={c.key} className="px-2 py-2.5 text-center">
                            <span className="inline-flex">
                              <Toggle size="sm" label={`${e.label} via ${c.label}`} checked={e.channels[c.key]} disabled={!canEdit} onChange={() => toggle(e.key, c.key)} />
                            </span>
                          </td>
                        ))}
                        <td className="px-5 py-2.5">
                          <RolePicker value={e.roles} disabled={!canEdit} onChange={(r) => setRoles(e.key, r)} />
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Section
            title="Payment reminders"
            desc="Automatic reminders to customers with open invoices (FR-FI-06). Uses approved WhatsApp templates only."
            action={<Toggle label="Payment reminders enabled" checked={reminderEnabled} disabled={!canEdit} onChange={(v) => { setPrefs({ reminderEnabled: v }); toast(v ? "Payment reminders on" : "Payment reminders paused"); }} />}
          >
            <fieldset disabled={!canEdit || !reminderEnabled} className={cn(!reminderEnabled && "opacity-60")}>
              <ol className="relative space-y-2 before:absolute before:top-3 before:bottom-3 before:left-[15px] before:w-px before:bg-line">
                {[...reminders].sort((a, b) => a.offset - b.offset).map((r) => (
                  <li key={r.id} className="relative flex flex-wrap items-center gap-2 pl-10">
                    <span className={cn("absolute left-1.5 flex size-[19px] items-center justify-center rounded-full border-2 bg-surface", r.offset < 0 ? "border-info" : r.offset === 0 ? "border-warning" : "border-danger")} />
                    <div className="flex items-center gap-1.5">
                      <Input aria-label="Days" type="number" className="w-16 text-right" value={Math.abs(r.offset)} onChange={(e) => updateStep(r.id, { offset: Math.sign(r.offset || 1) * Math.abs(Number(e.target.value)) })} />
                      <Select aria-label="Before or after due date" className="w-36" value={r.offset < 0 ? "before" : r.offset === 0 ? "on" : "after"} onChange={(e) => updateStep(r.id, { offset: e.target.value === "on" ? 0 : (e.target.value === "before" ? -1 : 1) * Math.max(1, Math.abs(r.offset)) })}>
                        <option value="before">days before due</option>
                        <option value="on">on due date</option>
                        <option value="after">days after due</option>
                      </Select>
                    </div>
                    <Select aria-label="Channel" className="w-32" value={r.channel} onChange={(e) => updateStep(r.id, { channel: e.target.value as ReminderStep["channel"] })}>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                    </Select>
                    <Button size="icon-sm" variant="ghost" aria-label="Remove step" onClick={() => setReminders(reminders.filter((x) => x.id !== r.id))}><Trash2 /></Button>
                  </li>
                ))}
              </ol>
              <div className="mt-3 flex items-center justify-between">
                <Button size="sm" onClick={() => setReminders([...reminders, { id: `rs${Date.now()}`, offset: 30, channel: "whatsapp", template: "payment_reminder_v2" }])}><Plus /> Add step</Button>
                <span className="text-xs text-ink-3">Stops automatically once the invoice is paid</span>
              </div>
            </fieldset>
          </Section>

          <Section title="Delivery rules" desc="Applies to every user unless they override it.">
            <fieldset disabled={!canEdit} className="divide-y divide-line">
              <div className="flex items-center justify-between gap-4 pb-2.5">
                <div>
                  <div className="text-sm font-medium">Daily digest time</div>
                  <div className="mt-0.5 text-xs text-ink-3">Low-stock and overdue summary, one message per day</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="size-4 text-ink-3" />
                  <Input aria-label="Digest time" type="time" className="w-28" value={digestTime} onChange={(e) => setPrefs({ digestTime: e.target.value })} />
                </div>
              </div>
              <ToggleRow title="Quiet hours (21:00 - 07:00)" desc="Hold WhatsApp and SMS except machine-down alerts" checked={quietHours} onChange={(v) => setPrefs({ quietHours: v })} />
              <ToggleRow title="Customer-facing messages in Hindi" desc="When the party's preferred language is Hindi" checked onChange={() => toast("Language follows each party's master")} />
              <ToggleRow title="Escalate unanswered approvals" desc="Remind the approver again after 4 working hours" checked onChange={() => toast("Escalation rule saved")} />
            </fieldset>
          </Section>
        </div>

        <Section
          title="WhatsApp message templates"
          desc="Meta must approve every business-initiated template. Rejected templates cannot be sent."
          action={<Button size="sm" onClick={() => toast.success("Templates synced from BSP", { description: `${approved.length} approved · ${wa.length - approved.length} not usable` })}><RefreshCw /> Sync</Button>}
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <ul className="-my-1 divide-y divide-line">
              {wa.map((w) => (
                <li key={w.id}>
                  <button onClick={() => setPreview(w.id)} className={cn("flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left", preview === w.id ? "bg-primary-50" : "hover:bg-surface-2")}>
                    <MessageCircle className={cn("size-4 shrink-0", preview === w.id ? "text-primary-600" : "text-ink-3")} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-[13px] font-medium">{w.name}</span>
                      <span className="block text-xs text-ink-3">{w.category} · {w.language}</span>
                    </span>
                    <Badge tone={WA_STATUS[w.status].tone}>{WA_STATUS[w.status].label}</Badge>
                  </button>
                </li>
              ))}
            </ul>
            <div className="rounded-xl bg-[#e7ddd3] p-4" aria-label="Message preview">
              <div className="mb-2 text-center text-2xs text-ink-3"><span className="rounded bg-white/70 px-2 py-0.5">Today</span></div>
              <div className="relative ml-auto max-w-[260px] rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 text-[13px] leading-snug text-ink shadow-xs">
                {pv.body.split(/(\{\{\d\}\})/).map((part, i) => (/\{\{\d\}\}/.test(part) ? <span key={i} className="rounded bg-primary-100 px-0.5 font-mono text-[11px] text-primary-800">{part}</span> : <React.Fragment key={i}>{part}</React.Fragment>))}
                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-ink-3">14:02 <CheckCircle2 className="size-3 text-info" /></div>
              </div>
              {pv.status === "rejected" && <p className="mt-3 rounded-md bg-white/80 px-2.5 py-1.5 text-xs text-danger">Rejected: promotional content is not allowed in the Utility category.</p>}
              {pv.status === "pending" && <p className="mt-3 rounded-md bg-white/80 px-2.5 py-1.5 text-xs text-warning">Under review by Meta — usually within 24 hours.</p>}
            </div>
          </div>
        </Section>
      </div>
    </SettingsShell>
  );
}

function ChannelCard({ icon, name, status, lines, usage, action }: { icon: React.ReactNode; name: string; status: React.ReactNode; lines: string[]; usage?: number; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary-50 text-primary-700 [&_svg]:size-4">{icon}</span>
        <span className="flex-1 text-sm font-semibold">{name}</span>
        {status}
      </div>
      <ul className="mt-3 space-y-0.5 text-xs text-ink-2">
        {lines.map((l) => <li key={l}>{l}</li>)}
      </ul>
      {usage !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={usage} aria-valuemin={0} aria-valuemax={100} aria-label={`${name} usage`}>
          <div className="h-full rounded-full bg-primary-600" style={{ width: `${usage}%` }} />
        </div>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

function RolePicker({ value, onChange, disabled }: { value: RoleKey[]; onChange: (r: RoleKey[]) => void; disabled?: boolean }) {
  return (
    <Menu>
      <MenuTrigger asChild disabled={disabled}>
        <button className="flex max-w-[260px] flex-wrap items-center gap-1 rounded-md p-0.5 text-left hover:bg-surface-3 disabled:hover:bg-transparent">
          {value.length ? value.map((r) => <Badge key={r} tone="brand" dot={false}>{ROLES[r].label}</Badge>) : <span className="px-1 text-xs text-ink-3">Nobody</span>}
        </button>
      </MenuTrigger>
      <MenuContent align="start" className="w-56">
        <MenuLabel>Notify roles</MenuLabel>
        {(Object.keys(ROLES) as RoleKey[]).map((k) => (
          <MenuCheckItem key={k} checked={value.includes(k)} onCheckedChange={(c) => onChange(c ? [...value, k] : value.filter((x) => x !== k))}>
            {ROLES[k].label}
          </MenuCheckItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
