"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock, MoreHorizontal, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PlatformPage } from "@/components/platform/platform-shell";
import { StatCard } from "@/components/platform/p2-ui";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/form";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from "@/components/ui/overlay";
import { onboardingProgress, PLANS, PLATFORM_USER, STAGES, TEMPLATES, type Tenant, type TenantStage, usePlatform } from "@/lib/store/platform";
import { cn, daysBetween, formatDate, TODAY } from "@/lib/utils";

const STAGE_TONE: Record<string, string> = {
  signed: "bg-ink-3",
  provisioning: "bg-info",
  configuring: "bg-progress",
  data_migration: "bg-warning",
  training: "bg-accent-500",
  live: "bg-success",
};

/** Typical days spent in each stage across recent go-lives (reporting aggregate, mock). */
const AVG_DAYS: Record<string, number> = { signed: 1, provisioning: 2, configuring: 4, data_migration: 5, training: 3 };

function GoLive({ t }: { t: Tenant }) {
  if (t.stage === "live") return <span className="text-xs text-success">Live since {formatDate(t.wentLiveOn)}</span>;
  const d = daysBetween(TODAY, t.goLiveTarget);
  return (
    <span className={cn("flex items-center gap-1 text-xs", d < 0 ? "text-danger" : d <= 7 ? "text-warning" : "text-ink-3")}>
      <CalendarClock className="size-3.5" />
      {formatDate(t.goLiveTarget)} · {d < 0 ? `${-d}d late` : d === 0 ? "today" : `${d}d left`}
    </span>
  );
}

