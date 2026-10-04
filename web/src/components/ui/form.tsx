import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-md border border-line-strong bg-surface text-sm text-ink placeholder:text-ink-3 shadow-xs transition-colors " +
  "hover:border-ink-3/60 focus:border-primary-500 focus:outline-none focus:ring-3 focus:ring-primary-500/15 " +
  "disabled:bg-surface-3 disabled:text-ink-3 aria-invalid:border-danger aria-invalid:ring-danger/15";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(control, "h-8 px-2.5", className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(control, "min-h-20 px-2.5 py-1.5", className)} {...props} />;
  },
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select ref={ref} className={cn(control, "h-8 appearance-none pr-8 pl-2.5", className)} {...props}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-ink-3" />
      </div>
    );
  },
);

export function Checkbox({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn("size-4 rounded border-line-strong accent-primary-600", className)}
      {...props}
    />
  );
}

/** Label + control + help/error, Odoo-style horizontal by default. */
export function Field({
  label,
  required,
  error,
  hint,
  children,
  layout = "horizontal",
  className,
  htmlFor,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  layout?: "horizontal" | "vertical";
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div
      className={cn(
        layout === "horizontal" ? "grid grid-cols-[140px_1fr] items-start gap-3" : "flex flex-col gap-1.5",
        className,
      )}
    >
      <label htmlFor={htmlFor} className={cn("text-sm font-medium text-ink-2", layout === "horizontal" && "pt-1.5")}>
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      <div className="min-w-0">
        {children}
        {error ? (
          <p className="mt-1 text-xs text-danger">{error}</p>
        ) : hint ? (
          <p className="mt-1 text-xs text-ink-3">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

/** Read-only value in a form sheet. */
export function ReadValue({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return <div className={cn("min-h-8 py-1.5 text-sm text-ink", mono && "font-mono text-[13px]")}>{children}</div>;
}
