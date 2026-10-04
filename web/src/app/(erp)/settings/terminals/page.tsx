"use client";

import * as React from "react";
import { KeyRound, Plus, QrCode, ShieldOff, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Section, SettingsShell } from "@/components/settings/settings-shell";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { Dialog } from "@/components/ui/overlay";
import { workCentres, wcById } from "@/lib/data/masters";
import { useApp, useRole } from "@/lib/store/app";
import { type OperatorRow, type Terminal, useSettings } from "@/lib/store/settings";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

export default function TerminalsPage() {
  const role = useRole();
  const lang = useApp((s) => s.lang);
  const { terminals, operators, revokeTerminal, registerTerminal, resetPin, toggleOperator } = useSettings();
  const [revoke, setRevoke] = React.useState<Terminal | null>(null);
  const [register, setRegister] = React.useState(false);
  const [pinFor, setPinFor] = React.useState<OperatorRow | null>(null);
  const canEdit = role.key === "owner" || role.key === "production";

  return (
    <SettingsShell title="Terminals & operators">
      <div className="mx-auto max-w-6xl">
        <Section
          title="Registered terminals"
          desc="Only registered devices can open the operator app. A revoked device loses its key immediately; queued offline events still sync once for audit."
          action={canEdit && <Button size="sm" variant="primary" onClick={() => setRegister(true)}><Plus /> Register terminal</Button>}
        >
          <div className="-m-5 overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-surface-2 text-xs text-ink-2">
                <tr>{["Terminal", "Work centres", "Last sync", "Pending events", "Status", ""].map((h) => <th key={h} className="px-5 py-2 text-left font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {terminals.map((t) => (
                  <tr key={t.id} className={cn("border-t border-line", t.status === "revoked" && "text-ink-3")}>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2 font-medium">
                        {t.status === "online" ? <Wifi className="size-4 text-success" /> : t.status === "offline" ? <WifiOff className="size-4 text-warning" /> : <ShieldOff className="size-4 text-ink-3" />}
                        {t.name}
                      </div>
                      <div className="text-xs text-ink-3">{t.device}</div>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {t.workCentres.length === 7 ? <Badge tone="neutral" dot={false}>All work centres</Badge> : t.workCentres.map((w) => <Badge key={w} tone="neutral" dot={false}>{wcById(w).code}</Badge>)}
                        {!t.workCentres.length && <span className="text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-2.5">{t.lastSync ? formatDateTime(t.lastSync) : "Never"}</td>
                    <td className="px-5 py-2.5">{t.pending ? <Badge tone="warning">{t.pending} waiting to sync</Badge> : <span className="text-ink-3">0</span>}</td>
                    <td className="px-5 py-2.5"><StatusBadge status={t.status} /></td>
                    <td className="px-5 py-2.5 text-right">
                      {canEdit && t.status !== "revoked" && <Button size="xs" variant="danger" onClick={() => setRevoke(t)}>Revoke</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Operators" desc="Operators sign in on a registered terminal with a 4-digit PIN or QR badge. PINs are stored hashed and never shown.">
          <div className="-m-5 overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-surface-2 text-xs text-ink-2">
                <tr>{["Code", "Name", "Hindi name", "Work centres", "Shift", "PIN set", "Active", ""].map((h) => <th key={h} className="px-5 py-2 text-left font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {operators.map((o) => (
                  <tr key={o.id} className={cn("border-t border-line", !o.active && "text-ink-3")}>
                    <td className="px-5 py-2.5 font-mono text-xs">{o.code}</td>
                    <td className="px-5 py-2.5 font-medium">{o.name}</td>
                    <td className="px-5 py-2.5" lang="hi">{o.nameHi}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex flex-wrap gap-1">{o.workCentres.map((w) => <Badge key={w} tone="neutral" dot={false}>{lang === "hi" ? wcById(w).nameHi : wcById(w).code}</Badge>)}</div>
                    </td>
                    <td className="px-5 py-2.5">{o.shift}</td>
                    <td className="px-5 py-2.5 text-ink-2">{formatDate(o.pinSetAt)}</td>
                    <td className="px-5 py-2.5">
                      <Checkbox aria-label={`${o.name} active`} checked={o.active} disabled={!canEdit} onChange={() => { toggleOperator(o.id); toast(o.active ? `${o.name} deactivated` : `${o.name} activated`); }} />
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="xs" variant="subtle" disabled={!canEdit} onClick={() => setPinFor(o)}><KeyRound className="!size-3" /> Reset PIN</Button>
                        <Button size="xs" variant="ghost" onClick={() => toast.success(`QR badge for ${o.name} sent to printer`)}><QrCode className="!size-3" /> Badge</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <Dialog
        open={!!revoke}
        onOpenChange={(o) => !o && setRevoke(null)}
        title={`Revoke ${revoke?.name}?`}
        description="The device key is invalidated now. The operator app on this device will stop working."
        size="sm"
        footer={
          <>
            <Button onClick={() => setRevoke(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => { revokeTerminal(revoke!.id); toast(`${revoke!.name} revoked`, { description: revoke!.pending ? `${revoke!.pending} pending events will be accepted once for audit` : undefined }); setRevoke(null); }}>Revoke device</Button>
          </>
        }
      >
        {revoke?.pending ? <p className="rounded-md bg-warning-bg px-3 py-2 text-sm text-warning">{revoke.pending} events have not synced yet from this device.</p> : <p className="text-sm text-ink-2">Use this if a device is lost or replaced.</p>}
      </Dialog>

      <RegisterDialog open={register} onOpenChange={setRegister} onRegister={(t) => { registerTerminal(t); toast.success(`${t.name} registered`, { description: "Scan the pairing QR on the device within 10 minutes" }); setRegister(false); }} />

      <Dialog
        open={!!pinFor}
        onOpenChange={(o) => !o && setPinFor(null)}
        title={`Reset PIN for ${pinFor?.name}`}
        description="A one-time PIN is sent to the supervisor's phone. The operator sets a new PIN at next sign-in."
        size="sm"
        footer={
          <>
            <Button onClick={() => setPinFor(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => { resetPin(pinFor!.id); toast.success(`PIN reset for ${pinFor!.name}`, { description: "One-time PIN sent to Prakash Deshmukh on WhatsApp" }); setPinFor(null); }}>Reset PIN</Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">Offline terminals keep the old PIN hash until their next sync.</p>
      </Dialog>
    </SettingsShell>
  );
}

function RegisterDialog({ open, onOpenChange, onRegister }: { open: boolean; onOpenChange: (o: boolean) => void; onRegister: (t: { name: string; device: string; workCentres: string[] }) => void }) {
  const [name, setName] = React.useState("");
  const [device, setDevice] = React.useState("");
  const [wcs, setWcs] = React.useState<string[]>([]);
  const [err, setErr] = React.useState("");
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setName(""); setDevice(""); setWcs([]); setErr(""); }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Register terminal"
      description="Android 8+ with 2 GB RAM; installs as a PWA."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => {
            if (!name.trim()) return setErr("Name the terminal, e.g. 'Tab · Press shop'");
            if (!wcs.length) return setErr("Assign at least one work centre");
            onRegister({ name: name.trim(), device: device.trim() || "Android device", workCentres: wcs });
          }}>Register & show pairing QR</Button>
        </>
      }
    >
      <div className="grid gap-3">
        <Field label="Terminal name" required layout="vertical" htmlFor="rt-n"><Input id="rt-n" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Device" layout="vertical" htmlFor="rt-d"><Input id="rt-d" value={device} onChange={(e) => setDevice(e.target.value)} placeholder="Redmi Pad SE · Android 14" /></Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink-2">Work centres <span className="text-danger">*</span></legend>
          <div className="grid grid-cols-2 gap-1.5">
            {workCentres.map((w) => (
              <label key={w.id} className="flex items-center gap-2 rounded-md border border-line px-2.5 py-1.5 text-sm hover:bg-surface-2">
                <Checkbox checked={wcs.includes(w.id)} onChange={() => setWcs((x) => (x.includes(w.id) ? x.filter((y) => y !== w.id) : [...x, w.id]))} />
                {w.name}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      {err && <p className="mt-3 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{err}</p>}
    </Dialog>
  );
}
