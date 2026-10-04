"use client";

import type * as React from "react";
import { Check } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/badge";
import type { NoteState } from "@/lib/store/returns";
import { cn } from "@/lib/utils";

/** Compact horizontal stepper for side panels. */
export function Stepper({ steps, current }: { steps: { key: string; label: string }[]; current: string }) {
  const idx = steps.findIndex((s) => s.key === current);
  return (
    <ol className="flex items-center gap-1" aria-label="Progress">
      {steps.map((s, i) => {
        const done = i < idx;
        const cur = i === idx;
        return (
          <li key={s.key} className="flex min-w-0 flex-1 items-center gap-1.5">
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                done && "bg-primary-600 text-white",
                cur && "bg-primary-50 text-primary-700 ring-2 ring-primary-500",
                !done && !cur && "bg-surface-3 text-ink-3",
              )}
              aria-current={cur ? "step" : undefined}
            >
              {done ? <Check className="size-3" /> : i + 1}
            </span>
            <span className={cn("truncate text-xs", cur ? "font-semibold text-ink" : done ? "text-ink-2" : "text-ink-3")}>{s.label}</span>
            {i < steps.length - 1 && <span className={cn("h-px min-w-3 flex-1", done ? "bg-primary-500" : "bg-line-strong")} />}
          </li>
        );
      })}
    </ol>
  );
}

const NOTE: Record<NoteState, { tone: Tone; label: string }> = {
  none: { tone: "neutral", label: "Not raised" },
  draft: { tone: "warning", label: "Draft" },
  posted: { tone: "info", label: "Posted" },
  irn_generated: { tone: "success", label: "Posted · IRN" },
};

export function NoteBadge({ state, number }: { state: NoteState; number?: string }) {
  const s = NOTE[state];
  return (
    <div className="flex min-w-0 flex-col items-start gap-0.5">
      <Badge tone={s.tone}>{s.label}</Badge>
      {number && <span className="font-mono text-2xs whitespace-nowrap text-ink-3">{number}</span>}
    </div>
  );
}

export function ToneBadge({ map, value }: { map: Record<string, { tone: Tone; label: string }>; value: string }) {
  const s = map[value] ?? { tone: "neutral" as Tone, label: value };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function KV({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-2 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-3">{k}</dt>
          <dd className="min-w-0 text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
