"use client";

import { useRouter } from "next/navigation";
import { Dialog as D } from "radix-ui";
import { Command } from "cmdk";
import { CornerDownLeft, FileText, Search, X } from "lucide-react";
import { NAV } from "@/lib/nav";
import { useRole } from "@/lib/store/app";
import { useSearchDocs } from "@/lib/search";

/** Odoo-style app launcher: a grid of module tiles. */
export function AppLauncher({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const role = useRole();
  const modules = NAV.filter((m) => role.modules.includes(m.key));
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="anim-fade fixed inset-0 z-50 bg-brand-950/55 backdrop-blur-sm" />
        <D.Content className="anim-pop fixed top-[10vh] left-1/2 z-50 w-[calc(100vw-32px)] max-w-3xl -translate-x-1/2 rounded-2xl border border-line bg-surface p-6 shadow-pop">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <D.Title className="text-lg font-semibold">Apps</D.Title>
              <D.Description className="text-sm text-ink-3">Modules available to {role.label}</D.Description>
            </div>
            <D.Close className="rounded-md p-1 text-ink-3 hover:bg-surface-3" aria-label="Close">
              <X className="size-4" />
            </D.Close>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.key}
                  onClick={() => {
                    onOpenChange(false);
                    router.push(m.href);
                  }}
                  className="group flex flex-col items-center gap-2 rounded-xl p-3 text-center transition-colors hover:bg-surface-3 focus-visible:bg-surface-3"
                >
                  <span className={`flex size-14 items-center justify-center rounded-2xl ${m.tile} text-white shadow-sm transition-transform group-hover:-translate-y-0.5`}>
                    <Icon className="size-7" strokeWidth={1.75} />
                  </span>
                  <span className="text-[13px] font-medium text-ink">{m.label}</span>
                  <span className="hidden text-2xs leading-snug text-ink-3 sm:block">{m.description}</span>
                </button>
              );
            })}
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/** ⌘K command palette: pages + documents + masters. */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const role = useRole();
  const docs = useSearchDocs();
  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };
  const pages = NAV.filter((m) => role.modules.includes(m.key)).flatMap((m) =>
    m.children ? m.children.map((c) => ({ label: c.label, module: m.label, href: c.href, icon: m.icon })) : [{ label: m.label, module: "", href: m.href, icon: m.icon }],
  );
  const groups = [...new Set(docs.map((d) => d.group))];

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="anim-fade fixed inset-0 z-50 bg-brand-950/45" />
        <D.Content className="anim-pop fixed top-[12vh] left-1/2 z-50 w-[calc(100vw-32px)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          <D.Title className="sr-only">Search</D.Title>
          <D.Description className="sr-only">Search pages, documents and masters</D.Description>
          <Command label="Global search" loop>
            <div className="flex items-center gap-2 border-b border-line px-4">
              <Search className="size-4 text-ink-3" />
              <Command.Input autoFocus placeholder="Search SO-2026-…, item code, customer, page…" className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-3" />
            </div>
            <Command.List className="scroll-thin max-h-[56vh] overflow-y-auto p-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-3 [&_[cmdk-group-heading]]:uppercase">
              <Command.Empty className="px-3 py-8 text-center text-sm text-ink-3">No results.</Command.Empty>
              <Command.Group heading="Pages">
                {pages.map((p) => {
                  const Icon = p.icon;
                  return (
                    <Command.Item key={p.href} value={`${p.label} ${p.module}`} onSelect={() => go(p.href)} className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm data-[selected=true]:bg-surface-3">
                      <Icon className="size-4 text-ink-3" />
                      <span className="flex-1">{p.label}</span>
                      {p.module && <span className="text-xs text-ink-3">{p.module}</span>}
                    </Command.Item>
                  );
                })}
              </Command.Group>
              {groups.map((g) => (
                <Command.Group key={g} heading={g}>
                  {docs
                    .filter((d) => d.group === g)
                    .map((d) => (
                      <Command.Item key={d.href + d.title} value={`${d.title} ${d.subtitle}`} onSelect={() => go(d.href)} className="flex h-10 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm data-[selected=true]:bg-surface-3">
                        <FileText className="size-4 text-ink-3" />
                        <span className="font-medium">{d.title}</span>
                        <span className="flex-1 truncate text-xs text-ink-3">{d.subtitle}</span>
                        <CornerDownLeft className="size-3.5 text-ink-3 opacity-0 [[data-selected=true]_&]:opacity-100" />
                      </Command.Item>
                    ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
