"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Minus, Pencil, ToggleLeft } from "lucide-react";
import { toast } from "sonner";
import { PlatformPage } from "@/components/platform/platform-shell";
import { StatCard } from "@/components/platform/p2-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Dialog } from "@/components/ui/overlay";
import { FEATURES, mrrOf, planPrice, type PlanKey, PLANS, PLATFORM_USER, usePlatform } from "@/lib/store/platform";
import { cn, formatINR0, formatLakh, formatNum } from "@/lib/utils";

const KEYS: PlanKey[] = ["starter", "growth", "pro"];
const featureLabel = (k: string) => FEATURES.find((f) => f.key === k)?.label ?? k;

export default function PlansPage() {
  const tenants = usePlatform((s) => s.tenants);
  const setOverride = usePlatform((s) => s.setOverride);
  const [cycle, setCycle] = React.useState<"monthly" | "annual">("monthly");
  const [editing, setEditing] = React.useState<PlanKey | null>(null);

  const live = tenants.filter((t) => t.stage !== "churned");
  const byPlan = (k: PlanKey) => live.filter((t) => t.plan === k);
  const groups = [...new Set(FEATURES.map((f) => f.group))];
  const popular = [...KEYS].sort((a, b) => byPlan(b).length - byPlan(a).length)[0];
  const overrides = live.flatMap((t) => Object.entries(t.overrides).map(([feature, on]) => ({ t, feature, on, inPlan: PLANS[t.plan].features.includes(feature) })));

  return (
    <PlatformPage
      title="Plans & features"
      subtitle="Entitlements switch modules on or off per tenant without a reinstall or data migration (arch §9.5)"
      crumbs={[{ label: "Platform", href: "/platform" }, { label: "Plans & features" }]}
      actions={
        <div className="flex rounded-md border border-line-strong p-0.5 shadow-xs" role="group" aria-label="Billing cycle">
          {(["monthly", "annual"] as const).map((c) => (
            <button key={c} onClick={() => setCycle(c)} aria-pressed={cycle === c} className={cn("h-7 rounded px-3 text-xs font-medium", cycle === c ? "bg-primary-600 text-white" : "text-ink-2 hover:bg-surface-3")}>
              {c === "monthly" ? "Monthly" : "Annual −15%"}
            </button>
          ))}
        </div>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Paying tenants" value={live.filter((t) => t.status !== "trial").length} hint={`${live.filter((t) => t.status === "trial").length} in trial`} />
        <StatCard label="MRR" value={formatLakh(live.reduce((a, t) => a + mrrOf(t), 0))} hint="Excl. GST" />
        <StatCard label="Most popular" value={PLANS[popular].name} hint={`${byPlan(popular).length} tenants`} />
        <StatCard label="Active overrides" value={overrides.length} hint="Tenant-level feature flags" tone={overrides.length ? "info" : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {KEYS.map((k) => {
          const p = PLANS[k];
          const ts = byPlan(k);
          return (
            <section key={k} className={cn("flex flex-col rounded-xl border bg-surface p-5 shadow-xs", k === "growth" ? "border-primary-500 ring-3 ring-primary-500/10" : "border-line")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{p.name}</h2>
                    {k === "growth" && <Badge tone="brand" dot={false}>Recommended</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm text-ink-3">{p.tagline}</p>
                </div>
                <Button size="icon-sm" variant="ghost" aria-label={`Edit ${p.name} pricing`} onClick={() => setEditing(k)}><Pencil /></Button>
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="tabular text-3xl font-semibold tracking-tight">{formatINR0(planPrice(k, cycle))}</span>
                <span className="text-sm text-ink-3">/ month + GST</span>
              </div>
              {cycle === "annual" && <div className="text-xs text-success">Billed {formatINR0(planPrice(k, "annual") * 12)} yearly</div>}
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Office users", formatNum(p.limits.users)],
                  ["Terminals", formatNum(p.limits.terminals)],
                  ["WhatsApp / mo", formatNum(p.limits.whatsapp)],
                  ["Storage", `${p.limits.storageGb} GB`],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-lg bg-surface-2 px-3 py-2">
                    <dt className="text-2xs text-ink-3">{l}</dt>
                    <dd className="tabular font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 border-t border-line pt-3">
                <div className="flex items-center justify-between text-xs text-ink-3">
                  <span>{ts.length} tenant{ts.length === 1 ? "" : "s"}</span>
                  <span className="tabular">{formatLakh(ts.reduce((a, t) => a + mrrOf(t), 0))} MRR</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ts.map((t) => (
                    <Link key={t.id} href={`/platform/tenants/${t.id}`} className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-2 hover:border-primary-500 hover:text-primary-700">
                      {t.shortName}
                    </Link>
                  ))}
                  {!ts.length && <span className="text-xs text-ink-3">No tenants yet</span>}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        <header className="border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold">Feature entitlements</h2>
          <p className="mt-0.5 text-xs text-ink-3">Codes are checked by the API and the UI; a tenant override wins over its plan.</p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-surface-2 text-xs text-ink-3">
                <th className="h-10 px-5 text-left font-semibold">Feature</th>
                {KEYS.map((k) => <th key={k} className={cn("h-10 w-32 px-3 text-center font-semibold", k === "growth" && "bg-primary-50/70 text-primary-800")}>{PLANS[k].name}</th>)}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <React.Fragment key={g}>
                  <tr><td colSpan={4} className="border-t border-line bg-surface-2/60 px-5 py-1.5 text-[10.5px] font-semibold tracking-wider text-ink-3 uppercase">{g}</td></tr>
                  {FEATURES.filter((f) => f.group === g).map((f) => (
                    <tr key={f.key} className="border-t border-line">
                      <td className="px-5 py-2.5">
                        <div className="font-medium">{f.label}</div>
                        <div className="font-mono text-2xs text-ink-3">{f.key}</div>
                      </td>
                      {KEYS.map((k) => (
                        <td key={k} className={cn("px-3 text-center", k === "growth" && "bg-primary-50/40")}>
                          {PLANS[k].features.includes(f.key) ? <Check className="mx-auto size-4 text-success" aria-label="Included" /> : <Minus className="mx-auto size-4 text-ink-3/50" aria-label="Not included" />}
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

      <section className="mt-4 overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold">Tenant overrides</h2>
            <p className="mt-0.5 text-xs text-ink-3">Betas, trials of add-ons and contractual exceptions. Reset returns the tenant to its plan default.</p>
          </div>
          <ToggleLeft className="size-5 text-ink-3" />
        </header>
        {overrides.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-ink-3">No overrides — every tenant follows its plan.</div>
        ) : (
          <ul className="divide-y divide-line">
            {overrides.map(({ t, feature, on, inPlan }) => (
              <li key={`${t.id}-${feature}`} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/platform/tenants/${t.id}`} className="font-medium hover:text-primary-700 hover:underline">{t.shortName}</Link>
                  <span className="text-ink-3"> · {PLANS[t.plan].name}</span>
                  <div className="text-xs text-ink-2">
                    {featureLabel(feature)} <span className="font-mono text-ink-3">({feature})</span>
                  </div>
                </div>
                <Badge tone={on ? "success" : "danger"}>{on ? "Forced on" : "Forced off"}</Badge>
                <span className="text-xs text-ink-3">Plan default: {inPlan ? "on" : "off"}</span>
                <Button
                  size="sm"
                  onClick={() => {
                    setOverride(t.id, feature, null, PLATFORM_USER.name);
                    toast.success(`${featureLabel(feature)} reset for ${t.shortName}`);
                  }}
                >
                  Reset
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <EditPriceDialog plan={editing} onClose={() => setEditing(null)} />
    </PlatformPage>
  );
}

function EditPriceDialog({ plan, onClose }: { plan: PlanKey | null; onClose: () => void }) {
  const log = usePlatform((s) => s.log);
  const [price, setPrice] = React.useState("");
  const [effective, setEffective] = React.useState("next_renewal");
  const p = plan ? PLANS[plan] : null;

  return (
    <Dialog
      open={!!plan}
      onOpenChange={(o) => { if (!o) { onClose(); setPrice(""); } }}
      title={p ? `Edit ${p.name} pricing` : ""}
      description="Existing tenants keep their price until their next renewal"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              const n = Number(price);
              if (!(n > 0)) return toast.error("Enter a valid monthly price");
              log(PLATFORM_USER.name, "plan.price", `${p!.name}: ${formatINR0(p!.monthly)} → ${formatINR0(n)} / month (${effective === "now" ? "new signups now" : "next renewal"})`);
              toast.success("Price change scheduled for next renewal", { description: `${p!.name} · ${formatINR0(n)} / month + GST` });
              onClose();
              setPrice("");
            }}
          >
            Schedule change
          </Button>
        </>
      }
    >
      {p && (
        <div className="space-y-3">
          <div className="rounded-lg bg-surface-2 px-4 py-3 text-sm">
            Current list price <span className="tabular font-semibold">{formatINR0(p.monthly)}</span> / month · annual {formatINR0(Math.round(p.monthly * 0.85))}
          </div>
          <Field label="New monthly price (₹)" layout="vertical" htmlFor="np">
            <Input id="np" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder={String(p.monthly)} className="tabular" />
          </Field>
          <Field label="Applies to" layout="vertical" htmlFor="ne">
            <Select id="ne" value={effective} onChange={(e) => setEffective(e.target.value)}>
              <option value="next_renewal">Existing tenants at next renewal + new signups</option>
              <option value="now">New signups only, from today</option>
            </Select>
          </Field>
        </div>
      )}
    </Dialog>
  );
}
