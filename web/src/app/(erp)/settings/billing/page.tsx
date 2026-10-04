"use client";

import * as React from "react";
import { ArrowUpRight, Check, CreditCard, Download, Mail, Minus, Pencil, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Section, SettingsShell } from "@/components/settings/settings-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Dialog } from "@/components/ui/overlay";
import { useRole } from "@/lib/store/app";
import { type BillingContact, useAdminSettings } from "@/lib/store/admin-settings";
import { cn, formatDate, formatINR, formatINR0 } from "@/lib/utils";

type PlanKey = "starter" | "growth" | "pro";

const PLANS: Record<PlanKey, { name: string; monthly: number; tagline: string; users: number; terminals: number; whatsapp: number }> = {
  starter: { name: "Starter", monthly: 7900, tagline: "Inventory, sales, purchase and GST billing", users: 3, terminals: 3, whatsapp: 500 },
  growth: { name: "Growth", monthly: 14900, tagline: "Full manufacturing with job-work and costing", users: 5, terminals: 10, whatsapp: 2000 },
  pro: { name: "Pro", monthly: 24900, tagline: "Higher limits, priority support, advanced reports", users: 15, terminals: 25, whatsapp: 10000 },
};

/** Feature flags gated by plan (arch §9.5). `true` = included, string = limit/note. */
const FEATURES: { group: string; rows: { label: string; flag: string; starter: boolean | string; growth: boolean | string; pro: boolean | string }[] }[] = [
  {
    group: "Core",
    rows: [
      { label: "Sales, purchase & inventory", flag: "core.erp", starter: true, growth: true, pro: true },
      { label: "GST invoicing, e-invoice & e-way bill", flag: "gst.einvoice", starter: true, growth: true, pro: true },
      { label: "Office users", flag: "limit.users", starter: "3", growth: "5", pro: "15" },
      { label: "Shop-floor terminals", flag: "limit.terminals", starter: "3", growth: "10", pro: "25" },
    ],
  },
  {
    group: "Manufacturing",
    rows: [
      { label: "BOM, routings & work orders", flag: "mfg.workorders", starter: false, growth: true, pro: true },
      { label: "Offline operator app", flag: "shopfloor.offline", starter: false, growth: true, pro: true },
      { label: "Order costing & profitability", flag: "costing.orders", starter: false, growth: true, pro: true },
      { label: "Job-work challans & ITC-04", flag: "jobwork", starter: false, growth: true, pro: true },
    ],
  },
  {
    group: "Integrations",
    rows: [
      { label: "WhatsApp messages / month", flag: "notify.whatsapp", starter: "500", growth: "2,000", pro: "10,000" },
      { label: "Tally export (masters + vouchers)", flag: "dataio.tally", starter: true, growth: true, pro: true },
      { label: "Smart import (AI mapping)", flag: "ai.import", starter: false, growth: true, pro: true },
    ],
  },
  {
    group: "Support",
    rows: [
      { label: "Data retention", flag: "retention", starter: "8 years", growth: "8 years", pro: "8 years" },
      { label: "Support", flag: "support", starter: "Email", growth: "Email + phone", pro: "Priority + named CSM" },
    ],
  },
];

