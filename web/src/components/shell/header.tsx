"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  CircleHelp,
  CircleUser,
  ClipboardCheck,
  Grid3x3,
  Info,
  Languages,
  LogOut,
  Menu as MenuIcon,
  Plus,
  Search,
  UserCog,
} from "lucide-react";
import { Button, Kbd } from "@/components/ui/button";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tip,
} from "@/components/ui/overlay";
import { ROLES, type RoleKey, useApp, useRole } from "@/lib/store/app";
import { company } from "@/lib/data/masters";
import { cn, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

export function Header({
  onOpenLauncher,
  onOpenSearch,
  onOpenMobileNav,
}: {
  onOpenLauncher: () => void;
  onOpenSearch: () => void;
  onOpenMobileNav: () => void;
}) {
  const router = useRouter();
  const role = useRole();
  const lang = useApp((s) => s.lang);
  const setLang = useApp((s) => s.setLang);

  return (
    <header className="sticky top-0 z-20 flex h-[var(--header-h)] items-center gap-2 border-b border-line bg-surface/95 px-3 backdrop-blur sm:px-4">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMobileNav} aria-label="Open navigation">
        <MenuIcon />
      </Button>
      <Tip label="All apps (Alt+A)">
        <Button variant="ghost" size="icon" className="hidden sm:inline-flex" onClick={onOpenLauncher} aria-label="Open app launcher">
          <Grid3x3 />
        </Button>
      </Tip>

      {/* Organisation */}
      <Menu>
        <MenuTrigger asChild>
          <button className="hidden h-8 items-center gap-2 rounded-md px-2 text-left hover:bg-surface-3 md:flex">
            <Building2 className="size-4 text-ink-3" />
            <span className="text-sm font-medium">{company.shortName}</span>
            <span className="text-xs text-ink-3">· Plant 1</span>
          </button>
        </MenuTrigger>
        <MenuContent align="start" className="w-80">
          <MenuLabel>Company</MenuLabel>
          <div className="px-2 pb-2">
            <div className="text-sm font-medium">{company.name}</div>
            <div className="mt-0.5 font-mono text-xs text-ink-3">GSTIN {company.gstin}</div>
            <div className="mt-0.5 text-xs text-ink-3">{company.plant}</div>
            <div className="mt-1.5 flex gap-1.5 text-2xs">
              <span className="rounded bg-surface-3 px-1.5 py-0.5">{company.fiscalYear}</span>
              <span className="rounded bg-success-bg px-1.5 py-0.5 text-success">e-Invoice applicable</span>
            </div>
          </div>
          <MenuSeparator />
          <MenuItem disabled icon={<Building2 />}>
            Add plant (Plus plan)
          </MenuItem>
        </MenuContent>
      </Menu>

      {/* Search */}
      <button
        onClick={onOpenSearch}
        className="mx-auto flex h-8 min-w-0 flex-1 max-w-md items-center gap-2 rounded-md border border-line bg-surface-2 px-2.5 text-sm text-ink-3 transition-colors hover:border-line-strong hover:bg-surface"
      >
        <Search className="size-4" />
        <span className="flex-1 truncate text-left">Search orders, items, parties, pages…</span>
        <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
      </button>

      <div className="flex items-center gap-0.5">
        <Menu>
          <MenuTrigger asChild>
            <Button variant="primary" size="md" className="hidden sm:inline-flex">
              <Plus /> New
            </Button>
          </MenuTrigger>
          <MenuContent className="w-56">
            <MenuLabel>Create</MenuLabel>
            <MenuItem onSelect={() => router.push("/sales/orders/new")}>Sales order</MenuItem>
            <MenuItem onSelect={() => router.push("/purchase/orders")}>Purchase order</MenuItem>
            <MenuItem onSelect={() => router.push("/manufacturing/work-orders")}>Work order</MenuItem>
            <MenuItem onSelect={() => router.push("/jobwork/challans")}>Job-work challan</MenuItem>
            <MenuItem onSelect={() => router.push("/finance/invoices")}>Invoice</MenuItem>
            <MenuItem onSelect={() => router.push("/inventory/items")}>Item</MenuItem>
          </MenuContent>
        </Menu>

        <Tip label={lang === "en" ? "हिन्दी में बदलें" : "Switch to English"}>
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:inline-flex"
            onClick={() => {
              const next = lang === "en" ? "hi" : "en";
              setLang(next);
              toast.success(next === "hi" ? "भाषा: हिन्दी (master names shown in Hindi)" : "Language: English");
            }}
            aria-label="Toggle language"
          >
            <Languages />
          </Button>
        </Tip>
        <Notifications />
        <Tip label="Help & guides">
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label="Help" onClick={() => toast("In-app guides are coming in R2 (copilot AI-10).")}>
            <CircleHelp />
          </Button>
        </Tip>

        <Menu>
          <MenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-md p-1 hover:bg-surface-3" aria-label="User menu">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
                {role.initials}
              </span>
              <span className="hidden text-left leading-tight xl:block">
                <span className="block text-[13px] font-medium">{role.user}</span>
                <span className="block text-2xs text-ink-3">{role.label}</span>
              </span>
            </button>
          </MenuTrigger>
          <MenuContent className="w-64">
            <div className="px-2 py-2">
              <div className="text-sm font-medium">{role.user}</div>
              <div className="text-xs text-ink-3">{role.email}</div>
            </div>
            <MenuSeparator />
            <MenuLabel>Demo: view as role</MenuLabel>
            <RoleSwitcher />
            <MenuSeparator />
            <MenuItem icon={<CircleUser />} onSelect={() => router.push("/profile")}>
              My profile & security
            </MenuItem>
            <MenuItem icon={<UserCog />} onSelect={() => router.push("/settings/users")}>
              Users & roles
            </MenuItem>
            <MenuItem icon={<LogOut />} onSelect={() => router.push("/login")}>
              Sign out
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </header>
  );
}

