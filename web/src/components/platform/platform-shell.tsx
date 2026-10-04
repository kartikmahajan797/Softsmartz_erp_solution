"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  CreditCard,
  ExternalLink,
  KanbanSquare,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu as MenuIcon,
  Plus,
  ScrollText,
  ShieldCheck,
  Sparkles,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/overlay";
import { PLATFORM_USER, usePlatform } from "@/lib/store/platform";
import { cn } from "@/lib/utils";

export const PLATFORM_NAV: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; group?: string }[] = [
  { href: "/platform", label: "Overview", icon: LayoutDashboard, group: "Business" },
  { href: "/platform/tenants", label: "Tenants", icon: Building2 },
  { href: "/platform/pipeline", label: "Onboarding pipeline", icon: KanbanSquare },
  { href: "/platform/billing", label: "Subscription billing", icon: CreditCard },
  { href: "/platform/plans", label: "Plans & features", icon: Sparkles, group: "Product" },
  { href: "/platform/support", label: "Support access", icon: LifeBuoy, group: "Operations" },
  { href: "/platform/health", label: "System health", icon: Activity },
  { href: "/platform/staff", label: "Platform staff", icon: UserCog, group: "Security" },
  { href: "/platform/audit", label: "Platform audit log", icon: ScrollText },
];

function PlatformLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#e8891c" />
        <path d="M8 23V12l5 3.2V12l5 3.2V9h6v14z" fill="#fff" />
        <rect x="19.5" y="11" width="3" height="3" rx=".6" fill="#071c24" />
      </svg>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold tracking-tight text-white">Factory ERP</div>
        <div className="text-2xs font-medium tracking-wider text-[#f5b971] uppercase">Platform console</div>
      </div>
    </div>
  );
}

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const pendingGrants = usePlatform((s) => s.grants.filter((g) => g.status === "requested").length);
  const isActive = (href: string) => (href === "/platform" ? pathname === href : pathname.startsWith(href));

  return (
    <div className="min-h-full">
      {open && <div className="fixed inset-0 z-30 bg-brand-950/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[var(--sidebar-w)] flex-col bg-[#0b1216] text-white/80 transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        aria-label="Platform navigation"
      >
        <div className="flex h-[var(--header-h)] items-center border-b border-white/8 px-4">
          <Link href="/platform" onClick={() => setOpen(false)}><PlatformLogo /></Link>
        </div>
        <nav className="scroll-thin flex-1 overflow-y-auto px-2 py-3">
          {PLATFORM_NAV.map((n, i) => {
            const Icon = n.icon;
            const active = isActive(n.href);
            return (
              <React.Fragment key={n.href}>
                {n.group && <div className={cn("mb-1 px-2.5 text-[10.5px] font-semibold tracking-wider text-white/35 uppercase", i > 0 && "mt-4")}>{n.group}</div>}
                <Link
                  href={n.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative mb-0.5 flex h-9 items-center gap-3 rounded-md px-2.5 text-[13.5px] font-medium transition-colors",
                    active ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/6 hover:text-white",
                  )}
                >
                  {active && <span className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-[#f5b971]" />}
                  <Icon className={cn("size-[18px]", active ? "text-[#f5b971]" : "text-white/50 group-hover:text-white/80")} />
                  <span className="flex-1">{n.label}</span>
                  {n.href === "/platform/support" && pendingGrants > 0 && (
                    <span className="rounded-full bg-accent-500 px-1.5 text-2xs font-semibold text-white">{pendingGrants}</span>
                  )}
                </Link>
              </React.Fragment>
            );
          })}
        </nav>
        <div className="border-t border-white/8 p-3">
          <Link href="/dashboard" className="mb-2 flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] text-white/65 hover:bg-white/6 hover:text-white">
            <ExternalLink className="size-4 text-white/45" /> Back to tenant app
          </Link>
          <div className="flex items-start gap-2 rounded-lg bg-white/5 px-3 py-2.5 text-2xs text-white/55">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#7fd4b0]" />
            Tenant data is visible only through consented, time-boxed support sessions. Every action is audited.
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-[var(--sidebar-w)]">
        <header className="sticky top-0 z-20 flex h-[var(--header-h)] items-center gap-2 border-b border-line bg-surface/95 px-3 backdrop-blur sm:px-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
            <MenuIcon />
          </Button>
          <span className="hidden items-center gap-1.5 rounded-full border border-accent-500/30 bg-accent-100 px-2.5 py-0.5 text-xs font-semibold text-[#9a5a0c] sm:inline-flex">
            <ShieldCheck className="size-3.5" /> Super admin mode
          </span>
          <span className="hidden text-xs text-ink-3 md:inline">Region ap-south-1 · Mumbai</span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="primary" onClick={() => router.push("/platform/tenants/new")}>
              <Plus /> <span className="hidden sm:inline">Onboard tenant</span>
            </Button>
            <Menu>
              <MenuTrigger asChild>
                <button className="flex h-9 items-center gap-2 rounded-md px-1.5 hover:bg-surface-3">
                  <span className="flex size-7 items-center justify-center rounded-full bg-[#0b1216] text-2xs font-semibold text-[#f5b971]">{PLATFORM_USER.initials}</span>
                  <span className="hidden text-left leading-tight sm:block">
                    <span className="block text-sm font-medium">{PLATFORM_USER.name}</span>
                    <span className="block text-2xs text-ink-3">{PLATFORM_USER.role}</span>
                  </span>
                </button>
              </MenuTrigger>
              <MenuContent className="w-64">
                <div className="px-2 py-2">
                  <div className="text-sm font-medium">{PLATFORM_USER.name}</div>
                  <div className="text-xs text-ink-3">{PLATFORM_USER.email}</div>
                </div>
                <MenuSeparator />
                <MenuItem icon={<ExternalLink />} onSelect={() => router.push("/dashboard")}>Open tenant app (demo)</MenuItem>
                <MenuItem icon={<LogOut />} onSelect={() => router.push("/platform/login")}>Sign out</MenuItem>
              </MenuContent>
            </Menu>
          </div>
        </header>
        <main id="main" className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}

/** Standard page header for platform screens. */
export function PlatformPage({
  title,
  subtitle,
  actions,
  crumbs,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  crumbs?: { label: string; href?: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-line bg-surface px-4 pt-4 pb-3 sm:px-6">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-1 flex items-center gap-1 text-xs text-ink-3">
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span>/</span>}
                {c.href ? <Link href={c.href} className="hover:text-primary-700 hover:underline">{c.label}</Link> : <span>{c.label}</span>}
              </React.Fragment>
            ))}
          </nav>
        )}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-ink-3">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
      <div className="flex-1 p-3 sm:p-5">{children}</div>
    </div>
  );
}
