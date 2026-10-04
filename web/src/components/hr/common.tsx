"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ATT_TONE, type AttStatus, EMP_TYPE, type Employee, type EmpType } from "@/lib/store/hr";
import { cn } from "@/lib/utils";

const AVATAR_TONES = ["bg-primary-100 text-primary-800", "bg-info-bg text-info", "bg-progress-bg text-progress", "bg-warning-bg text-warning", "bg-success-bg text-success"];

export function Avatar({ e, size = "md" }: { e: Pick<Employee, "id" | "name">; size?: "sm" | "md" | "lg" }) {
  const n = Number(e.id.replace(/\D/g, "")) || 0;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        AVATAR_TONES[n % AVATAR_TONES.length],
        size === "sm" && "size-6 text-[10px]",
        size === "md" && "size-8 text-xs",
        size === "lg" && "size-14 text-lg",
      )}
      aria-hidden
    >
      {e.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
    </span>
  );
}

export function EmpCell({ e, sub, link = true }: { e: Employee; sub?: React.ReactNode; link?: boolean }) {
  const body = (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar e={e} />
      <span className="min-w-0 leading-tight">
        <span className="block truncate font-medium text-ink">{e.name}</span>
        <span className="block truncate text-xs text-ink-3">{sub ?? `${e.code} · ${e.designation}`}</span>
      </span>
    </span>
  );
  return link ? (
    <Link href={`/hr/employees/${e.id}`} onClick={(ev) => ev.stopPropagation()} className="hover:[&_span.font-medium]:text-primary-700">
      {body}
    </Link>
  ) : (
    body
  );
}

export function AttBadge({ status }: { status: AttStatus }) {
  const t = ATT_TONE[status];
  return <Badge tone={t.tone}>{t.label}</Badge>;
}

export function TypeBadge({ type }: { type: EmpType }) {
  return (
    <Badge tone={EMP_TYPE[type].tone} dot={false}>
      {EMP_TYPE[type].label}
    </Badge>
  );
}