function RoleSwitcher() {
  const current = useApp((s) => s.role);
  const setRole = useApp((s) => s.setRole);
  const router = useRouter();
  return (
    <>
      {(Object.keys(ROLES) as RoleKey[]).map((k) => (
        <MenuItem
          key={k}
          icon={<Check className={cn(k === current ? "opacity-100 !text-primary-600" : "opacity-0")} />}
          onSelect={() => {
            setRole(k);
            toast.success(`Now viewing as ${ROLES[k].label}`, {
              description: ROLES[k].seesCost ? "Full access to cost fields" : "Cost and margin fields hidden by field rules",
            });
            router.push("/dashboard");
          }}
        >
          {ROLES[k].label}
        </MenuItem>
      ))}
    </>
  );
}

const kindIcon = {
  approval: <ClipboardCheck className="size-4 text-warning" />,
  alert: <AlertTriangle className="size-4 text-danger" />,
  info: <Info className="size-4 text-info" />,
  success: <CheckCircle2 className="size-4 text-success" />,
};

function Notifications() {
  const notifications = useApp((s) => s.notifications);
  const markAllRead = useApp((s) => s.markAllRead);
  const markRead = useApp((s) => s.markRead);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative flex size-8 items-center justify-center rounded-md text-ink-2 hover:bg-surface-3" aria-label={`Notifications, ${unread} unread`}>
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-semibold text-white">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px]">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="text-sm font-semibold">Notifications</div>
          <button className="text-xs font-medium text-primary-700 hover:underline" onClick={markAllRead}>
            Mark all read
          </button>
        </div>
        <ul className="scroll-thin max-h-[420px] overflow-y-auto">
          {notifications.map((n) => (
            <li key={n.id}>
              <Link
                href={n.href ?? "#"}
                onClick={() => markRead(n.id)}
                className={cn("flex gap-3 border-b border-line px-4 py-3 hover:bg-surface-2", !n.read && "bg-primary-50/40")}
              >
                <span className="mt-0.5">{kindIcon[n.kind]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">{n.title}</span>
                  <span className="mt-0.5 block text-xs text-ink-2">{n.body}</span>
                  <span className="mt-1 block text-2xs text-ink-3">{formatDateTime(n.at)}</span>
                </span>
                {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary-600" />}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between px-4 py-2.5 text-xs">
          <Link href="/settings/notifications" className="text-ink-3 hover:text-ink">Preferences</Link>
          <Link href="/notifications" className="font-medium text-primary-700 hover:underline">View all</Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
