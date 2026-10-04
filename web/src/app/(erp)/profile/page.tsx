"use client";

import * as React from "react";
import { Copy, Laptop, LogOut, Monitor, Save, ShieldAlert, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/erp/form-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Dialog } from "@/components/ui/overlay";
import { useApp, useRole } from "@/lib/store/app";
import { cn, formatDateTime } from "@/lib/utils";

interface Session {
  id: string;
  device: string;
  kind: "desktop" | "mobile" | "laptop";
  location: string;
  ip: string;
  at: string;
  current?: boolean;
}

const SEED_SESSIONS: Session[] = [
  { id: "s1", device: "Chrome on Windows 11", kind: "desktop", location: "Pune, MH", ip: "103.21.58.14", at: "2026-10-02T14:02:00", current: true },
  { id: "s2", device: "Safari on iPhone 15", kind: "mobile", location: "Pune, MH", ip: "49.36.112.7", at: "2026-10-02T08:31:00" },
  { id: "s3", device: "Edge on Windows 10 · Accounts PC", kind: "laptop", location: "Pune, MH", ip: "103.21.58.20", at: "2026-09-29T17:45:00" },
];

const EVENTS = [
  { key: "approvals", label: "Approval requests", desc: "POs, discounts, adjustments, payments waiting for you" },
  { key: "einvoice", label: "e-Invoice / e-way bill failures", desc: "GSP errors after automatic retries" },
  { key: "machine", label: "Machine down", desc: "A work centre reports a breakdown" },
  { key: "stock", label: "Low stock", desc: "Daily digest of items below reorder level" },
  { key: "jobwork", label: "Job-work time limits", desc: "Challans nearing the 1-year / 3-year limit" },
  { key: "digest", label: "Daily owner summary", desc: "Production, dispatch and cash at 8 pm" },
] as const;
const CHANNELS = ["In-app", "WhatsApp", "Email", "SMS"] as const;

const BACKUP_CODES = ["8KQ2-7MXD", "3PZN-4TVA", "W9HC-2R6E", "J5LB-8YQU", "T7FG-1NKS", "C4XM-6DPW", "R2VJ-9ELH", "N6AT-3QBZ", "H8YK-5WCF", "E1DS-7GUM"];

export default function ProfilePage() {
  const role = useRole();
  // Re-mount when the demo role changes so the form starts from that user's data.
  return <ProfileView key={role.key} />;
}

