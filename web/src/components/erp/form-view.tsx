"use client";

import * as React from "react";
import Link from "next/link";
import { Tabs as RT } from "radix-ui";
import { Check, History, MessageSquare, Paperclip, Send, ShieldCheck } from "lucide-react";
import { Breadcrumbs, type Crumb } from "./control-panel";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import { useRole } from "@/lib/store/app";

/* ---------------- Page frame ---------------- */

export function FormPage({
  crumbs,
  actions,
  status,
  banner,
  children,
  chatter,
}: {
  crumbs: Crumb[];
  actions?: React.ReactNode;
  status?: React.ReactNode;
  banner?: React.ReactNode;
  children: React.ReactNode;
  chatter?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-line bg-surface px-4 py-2.5 sm:px-6">
        <Breadcrumbs items={crumbs} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
        {status}
      </div>
      {banner}
      <div className="flex flex-1 flex-col gap-4 p-3 sm:p-5 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">{children}</div>
        {chatter && <div className="w-full shrink-0 xl:sticky xl:top-[68px] xl:w-[320px]">{chatter}</div>}
      </div>
    </div>
  );
}

/* ---------------- Odoo-style status bar ---------------- */

export function StatusBar({
  steps,
  current,
  onSelect,
}: {
  steps: { key: string; label: string }[];
  current: string;
  onSelect?: (key: string) => void;
}) {
  const idx = steps.findIndex((s) => s.key === current);
  return (
    <ol className="inline-flex max-w-full overflow-x-auto rounded-md border border-line-strong text-xs" aria-label="Document status">
      {steps.map((s, i) => {
        const done = i < idx;
        const cur = i === idx;
        return (
          <li key={s.key} className="relative">
            <button
              disabled={!onSelect}
              onClick={() => onSelect?.(s.key)}
              aria-current={cur ? "step" : undefined}
              className={cn(
                "flex h-7 items-center gap-1 py-0 pr-3 pl-5 font-medium whitespace-nowrap first:pl-3",
                cur ? "bg-primary-600 text-white" : done ? "bg-surface text-ink-2" : "bg-surface text-ink-3",
                onSelect && !cur && "hover:bg-surface-3",
              )}
            >
              {done && <Check className="size-3 text-primary-600" />}
              {s.label}
            </button>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-0 -right-[7px] z-[1] h-7 w-3.5 [clip-path:polygon(0_0,50%_50%,0_100%)]",
                  cur ? "bg-primary-600" : "bg-line-strong",
                )}
              >
                {!cur && <span className="absolute inset-0 -left-px bg-surface [clip-path:polygon(0_0,50%_50%,0_100%)]" />}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------- Smart buttons ---------------- */

export function SmartButtons({ children }: { children: React.ReactNode }) {
  return <div className="-mx-5 -mt-5 mb-5 flex flex-wrap justify-end border-b border-line">{children}</div>;
}

export function SmartButton({
  icon,
  label,
  value,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <span className="flex h-12 items-center gap-2.5 border-l border-line px-4 text-left transition-colors hover:bg-surface-2 [&_svg]:size-5 [&_svg]:text-primary-600">
      {icon}
      <span className="leading-tight">
        <span className="tabular block text-sm font-semibold text-ink">{value}</span>
        <span className="block text-xs text-ink-3">{label}</span>
      </span>
    </span>
  );
  return href ? <Link href={href}>{inner}</Link> : <button onClick={onClick}>{inner}</button>;
}

/* ---------------- Sheet ---------------- */

export function Sheet({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto max-w-[1180px] rounded-xl border border-line bg-surface p-5 shadow-xs", className)}>
      {children}
    </div>
  );
}

export function SheetTitle({
  label,
  title,
  subtitle,
  badge,
}: {
  label?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      {label && <div className="text-xs font-medium tracking-wide text-ink-3 uppercase">{label}</div>}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {badge}
      </div>
      {subtitle && <div className="mt-1 text-sm text-ink-2">{subtitle}</div>}
    </div>
  );
}

export function FieldGrid({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 | 3 }) {
  return (
    <div
      className={cn(
        "grid gap-x-10 gap-y-3",
        cols === 2 && "lg:grid-cols-2",
        cols === 3 && "md:grid-cols-2 xl:grid-cols-3",
      )}
    >
      {children}
    </div>
  );
}

/* ---------------- Tabs (notebook) ---------------- */

export function Notebook({
  tabs,
  defaultTab,
}: {
  tabs: { key: string; label: string; count?: number; content: React.ReactNode }[];
  defaultTab?: string;
}) {
  return (
    <RT.Root defaultValue={defaultTab ?? tabs[0]?.key} className="mt-6">
      <RT.List className="flex gap-1 overflow-x-auto border-b border-line" aria-label="Sections">
        {tabs.map((t) => (
          <RT.Trigger
            key={t.key}
            value={t.key}
            className="relative -mb-px flex h-9 items-center gap-1.5 border-b-2 border-transparent px-3 text-sm font-medium whitespace-nowrap text-ink-3 hover:text-ink data-[state=active]:border-primary-600 data-[state=active]:text-ink"
          >
            {t.label}
            {t.count !== undefined && <span className="rounded-full bg-surface-3 px-1.5 text-xs text-ink-3">{t.count}</span>}
          </RT.Trigger>
        ))}
      </RT.List>
      {tabs.map((t) => (
        <RT.Content key={t.key} value={t.key} className="pt-4 outline-none">
          {t.content}
        </RT.Content>
      ))}
    </RT.Root>
  );
}

/* ---------------- Totals ---------------- */

export function Totals({ rows }: { rows: { label: string; value: string; strong?: boolean; muted?: boolean }[] }) {
  return (
    <dl className="ml-auto w-full max-w-sm text-sm">
      {rows.map((r) => (
        <div
          key={r.label}
          className={cn(
            "flex justify-between gap-6 py-1",
            r.strong && "mt-1 border-t border-line-strong pt-2 text-base font-semibold",
            r.muted && "text-ink-3",
          )}
        >
          <dt>{r.label}</dt>
          <dd className="tabular">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------------- Chatter / audit trail (FR-PL-03) ---------------- */

export interface Activity {
  id: string;
  at: string;
  user: string;
  kind: "created" | "updated" | "status" | "approved" | "note" | "system" | "posted";
  text: string;
  device?: string;
}

export function Chatter({
  activities,
  onLog,
}: {
  activities: Activity[];
  onLog?: (text: string) => void;
}) {
  const role = useRole();
  const [text, setText] = React.useState("");
  const [tab, setTab] = React.useState<"note" | "audit">("note");

  return (
    <aside className="rounded-xl border border-line bg-surface shadow-xs" aria-label="Activity">
      <div className="flex items-center gap-1 border-b border-line px-3 py-2">
        <Button size="sm" variant={tab === "note" ? "subtle" : "ghost"} onClick={() => setTab("note")}>
          <MessageSquare /> Log note
        </Button>
        <Button size="sm" variant={tab === "audit" ? "subtle" : "ghost"} onClick={() => setTab("audit")}>
          <History /> Audit trail
        </Button>
        <Button size="icon-sm" variant="ghost" className="ml-auto" aria-label="Attach file">
          <Paperclip />
        </Button>
      </div>
      {tab === "note" && onLog && (
        <form
          className="flex gap-2 border-b border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            onLog(text.trim());
            setText("");
          }}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-2xs font-semibold text-white">
            {role.initials}
          </span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add an internal note…"
            className="h-8 min-w-0 flex-1 rounded-md border border-line-strong px-2.5 text-sm outline-none focus:border-primary-500"
          />
          <Button type="submit" size="icon" variant="primary" aria-label="Post note">
            <Send />
          </Button>
        </form>
      )}
      {tab === "audit" && (
        <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-3 py-2 text-xs text-ink-3">
          <ShieldCheck className="size-3.5 text-success" /> Immutable, hash-chained log · user, device, time
        </div>
      )}
      <ol className="scroll-thin max-h-[560px] overflow-y-auto px-3 py-2">
        {activities.map((a) => (
            <li key={a.id} className="flex gap-2.5 py-2.5">
              <span
                className={cn(
                  "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-2xs font-semibold",
                  a.kind === "system" ? "bg-surface-3 text-ink-3" : "bg-primary-100 text-primary-800",
                )}
              >
                {a.user
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-medium">{a.user}</span>
                  <span className="text-2xs text-ink-3">{formatDateTime(a.at)}</span>
                </div>
                <div className={cn("mt-0.5 text-sm", a.kind === "note" ? "rounded-md bg-surface-3 px-2.5 py-1.5 text-ink" : "text-ink-2")}>
                  {a.text}
                </div>
                {tab === "audit" && a.device && <div className="mt-0.5 text-2xs text-ink-3">Device: {a.device}</div>}
              </div>
            </li>
          ))}
      </ol>
    </aside>
  );
}

/* ---------------- Misc building blocks ---------------- */

export function Card({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-line bg-surface shadow-xs", className)}>
      {(title || action) && (
        <header className="flex min-h-11 items-center justify-between gap-3 border-b border-line px-4 py-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Banner({
  tone = "info",
  icon,
  children,
  action,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const t = {
    info: "bg-info-bg text-info border-info/20",
    warning: "bg-warning-bg text-warning border-warning/20",
    danger: "bg-danger-bg text-danger border-danger/20",
    success: "bg-success-bg text-success border-success/20",
  }[tone];
  return (
    <div className={cn("flex flex-wrap items-center gap-2 border-b px-4 py-2 text-sm sm:px-6 [&_svg]:size-4", t)}>
      {icon}
      <div className="flex-1 text-ink">{children}</div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-3 text-ink-3 [&_svg]:size-5">{icon}</span>
      <div className="text-sm font-medium">{title}</div>
      {body && <div className="max-w-sm text-xs text-ink-3">{body}</div>}
      {action}
    </div>
  );
}
