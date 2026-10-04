"use client";

import { Badge, type Tone } from "@/components/ui/badge";
import { STAGES, type Tenant, type TenantStage, type TenantStatus } from "@/lib/store/platform";
import { cn } from "@/lib/utils";

const STATUS: Record<TenantStatus, { tone: Tone; label: string }> = {
  trial: { tone: "info", label: "Trial" },
  active: { tone: "success", label: "Active" },
  past_due: { tone: "danger", label: "Past due" },
  suspended: { tone: "neutral", label: "Suspended" },
  offboarding: { tone: "warning", label: "Offboarding" },
};

const HEALTH: Record<Tenant["health"], { tone: Tone; label: string }> = {
  healthy: { tone: "success", label: "Healthy" },
  at_risk: { tone: "warning", label: "At risk" },
  critical: { tone: "danger", label: "Critical" },
};

export const STAGE_TONE: Record<TenantStage, string> = {
  signed: "bg-ink-3",
  provisioning: "bg-info",
  configuring: "bg-progress",
  data_migration: "bg-warning",
  training: "bg-accent-500",
  live: "bg-success",
  churned: "bg-danger",
};

export const stageLabel = (s: TenantStage) => (s === "churned" ? "Churned" : STAGES.find((x) => x.key === s)?.label ?? s);

export function TenantStatusBadge({ status }: { status: TenantStatus }) {
  const s = STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function HealthBadge({ health }: { health: Tenant["health"] }) {
  const h = HEALTH[health];
  return <Badge tone={h.tone}>{h.label}</Badge>;
}

export function StageBadge({ stage }: { stage: TenantStage }) {
  return (
    <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-surface-3 px-2 text-xs font-medium whitespace-nowrap text-ink-2">
      <span className={cn("size-1.5 rounded-full", STAGE_TONE[stage])} />
      {stageLabel(stage)}
    </span>
  );
}

export function TenantAvatar({ t, size = "md" }: { t: Pick<Tenant, "shortName">; size?: "md" | "lg" }) {
  const initials = t.shortName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-primary-50 font-semibold text-primary-700",
        size === "lg" ? "size-12 text-base" : "size-8 text-xs",
      )}
    >
      {initials}
    </span>
  );
}

export function Meter({ label, used, limit, unit = "" }: { label: string; used: number; limit: number; unit?: string }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  const tone = pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-primary-600";
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-ink-2">{label}</span>
        <span className="tabular font-medium">
          {used.toLocaleString("en-IN")}
          {unit} <span className="text-ink-3">/ {limit.toLocaleString("en-IN")}{unit}</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "success" | "warning" | "danger" | "info";
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3 shadow-xs">
      <div className="flex items-center gap-1.5 text-xs font-medium text-ink-3 [&_svg]:size-3.5">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "tabular mt-1 text-xl font-semibold tracking-tight",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
          tone === "danger" && "text-danger",
          tone === "info" && "text-info",
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 truncate text-xs text-ink-3">{hint}</div>}
    </div>
  );
}
