"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CircleCheck,
  CircleDashed,
  Cog,
  Download,
  Factory,
  FileSpreadsheet,
  Hammer,
  Layers,
  Loader2,
  Plus,
  Rocket,
  Trash2,
  Upload,
  Users,
  Warehouse,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/form";
import { cn } from "@/lib/utils";

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const STATES: [string, string][] = [["27", "Maharashtra"], ["29", "Karnataka"], ["24", "Gujarat"], ["06", "Haryana"], ["33", "Tamil Nadu"], ["09", "Uttar Pradesh"]];

const STEPS: { key: string; label: string; desc: string; icon: LucideIcon }[] = [
  { key: "company", label: "Company & GSTIN", desc: "Legal entity and tax registration", icon: Building2 },
  { key: "template", label: "Industry template", desc: "Seed masters for your industry", icon: Layers },
  { key: "plant", label: "Plant & shifts", desc: "Warehouses and working hours", icon: Warehouse },
  { key: "opening", label: "Opening balances", desc: "Stock, receivables, payables", icon: Wallet },
  { key: "team", label: "Invite team", desc: "Office users and roles", icon: Users },
  { key: "golive", label: "Go-live checklist", desc: "Review and launch", icon: Rocket },
];

const TEMPLATES: { key: string; name: string; icon: LucideIcon; blurb: string; seeds: string[] }[] = [
  {
    key: "cnc", name: "CNC job shop", icon: Cog, blurb: "Turned and milled parts to customer drawings",
    seeds: ["8 work centres (CNC lathe, VMC, drill…)", "Routing: turning → milling → inspection", "Reject reasons: dimension, burr, setup", "Job-work: heat treatment, plating"],
  },
  {
    key: "fab", name: "Fabrication", icon: Hammer, blurb: "Sheet metal, welding, structures",
    seeds: ["Laser, press brake, welding bays", "BOMs with cut lengths and sheet nesting", "Scrap by weight to scrap yard", "Job-work: galvanising, powder coat"],
  },
  {
    key: "plastics", name: "Plastics moulding", icon: Factory, blurb: "Injection and blow moulding",
    seeds: ["Moulding machines by tonnage", "Mould master with cavity count", "Regrind and runner wastage codes", "Batch tracking of resin lots"],
  },
  {
    key: "auto", name: "Auto components tier-2/3", icon: Layers, blurb: "Supplying OEMs and tier-1s",
    seeds: ["Customer schedules and call-offs", "PPAP-ready inspection steps", "FIFO batch dispatch", "Job-work + e-way bill for inter-state"],
  },
];

const ROLES = ["Owner / Admin", "Production head", "Store keeper", "Accountant", "Sales & purchase", "External CA (read-only)"];

interface Invite {
  id: number;
  email: string;
  role: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [done, setDone] = React.useState<number[]>([]);
  const [finishing, setFinishing] = React.useState(false);

  const [company, setCompany] = React.useState({ legalName: "", gstin: "", state: "27", turnover: "5-50", fyStart: "4" });
  const [companyErr, setCompanyErr] = React.useState<Record<string, string>>({});
  const [template, setTemplate] = React.useState("cnc");
  const [sandbox, setSandbox] = React.useState(true);
  const [plant, setPlant] = React.useState({ name: "Plant 1", address: "", warehouses: ["Main stores", "Finished goods", "Scrap yard"], newWh: "" });
  const [shifts, setShifts] = React.useState([
    { name: "Shift A", start: "07:00", end: "15:30" },
    { name: "Shift B", start: "15:30", end: "00:00" },
  ]);
  const [opening, setOpening] = React.useState<Record<string, "pending" | "uploaded" | "skipped">>({ stock: "pending", ar: "pending", ap: "pending" });
  const [invites, setInvites] = React.useState<Invite[]>([
    { id: 1, email: "", role: "Production head" },
    { id: 2, email: "", role: "Accountant" },
  ]);

