import { cn } from "@/lib/utils";

export type Tone = "success" | "warning" | "danger" | "info" | "progress" | "neutral" | "brand";

const tones: Record<Tone, string> = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  progress: "bg-progress-bg text-progress",
  neutral: "bg-neutral-bg text-neutral",
  brand: "bg-primary-50 text-primary-700",
};

const dots: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  progress: "bg-progress",
  neutral: "bg-neutral",
  brand: "bg-primary-600",
};

export function Badge({
  tone = "neutral",
  children,
  dot = true,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", dots[tone])} />}
      {children}
    </span>
  );
}

/** Maps every document status used in the app to a tone + label. */
const STATUS: Record<string, { tone: Tone; label: string }> = {
  draft: { tone: "neutral", label: "Draft" },
  pending_approval: { tone: "warning", label: "Pending approval" },
  approved: { tone: "info", label: "Approved" },
  confirmed: { tone: "info", label: "Confirmed" },
  sent: { tone: "info", label: "Sent" },
  accepted: { tone: "success", label: "Accepted" },
  rejected: { tone: "danger", label: "Rejected" },
  expired: { tone: "neutral", label: "Expired" },
  partially_delivered: { tone: "progress", label: "Partly delivered" },
  delivered: { tone: "success", label: "Delivered" },
  partially_received: { tone: "progress", label: "Partly received" },
  received: { tone: "success", label: "Received" },
  closed: { tone: "neutral", label: "Closed" },
  cancelled: { tone: "danger", label: "Cancelled" },
  released: { tone: "info", label: "Released" },
  in_progress: { tone: "progress", label: "In progress" },
  completed: { tone: "success", label: "Completed" },
  open: { tone: "info", label: "Open" },
  running: { tone: "success", label: "Running" },
  paused: { tone: "warning", label: "Paused" },
  idle: { tone: "neutral", label: "Idle" },
  down: { tone: "danger", label: "Down" },
  posted: { tone: "success", label: "Posted" },
  issued: { tone: "info", label: "Issued" },
  partially_returned: { tone: "progress", label: "Partly returned" },
  overdue: { tone: "danger", label: "Overdue" },
  irn_pending: { tone: "warning", label: "IRN pending" },
  irn_generated: { tone: "success", label: "IRN generated" },
  irn_failed: { tone: "danger", label: "IRN failed" },
  not_applicable: { tone: "neutral", label: "Not applicable" },
  paid: { tone: "success", label: "Paid" },
  partially_paid: { tone: "progress", label: "Partly paid" },
  unpaid: { tone: "warning", label: "Unpaid" },
  active: { tone: "success", label: "Active" },
  obsolete: { tone: "neutral", label: "Obsolete" },
  counting: { tone: "progress", label: "Counting" },
  submitted: { tone: "warning", label: "Submitted" },
  applied: { tone: "success", label: "Applied" },
  exception: { tone: "danger", label: "Exception" },
  voided: { tone: "neutral", label: "Voided" },
  matched: { tone: "success", label: "Matched" },
  mismatch: { tone: "danger", label: "Mismatch" },
  generated: { tone: "success", label: "Generated" },
  pending: { tone: "warning", label: "Pending" },
  planned: { tone: "info", label: "Planned" },
  online: { tone: "success", label: "Online" },
  offline: { tone: "warning", label: "Offline" },
  revoked: { tone: "neutral", label: "Revoked" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = STATUS[status] ?? { tone: "neutral" as Tone, label: status.replace(/_/g, " ") };
  return (
    <Badge tone={s.tone} className={className}>
      {s.label}
    </Badge>
  );
}

export function statusLabel(status: string) {
  return STATUS[status]?.label ?? status.replace(/_/g, " ");
}
