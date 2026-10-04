"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Factory,
  FlaskConical,
  Mail,
  Rocket,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PlatformPage } from "@/components/platform/platform-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import {
  FEATURES,
  type IndustryTemplate,
  type NewTenantInput,
  type PlanKey,
  PLANS,
  planPrice,
  PLATFORM_USER,
  type Tenant,
  TEMPLATES,
  usePlatform,
} from "@/lib/store/platform";
import { cn, formatDate, formatINR0, TODAY } from "@/lib/utils";

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PHONE_RE = /^\+?[\d\s-]{10,15}$/;

const STATES: [string, string][] = [
  ["27", "Maharashtra"], ["24", "Gujarat"], ["29", "Karnataka"], ["33", "Tamil Nadu"], ["06", "Haryana"], ["09", "Uttar Pradesh"],
  ["07", "Delhi"], ["08", "Rajasthan"], ["03", "Punjab"], ["36", "Telangana"], ["37", "Andhra Pradesh"], ["19", "West Bengal"],
  ["23", "Madhya Pradesh"], ["32", "Kerala"], ["21", "Odisha"],
];

const TURNOVER = ["Up to ₹5 Cr", "₹5-50 Cr", "Above ₹50 Cr"];
const FEES = [
  { value: 25000, label: "Starter package", desc: "Template + import support + 1 training session" },
  { value: 50000, label: "Standard package", desc: "Data migration, GSP setup, 3 training sessions" },
  { value: 75000, label: "Premium package", desc: "On-site go-live week, Tally reconciliation, operator training" },
];
const TEMPLATE_ICON: Record<IndustryTemplate, React.ReactNode> = {
  cnc_job_shop: <Factory />,
  fabrication: <Building2 />,
  plastics: <FlaskConical />,
  auto_components: <Sparkles />,
  blank: <Building2 />,
};

const STEPS = [
  { key: "company", label: "Company", desc: "Legal entity & GSTIN", icon: Building2 },
  { key: "plan", label: "Plan & billing", desc: "Subscription and onboarding fee", icon: Sparkles },
  { key: "template", label: "Industry template", desc: "What gets pre-configured", icon: Factory },
  { key: "owner", label: "Owner admin", desc: "Who receives the invite", icon: UserRound },
  { key: "team", label: "Onboarding team", desc: "Manager and go-live target", icon: Users },
  { key: "review", label: "Review & provision", desc: "Create the tenant", icon: Rocket },
] as const;

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

type Form = NewTenantInput & { stateCode: string; feeChoice: string; customFee: string; notes: string };

const initial: Form = {
  name: "", shortName: "", gstin: "", city: "", state: "Maharashtra", stateCode: "27", turnoverBand: "₹5-50 Cr",
  template: "cnc_job_shop", plan: "growth", cycle: "annual",
  owner: { name: "", email: "", phone: "" },
  onboardingManager: "Pooja Nair", onboardingFee: 50000, feeChoice: "50000", customFee: "",
  goLiveTarget: addDays(TODAY, 14), sandbox: true, notes: "",
};