export default function PipelinePage() {
  const tenants = usePlatform((s) => s.tenants);
  const setStage = usePlatform((s) => s.setStage);
  const [manager, setManager] = React.useState("");
  const [showLive, setShowLive] = React.useState(true);

  const managers = [...new Set(tenants.map((t) => t.onboardingManager))].sort();
  const visible = tenants.filter((t) => t.stage !== "churned" && (!manager || t.onboardingManager === manager));
  const inFlight = visible.filter((t) => t.stage !== "live");
  const late = inFlight.filter((t) => daysBetween(TODAY, t.goLiveTarget) < 0).length;
  const dueSoon = inFlight.filter((t) => {
    const d = daysBetween(TODAY, t.goLiveTarget);
    return d >= 0 && d <= 14;
  }).length;
  const liveDurations = tenants.filter((t) => t.wentLiveOn).map((t) => daysBetween(t.signedOn, t.wentLiveOn!));
  const avgGoLive = liveDurations.length ? Math.round(liveDurations.reduce((a, b) => a + b, 0) / liveDurations.length) : 0;

  const columns = STAGES.filter((s) => showLive || s.key !== "live");

  const move = (t: Tenant, stage: TenantStage) => {
    setStage(t.id, stage, PLATFORM_USER.name);
    toast.success(`${t.shortName} moved to ${STAGES.find((s) => s.key === stage)?.label}`, { description: "Recorded in the platform audit log" });
  };

  return (
    <PlatformPage
      title="Onboarding pipeline"
      subtitle="Every signed factory from contract to first posted invoice — target go-live within 14 days"
      crumbs={[{ label: "Platform", href: "/platform" }, { label: "Onboarding pipeline" }]}
      actions={
        <>
          <Select aria-label="Onboarding manager" value={manager} onChange={(e) => setManager(e.target.value)} className="w-52">
            <option value="">All managers</option>
            {managers.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
          <label className="flex h-8 items-center gap-2 rounded-md border border-line-strong bg-surface px-2.5 text-sm text-ink-2 shadow-xs">
            <input type="checkbox" className="size-4 accent-primary-600" checked={showLive} onChange={(e) => setShowLive(e.target.checked)} />
            Show live
          </label>
        </>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="In onboarding" value={inFlight.length} hint={`${visible.length - inFlight.length} live tenants`} />
        <StatCard label="Go-live in 14 days" value={dueSoon} hint="Book training slots" tone="info" />
        <StatCard label="Past target" value={late} hint="Escalate to onboarding lead" tone={late ? "danger" : undefined} />
        <StatCard label="Avg. signed → live" value={`${avgGoLive} days`} hint={`Goal 14 days · ${liveDurations.length} go-lives`} tone={avgGoLive <= 14 ? "success" : "warning"} />
      </div>

      <div className="mb-4 overflow-x-auto rounded-xl border border-line bg-surface shadow-xs">
        <div className="flex min-w-[640px] items-stretch">
          {STAGES.filter((s) => s.key !== "live").map((s, i) => (
            <div key={s.key} className={cn("flex-1 px-4 py-2.5", i > 0 && "border-l border-line")}>
              <div className="flex items-center gap-1.5 text-xs text-ink-3">
                <span className={cn("size-2 rounded-full", STAGE_TONE[s.key])} />
                {s.label}
              </div>
              <div className="tabular mt-0.5 text-sm font-semibold">
                {AVG_DAYS[s.key]} d <span className="font-normal text-ink-3">avg</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="scroll-thin flex gap-3 overflow-x-auto pb-2">
        {columns.map((col) => {
          const cards = visible.filter((t) => t.stage === col.key);
          return (
            <section key={col.key} className="flex w-[280px] shrink-0 flex-col rounded-xl bg-surface-3/60 p-2" aria-label={col.label}>
              <header className="mb-2 flex items-center gap-2 px-1.5 pt-1">
                <span className={cn("size-2 rounded-full", STAGE_TONE[col.key])} />
                <h2 className="text-sm font-semibold">{col.label}</h2>
                <span className="rounded-full bg-surface px-1.5 text-xs text-ink-3">{cards.length}</span>
              </header>
              <div className="flex flex-col gap-2">
                {cards.map((t) => {
                  const pct = onboardingProgress(t);
                  const idx = STAGES.findIndex((s) => s.key === t.stage);
                  return (
                    <article key={t.id} className="rounded-lg border border-line bg-surface p-3 shadow-xs transition-shadow hover:border-line-strong hover:shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/platform/tenants/${t.id}`} className="min-w-0">
                          <div className="truncate text-sm font-semibold hover:text-primary-700">{t.shortName}</div>
                          <div className="truncate text-xs text-ink-3">{t.city} · {TEMPLATES[t.template].label}</div>
                        </Link>
                        <Menu>
                          <MenuTrigger asChild>
                            <button className="rounded p-0.5 text-ink-3 hover:bg-surface-3 hover:text-ink" aria-label={`Actions for ${t.shortName}`}>
                              <MoreHorizontal className="size-4" />
                            </button>
                          </MenuTrigger>
                          <MenuContent className="w-52">
                            <MenuLabel>Move to stage</MenuLabel>
                            {STAGES.map((s) => (
                              <MenuItem key={s.key} disabled={s.key === t.stage} onSelect={() => move(t, s.key)}>
                                {s.label}
                              </MenuItem>
                            ))}
                          </MenuContent>
                        </Menu>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge tone={t.plan === "pro" ? "progress" : t.plan === "growth" ? "brand" : "neutral"} dot={false}>{PLANS[t.plan].name}</Badge>
                        {t.status === "trial" && <Badge tone="info" dot={false}>Trial</Badge>}
                        {t.status === "past_due" && <Badge tone="danger" dot={false}>Past due</Badge>}
                        {t.inviteStatus === "pending" && <Badge tone="warning" dot={false}>Invite pending</Badge>}
                      </div>
                      <div className="mt-2.5">
                        <div className="mb-1 flex justify-between text-2xs text-ink-3">
                          <span>Checklist</span>
                          <span className="tabular">{t.checklist.filter((c) => c.done).length}/{t.checklist.length}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                          <div className={cn("h-full rounded-full", pct === 100 ? "bg-success" : "bg-primary-600")} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2">
                        <span className="flex min-w-0 items-center gap-1 truncate text-xs text-ink-2">
                          <UserRound className="size-3.5 shrink-0 text-ink-3" />
                          {t.onboardingManager}
                        </span>
                        <GoLive t={t} />
                      </div>
                      {t.stage !== "live" && idx < STAGES.length - 1 && (
                        <button
                          onClick={() => move(t, STAGES[idx + 1].key)}
                          className="mt-2 w-full rounded-md border border-dashed border-line-strong py-1 text-xs font-medium text-ink-2 hover:border-primary-500 hover:text-primary-700"
                        >
                          Advance to {STAGES[idx + 1].label} →
                        </button>
                      )}
                    </article>
                  );
                })}
                {cards.length === 0 && <div className="rounded-lg border border-dashed border-line-strong px-3 py-6 text-center text-xs text-ink-3">No tenants</div>}
              </div>
            </section>
          );
        })}
      </div>
    </PlatformPage>
  );
}
