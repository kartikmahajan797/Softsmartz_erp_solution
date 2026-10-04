"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, BellOff, CheckCheck, CheckCircle2, ChevronRight, ClipboardCheck, Info, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Notification, useApp } from "@/lib/store/app";
import { cn, daysBetween, formatDate, TODAY } from "@/lib/utils";

/** Older items that are not in the live header feed. */
const HISTORY: Notification[] = [
  { id: "h1", kind: "approval", title: "Stock adjustment ADJ-2026-0058 approved", body: "−12 kg MS Round Bar EN8 · approved by Rajesh Agarwal", at: "2026-10-01T16:05:00", href: "/inventory/adjustments", read: true },
  { id: "h2", kind: "alert", title: "Bearing 6204-2RS below reorder level", body: "Free stock −40 nos against reorder level 400", at: "2026-10-01T08:00:00", href: "/inventory/stock", read: false },
  { id: "h3", kind: "info", title: "Payment reminder sent to Deccan Motors Ltd", body: "WhatsApp · ₹3,49,440 overdue by 12 days", at: "2026-10-01T10:30:00", href: "/finance/ageing", read: true },
  { id: "h4", kind: "success", title: "IRN generated for INV/26-27/0409", body: "Varun Auto Components Ltd · e-way bill 4812 0937 1256", at: "2026-09-30T15:12:00", href: "/finance/einvoice", read: true },
  { id: "h5", kind: "approval", title: "Discount 12% on SO-2026-00233 needs approval", body: "Sahyadri Tractors Pvt Ltd · rule: discount above 10%", at: "2026-09-29T11:40:00", href: "/approvals", read: true },
  { id: "h6", kind: "alert", title: "2 shop-floor sync exceptions", body: "Terminal CNC-Bay-2 · qty over released on JC-2026-00409", at: "2026-09-28T19:22:00", href: "/manufacturing/sync-exceptions", read: true },
];

const KIND = {
  approval: { icon: ClipboardCheck, cls: "bg-warning-bg text-warning", label: "Approval" },
  alert: { icon: AlertTriangle, cls: "bg-danger-bg text-danger", label: "Alert" },
  info: { icon: Info, cls: "bg-info-bg text-info", label: "Info" },
  success: { icon: CheckCircle2, cls: "bg-success-bg text-success", label: "Done" },
} as const;

type Tab = "all" | "unread" | "approval" | "alert";

export default function NotificationsPage() {
  const live = useApp((s) => s.notifications);
  const markRead = useApp((s) => s.markRead);
  const markAllRead = useApp((s) => s.markAllRead);
  const [history, setHistory] = React.useState(HISTORY);
  const [tab, setTab] = React.useState<Tab>("all");

  const all = React.useMemo(() => [...live, ...history].sort((a, b) => b.at.localeCompare(a.at)), [live, history]);
  const unread = all.filter((n) => !n.read).length;
  const counts: Record<Tab, number> = {
    all: all.length,
    unread,
    approval: all.filter((n) => n.kind === "approval").length,
    alert: all.filter((n) => n.kind === "alert").length,
  };
  const shown = all.filter((n) => (tab === "all" ? true : tab === "unread" ? !n.read : n.kind === tab));

  const groups = React.useMemo(() => {
    const g: { label: string; items: Notification[] }[] = [];
    shown.forEach((n) => {
      const d = daysBetween(n.at, TODAY);
      const label = d <= 0 ? "Today" : d === 1 ? "Yesterday" : "Earlier";
      const last = g[g.length - 1];
      if (last?.label === label) last.items.push(n);
      else g.push({ label, items: [n] });
    });
    return g;
  }, [shown]);

  const read = (n: Notification) => {
    if (live.some((x) => x.id === n.id)) markRead(n.id);
    else setHistory((h) => h.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
  };
  const readAll = () => {
    markAllRead();
    setHistory((h) => h.map((x) => ({ ...x, read: true })));
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "approval", label: "Approvals" },
    { key: "alert", label: "Alerts" },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-line bg-surface px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3 pt-4 pb-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
              {unread > 0 && <span className="tabular rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">{unread} unread</span>}
            </div>
            <p className="mt-0.5 text-sm text-ink-3">Approvals, alerts and system events across your factory</p>
          </div>
          <div className="flex gap-2">
            <Link href="/settings/notifications">
              <Button><Settings2 /> Preferences</Button>
            </Link>
            <Button variant="primary" onClick={readAll} disabled={!unread}><CheckCheck /> Mark all read</Button>
          </div>
        </div>
        <div role="tablist" aria-label="Filter notifications" className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex h-10 items-center gap-1.5 border-b-2 px-3 text-sm font-medium whitespace-nowrap",
                tab === t.key ? "border-primary-600 text-ink" : "border-transparent text-ink-3 hover:text-ink",
              )}
            >
              {t.label}
              <span className={cn("tabular rounded-full px-1.5 text-xs", tab === t.key ? "bg-primary-50 text-primary-700" : "bg-surface-3 text-ink-3")}>{counts[t.key]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl p-3 sm:p-5">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface py-16 text-center shadow-xs">
            <span className="flex size-12 items-center justify-center rounded-full bg-surface-3 text-ink-3"><BellOff className="size-5" /></span>
            <div className="text-sm font-medium">You&apos;re all caught up</div>
            <div className="text-xs text-ink-3">Nothing in this view right now.</div>
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.label} className="mb-5">
              <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-ink-3 uppercase">{g.label}</h2>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
                {g.items.map((n) => {
                  const k = KIND[n.kind];
                  const Icon = k.icon;
                  return (
                    <li key={n.id} className={cn("group relative flex gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2", !n.read && "bg-primary-50/30")}>
                      {!n.read && <span className="absolute top-0 bottom-0 left-0 w-0.5 bg-primary-600" aria-hidden />}
                      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", k.cls)}>
                        <Icon className="size-4" />
                      </span>
                      <Link href={n.href ?? "#"} onClick={() => read(n)} className="min-w-0 flex-1 focus-visible:outline-none">
                        <span className="absolute inset-0" aria-hidden />
                        <span className={cn("block text-sm text-ink", !n.read ? "font-semibold" : "font-medium")}>{n.title}</span>
                        <span className="mt-0.5 block text-sm text-ink-2">{n.body}</span>
                        <span className="mt-1 block text-xs text-ink-3">
                          {k.label} · {g.label === "Earlier" ? formatDate(n.at) : n.at.slice(11, 16)}
                        </span>
                      </Link>
                      <div className="relative z-[1] flex shrink-0 items-start gap-1">
                        {!n.read && (
                          <Button size="xs" variant="ghost" className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" onClick={() => read(n)}>
                            Mark read
                          </Button>
                        )}
                        <ChevronRight className="mt-0.5 size-4 text-ink-3" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
        <p className="text-center text-xs text-ink-3">
          Notifications are also delivered on WhatsApp, SMS and email per your{" "}
          <Link href="/profile" className="text-primary-700 hover:underline">personal preferences</Link>.
        </p>
      </div>
    </div>
  );
}
