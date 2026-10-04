"use client";

import * as React from "react";
import { Dialog as D, DropdownMenu as DM, Popover as P, Tooltip as T } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------- Dialog ---------------- */

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const w = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="anim-fade fixed inset-0 z-50 bg-brand-950/40 backdrop-blur-[1px]" />
        <D.Content
          className={cn(
            "anim-pop fixed top-[12vh] left-1/2 z-50 flex max-h-[76vh] w-[calc(100vw-32px)] -translate-x-1/2 flex-col rounded-xl border border-line bg-surface shadow-pop",
            w,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <D.Title className="text-lg font-semibold text-ink">{title}</D.Title>
              {description ? (
                <D.Description className="mt-0.5 text-sm text-ink-3">{description}</D.Description>
              ) : (
                <D.Description className="sr-only">{title}</D.Description>
              )}
            </div>
            <D.Close className="rounded-md p-1 text-ink-3 hover:bg-surface-3 hover:text-ink" aria-label="Close">
              <X className="size-4" />
            </D.Close>
          </div>
          <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3 rounded-b-xl">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/* ---------------- Side sheet (Zoho-style quick view) ---------------- */

export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  footer,
  width = 480,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="anim-fade fixed inset-0 z-50 bg-brand-950/30" />
        <D.Content
          style={{ width }}
          className="anim-slide fixed top-0 right-0 z-50 flex h-full max-w-[100vw] flex-col border-l border-line bg-surface shadow-pop"
        >
          <div className="flex h-[52px] items-center justify-between border-b border-line px-5">
            <D.Title className="text-base font-semibold">{title}</D.Title>
            <D.Description className="sr-only">Details panel</D.Description>
            <D.Close className="rounded-md p-1 text-ink-3 hover:bg-surface-3 hover:text-ink" aria-label="Close">
              <X className="size-4" />
            </D.Close>
          </div>
          <div className="scroll-thin flex-1 overflow-y-auto p-5">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/* ---------------- Dropdown menu ---------------- */

export const Menu = DM.Root;
export const MenuTrigger = DM.Trigger;

export function MenuContent({
  children,
  align = "end",
  className,
}: {
  children: React.ReactNode;
  align?: "start" | "end" | "center";
  className?: string;
}) {
  return (
    <DM.Portal>
      <DM.Content
        align={align}
        sideOffset={6}
        className={cn(
          "anim-pop z-50 min-w-48 rounded-lg border border-line bg-surface p-1 text-sm shadow-pop",
          className,
        )}
      >
        {children}
      </DM.Content>
    </DM.Portal>
  );
}

export function MenuItem({
  children,
  onSelect,
  icon,
  danger,
  shortcut,
  disabled,
}: {
  children: React.ReactNode;
  onSelect?: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
  shortcut?: string;
  disabled?: boolean;
}) {
  return (
    <DM.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        "flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "data-[highlighted]:bg-surface-3 [&_svg]:size-4 [&_svg]:text-ink-3",
        danger ? "text-danger [&_svg]:text-danger" : "text-ink",
      )}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {shortcut && <span className="text-xs text-ink-3">{shortcut}</span>}
    </DM.Item>
  );
}

export function MenuCheckItem({
  children,
  checked,
  onCheckedChange,
}: {
  children: React.ReactNode;
  checked: boolean;
  onCheckedChange: (c: boolean) => void;
}) {
  return (
    <DM.CheckboxItem
      checked={checked}
      onCheckedChange={onCheckedChange}
      onSelect={(e) => e.preventDefault()}
      className="flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-ink outline-none select-none data-[highlighted]:bg-surface-3"
    >
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded border",
          checked ? "border-primary-600 bg-primary-600 text-white" : "border-line-strong",
        )}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2.5 6.5l2.2 2.2L9.5 3.8" />
          </svg>
        )}
      </span>
      {children}
    </DM.CheckboxItem>
  );
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return <DM.Label className="px-2 pt-2 pb-1 text-2xs font-semibold tracking-wide text-ink-3 uppercase">{children}</DM.Label>;
}

export function MenuSeparator() {
  return <DM.Separator className="my-1 h-px bg-line" />;
}

/* ---------------- Popover ---------------- */

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export function PopoverContent({
  children,
  className,
  align = "end",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "end" | "center";
}) {
  return (
    <P.Portal>
      <P.Content
        align={align}
        sideOffset={6}
        className={cn("anim-pop z-50 rounded-lg border border-line bg-surface shadow-pop outline-none", className)}
      >
        {children}
      </P.Content>
    </P.Portal>
  );
}

/* ---------------- Tooltip ---------------- */

export function Tip({
  label,
  children,
  side = "top",
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <T.Provider delayDuration={250}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content
            side={side}
            sideOffset={6}
            className="anim-fade z-[60] rounded-md bg-brand-900 px-2 py-1 text-xs text-white shadow-pop"
          >
            {label}
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}