export default function OnboardTenantPage() {
  const router = useRouter();
  const createTenant = usePlatform((s) => s.createTenant);
  const tenants = usePlatform((s) => s.tenants);
  const staff = usePlatform((s) => s.staff);
  const managers = staff.filter((s) => s.status === "active" && (s.role === "onboarding" || s.role === "super_admin"));

  const [step, setStep] = React.useState(0);
  const [f, setF] = React.useState<Form>(initial);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [created, setCreated] = React.useState<Tenant | null>(null);
  const [busy, setBusy] = React.useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const setOwner = (k: keyof Form["owner"], v: string) => setF((x) => ({ ...x, owner: { ...x.owner, [k]: v } }));

  const fee = f.feeChoice === "custom" ? Number(f.customFee) || 0 : Number(f.feeChoice);

  const validate = (i: number) => {
    const e: Record<string, string> = {};
    if (i === 0) {
      if (!f.name.trim()) e.name = "Required";
      if (!f.shortName.trim()) e.shortName = "Required";
      if (!GSTIN_RE.test(f.gstin)) e.gstin = "Invalid GSTIN — 15 characters, e.g. 27AAKCS4821M1Z5";
      else if (f.gstin.slice(0, 2) !== f.stateCode) e.gstin = `First two digits must match state code ${f.stateCode} (${f.state})`;
      else if (tenants.some((t) => t.gstin === f.gstin)) e.gstin = "A tenant with this GSTIN already exists";
      if (!f.city.trim()) e.city = "Required";
    }
    if (i === 1 && f.feeChoice === "custom" && !(Number(f.customFee) >= 0 && f.customFee !== "")) e.customFee = "Enter an amount (0 for none)";
    if (i === 3) {
      if (!f.owner.name.trim()) e.ownerName = "Required";
      if (!EMAIL_RE.test(f.owner.email)) e.ownerEmail = "Enter a valid email";
      if (!PHONE_RE.test(f.owner.phone)) e.ownerPhone = "Enter a valid mobile number";
    }
    if (i === 4) {
      if (!f.goLiveTarget || f.goLiveTarget < TODAY) e.goLive = "Pick a date from today onward";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validate(step)) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const goTo = (i: number) => {
    if (i <= step) return setStep(i);
    for (let k = step; k < i; k++) if (!validate(k)) return setStep(k);
    setStep(i);
  };

  const provision = () => {
    for (let k = 0; k < 5; k++) if (!validate(k)) return setStep(k);
    setBusy(true);
    setTimeout(() => {
      const t = createTenant(
        {
          name: f.name.trim(), shortName: f.shortName.trim(), gstin: f.gstin, city: f.city.trim(), state: f.state, turnoverBand: f.turnoverBand,
          template: f.template, plan: f.plan, cycle: f.cycle, owner: { name: f.owner.name.trim(), email: f.owner.email.trim(), phone: f.owner.phone.trim() },
          onboardingManager: f.onboardingManager, onboardingFee: fee, goLiveTarget: f.goLiveTarget, sandbox: f.sandbox,
        },
        PLATFORM_USER.name,
      );
      if (f.notes.trim()) usePlatform.getState().updateTenant(t.id, { notes: f.notes.trim() }, PLATFORM_USER.name, "tenant.note", "Added onboarding notes");
      setBusy(false);
      setCreated(t);
      toast.success(`${t.shortName} provisioned`, { description: `Invite emailed to ${t.owner.email}` });
    }, 900);
  };

  if (created) return <Success t={created} onAnother={() => { setCreated(null); setF(initial); setStep(0); }} onOpen={() => router.push(`/platform/tenants/${created.id}`)} />;

  const pct = Math.round((step / (STEPS.length - 1)) * 100);

  return (
    <PlatformPage
      title="Onboard a new tenant"
      subtitle="Provision the workspace, apply an industry template and invite the owner. Most factories go live in under 14 days."
      crumbs={[{ label: "Platform", href: "/platform" }, { label: "Tenants", href: "/platform/tenants" }, { label: "Onboard tenant" }]}
      actions={<Button onClick={() => router.push("/platform/tenants")}>Cancel</Button>}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-start">
        {/* Stepper */}
        <aside className="rounded-xl border border-line bg-surface p-4 shadow-xs lg:sticky lg:top-[68px] lg:w-72 lg:shrink-0">
          <div className="flex items-center justify-between text-xs font-medium text-ink-3">
            <span>Progress</span>
            <span className="tabular">{pct}%</span>
          </div>
          <div className="mt-1.5 mb-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-primary-600 transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          <ol className="flex gap-1 overflow-x-auto lg:flex-col">
            {STEPS.map((s, i) => {
              const done = i < step;
              const cur = i === step;
              return (
                <li key={s.key} className="shrink-0">
                  <button
                    onClick={() => goTo(i)}
                    aria-current={cur ? "step" : undefined}
                    className={cn("flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors", cur ? "bg-primary-50" : "hover:bg-surface-2")}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                        done ? "border-primary-600 bg-primary-600 text-white" : cur ? "border-primary-600 text-primary-700" : "border-line-strong text-ink-3",
                      )}
                    >
                      {done ? <Check className="size-3.5" /> : i + 1}
                    </span>
                    <span className="hidden sm:block">
                      <span className={cn("block text-sm font-medium", cur ? "text-primary-800" : done ? "text-ink" : "text-ink-2")}>{s.label}</span>
                      <span className="block text-xs text-ink-3">{s.desc}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        {/* Step body */}
        <section className="min-w-0 flex-1 rounded-xl border border-line bg-surface shadow-xs">
          <header className="border-b border-line px-6 py-4">
            <div className="text-xs font-medium tracking-wide text-ink-3 uppercase">Step {step + 1} of {STEPS.length}</div>
            <h2 className="text-lg font-semibold">{STEPS[step].label}</h2>
          </header>
          <div className="px-6 py-5">
            {step === 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                <Field layout="vertical" label="Legal name" required error={errors.name} htmlFor="nm" className="md:col-span-2">
                  <Input id="nm" aria-invalid={!!errors.name} value={f.name} placeholder="e.g. Krishna Engineering Works Pvt Ltd"
                    onChange={(e) => set("name", e.target.value)} />
                </Field>
                <Field layout="vertical" label="Short name" required error={errors.shortName} hint="Shown in the app header and on the tenant list" htmlFor="sn">
                  <Input id="sn" aria-invalid={!!errors.shortName} value={f.shortName} placeholder="e.g. Krishna Engineering" onChange={(e) => set("shortName", e.target.value)} />
                </Field>
                <Field layout="vertical" label="State" htmlFor="st">
                  <Select id="st" value={`${f.stateCode}|${f.state}`} onChange={(e) => { const [c, n] = e.target.value.split("|"); setF((x) => ({ ...x, stateCode: c, state: n })); }}>
                    {STATES.map(([c, n]) => <option key={c} value={`${c}|${n}`}>{c} - {n}</option>)}
                  </Select>
                </Field>
                <Field layout="vertical" label="GSTIN" required error={errors.gstin} hint="Verified with the GSP when the tenant is provisioned" htmlFor="gst">
                  <Input id="gst" className="font-mono uppercase" maxLength={15} aria-invalid={!!errors.gstin} value={f.gstin} placeholder="27AAKCS4821M1Z5"
                    onChange={(e) => set("gstin", e.target.value.toUpperCase().replace(/\s/g, ""))} />
                </Field>
                <Field layout="vertical" label="PAN (from GSTIN)" htmlFor="pan">
                  <Input id="pan" className="font-mono" disabled value={GSTIN_RE.test(f.gstin) ? f.gstin.slice(2, 12) : ""} placeholder="Auto-filled" />
                </Field>
                <Field layout="vertical" label="City" required error={errors.city} htmlFor="ct">
                  <Input id="ct" aria-invalid={!!errors.city} value={f.city} placeholder="e.g. Pune" onChange={(e) => set("city", e.target.value)} />
                </Field>
                <Field layout="vertical" label="Annual turnover" hint="Decides e-invoicing, HSN digits and ITC-04 frequency" htmlFor="tb">
                  <Select id="tb" value={f.turnoverBand} onChange={(e) => set("turnoverBand", e.target.value)}>
                    {TURNOVER.map((t) => <option key={t}>{t}</option>)}
                  </Select>
                </Field>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-ink-2">Choose the subscription. Entitlements switch on instantly; you can change plan later without migration.</p>
                  <div className="flex shrink-0 rounded-md border border-line-strong p-0.5" role="group" aria-label="Billing cycle">
                    {(["monthly", "annual"] as const).map((c) => (
                      <button key={c} onClick={() => set("cycle", c)} aria-pressed={f.cycle === c}
                        className={cn("h-7 rounded px-3 text-xs font-medium", f.cycle === c ? "bg-primary-600 text-white" : "text-ink-2 hover:bg-surface-3")}>
                        {c === "monthly" ? "Monthly" : "Annual −15%"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {(Object.keys(PLANS) as PlanKey[]).map((k) => {
                    const p = PLANS[k];
                    const on = f.plan === k;
                    return (
                      <button key={k} onClick={() => set("plan", k)} aria-pressed={on}
                        className={cn("flex flex-col rounded-xl border p-4 text-left transition-colors", on ? "border-primary-500 bg-primary-50/40 ring-3 ring-primary-500/15" : "border-line hover:border-line-strong")}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{p.name}</span>
                          {k === "growth" && <Badge tone="brand" dot={false}>Most popular</Badge>}
                        </div>
                        <div className="mt-2"><span className="tabular text-2xl font-semibold">{formatINR0(planPrice(k, f.cycle))}</span><span className="text-xs text-ink-3"> /month + GST</span></div>
                        <div className="mt-1 text-xs text-ink-3">{p.tagline}</div>
                        <div className="mt-3 text-xs text-ink-2">{p.limits.users} office users · {p.limits.terminals} terminals · {p.limits.whatsapp.toLocaleString("en-IN")} WhatsApp/mo</div>
                        <ul className="mt-3 space-y-1 border-t border-line pt-3">
                          {FEATURES.map((ft) => {
                            const has = p.features.includes(ft.key);
                            return (
                              <li key={ft.key} className={cn("flex items-start gap-1.5 text-xs", has ? "text-ink-2" : "text-ink-3 line-through opacity-60")}>
                                <Check className={cn("mt-0.5 size-3 shrink-0", has ? "text-success" : "text-ink-3")} />{ft.label}
                              </li>
                            );
                          })}
                        </ul>
                      </button>
                    );
                  })}
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Onboarding package</h3>
                  <div className="grid gap-2 md:grid-cols-2">
                    {[...FEES.map((x) => ({ key: String(x.value), label: x.label, desc: x.desc, price: formatINR0(x.value) })), { key: "custom", label: "Custom / waived", desc: "Negotiated amount or ₹0 for pilots", price: "" }].map((o) => (
                      <label key={o.key} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3", f.feeChoice === o.key ? "border-primary-500 bg-primary-50/40" : "border-line hover:border-line-strong")}>
                        <input type="radio" name="fee" className="mt-1 accent-primary-600" checked={f.feeChoice === o.key} onChange={() => set("feeChoice", o.key)} />
                        <span className="flex-1">
                          <span className="flex justify-between gap-2 text-sm font-medium"><span>{o.label}</span><span className="tabular">{o.price}</span></span>
                          <span className="block text-xs text-ink-3">{o.desc}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {f.feeChoice === "custom" && (
                    <Field layout="vertical" label="Custom amount (₹, excl. GST)" error={errors.customFee} className="mt-3 max-w-xs" htmlFor="cf">
                      <Input id="cf" type="number" min={0} value={f.customFee} onChange={(e) => set("customFee", e.target.value)} />
                    </Field>
                  )}
                  <p className="mt-2 text-xs text-ink-3">A draft onboarding invoice is raised in Subscription billing (manual invoicing in R1).</p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-ink-2">The template seeds masters, routings, reason codes, approval rules and role templates. The owner can change everything later.</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {(Object.keys(TEMPLATES) as IndustryTemplate[]).map((k) => {
                    const on = f.template === k;
                    return (
                      <button key={k} onClick={() => set("template", k)} aria-pressed={on}
                        className={cn("flex items-start gap-3 rounded-xl border p-4 text-left transition-colors", on ? "border-primary-500 bg-primary-50/40 ring-3 ring-primary-500/15" : "border-line hover:border-line-strong")}>
                        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg]:size-5", on ? "bg-primary-600 text-white" : "bg-surface-3 text-ink-2")}>{TEMPLATE_ICON[k]}</span>
                        <span className="min-w-0">
                          <span className="block font-medium">{TEMPLATES[k].label}</span>
                          <span className="mt-0.5 block text-xs text-ink-3">{TEMPLATES[k].seeds}</span>
                        </span>
                        {on && <CheckCircle2 className="ml-auto size-5 shrink-0 text-primary-600" />}
                      </button>
                    );
                  })}
                </div>
                <label className="flex items-start gap-3 rounded-lg border border-line bg-surface-2 p-3">
                  <Checkbox className="mt-0.5" checked={f.sandbox} onChange={(e) => set("sandbox", e.target.checked)} />
                  <span>
                    <span className="block text-sm font-medium">Also provision a training sandbox</span>
                    <span className="block text-xs text-ink-3">A separate tenant with demo data for operator and office training. Never billed, reset any time (S8).</span>
                  </span>
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field layout="vertical" label="Owner name" required error={errors.ownerName} htmlFor="on">
                    <Input id="on" aria-invalid={!!errors.ownerName} value={f.owner.name} placeholder="e.g. Ravi Kumar" onChange={(e) => setOwner("name", e.target.value)} />
                  </Field>
                  <Field layout="vertical" label="Mobile (WhatsApp)" required error={errors.ownerPhone} htmlFor="op">
                    <Input id="op" aria-invalid={!!errors.ownerPhone} value={f.owner.phone} placeholder="+91 98xxx xxxxx" onChange={(e) => setOwner("phone", e.target.value)} />
                  </Field>
                  <Field layout="vertical" label="Work email" required error={errors.ownerEmail} className="md:col-span-2" htmlFor="oe">
                    <Input id="oe" type="email" aria-invalid={!!errors.ownerEmail} value={f.owner.email} placeholder="owner@company.in" onChange={(e) => setOwner("email", e.target.value)} />
                  </Field>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { icon: <Mail />, title: "Invite by email + WhatsApp", body: "A one-time link valid for 7 days. You can resend it from the tenant page." },
                    { icon: <ShieldCheck />, title: "Mandatory 2FA", body: "The Owner sets a password and an authenticator app before first sign-in." },
                    { icon: <Users />, title: "Owner invites the team", body: "Office users, roles and shop-floor terminals are added from the tenant's Settings." },
                  ].map((x) => (
                    <div key={x.title} className="rounded-lg border border-line bg-surface-2 p-3">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-primary-50 text-primary-700 [&_svg]:size-4">{x.icon}</span>
                      <div className="mt-2 text-sm font-medium">{x.title}</div>
                      <div className="mt-0.5 text-xs text-ink-3">{x.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="grid gap-4 md:grid-cols-2">
                <Field layout="vertical" label="Onboarding manager" htmlFor="om" hint="Owns the go-live checklist and support grants">
                  <Select id="om" value={f.onboardingManager} onChange={(e) => set("onboardingManager", e.target.value)}>
                    {managers.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </Select>
                </Field>
                <Field layout="vertical" label="Go-live target" required error={errors.goLive} hint={`Default is 14 days from signing (${formatDate(addDays(TODAY, 14))})`} htmlFor="gl">
                  <Input id="gl" type="date" min={TODAY} value={f.goLiveTarget} onChange={(e) => set("goLiveTarget", e.target.value)} />
                </Field>
                <Field layout="vertical" label="Internal notes" className="md:col-span-2" htmlFor="nt" hint="Visible to platform staff only">
                  <Textarea id="nt" value={f.notes} placeholder="Context from the sales call, special requirements, Tally version…" onChange={(e) => set("notes", e.target.value)} />
                </Field>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <ReviewBlock title="Company" onEdit={() => setStep(0)} rows={[["Legal name", f.name], ["Short name", f.shortName], ["GSTIN", f.gstin], ["Location", `${f.city}, ${f.state}`], ["Turnover", f.turnoverBand]]} />
                  <ReviewBlock title="Plan & billing" onEdit={() => setStep(1)} rows={[["Plan", `${PLANS[f.plan].name} · ${f.cycle === "annual" ? "annual" : "monthly"}`], ["Subscription", `${formatINR0(planPrice(f.plan, f.cycle))} / month + GST`], ["Onboarding fee", fee ? `${formatINR0(fee)} + GST` : "Waived"]]} />
                  <ReviewBlock title="Template" onEdit={() => setStep(2)} rows={[["Industry", TEMPLATES[f.template].label], ["Training sandbox", f.sandbox ? "Yes" : "No"]]} />
                  <ReviewBlock title="Owner & team" onEdit={() => setStep(3)} rows={[["Owner", f.owner.name], ["Email", f.owner.email], ["Mobile", f.owner.phone], ["Manager", f.onboardingManager], ["Go-live target", formatDate(f.goLiveTarget)]]} />
                </div>
                <div className="rounded-lg border border-info/20 bg-info-bg px-4 py-3 text-sm">
                  <div className="font-medium text-ink">Provisioning will:</div>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-2">
                    <li>Create the tenant in ap-south-1 (Mumbai) with row-level isolation</li>
                    <li>Apply the {TEMPLATES[f.template].label} template and {PLANS[f.plan].name} entitlements</li>
                    <li>Email and WhatsApp the owner invite to {f.owner.email || "the owner"}</li>
                    {fee > 0 && <li>Raise a draft onboarding invoice of {formatINR0(fee)} + GST</li>}
                  </ul>
                </div>
              </div>
            )}
          </div>
          <footer className="flex items-center justify-between gap-2 rounded-b-xl border-t border-line bg-surface-2 px-6 py-3">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ArrowLeft /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button variant="primary" onClick={next}>Continue <ArrowRight /></Button>
            ) : (
              <Button variant="primary" onClick={provision} disabled={busy}>
                <Rocket /> {busy ? "Provisioning…" : "Provision tenant & send invite"}
              </Button>
            )}
          </footer>
        </section>
      </div>
    </PlatformPage>
  );
}

function ReviewBlock({ title, rows, onEdit }: { title: string; rows: [string, string][]; onEdit: () => void }) {
  return (
    <div className="rounded-lg border border-line">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <span className="text-sm font-semibold">{title}</span>
        <button onClick={onEdit} className="text-xs font-medium text-primary-700 hover:underline">Edit</button>
      </div>
      <dl className="grid grid-cols-[120px_1fr] gap-y-1.5 px-4 py-3 text-sm">
        {rows.map(([k, v]) => (
          <React.Fragment key={k}>
            <dt className="text-ink-3">{k}</dt>
            <dd className="min-w-0 truncate">{v || "—"}</dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
}

function Success({ t, onAnother, onOpen }: { t: Tenant; onAnother: () => void; onOpen: () => void }) {
  const [origin, setOrigin] = React.useState("");
  React.useEffect(() => {
    // window is only available after mount.
    const id = requestAnimationFrame(() => setOrigin(window.location.origin));
    return () => cancelAnimationFrame(id);
  }, []);
  const link = `${origin}/invite/${t.id}`;
  const copy = () => {
    navigator.clipboard?.writeText(link).catch(() => undefined);
    toast.success("Invite link copied");
  };
  return (
    <PlatformPage title="Tenant provisioned" crumbs={[{ label: "Platform", href: "/platform" }, { label: "Tenants", href: "/platform/tenants" }, { label: t.shortName }]}>
      <div className="mx-auto max-w-2xl rounded-xl border border-line bg-surface p-8 text-center shadow-xs">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-bg text-success">
          <CheckCircle2 className="size-7" />
        </span>
        <h2 className="mt-4 text-xl font-semibold">{t.shortName} is ready</h2>
        <p className="mt-1 text-sm text-ink-3">
          {PLANS[t.plan].name} plan · {TEMPLATES[t.template].label} template · tenant code <span className="font-mono">{t.code}</span>
        </p>
        <div className="mt-6 rounded-lg border border-line bg-surface-2 p-4 text-left">
          <div className="text-xs font-medium text-ink-3">Owner invite sent to</div>
          <div className="text-sm font-medium">{t.owner.name} · {t.owner.email}</div>
          <div className="mt-3 flex gap-2">
            <Input readOnly value={link} className="font-mono text-xs" aria-label="Invite link" />
            <Button onClick={copy}><Copy /> Copy</Button>
          </div>
          <p className="mt-2 text-xs text-ink-3">Valid for 7 days. The owner sets a password and 2FA, then completes the setup wizard.</p>
        </div>
        <ol className="mt-6 grid gap-2 text-left text-sm sm:grid-cols-3">
          {["Owner accepts invite & sets 2FA", "Owner completes setup wizard", "You track go-live on the pipeline"].map((s, i) => (
            <li key={s} className="flex items-start gap-2 rounded-lg border border-line p-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-50 text-2xs font-semibold text-primary-700">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={onAnother}>Onboard another</Button>
          <Link href={`/invite/${t.id}`} target="_blank" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 text-sm font-medium shadow-xs hover:bg-surface-3">
            Preview invite
          </Link>
          <Button variant="primary" onClick={onOpen}>Open tenant <ArrowRight /></Button>
        </div>
      </div>
    </PlatformPage>
  );
}
