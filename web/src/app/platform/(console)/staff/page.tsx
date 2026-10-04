"use client";

import * as React from "react";
import { Check, KeyRound, Minus, MoreHorizontal, ShieldCheck, Smartphone, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { PlatformPage } from "@/components/platform/platform-shell";
import { Avatar, StatCard } from "@/components/platform/p2-ui";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Dialog, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/overlay";
import { type PlatformStaff, PLATFORM_USER, STAFF_ROLE_LABEL, usePlatform } from "@/lib/store/platform";
import { cn, formatDateTime } from "@/lib/utils";

type Role = PlatformStaff["role"];
const ROLES: Role[] = ["super_admin", "onboarding", "support", "billing"];

const ROLE_TONE: Record<Role, Tone> = { super_admin: "warning", onboarding: "brand", support: "info", billing: "progress" };

const PERMS: { key: string; label: string; roles: Role[] }[] = [
  { key: "tenant.create", label: "Onboard & provision tenants", roles: ["super_admin", "onboarding"] },
  { key: "tenant.stage", label: "Move onboarding stage & checklist", roles: ["super_admin", "onboarding"] },
  { key: "tenant.suspend", label: "Suspend / offboard tenant", roles: ["super_admin"] },
  { key: "tenant.flag", label: "Feature flag overrides", roles: ["super_admin"] },
  { key: "plan.edit", label: "Edit plans & pricing", roles: ["super_admin"] },
  { key: "billing.invoice", label: "Create & send subscription invoices", roles: ["super_admin", "billing"] },
  { key: "support.request", label: "Request support access", roles: ["super_admin", "onboarding", "support"] },
  { key: "support.session", label: "Open consented support session", roles: ["super_admin", "onboarding", "support"] },
  { key: "staff.manage", label: "Manage platform staff", roles: ["super_admin"] },
  { key: "audit.read", label: "Read platform audit log", roles: ["super_admin", "support", "billing", "onboarding"] },
];

interface StaffRow extends PlatformStaff {
  invited?: boolean;
}

export default function StaffPage() {
  const seed = usePlatform((s) => s.staff);
  const log = usePlatform((s) => s.log);
  const [extra, setExtra] = React.useState<StaffRow[]>([]);
  const [disabled, setDisabled] = React.useState<string[]>([]);
  const [open, setOpen] = React.useState(false);

  const rows: StaffRow[] = [...seed, ...extra].map((s) => (disabled.includes(s.id) ? { ...s, status: "disabled" as const } : s));
  const active = rows.filter((r) => r.status === "active");

  return (
    <PlatformPage
      title="Platform staff"
      subtitle="People who operate the SaaS. Staff sign in with SSO; super admins must use a hardware security key."
      crumbs={[{ label: "Platform", href: "/platform" }, { label: "Platform staff" }]}
      actions={<Button variant="primary" onClick={() => setOpen(true)}><UserPlus /> Invite staff</Button>}
    >
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Active staff" value={active.length} hint={`${rows.length - active.length} disabled or invited`} />
        <StatCard label="Super admins" value={active.filter((r) => r.role === "super_admin").length} hint="Keep this number small" tone="warning" />
        <StatCard label="Hardware keys" value={`${active.filter((r) => r.twoFactor === "hardware_key").length}/${active.length}`} hint="FIDO2 security keys" tone="success" />
        <StatCard label="Support-capable" value={active.filter((r) => r.role !== "billing").length} hint="Can request tenant access" />
      </div>

      <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-surface-2 text-xs text-ink-3">
                {["Name", "Role", "Two-factor", "Last active", "Status", ""].map((h) => (
                  <th key={h} className="h-10 border-b border-line px-4 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const me = s.email === PLATFORM_USER.email;
                return (
                  <tr key={s.id} className={cn("border-b border-line last:border-b-0", s.status === "disabled" && "opacity-55")}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.name} className={s.role === "super_admin" ? "bg-[#0b1216] text-[#f5b971]" : undefined} />
                        <div className="leading-tight">
                          <div className="font-medium">{s.name} {me && <span className="text-xs font-normal text-ink-3">(you)</span>}</div>
                          <div className="text-xs text-ink-3">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5"><Badge tone={ROLE_TONE[s.role]} dot={false}>{STAFF_ROLE_LABEL[s.role]}</Badge></td>
                    <td className="px-4 py-2.5">
                      {s.twoFactor === "hardware_key" ? (
                        <span className="flex items-center gap-1.5 text-success"><KeyRound className="size-3.5" /> Security key</span>
                      ) : (
                        <span className={cn("flex items-center gap-1.5", s.role === "super_admin" ? "text-danger" : "text-ink-2")}>
                          <Smartphone className="size-3.5" /> Authenticator app
                          {s.role === "super_admin" && <Badge tone="danger" dot={false}>Key required</Badge>}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-ink-2">{s.invited ? "—" : formatDateTime(s.lastActive)}</td>
                    <td className="px-4 py-2.5">
                      {s.invited ? <Badge tone="warning">Invited</Badge> : s.status === "active" ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Disabled</Badge>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Menu>
                        <MenuTrigger asChild>
                          <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${s.name}`} disabled={me}><MoreHorizontal /></Button>
                        </MenuTrigger>
                        <MenuContent className="w-52">
                          <MenuItem onSelect={() => toast.success("Sessions revoked", { description: `${s.name} must sign in again` })}>Revoke sessions</MenuItem>
                          <MenuItem onSelect={() => toast.success("2FA reset link sent", { description: s.email })}>Reset two-factor</MenuItem>
                          <MenuSeparator />
                          <MenuItem
                            danger={s.status === "active"}
                            onSelect={() => {
                              setDisabled((d) => (d.includes(s.id) ? d.filter((x) => x !== s.id) : [...d, s.id]));
                              log(PLATFORM_USER.name, s.status === "active" ? "staff.disable" : "staff.enable", `${s.status === "active" ? "Disabled" : "Re-enabled"} ${s.name}`);
                              toast(s.status === "active" ? `${s.name} disabled` : `${s.name} re-enabled`);
                            }}
                          >
                            {s.status === "active" ? "Disable account" : "Re-enable account"}
                          </MenuItem>
                        </MenuContent>
                      </Menu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        <header className="flex items-center gap-2 border-b border-line px-5 py-3">
          <ShieldCheck className="size-4 text-primary-600" />
          <div>
            <h2 className="text-sm font-semibold">Role permissions</h2>
            <p className="mt-0.5 text-xs text-ink-3">No platform role can read tenant data directly — only through a consented support session.</p>
          </div>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-surface-2 text-xs text-ink-3">
                <th className="h-10 px-5 text-left font-semibold">Permission</th>
                {ROLES.map((r) => <th key={r} className="h-10 w-32 px-3 text-center font-semibold">{STAFF_ROLE_LABEL[r]}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERMS.map((p) => (
                <tr key={p.key} className="border-t border-line">
                  <td className="px-5 py-2.5">
                    <div className="font-medium">{p.label}</div>
                    <div className="font-mono text-2xs text-ink-3">{p.key}</div>
                  </td>
                  {ROLES.map((r) => (
                    <td key={r} className="px-3 text-center">
                      {p.roles.includes(r) ? <Check className="mx-auto size-4 text-success" aria-label="Allowed" /> : <Minus className="mx-auto size-4 text-ink-3/50" aria-label="Not allowed" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <InviteDialog
        open={open}
        onOpenChange={setOpen}
        existing={rows.map((r) => r.email.toLowerCase())}
        onInvite={(row) => {
          setExtra((e) => [...e, row]);
          log(PLATFORM_USER.name, "staff.invite", `Invited ${row.name} as ${STAFF_ROLE_LABEL[row.role]}`);
        }}
      />
    </PlatformPage>
  );
}

function InviteDialog({ open, onOpenChange, existing, onInvite }: { open: boolean; onOpenChange: (o: boolean) => void; existing: string[]; onInvite: (r: StaffRow) => void }) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<Role>("support");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const reset = () => { setName(""); setEmail(""); setRole("support"); setErrors({}); };

  const submit = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Required";
    if (!/^[^\s@]+@factoryerp\.in$/i.test(email.trim())) e.email = "Use a company address ending in @factoryerp.in";
    else if (existing.includes(email.trim().toLowerCase())) e.email = "This person is already on the team";
    setErrors(e);
    if (Object.keys(e).length) return;
    onInvite({ id: `ps${Date.now()}`, name: name.trim(), email: email.trim().toLowerCase(), role, twoFactor: role === "super_admin" ? "hardware_key" : "totp", lastActive: "", status: "active", invited: true });
    toast.success(`Invite sent to ${email.trim()}`, { description: role === "super_admin" ? "They must enrol a hardware security key on first sign-in" : "SSO sign-in + authenticator app" });
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title="Invite platform staff"
      description="Staff accounts are separate from tenant users"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Send invite</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Full name" required layout="vertical" error={errors.name} htmlFor="si-n">
          <Input id="si-n" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} />
        </Field>
        <Field label="Work email" required layout="vertical" error={errors.email} htmlFor="si-e">
          <Input id="si-e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@factoryerp.in" aria-invalid={!!errors.email} />
        </Field>
        <Field label="Role" layout="vertical" htmlFor="si-r" hint={role === "super_admin" ? "Super admins need a FIDO2 hardware key — no exceptions." : undefined}>
          <Select id="si-r" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => <option key={r} value={r}>{STAFF_ROLE_LABEL[r]}</option>)}
          </Select>
        </Field>
      </div>
    </Dialog>
  );
}