  const validateCompany = () => {
    const e: Record<string, string> = {};
    if (!company.legalName.trim()) e.legalName = "Required";
    if (!GSTIN_RE.test(company.gstin)) e.gstin = "Enter a valid 15-character GSTIN, e.g. 27AAKCS4821M1Z5";
    else if (company.gstin.slice(0, 2) !== company.state) e.gstin = `First two digits must match state code ${company.state}`;
    setCompanyErr(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (step === 0 && !validateCompany()) return;
    if (step === 4) {
      const bad = invites.find((i) => i.email && !/^\S+@\S+\.\S+$/.test(i.email));
      if (bad) return toast.error(`"${bad.email}" is not a valid email`);
    }
    setDone((d) => (d.includes(step) ? d : [...d, step]));
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const finish = () => {
    setFinishing(true);
    setTimeout(() => {
      toast.success("Your factory is live", { description: `${TEMPLATES.find((t) => t.key === template)!.name} template applied` });
      router.push("/dashboard");
    }, 900);
  };

  const progress = Math.round((done.length / (STEPS.length - 1)) * 100);
  const current = STEPS[step];

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
        <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
          <rect width="32" height="32" rx="8" fill="#0d7377" />
          <path d="M8 23V12l5 3.2V12l5 3.2V9h6v14z" fill="#fff" />
          <rect x="19.5" y="11" width="3" height="3" rx=".6" fill="#e8891c" />
        </svg>
        <span className="text-[15px] font-semibold">Factory ERP</span>
        <span className="hidden text-sm text-ink-3 sm:inline">· Set up your factory</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs text-ink-3 md:inline">Most factories go live in under 14 days</span>
          <Button
            onClick={() => {
              toast.success("Progress saved", { description: "Pick up where you left off any time" });
              router.push("/dashboard");
            }}
          >
            Save & exit
          </Button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:gap-8 lg:p-8">
        {/* Stepper */}
        <aside className="lg:w-72 lg:shrink-0">
          <div className="rounded-xl border border-line bg-surface p-4 shadow-xs lg:sticky lg:top-20">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink-2">Setup progress</span>
              <span className="tabular text-ink-3">{progress}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-primary-600 transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
            <ol className="mt-4 flex gap-1 overflow-x-auto lg:flex-col lg:gap-0">
              {STEPS.map((s, i) => {
                const isDone = done.includes(i);
                const isCur = i === step;
                const reachable = isDone || i <= Math.max(...done, -1) + 1;
                return (
                  <li key={s.key} className="relative shrink-0">
                    {i < STEPS.length - 1 && (
                      <span aria-hidden className={cn("absolute top-9 left-[19px] hidden h-[calc(100%-24px)] w-px lg:block", isDone ? "bg-primary-500" : "bg-line")} />
                    )}
                    <button
                      disabled={!reachable}
                      onClick={() => setStep(i)}
                      aria-current={isCur ? "step" : undefined}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg p-2 text-left transition-colors disabled:cursor-not-allowed",
                        isCur ? "bg-primary-50" : reachable && "hover:bg-surface-2",
                      )}
                    >
                      <span
                        className={cn(
                          "relative z-[1] flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                          isDone ? "border-primary-600 bg-primary-600 text-white" : isCur ? "border-primary-600 bg-surface text-primary-700" : "border-line-strong bg-surface text-ink-3",
                        )}
                      >
                        {isDone ? <Check className="size-3.5" /> : i + 1}
                      </span>
                      <span className="hidden lg:block">
                        <span className={cn("block text-sm font-medium", isCur ? "text-primary-800" : reachable ? "text-ink" : "text-ink-3")}>{s.label}</span>
                        <span className="block text-xs text-ink-3">{s.desc}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>

        {/* Step content */}
        <main className="min-w-0 flex-1">
          <div className="rounded-xl border border-line bg-surface shadow-xs">
            <div className="border-b border-line px-5 py-4 sm:px-7">
              <div className="text-xs font-medium tracking-wide text-ink-3 uppercase">Step {step + 1} of {STEPS.length}</div>
              <h1 className="mt-0.5 text-xl font-semibold tracking-tight">{current.label}</h1>
            </div>

            <div className="anim-fade px-5 py-6 sm:px-7" key={step}>
              {step === 0 && (
                <div className="space-y-4">
                  <p className="text-sm text-ink-2">We use these details on invoices, challans and e-invoice requests. The GSTIN is verified with the GST portal before your first invoice.</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field layout="vertical" label="Legal name" required error={companyErr.legalName} htmlFor="ob-ln">
                      <Input id="ob-ln" placeholder="Shakti Precision Components Pvt Ltd" aria-invalid={!!companyErr.legalName} value={company.legalName} onChange={(e) => setCompany({ ...company, legalName: e.target.value })} />
                    </Field>
                    <Field layout="vertical" label="State" htmlFor="ob-st">
                      <Select id="ob-st" value={company.state} onChange={(e) => setCompany({ ...company, state: e.target.value })}>
                        {STATES.map(([c, n]) => <option key={c} value={c}>{c} - {n}</option>)}
                      </Select>
                    </Field>
                    <Field layout="vertical" label="GSTIN" required error={companyErr.gstin} hint="15 characters; first two digits are your state code" htmlFor="ob-gst">
                      <div className="relative">
                        <Input id="ob-gst" className="pr-24 font-mono uppercase" maxLength={15} placeholder="27AAKCS4821M1Z5" aria-invalid={!!companyErr.gstin} value={company.gstin} onChange={(e) => setCompany({ ...company, gstin: e.target.value.toUpperCase() })} />
                        {GSTIN_RE.test(company.gstin) && company.gstin.slice(0, 2) === company.state && (
                          <span className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1 text-xs font-medium text-success"><CircleCheck className="size-3.5" /> Valid</span>
                        )}
                      </div>
                    </Field>
                    <Field layout="vertical" label="PAN (from GSTIN)" htmlFor="ob-pan">
                      <Input id="ob-pan" className="font-mono" disabled value={GSTIN_RE.test(company.gstin) ? company.gstin.slice(2, 12) : ""} placeholder="Auto-filled" />
                    </Field>
                    <Field layout="vertical" label="Annual turnover" hint="Decides e-invoicing, HSN digits and ITC-04 frequency" htmlFor="ob-to">
                      <Select id="ob-to" value={company.turnover} onChange={(e) => setCompany({ ...company, turnover: e.target.value })}>
                        <option value="0-5">Up to ₹5 Cr</option>
                        <option value="5-50">₹5 - 50 Cr</option>
                        <option value="50+">Above ₹50 Cr</option>
                      </Select>
                    </Field>
                    <Field layout="vertical" label="Financial year starts" htmlFor="ob-fy">
                      <Select id="ob-fy" value={company.fyStart} onChange={(e) => setCompany({ ...company, fyStart: e.target.value })}>
                        <option value="4">April (Indian FY)</option>
                        <option value="1">January</option>
                      </Select>
                    </Field>
                  </div>
                  {company.turnover !== "0-5" && (
                    <div className="rounded-lg border border-info/20 bg-info-bg px-4 py-3 text-sm text-ink">
                      e-Invoicing applies at your turnover. We&apos;ll connect to the GSP so IRN and QR are generated when you post an invoice.
                    </div>
                  )}
                </div>
              )}

              {step === 1 && (
                <div>
                  <p className="text-sm text-ink-2">Templates pre-load work centres, routings, reason codes and reports so you start from a working setup. You can change everything later.</p>
                  <div className="mt-5 grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Industry template">
                    {TEMPLATES.map((t) => {
                      const on = template === t.key;
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.key}
                          role="radio"
                          aria-checked={on}
                          onClick={() => setTemplate(t.key)}
                          className={cn(
                            "relative rounded-xl border p-4 text-left transition-all",
                            on ? "border-primary-500 bg-primary-50/40 ring-3 ring-primary-500/15" : "border-line hover:border-line-strong hover:shadow-sm",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span className={cn("flex size-10 items-center justify-center rounded-lg", on ? "bg-primary-600 text-white" : "bg-surface-3 text-ink-2")}>
                              <Icon className="size-5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold">{t.name}</div>
                              <div className="text-xs text-ink-3">{t.blurb}</div>
                            </div>
                            <span className={cn("flex size-5 items-center justify-center rounded-full border", on ? "border-primary-600 bg-primary-600 text-white" : "border-line-strong")}>
                              {on && <Check className="size-3" />}
                            </span>
                          </div>
                          <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                            {t.seeds.map((s) => (
                              <li key={s} className="flex gap-2 text-xs text-ink-2">
                                <Check className="mt-0.5 size-3 shrink-0 text-primary-600" /> {s}
                              </li>
                            ))}
                          </ul>
                        </button>
                      );
                    })}
                  </div>
                  <label className="mt-5 flex items-start gap-3 rounded-lg border border-line bg-surface-2 p-3.5">
                    <input type="checkbox" className="mt-0.5 size-4 accent-primary-600" checked={sandbox} onChange={(e) => setSandbox(e.target.checked)} />
                    <span>
                      <span className="block text-sm font-medium">Also create a training sandbox</span>
                      <span className="block text-xs text-ink-3">A copy with sample orders so operators and office staff can practise without touching live data.</span>
                    </span>
                  </label>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field layout="vertical" label="Plant name" htmlFor="ob-pn">
                      <Input id="ob-pn" value={plant.name} onChange={(e) => setPlant({ ...plant, name: e.target.value })} />
                    </Field>
                    <Field layout="vertical" label="Plant address" htmlFor="ob-pa">
                      <Input id="ob-pa" placeholder="Plot J-142, Bhosari MIDC, Pune 411026" value={plant.address} onChange={(e) => setPlant({ ...plant, address: e.target.value })} />
                    </Field>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Warehouses</h3>
                    <p className="text-xs text-ink-3">Job-worker virtual warehouses are created automatically when you add a job-worker.</p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {plant.warehouses.map((w) => (
                        <li key={w} className="flex h-8 items-center gap-2 rounded-full border border-line bg-surface-2 pr-1.5 pl-3 text-sm">
                          <Warehouse className="size-3.5 text-ink-3" /> {w}
                          <button aria-label={`Remove ${w}`} onClick={() => setPlant({ ...plant, warehouses: plant.warehouses.filter((x) => x !== w) })} className="rounded-full p-1 text-ink-3 hover:bg-surface-3 hover:text-danger">
                            <Trash2 className="size-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <form
                      className="mt-3 flex max-w-sm gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const n = plant.newWh.trim();
                        if (!n || plant.warehouses.includes(n)) return;
                        setPlant({ ...plant, warehouses: [...plant.warehouses, n], newWh: "" });
                      }}
                    >
                      <Input placeholder="e.g. Quality hold" aria-label="New warehouse name" value={plant.newWh} onChange={(e) => setPlant({ ...plant, newWh: e.target.value })} />
                      <Button type="submit"><Plus /> Add</Button>
                    </form>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Shifts</h3>
                    <p className="text-xs text-ink-3">Production entries and the owner dashboard roll up by shift.</p>
                    <div className="mt-3 overflow-hidden rounded-lg border border-line">
                      <table className="w-full text-sm">
                        <thead className="bg-surface-2 text-xs text-ink-3">
                          <tr>
                            <th className="h-9 px-3 text-left font-semibold">Shift</th>
                            <th className="h-9 px-3 text-left font-semibold">Start</th>
                            <th className="h-9 px-3 text-left font-semibold">End</th>
                            <th className="w-10" />
                          </tr>
                        </thead>
                        <tbody>
                          {shifts.map((s, i) => (
                            <tr key={i} className="border-t border-line">
                              <td className="px-3 py-2"><Input aria-label="Shift name" value={s.name} onChange={(e) => setShifts(shifts.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} /></td>
                              <td className="px-3 py-2"><Input type="time" aria-label="Start time" value={s.start} onChange={(e) => setShifts(shifts.map((x, k) => (k === i ? { ...x, start: e.target.value } : x)))} /></td>
                              <td className="px-3 py-2"><Input type="time" aria-label="End time" value={s.end} onChange={(e) => setShifts(shifts.map((x, k) => (k === i ? { ...x, end: e.target.value } : x)))} /></td>
                              <td className="pr-2">
                                <Button size="icon-sm" variant="ghost" aria-label="Remove shift" disabled={shifts.length === 1} onClick={() => setShifts(shifts.filter((_, k) => k !== i))}><Trash2 /></Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Button size="sm" variant="ghost" className="mt-2" onClick={() => setShifts([...shifts, { name: `Shift ${String.fromCharCode(65 + shifts.length)}`, start: "00:00", end: "07:00" }])}>
                      <Plus /> Add shift
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <p className="text-sm text-ink-2">Bring in balances as of your go-live date so stock, receivables and payables match your books. You can do this later from Settings → Data import.</p>
                  <div className="mt-5 space-y-3">
                    {[
                      { key: "stock", title: "Opening stock", desc: "Quantity and value by item, warehouse and batch", file: "opening-stock-sample.xlsx" },
                      { key: "ar", title: "Open receivables (AR)", desc: "Unpaid customer invoices with due dates", file: "opening-ar-sample.xlsx" },
                      { key: "ap", title: "Open payables (AP)", desc: "Unpaid vendor bills with due dates", file: "opening-ap-sample.xlsx" },
                    ].map((o) => {
                      const st = opening[o.key];
                      return (
                        <div key={o.key} className="flex flex-wrap items-center gap-4 rounded-xl border border-line p-4">
                          <span className={cn("flex size-10 items-center justify-center rounded-lg", st === "uploaded" ? "bg-success-bg text-success" : "bg-surface-3 text-ink-2")}>
                            <FileSpreadsheet className="size-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              {o.title}
                              {st === "uploaded" && <Badge tone="success">Uploaded · 0 errors</Badge>}
                              {st === "skipped" && <Badge tone="neutral">Skipped</Badge>}
                            </div>
                            <div className="text-xs text-ink-3">{o.desc}</div>
                            <button className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline" onClick={() => toast(`Downloading ${o.file}`)}>
                              <Download className="size-3" /> Sample file
                            </button>
                          </div>
                          <div className="flex gap-2">
                            {st !== "skipped" && st !== "uploaded" && <Button size="sm" variant="ghost" onClick={() => setOpening({ ...opening, [o.key]: "skipped" })}>Skip</Button>}
                            <Button
                              size="sm"
                              variant={st === "uploaded" ? "secondary" : "primary"}
                              onClick={() => {
                                setOpening({ ...opening, [o.key]: "uploaded" });
                                toast.success(`${o.title} imported`, { description: "Rows validated and staged" });
                              }}
                            >
                              <Upload /> {st === "uploaded" ? "Replace" : "Upload"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-xs text-ink-3">Coming from Tally? Upload the Tally XML export and we&apos;ll map ledgers and stock items automatically.</p>
                </div>
              )}

              {step === 4 && (
                <div>
                  <p className="text-sm text-ink-2">Your Growth plan includes 5 office users and unlimited shop-floor operators. Operators are added later with a PIN, not an email.</p>
                  <div className="mt-5 space-y-2">
                    {invites.map((inv) => (
                      <div key={inv.id} className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          type="email"
                          placeholder="name@company.in"
                          aria-label="Email"
                          className="sm:flex-1"
                          value={inv.email}
                          onChange={(e) => setInvites(invites.map((x) => (x.id === inv.id ? { ...x, email: e.target.value } : x)))}
                        />
                        <div className="flex gap-2">
                          <div className="flex-1 sm:w-52">
                            <Select aria-label="Role" value={inv.role} onChange={(e) => setInvites(invites.map((x) => (x.id === inv.id ? { ...x, role: e.target.value } : x)))}>
                              {ROLES.map((r) => <option key={r}>{r}</option>)}
                            </Select>
                          </div>
                          <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => setInvites(invites.filter((x) => x.id !== inv.id))}><Trash2 /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2"
                    disabled={invites.length >= 5}
                    onClick={() => setInvites([...invites, { id: Date.now(), email: "", role: "Store keeper" }])}
                  >
                    <Plus /> Add another
                  </Button>
                  <p className="mt-4 rounded-lg bg-surface-3 px-3 py-2.5 text-xs text-ink-2">Owner and Accountant must set up two-step verification on first sign-in.</p>
                </div>
              )}

              {step === 5 && (
                <div>
                  <p className="text-sm text-ink-2">Here&apos;s what&apos;s ready. Optional items can be finished after go-live.</p>
                  <ul className="mt-5 divide-y divide-line rounded-xl border border-line">
                    {[
                      { label: "Company & GSTIN", detail: company.legalName || "—", ok: done.includes(0) },
                      { label: "Industry template", detail: `${TEMPLATES.find((t) => t.key === template)!.name}${sandbox ? " + training sandbox" : ""}`, ok: done.includes(1) },
                      { label: "Plant & shifts", detail: `${plant.warehouses.length} warehouses · ${shifts.length} shifts`, ok: done.includes(2) },
                      {
                        label: "Opening balances",
                        detail: Object.values(opening).filter((v) => v === "uploaded").length + " of 3 uploaded",
                        ok: Object.values(opening).every((v) => v !== "pending"),
                        optional: true,
                      },
                      { label: "Team invited", detail: `${invites.filter((i) => i.email).length} invitations`, ok: invites.some((i) => i.email), optional: true },
                      { label: "Connect GSP for e-invoice", detail: "Settings → Company", ok: false, optional: true },
                      { label: "Register shop-floor terminals", detail: "Settings → Terminals & operators", ok: false, optional: true },
                    ].map((c) => (
                      <li key={c.label} className="flex items-center gap-3 px-4 py-3">
                        {c.ok ? <CircleCheck className="size-5 text-success" /> : <CircleDashed className="size-5 text-ink-3" />}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{c.label}</div>
                          <div className="truncate text-xs text-ink-3">{c.detail}</div>
                        </div>
                        {!c.ok && (c.optional ? <Badge tone="neutral" dot={false}>Optional</Badge> : <Badge tone="warning">Required</Badge>)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-b-xl border-t border-line bg-surface-2 px-5 py-3.5 sm:px-7">
              <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button variant="primary" onClick={next}>
                  Continue <ArrowRight />
                </Button>
              ) : (
                <Button variant="primary" onClick={finish} disabled={finishing || ![0, 1, 2].every((i) => done.includes(i))}>
                  {finishing ? <Loader2 className="animate-spin" /> : <Rocket />} Go live
                </Button>
              )}
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-ink-3">
            Need help? Our onboarding team can configure this with you. <Link href="/login" className="text-primary-700 hover:underline">Back to sign in</Link>
          </p>
        </main>
      </div>
    </div>
  );
}
