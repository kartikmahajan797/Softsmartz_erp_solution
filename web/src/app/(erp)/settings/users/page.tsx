"use client";

import * as React from "react";
import { Tabs as RT } from "radix-ui";
import { MoreHorizontal, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Section, SettingsShell } from "@/components/settings/settings-shell";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { Dialog, Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/overlay";
import { ROLES, type RoleKey, useRole } from "@/lib/store/app";
import { MODULES, PERMS, useSettings } from "@/lib/store/settings";
import { cn, formatDateTime } from "@/lib/utils";

const PERM_LABEL = { read: "Read", create: "Create", approve: "Approve", post: "Post" };

export default function UsersPage() {
  const me = useRole();
  const { users, matrix, fieldRules, officeUserLimit, inviteUser, setUserStatus, togglePerm, toggleFieldRule } = useSettings();
  const [tab, setTab] = React.useState("users");
  const [role, setRole] = React.useState<RoleKey>("store");
  const [invite, setInvite] = React.useState(false);
  const canEdit = me.key === "owner";
  const activeCount = users.filter((u) => u.status !== "disabled").length;

  return (
    <SettingsShell
      title="Users & roles"
      actions={canEdit && <Button variant="primary" onClick={() => setInvite(true)}><UserPlus /> Invite user</Button>}
    >
      <RT.Root value={tab} onValueChange={setTab} className="mx-auto max-w-6xl">
        <RT.List className="mb-4 flex gap-1 border-b border-line" aria-label="Users and roles">
          {[["users", "Users"], ["roles", "Roles & permissions"]].map(([k, l]) => (
            <RT.Trigger key={k} value={k} className="-mb-px h-9 border-b-2 border-transparent px-3 text-sm font-medium text-ink-3 hover:text-ink data-[state=active]:border-primary-600 data-[state=active]:text-ink">{l}</RT.Trigger>
          ))}
        </RT.List>

        <RT.Content value="users">
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-xs">
            <div className="text-sm"><span className="font-semibold">{activeCount}</span> of {officeUserLimit} office users on the Growth plan</div>
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-primary-600" style={{ width: `${(activeCount / officeUserLimit) * 100}%` }} /></div>
            <span className="text-xs text-ink-3">Operators on shop-floor terminals are unlimited and not counted.</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-xs">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-surface-2 text-xs text-ink-2">
                <tr>{["User", "Role", "Phone", "2FA", "Last active", "Status", ""].map((h) => <th key={h} className="px-4 py-2 text-left font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-line">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-800">{u.name.split(" ").map((x) => x[0]).join("").slice(0, 2)}</span>
                        <div><div className="font-medium">{u.name}</div><div className="text-xs text-ink-3">{u.email}</div></div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">{ROLES[u.role].label}{u.name.startsWith("CA ") && <Badge tone="neutral" dot={false} className="ml-2">External</Badge>}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{u.phone}</td>
                    <td className="px-4 py-2.5">
                      {u.twoFactor ? <span className="flex items-center gap-1 text-success"><ShieldCheck className="size-4" /> On</span> : ["owner", "accountant"].includes(u.role) ? <Badge tone="danger">Required</Badge> : <span className="text-ink-3">Off</span>}
                    </td>
                    <td className="px-4 py-2.5 text-ink-2">{u.lastActive ? formatDateTime(u.lastActive) : "—"}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={u.status === "invited" ? "pending" : u.status === "disabled" ? "cancelled" : "active"} /></td>
                    <td className="px-4 py-2.5 text-right">
                      {canEdit && u.role !== "owner" && (
                        <Menu>
                          <MenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Actions for ${u.name}`}><MoreHorizontal /></Button></MenuTrigger>
                          <MenuContent>
                            {u.status === "invited" && <MenuItem onSelect={() => toast.success(`Invite re-sent to ${u.email}`)}>Resend invite</MenuItem>}
                            <MenuItem onSelect={() => toast.success(`Password reset link sent to ${u.email}`)}>Reset password</MenuItem>
                            <MenuItem danger={u.status !== "disabled"} onSelect={() => { setUserStatus(u.id, u.status === "disabled" ? "active" : "disabled"); toast(u.status === "disabled" ? `${u.name} enabled` : `${u.name} disabled · sessions revoked`); }}>
                              {u.status === "disabled" ? "Enable user" : "Disable user"}
                            </MenuItem>
                          </MenuContent>
                        </Menu>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </RT.Content>

        <RT.Content value="roles">
          <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <ul className="h-fit overflow-hidden rounded-xl border border-line bg-surface shadow-xs" aria-label="Roles">
              {(Object.keys(ROLES) as RoleKey[]).map((k) => (
                <li key={k}>
                  <button onClick={() => setRole(k)} className={cn("flex w-full items-center justify-between border-b border-line px-4 py-2.5 text-left text-sm last:border-0 hover:bg-surface-2", role === k && "bg-primary-50 font-medium text-primary-800")}>
                    {ROLES[k].label}
                    <span className="text-xs text-ink-3">{users.filter((u) => u.role === k).length}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div>
              <Section title={`${ROLES[role].label} · module permissions`} desc="Permission codes are module.resource.action; enforced on the server, mirrored in the UI.">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="text-xs text-ink-3">
                      <tr className="border-b border-line">
                        <th className="py-2 text-left font-medium">Module</th>
                        {PERMS.map((p) => <th key={p} className="w-24 py-2 text-center font-medium">{PERM_LABEL[p]}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {MODULES.map((m) => (
                        <tr key={m} className="border-b border-line last:border-0">
                          <td className="py-2 font-medium">{m}</td>
                          {PERMS.map((p) => (
                            <td key={p} className="py-2 text-center">
                              <Checkbox
                                aria-label={`${ROLES[role].label} ${m} ${p}`}
                                checked={(matrix[role][m] ?? []).includes(p)}
                                disabled={!canEdit || role === "owner"}
                                onChange={() => { togglePerm(role, m, p); toast.success(`${m}: ${PERM_LABEL[p]} ${(matrix[role][m] ?? []).includes(p) ? "removed" : "granted"}`, { description: ROLES[role].label }); }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {role === "owner" && <p className="mt-3 text-xs text-ink-3">The Owner / Admin role always has full access.</p>}
              </Section>
              <Section title="Field rules" desc="Hidden fields are removed from API responses, exports and screens — not just greyed out.">
                <div className="grid gap-3 sm:grid-cols-3">
                  {([["cost", "Cost & valuation", "Item cost, stock value, WO cost"], ["rate", "Purchase & sale rates", "PO rates, price lists"], ["margin", "Margin & profitability", "Order margin, variance"]] as const).map(([k, l, d]) => {
                    const visible = fieldRules[role][k];
                    return (
                      <label key={k} className={cn("flex cursor-pointer gap-3 rounded-lg border p-3", visible ? "border-line" : "border-warning/30 bg-warning-bg/50")}>
                        <Checkbox checked={visible} disabled={!canEdit || role === "owner"} onChange={() => toggleFieldRule(role, k)} />
                        <span>
                          <span className="block text-sm font-medium">{l}</span>
                          <span className="block text-xs text-ink-3">{d}</span>
                          <span className={cn("mt-1 block text-xs font-medium", visible ? "text-success" : "text-warning")}>{visible ? "Visible" : "Hidden"}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </Section>
            </div>
          </div>
        </RT.Content>
      </RT.Root>

      <InviteDialog
        open={invite}
        onOpenChange={setInvite}
        full={activeCount >= officeUserLimit}
        onInvite={(u) => { inviteUser(u); toast.success(`Invite sent to ${u.email}`, { description: `${ROLES[u.role].label} · link valid 72 h` }); setInvite(false); }}
      />
    </SettingsShell>
  );
}

function InviteDialog({ open, onOpenChange, full, onInvite }: { open: boolean; onOpenChange: (o: boolean) => void; full: boolean; onInvite: (u: { name: string; email: string; phone: string; role: RoleKey }) => void }) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [role, setRole] = React.useState<RoleKey>("sales");
  const [err, setErr] = React.useState("");
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setName(""); setEmail(""); setPhone(""); setRole("sales"); setErr(""); }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Invite office user"
      description="They receive an email and WhatsApp link to set a password."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" disabled={full} onClick={() => {
            if (!name.trim()) return setErr("Enter a name");
            if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email");
            if (!/^\+?91?\s?\d{5}\s?\d{5}$/.test(phone.replace(/\s/g, " ").trim())) return setErr("Enter a 10-digit Indian mobile number");
            onInvite({ name: name.trim(), email: email.trim(), phone: phone.trim(), role });
          }}>Send invite</Button>
        </>
      }
    >
      {full && <p className="mb-3 rounded-md bg-warning-bg px-3 py-2 text-sm text-warning">Office user limit reached for your plan. Disable a user or upgrade to Plus.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name" required layout="vertical" htmlFor="iu-n"><Input id="iu-n" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Role" layout="vertical" htmlFor="iu-r">
          <Select id="iu-r" value={role} onChange={(e) => setRole(e.target.value as RoleKey)}>
            {(Object.keys(ROLES) as RoleKey[]).filter((k) => k !== "owner").map((k) => <option key={k} value={k}>{ROLES[k].label}</option>)}
          </Select>
        </Field>
        <Field label="Email" required layout="vertical" htmlFor="iu-e"><Input id="iu-e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Mobile" required layout="vertical" htmlFor="iu-p"><Input id="iu-p" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98220 12345" /></Field>
      </div>
      {["accountant"].includes(role) && <p className="mt-3 text-xs text-ink-3">2FA will be mandatory for this role.</p>}
      {err && <p className="mt-3 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{err}</p>}
    </Dialog>
  );
}