export default function BillingPage() {
  const role = useRole();
  const canEdit = role.key === "owner";
  const plan = useAdminSettings((s) => s.plan);
  const cycle = useAdminSettings((s) => s.cycle);
  const setCycle = useAdminSettings((s) => s.setCycle);
  const setPlan = useAdminSettings((s) => s.setPlan);
  const invoices = useAdminSettings((s) => s.invoices);
  const contact = useAdminSettings((s) => s.contact);
  const [editContact, setEditContact] = React.useState(false);
  const [changeTo, setChangeTo] = React.useState<PlanKey | null>(null);
  const p = PLANS[plan];
  const unpaid = invoices.filter((i) => i.status === "unpaid");

  const usage = [
    { label: "Office users", used: 4, limit: p.users, unit: "" },
    { label: "Shop-floor terminals", used: 7, limit: p.terminals, unit: "" },
    { label: "WhatsApp messages", used: 1684, limit: p.whatsapp, unit: "", note: "Resets 1-Nov" },
    { label: "Document storage", used: 6.4, limit: 25, unit: " GB" },
    { label: "e-Invoices (IRN) this month", used: 212, limit: 0, unit: "", note: "Unlimited" },
  ];

  return (
    <SettingsShell title="Plan & billing">
      <div className="mx-auto max-w-5xl">
        {unpaid.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-warning/25 bg-warning-bg px-4 py-3 text-sm">
            <CreditCard className="size-4 text-warning" />
            <span className="flex-1 text-ink">
              Invoice <span className="font-mono font-medium">{unpaid[0].number}</span> for {formatINR(unpaid[0].amount)} is due on {formatDate("2026-10-15")}.
            </span>
            {canEdit && <Button size="sm" variant="primary" onClick={() => toast.success("Payment link sent to " + contact.email)}>Pay now</Button>}
          </div>
        )}

        {/* Current plan */}
        <div className="mb-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="relative overflow-hidden rounded-xl border border-line bg-brand-900 p-5 text-white shadow-xs">
            <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-primary-500/25 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-white/60 uppercase">Current plan</div>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="text-2xl font-semibold">{p.name}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80">{cycle === "annual" ? "Billed annually" : "Billed monthly"}</span>
              </div>
              <p className="mt-1 text-sm text-white/70">{p.tagline}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="tabular text-3xl font-semibold">{formatINR0(price(p.monthly, cycle))}</span>
                <span className="text-sm text-white/60">/ month + GST</span>
              </div>
              <div className="mt-1 text-xs text-white/55">1 plant · 1 GSTIN · unlimited operators · renews 01-Apr-2027</div>
              {canEdit && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {plan !== "pro" && (
                    <Button variant="primary" className="border-accent-500 bg-accent-500 hover:bg-accent-500/90" onClick={() => setChangeTo("pro")}>
                      <Sparkles /> Upgrade to Pro
                    </Button>
                  )}
                  <Button className="border-white/20 bg-white/10 text-white hover:bg-white/15" onClick={() => document.getElementById("compare")?.scrollIntoView({ behavior: "smooth" })}>
                    Compare plans
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5 shadow-xs">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Usage this month</h2>
              <span className="text-xs text-ink-3">01-Oct → 31-Oct</span>
            </div>
            <ul className="space-y-3">
              {usage.map((u) => {
                const pct = u.limit ? Math.min(100, (u.used / u.limit) * 100) : 0;
                return (
                  <li key={u.label}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-ink-2">{u.label}</span>
                      <span className="tabular font-medium">
                        {u.used.toLocaleString("en-IN")}{u.unit}
                        {u.limit ? <span className="font-normal text-ink-3"> / {u.limit.toLocaleString("en-IN")}{u.unit}</span> : null}
                      </span>
                    </div>
                    {u.limit ? (
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                        <div className={cn("h-full rounded-full", pct >= 90 ? "bg-danger" : pct >= 75 ? "bg-warning" : "bg-primary-600")} style={{ width: `${pct}%` }} />
                      </div>
                    ) : null}
                    {(u.note || pct >= 75) && (
                      <div className={cn("mt-1 text-2xs", pct >= 75 ? "text-warning" : "text-ink-3")}>
                        {pct >= 90 ? "Almost at limit — " : pct >= 75 ? "Approaching limit — " : ""}
                        {u.note ?? `${u.limit - u.used} remaining`}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Plan comparison */}
        <section id="compare" className="mb-4 scroll-mt-20 rounded-xl border border-line bg-surface shadow-xs">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
            <div>
              <h2 className="text-sm font-semibold">Plans and features</h2>
              <p className="mt-0.5 text-xs text-ink-3">Features are switched on by plan entitlements — no reinstall or data migration when you change plan.</p>
            </div>
            <div className="flex rounded-md border border-line-strong p-0.5 shadow-xs" role="group" aria-label="Billing cycle">
              {(["monthly", "annual"] as const).map((c) => (
                <button
                  key={c}
                  disabled={!canEdit}
                  aria-pressed={cycle === c}
                  onClick={() => { setCycle(c); toast(`Switched to ${c} billing from next cycle`); }}
                  className={cn("rounded px-2.5 py-1 text-xs font-medium capitalize", cycle === c ? "bg-primary-600 text-white" : "text-ink-2 hover:bg-surface-3")}
                >
                  {c}
                  {c === "annual" && <span className={cn("ml-1", cycle === c ? "text-white/80" : "text-success")}>−15%</span>}
                </button>
              ))}
            </div>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr>
                  <th className="w-[38%] px-5 py-4 text-left align-bottom text-xs font-semibold text-ink-3">Feature</th>
                  {(Object.keys(PLANS) as PlanKey[]).map((k) => (
                    <th key={k} className={cn("px-4 py-4 text-left align-top", k === plan && "bg-primary-50/60")}>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold">{PLANS[k].name}</span>
                        {k === plan && <Badge tone="brand">Current</Badge>}
                      </div>
                      <div className="tabular mt-1 text-lg font-semibold">
                        {formatINR0(price(PLANS[k].monthly, cycle))}
                        <span className="text-xs font-normal text-ink-3"> /mo</span>
                      </div>
                      {canEdit && k !== plan && (
                        <Button size="sm" className="mt-2" variant={rank(k) > rank(plan) ? "primary" : "secondary"} onClick={() => setChangeTo(k)}>
                          {rank(k) > rank(plan) ? "Upgrade" : "Downgrade"}
                        </Button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((g) => (
                  <React.Fragment key={g.group}>
                    <tr>
                      <td colSpan={4} className="border-t border-line bg-surface-2 px-5 py-1.5 text-2xs font-semibold tracking-wider text-ink-3 uppercase">{g.group}</td>
                    </tr>
                    {g.rows.map((f) => (
                      <tr key={f.flag} className="border-t border-line">
                        <td className="px-5 py-2.5">
                          <div>{f.label}</div>
                          <div className="font-mono text-2xs text-ink-3">{f.flag}</div>
                        </td>
                        {(["starter", "growth", "pro"] as const).map((k) => (
                          <td key={k} className={cn("px-4 py-2.5", k === plan && "bg-primary-50/60")}>
                            <Cell v={f[k]} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Section title="Subscription invoices" desc="GST tax invoices from FactoryERP. Claim ITC against our GSTIN 27AAFCF0921K1Z3.">
            <ul className="-my-2 divide-y divide-line">
              {invoices.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[12.5px] font-medium">{i.number}</div>
                    <div className="text-xs text-ink-3">{i.period} · {formatDate(i.date)}</div>
                  </div>
                  <span className="tabular text-sm font-medium">{formatINR(i.amount)}</span>
                  {i.status === "paid" ? <Badge tone="success">Paid</Badge> : <Badge tone="warning">Due</Badge>}
                  <Button size="icon-sm" variant="ghost" aria-label={`Download ${i.number}`} onClick={() => toast.success(`${i.number}.pdf downloaded`)}>
                    <Download />
                  </Button>
                </li>
              ))}
            </ul>
          </Section>

          <div>
            <Section
              title="Billing contact"
              desc="Invoices and payment reminders go here."
              action={canEdit && <Button size="sm" variant="ghost" onClick={() => setEditContact(true)}><Pencil /> Edit</Button>}
            >
              <dl className="grid grid-cols-[80px_1fr] gap-y-2 text-sm">
                <dt className="text-ink-3">Name</dt><dd className="font-medium">{contact.name}</dd>
                <dt className="text-ink-3">Email</dt><dd className="flex items-center gap-1.5"><Mail className="size-3.5 text-ink-3" />{contact.email}</dd>
                <dt className="text-ink-3">Phone</dt><dd>{contact.phone}</dd>
                <dt className="text-ink-3">GSTIN</dt><dd className="font-mono text-[13px]">{contact.gstin}</dd>
                <dt className="text-ink-3">Address</dt><dd className="text-ink-2">{contact.address}</dd>
              </dl>
            </Section>
            <Section title="Payment method">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-12 items-center justify-center rounded-md border border-line bg-surface-2 text-2xs font-bold text-info">NACH</span>
                <div className="flex-1 text-sm">
                  <div className="font-medium">e-Mandate · HDFC Bank ••4417</div>
                  <div className="text-xs text-ink-3">Auto-debit on the 5th · max ₹50,000</div>
                </div>
                {canEdit && <Button size="sm" onClick={() => toast("Mandate update link sent to " + contact.email)}>Change <ArrowUpRight /></Button>}
              </div>
            </Section>
          </div>
        </div>
      </div>

      <ContactDialog open={editContact} onClose={() => setEditContact(false)} />
      <Dialog
        open={!!changeTo}
        onOpenChange={(o) => !o && setChangeTo(null)}
        title={changeTo ? `${rank(changeTo) > rank(plan) ? "Upgrade" : "Downgrade"} to ${PLANS[changeTo].name}` : ""}
        description={changeTo ? PLANS[changeTo].tagline : undefined}
        footer={
          <>
            <Button onClick={() => setChangeTo(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!changeTo) return;
                setPlan(changeTo);
                toast.success(`Plan changed to ${PLANS[changeTo].name}`, { description: rank(changeTo) > rank(plan) ? "New features are available now; prorated invoice issued" : "Takes effect from the next billing cycle" });
                setChangeTo(null);
              }}
            >
              Confirm change
            </Button>
          </>
        }
      >
        {changeTo && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3">
              <span className="text-ink-2">New price</span>
              <span className="tabular text-base font-semibold">{formatINR0(price(PLANS[changeTo].monthly, cycle))} / month + GST</span>
            </div>
            <ul className="space-y-1.5 text-ink-2">
              <li>• Office users: {PLANS[plan].users} → <span className="font-medium text-ink">{PLANS[changeTo].users}</span></li>
              <li>• Terminals: {PLANS[plan].terminals} → <span className="font-medium text-ink">{PLANS[changeTo].terminals}</span></li>
              <li>• WhatsApp messages: {PLANS[plan].whatsapp.toLocaleString("en-IN")} → <span className="font-medium text-ink">{PLANS[changeTo].whatsapp.toLocaleString("en-IN")}</span></li>
            </ul>
            {rank(changeTo) < rank(plan) && (
              <p className="rounded-md bg-warning-bg px-3 py-2 text-ink">
                Starter does not include manufacturing, job-work or costing. Existing records stay readable but you cannot create new work orders or challans. 7 terminals exceed the Starter limit of 3.
              </p>
            )}
          </div>
        )}
      </Dialog>
    </SettingsShell>
  );
}

function price(monthly: number, cycle: "monthly" | "annual") {
  return cycle === "annual" ? Math.round((monthly * 0.85) / 10) * 10 : monthly;
}

function rank(k: PlanKey) {
  return { starter: 0, growth: 1, pro: 2 }[k];
}

function Cell({ v }: { v: boolean | string }) {
  if (v === true) return <Check className="size-4 text-success" aria-label="Included" />;
  if (v === false) return <Minus className="size-4 text-ink-3/60" aria-label="Not included" />;
  return <span className="font-medium">{v}</span>;
}

function ContactDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const contact = useAdminSettings((s) => s.contact);
  const setContact = useAdminSettings((s) => s.setContact);
  const [c, setC] = React.useState<BillingContact>(contact);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setC(contact);
      setErrors({});
    }
  }
  const save = () => {
    const e: Record<string, string> = {};
    if (!c.name.trim()) e.name = "Required";
    if (!/^\S+@\S+\.\S+$/.test(c.email)) e.email = "Invalid email";
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(c.gstin)) e.gstin = "Invalid GSTIN";
    setErrors(e);
    if (Object.keys(e).length) return;
    setContact(c);
    toast.success("Billing contact updated");
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="Billing contact" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" required error={errors.name} layout="vertical" htmlFor="bc-n"><Input id="bc-n" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></Field>
        <Field label="Phone" layout="vertical" htmlFor="bc-p"><Input id="bc-p" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} /></Field>
        <Field label="Email" required error={errors.email} layout="vertical" htmlFor="bc-e" className="sm:col-span-2"><Input id="bc-e" type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} /></Field>
        <Field label="GSTIN" required error={errors.gstin} layout="vertical" htmlFor="bc-g" className="sm:col-span-2"><Input id="bc-g" className="font-mono uppercase" maxLength={15} value={c.gstin} onChange={(e) => setC({ ...c, gstin: e.target.value.toUpperCase() })} /></Field>
        <Field label="Billing address" layout="vertical" htmlFor="bc-a" className="sm:col-span-2"><Textarea id="bc-a" className="min-h-16" value={c.address} onChange={(e) => setC({ ...c, address: e.target.value })} /></Field>
      </div>
    </Dialog>
  );
}