function ProfileView() {
  const role = useRole();
  const lang = useApp((s) => s.lang);
  const setLang = useApp((s) => s.setLang);
  const [info, setInfo] = React.useState({ name: role.user, email: role.email, phone: "+91 98220 41736", designation: role.label });
  const [twoFactor, setTwoFactor] = React.useState(role.key === "owner" || role.key === "accountant");
  const [setupOpen, setSetupOpen] = React.useState(false);
  const [setupStep, setSetupStep] = React.useState<"scan" | "codes">("scan");
  const [code, setCode] = React.useState("");
  const [sessions, setSessions] = React.useState(SEED_SESSIONS);
  const [prefs, setPrefs] = React.useState<Record<string, string[]>>({
    approvals: ["In-app", "WhatsApp"],
    einvoice: ["In-app", "Email"],
    machine: ["In-app", "WhatsApp"],
    stock: ["Email"],
    jobwork: ["In-app", "Email"],
    digest: ["WhatsApp"],
  });
  const mandatory2fa = role.key === "owner" || role.key === "accountant";

  const togglePref = (ev: string, ch: string) =>
    setPrefs((p) => ({ ...p, [ev]: p[ev].includes(ch) ? p[ev].filter((c) => c !== ch) : [...p[ev], ch] }));

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-line bg-surface px-4 pt-4 pb-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary-600 text-lg font-semibold text-white">{role.initials}</span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight">{info.name}</h1>
            <p className="text-sm text-ink-3">{role.label} · {info.email}</p>
          </div>
          {twoFactor ? <Badge tone="success">2FA on</Badge> : <Badge tone="warning">2FA off</Badge>}
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-5xl gap-4 p-3 sm:p-5">
        <Card
          title="Personal information"
          action={<Button size="sm" variant="primary" onClick={() => toast.success("Profile saved")}><Save /> Save</Button>}
        >
          <div className="grid gap-x-10 gap-y-3 lg:grid-cols-2">
            <Field label="Full name" htmlFor="p-name"><Input id="p-name" value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} /></Field>
            <Field label="Email" htmlFor="p-email" hint="Changing email needs re-verification"><Input id="p-email" type="email" value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} /></Field>
            <Field label="Mobile (WhatsApp)" htmlFor="p-phone"><Input id="p-phone" value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} /></Field>
            <Field label="Role" htmlFor="p-role" hint="Assigned by an admin"><Input id="p-role" disabled value={info.designation} /></Field>
            <Field label="Language" htmlFor="p-lang">
              <Select id="p-lang" value={lang} onChange={(e) => { setLang(e.target.value as "en" | "hi"); toast.success(e.target.value === "hi" ? "भाषा हिंदी पर सेट" : "Language set to English"); }}>
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
              </Select>
            </Field>
            <Field label="Date format" htmlFor="p-df"><Select id="p-df" defaultValue="dmy"><option value="dmy">02-Oct-2026</option><option value="iso">2026-10-02</option></Select></Field>
          </div>
        </Card>

        <Card title="Password & two-step verification">
          <div className="divide-y divide-line">
            <div className="flex flex-wrap items-center gap-3 pb-4">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">Password</div>
                <div className="text-xs text-ink-3">Last changed 14-Aug-2026</div>
              </div>
              <Button onClick={() => toast("Password reset link sent", { description: info.email })}>Change password</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-4">
              <span className={cn("flex size-10 items-center justify-center rounded-lg", twoFactor ? "bg-success-bg text-success" : "bg-warning-bg text-warning")}>
                {twoFactor ? <ShieldCheck className="size-5" /> : <ShieldAlert className="size-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  Authenticator app {twoFactor ? <Badge tone="success">Enabled</Badge> : <Badge tone="warning">Not set up</Badge>}
                </div>
                <div className="text-xs text-ink-3">
                  {mandatory2fa ? "Mandatory for your role — it cannot be turned off." : "Recommended for every office user."}
                </div>
              </div>
              {twoFactor ? (
                <div className="flex gap-2">
                  <Button onClick={() => { setSetupStep("codes"); setSetupOpen(true); }}>Backup codes</Button>
                  {!mandatory2fa && <Button variant="danger" onClick={() => { setTwoFactor(false); toast("Two-step verification turned off"); }}>Turn off</Button>}
                </div>
              ) : (
                <Button variant="primary" onClick={() => { setSetupStep("scan"); setCode(""); setSetupOpen(true); }}>Set up 2FA</Button>
              )}
            </div>
          </div>
        </Card>

        <Card
          title="Active sessions"
          action={
            <Button size="sm" variant="ghost" onClick={() => { setSessions((s) => s.filter((x) => x.current)); toast.success("Signed out of all other devices"); }}>
              Sign out others
            </Button>
          }
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-line">
            {sessions.map((s) => {
              const Icon = s.kind === "mobile" ? Smartphone : s.kind === "laptop" ? Laptop : Monitor;
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-surface-3 text-ink-2"><Icon className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {s.device} {s.current && <Badge tone="brand">This device</Badge>}
                    </div>
                    <div className="text-xs text-ink-3">{s.location} · {s.ip} · {s.current ? "Active now" : `Last active ${formatDateTime(s.at)}`}</div>
                  </div>
                  {!s.current && (
                    <Button size="sm" variant="danger" onClick={() => { setSessions((x) => x.filter((y) => y.id !== s.id)); toast.success("Session revoked"); }}>
                      <LogOut /> Revoke
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card
          title="My notifications"
          action={<Button size="sm" variant="primary" onClick={() => toast.success("Notification preferences saved")}><Save /> Save</Button>}
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-2 text-xs text-ink-3">
                  <th className="h-10 px-4 text-left font-semibold">Event</th>
                  {CHANNELS.map((c) => <th key={c} className="h-10 w-24 px-2 text-center font-semibold">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {EVENTS.map((ev) => (
                  <tr key={ev.key} className="border-t border-line">
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{ev.label}</div>
                      <div className="text-xs text-ink-3">{ev.desc}</div>
                    </td>
                    {CHANNELS.map((ch) => (
                      <td key={ch} className="px-2 text-center">
                        <Toggle checked={prefs[ev.key].includes(ch)} onChange={() => togglePref(ev.key, ch)} label={`${ev.label} via ${ch}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-4 py-2.5 text-xs text-ink-3">WhatsApp uses approved templates sent from your company&apos;s business number. Quiet hours: 10 pm - 7 am (except machine down).</p>
        </Card>
      </div>

      <Dialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        title={setupStep === "scan" ? "Set up authenticator app" : "Backup codes"}
        description={setupStep === "scan" ? "Scan with Google Authenticator, Microsoft Authenticator or Authy." : "Each code works once. Store them somewhere safe."}
        footer={
          setupStep === "scan" ? (
            <>
              <Button onClick={() => setSetupOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (!/^\d{6}$/.test(code)) return toast.error("Enter the 6-digit code from the app");
                  setTwoFactor(true);
                  setSetupStep("codes");
                  toast.success("Two-step verification enabled");
                }}
              >
                Verify & enable
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => setSetupOpen(false)}>Done</Button>
          )
        }
      >
        {setupStep === "scan" ? (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <QrPlaceholder />
            <div className="w-full flex-1 space-y-3">
              <div>
                <div className="text-xs text-ink-3">Can&apos;t scan? Enter this key</div>
                <div className="mt-1 flex items-center gap-2 rounded-md bg-surface-3 px-2.5 py-1.5 font-mono text-sm">
                  JBSW Y3DP EHPK 3PXP
                  <button className="ml-auto text-ink-3 hover:text-ink" aria-label="Copy key" onClick={() => toast("Key copied")}><Copy className="size-3.5" /></button>
                </div>
              </div>
              <Field layout="vertical" label="6-digit code" htmlFor="tfa-code">
                <Input id="tfa-code" inputMode="numeric" maxLength={6} className="tabular font-mono tracking-[0.3em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" />
              </Field>
            </div>
          </div>
        ) : (
          <div>
            <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
              {BACKUP_CODES.map((c) => <li key={c} className="rounded-md bg-surface-3 px-3 py-1.5 text-center">{c}</li>)}
            </ul>
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={() => toast("Codes copied")}><Copy /> Copy</Button>
              <Button size="sm" onClick={() => toast("Downloaded backup-codes.txt")}>Download</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors", checked ? "bg-primary-600" : "bg-line-strong")}
    >
      <span className={cn("inline-block size-4 rounded-full bg-white shadow-xs transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

function Finder({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="7" height="7" fill="#17202a" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="#17202a" />
    </g>
  );
}

/** Deterministic QR-like pattern (placeholder; the real secret is rendered server-side). */
function QrPlaceholder() {
  const n = 21;
  const cells: [number, number][] = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const finder = (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
      if (finder) continue;
      if (((x * 7 + y * 13 + x * y) % 5) < 2) cells.push([x, y]);
    }
  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} className="size-40 shrink-0 rounded-lg border border-line bg-white" role="img" aria-label="QR code for authenticator app">
      {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#17202a" />)}
      <Finder x={0} y={0} />
      <Finder x={n - 7} y={0} />
      <Finder x={0} y={n - 7} />
    </svg>
  );
}
