import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle" | "link";
type Size = "xs" | "sm" | "md" | "lg" | "icon" | "icon-sm";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-xs border border-primary-700/40",
  secondary:
    "bg-surface text-ink border border-line-strong hover:bg-surface-3 hover:border-line-strong active:bg-line shadow-xs",
  ghost: "text-ink-2 hover:bg-surface-3 hover:text-ink",
  subtle: "bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-100",
  danger: "bg-surface text-danger border border-line-strong hover:bg-danger-bg hover:border-danger/30",
  link: "text-primary-700 hover:underline underline-offset-2 px-0 h-auto",
};

const sizes: Record<Size, string> = {
  xs: "h-6 px-2 text-xs gap-1 rounded",
  sm: "h-7 px-2.5 text-xs gap-1.5 rounded-md",
  md: "h-8 px-3 text-sm gap-1.5 rounded-md",
  lg: "h-10 px-4 text-base gap-2 rounded-md",
  icon: "h-8 w-8 rounded-md justify-center",
  "icon-sm": "h-7 w-7 rounded-md justify-center",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "md", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center font-medium whitespace-nowrap transition-colors select-none",
        "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong bg-surface px-1 font-mono text-[10.5px] text-ink-3",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
