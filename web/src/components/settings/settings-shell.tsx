"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Building2, LayoutDashboard, LifeBuoy, CalendarRange, CheckCheck, CreditCard, Database, FileDown, FileText, FileUp, ScrollText, Tablet, Users } from "lucide-react";
import { Breadcrumbs } from "@/components/erp/control-panel";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings/admin", label: "Admin home", icon: LayoutDashboard, group: "Organisation" },
  { href: "/settings", label: "Company", icon: Building2 },
  { href: "/settings/fiscal", label: "Financial year & locks", icon: CalendarRange },
  { href: "/settings/billing", label: "Plan & billing", icon: CreditCard },
  { href: "/settings/users", label: "Users & roles", icon: Users, group: "Access" },
  { href: "/settings/terminals", label: "Terminals & operators", icon: Tablet },
  { href: "/settings/audit-log", label: "Audit log", icon: ScrollText },
  { href: "/settings/support-access", label: "Support access", icon: LifeBuoy },
  { href: "/settings/masters", label: "Master data", icon: Database, group: "Configuration" },
  { href: "/settings/approval-rules", label: "Approval rules", icon: CheckCheck },
  { href: "/settings/templates", label: "Document templates", icon: FileText },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/import", label: "Data import", icon: FileUp, group: "Data" },
  { href: "/settings/data-export", label: "Data export", icon: FileDown },
];

export function SettingsShell({ title, actions, children }: { title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex min-h-[53px] flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-2.5 sm:px-6">
        <Breadcrumbs items={[{ label: "Settings", href: "/settings" }, { label: title }]} />
        <div className="ml-auto flex gap-2">{actions}</div>
      </div>
      <div className="flex flex-1 flex-col lg:flex-row">
        <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto border-b border-line bg-surface p-2 lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0 lg:p-3">
          {TABS.map((t, i) => {
            const active = pathname === t.href;
            const Icon = t.icon;
            return (
              <React.Fragment key={t.href}>
              {t.group && (
                <div className={cn("mb-1 hidden px-2.5 text-[10.5px] font-semibold tracking-wider text-ink-3 uppercase lg:block", i > 0 && "mt-3")}>{t.group}</div>
              )}
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn("flex h-8 shrink-0 items-center gap-2 rounded-md px-2.5 text-sm whitespace-nowrap", active ? "bg-primary-50 font-medium text-primary-800" : "text-ink-2 hover:bg-surface-3")}
              >
                <Icon className={cn("size-4", active ? "text-primary-600" : "text-ink-3")} />
                {t.label}
              </Link>
              </React.Fragment>
            );
          })}
        </nav>
        <div className="min-w-0 flex-1 p-3 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

export function Section({ title, desc, children, action }: { title: string; desc?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-xl border border-line bg-surface shadow-xs">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {desc && <p className="mt-0.5 text-xs text-ink-3">{desc}</p>}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
