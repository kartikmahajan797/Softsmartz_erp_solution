"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronsLeft, ChevronsRight, ExternalLink, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { leafForPath, moduleForPath, NAV, type NavModule } from "@/lib/nav";
import { useApp, useRole } from "@/lib/store/app";
import { cn } from "@/lib/utils";
import { Tip } from "@/components/ui/overlay";
import { company } from "@/lib/data/masters";

export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#0d7377" />
        <path d="M8 23V12l5 3.2V12l5 3.2V9h6v14z" fill="#fff" />
        <rect x="19.5" y="11" width="3" height="3" rx=".6" fill="#e8891c" />
      </svg>
      {!collapsed && (
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight text-white">Factory ERP</div>
          <div className="text-2xs text-white/50">Factory-first cloud ERP</div>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const collapsed = useApp((s) => s.sidebarCollapsed);
  const toggle = useApp((s) => s.toggleSidebar);
  const role = useRole();
  const pathname = usePathname();
  const modules = NAV.filter((m) => role.modules.includes(m.key));

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-brand-950/40 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-brand-900 text-white/80 transition-[width,transform] duration-200",
          collapsed ? "lg:w-[var(--sidebar-w-collapsed)]" : "lg:w-[var(--sidebar-w)]",
          "w-[var(--sidebar-w)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        aria-label="Main navigation"
      >
        <div className={cn("flex h-[var(--header-h)] items-center border-b border-white/8", collapsed ? "lg:justify-center lg:px-0 px-4" : "px-4")}>
          <Link href="/dashboard" onClick={onClose}>
            <Logo collapsed={collapsed} />
          </Link>
        </div>

        <nav className="scroll-thin flex-1 overflow-y-auto px-2 py-3">
          {modules.map((m) => (
            <div key={m.key}>
              {m.section &&
                (collapsed ? (
                  <div className="mx-auto my-2 hidden h-px w-6 bg-white/12 lg:block" />
                ) : (
                  <div className="mt-4 mb-1.5 border-t border-white/8 px-2.5 pt-3 text-[10.5px] font-semibold tracking-wider text-white/35 uppercase">{m.section}</div>
                ))}
              <ModuleItem m={m} collapsed={collapsed} pathname={pathname} onNavigate={onClose} />
            </div>
          ))}
        </nav>

        <div className="border-t border-white/8 p-2">
          {!collapsed && (
            <div className="mb-2 rounded-lg bg-white/5 px-3 py-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-white/90">{company.plan} plan</span>
                <span className="flex items-center gap-1 text-[#7fd4b0]">
                  <Wifi className="size-3" /> 6/7 terminals
                </span>
              </div>
              <div className="mt-1 text-2xs text-white/45">1 plant · unlimited operators</div>
            </div>
          )}
          <button
            onClick={toggle}
            className="hidden h-8 w-full items-center gap-2 rounded-md px-2.5 text-xs text-white/55 hover:bg-white/6 hover:text-white lg:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="mx-auto size-4" /> : <><ChevronsLeft className="size-4" /> Collapse</>}
          </button>
        </div>
      </aside>
    </>
  );
}

function ModuleItem({
  m,
  collapsed,
  pathname,
  onNavigate,
}: {
  m: NavModule;
  collapsed: boolean;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = moduleForPath(pathname)?.key === m.key;
  const activeLeaf = active ? leafForPath(m, pathname) : undefined;
  const [open, setOpen] = useState(active);
  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  const Icon = m.icon;
  const base =
    "group flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-[13.5px] font-medium transition-colors";
  const tone = active ? "text-white" : "text-white/70 hover:bg-white/6 hover:text-white";

  if (collapsed) {
    return (
      <Tip label={m.label} side="right">
        <Link
          href={m.href}
          onClick={onNavigate}
          className={cn(base, tone, "mb-0.5 justify-center px-0 lg:flex", active && "bg-white/10")}
          aria-label={m.label}
        >
          <Icon className="size-[18px]" />
        </Link>
      </Tip>
    );
  }

  if (!m.children || m.flat) {
    return (
      <Link href={m.href} onClick={onNavigate} className={cn(base, tone, "mb-0.5", active && "bg-white/10")}>
        <Icon className={cn("size-[18px]", active ? "text-[#5fd0c9]" : "text-white/55 group-hover:text-white/80")} />
        {m.label}
      </Link>
    );
  }

  return (
    <div className="mb-0.5">
      <button onClick={() => setOpen((o) => !o)} className={cn(base, tone)} aria-expanded={open}>
        <Icon className={cn("size-[18px]", active ? "text-[#5fd0c9]" : "text-white/55 group-hover:text-white/80")} />
        <span className="flex-1 text-left">{m.label}</span>
        <ChevronDown className={cn("size-3.5 text-white/40 transition-transform", !open && "-rotate-90")} />
      </button>
      {open && (
        <div className="mt-0.5 mb-1.5 ml-[21px] border-l border-white/10 pl-3">
          {m.children.map((c) => {
            const isActive = activeLeaf?.href === c.href;
            return (
              <div key={c.href}>
                {c.group && (
                  <div className="mt-2 mb-1 px-2 text-[10.5px] font-semibold tracking-wider text-white/35 uppercase">
                    {c.group}
                  </div>
                )}
                <Link
                  href={c.href}
                  onClick={onNavigate}
                  target={c.external ? "_blank" : undefined}
                  className={cn(
                    "relative flex h-8 items-center gap-2 rounded-md px-2 text-[13px] transition-colors",
                    isActive ? "bg-white/10 font-medium text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
                  )}
                >
                  {isActive && <span className="absolute top-1.5 bottom-1.5 -left-[13px] w-0.5 rounded-full bg-[#5fd0c9]" />}
                  {c.label}
                  {c.external && <ExternalLink className="size-3 text-white/40" />}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
