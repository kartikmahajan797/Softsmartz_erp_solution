"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { AppLauncher, CommandPalette } from "./launcher";
import { useApp } from "@/lib/store/app";
import { usePlatform } from "@/lib/store/platform";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const collapsed = useApp((s) => s.sidebarCollapsed);
  const [launcher, setLauncher] = React.useState(false);
  const [search, setSearch] = React.useState(false);
  const [mobileNav, setMobileNav] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => setHydrated(true), []);
  React.useEffect(() => setMobileNav(false), [pathname]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch((s) => !s);
      }
      if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setLauncher((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-full">
      <a href="#main" className="sr-only z-50 rounded bg-primary-600 px-3 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Skip to content
      </a>
      <Sidebar mobileOpen={mobileNav} onClose={() => setMobileNav(false)} />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-200",
          hydrated && collapsed ? "lg:pl-[var(--sidebar-w-collapsed)]" : "lg:pl-[var(--sidebar-w)]",
        )}
      >
        {hydrated && <SupportSessionBanner />}
        <Header onOpenLauncher={() => setLauncher(true)} onOpenSearch={() => setSearch(true)} onOpenMobileNav={() => setMobileNav(true)} />
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
      </div>
      <AppLauncher open={launcher} onOpenChange={setLauncher} />
      <CommandPalette open={search} onOpenChange={setSearch} />
    </div>
  );
}

/** Shown while platform support is inside this tenant under a consented grant (arch G17). */
function SupportSessionBanner() {
  const router = useRouter();
  const imp = usePlatform((s) => s.impersonating);
  const tenant = usePlatform((s) => s.tenants.find((t) => t.id === s.impersonating?.tenantId));
  const end = usePlatform((s) => s.endImpersonation);
  if (!imp) return null;
  return (
    <div role="status" className="flex flex-wrap items-center gap-2 border-b border-warning/30 bg-[#fbbf24] px-4 py-1.5 text-sm text-[#3d2a00] sm:px-6">
      <ShieldAlert className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <strong>Support session</strong> — {imp.staff} (platform support) is viewing {tenant?.shortName ?? "this workspace"} with{" "}
        {imp.scope === "read_only" ? "read-only" : "configure"} access until {formatDateTime(imp.until)}. All actions are audited.
      </span>
      <Button
        size="sm"
        className="border-[#3d2a00]/30 bg-white/70 text-[#3d2a00] hover:bg-white"
        onClick={() => {
          end();
          router.push("/platform/support");
        }}
      >
        End session
      </Button>
    </div>
  );
}
