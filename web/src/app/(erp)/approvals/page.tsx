"use client";

import * as React from "react";
import Link from "next/link";
import { Check, CheckCheck, ExternalLink, Inbox, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/erp/control-panel";
import { EmptyState } from "@/components/erp/form-view";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { useApp, useRole } from "@/lib/store/app";
import { APPROVAL_TYPE_LABEL, type ApprovalType, useApprovals } from "@/lib/store/approvals";
import { useFinance } from "@/lib/store/finance";
import { useSales } from "@/lib/store/sales";
import { cn, formatDateTime, formatINR } from "@/lib/utils";

const TYPE_TONE: Record<ApprovalType, "warning" | "info" | "progress" | "danger" | "brand"> = {
  purchase_order: "info",
  credit_override: "danger",
  stock_adjustment: "progress",
  payment: "warning",
  discount: "brand",
};

function age(iso: string) {
  const h = Math.max(0, Math.round((Date.parse("2026-10-02T14:05:00") - Date.parse(iso)) / 36e5));
  return h < 1 ? "just now" : h < 24 ? `${h} h` : `${Math.round(h / 24)} d`;
}

export default function ApprovalsPage() {
  const role = useRole();
  const requests = useApprovals((s) => s.requests);
  const decide = useApprovals((s) => s.decide);
  const push = useApp((s) => s.pushNotification);
  const [tab, setTab] = React.useState<"pending" | "history">("pending");
  const [type, setType] = React.useState<ApprovalType | "all">("all");
  const [sel, setSel] = React.useState<string | null>("ap1");
  const [comment, setComment] = React.useState("");

  const list = requests
    .filter((r) => (tab === "pending" ? r.status === "pending" : r.status !== "pending"))
    .filter((r) => type === "all" || r.type === type);
  const current = requests.find((r) => r.id === sel && list.some((l) => l.id === r.id)) ?? list[0];
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const ownRequest = current && current.requestedBy === role.user;

  const act = (status: "approved" | "rejected") => {
    if (!current) return;
    if (status === "rejected" && !comment.trim()) return toast.error("Add a comment to reject", { description: "The requester sees it in the audit trail" });
    decide(current.id, status, role.user, comment.trim());
    if (status === "approved" && current.target?.kind === "sales_order") {
      useSales.getState().setStatus(current.target.id, "confirmed", role.user, `Credit override approved${comment ? ` — ${comment}` : ""}`, "approved");
    }
    if (status === "rejected" && current.target?.kind === "sales_order") {
      useSales.getState().setStatus(current.target.id, "draft", role.user, `Credit override rejected — ${comment}`, "status");
    }
    if (status === "approved" && current.target?.kind === "payment") useFinance.getState().approvePayment(current.target.id);
    push({ kind: status === "approved" ? "success" : "info", title: `${current.document} ${status}`, body: `${current.party} · by ${role.user}`, href: current.href });
    toast.success(`${current.document} ${status}`, { description: status === "approved" ? "Document released for the next step" : "Returned to the requester" });
    setComment("");
    const next = list.find((r) => r.id !== current.id);
    setSel(next?.id ?? null);
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-2.5 sm:px-6">
        <Breadcrumbs items={[{ label: "Approvals" }]} />
        <div className="ml-auto flex rounded-md border border-line-strong p-0.5 text-sm" role="tablist">
          {(["pending", "history"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setSel(null); }} className={cn("flex h-7 items-center gap-1.5 rounded px-3 font-medium", tab === t ? "bg-primary-600 text-white" : "text-ink-2 hover:bg-surface-3")}>
              {t === "pending" ? "Waiting for me" : "History"}
              {t === "pending" && <span className={cn("rounded-full px-1.5 text-xs", tab === t ? "bg-white/20" : "bg-surface-3")}>{pendingCount}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-line bg-surface px-4 py-2 sm:px-6">
        {(["all", ...Object.keys(APPROVAL_TYPE_LABEL)] as (ApprovalType | "all")[]).map((t) => {
          const n = requests.filter((r) => (tab === "pending" ? r.status === "pending" : r.status !== "pending") && (t === "all" || r.type === t)).length;
          return (
            <button key={t} onClick={() => setType(t)} aria-pressed={type === t} className={cn("h-7 rounded-full border px-3 text-xs font-medium", type === t ? "border-primary-600 bg-primary-50 text-primary-700" : "border-line-strong text-ink-2 hover:bg-surface-3")}>
              {t === "all" ? "All types" : APPROVAL_TYPE_LABEL[t]} <span className="text-ink-3">{n}</span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<Inbox />} title={tab === "pending" ? "Nothing waiting for approval" : "No decisions yet"} body="Documents that hit an approval rule appear here." />
      ) : (
        <div className="grid flex-1 lg:grid-cols-[minmax(340px,440px)_1fr]">
          <ul className="border-r border-line bg-surface" aria-label="Approval requests">
            {list.map((r) => (
              <li key={r.id}>
                <button onClick={() => setSel(r.id)} className={cn("flex w-full flex-col gap-1 border-b border-line px-4 py-3 text-left hover:bg-surface-2", current?.id === r.id && "bg-primary-50/70 shadow-[inset_3px_0_0_var(--primary-600)]")}>
                  <span className="flex items-center gap-2">
                    <Badge tone={TYPE_TONE[r.type]} dot={false}>{APPROVAL_TYPE_LABEL[r.type]}</Badge>
                    <span className="font-mono text-xs font-medium">{r.document}</span>
                    <span className="ml-auto text-2xs text-ink-3">{age(r.requestedAt)}</span>
                  </span>
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">{r.party}</span>
                    {role.seesCost && <span className="tabular text-sm font-semibold">{formatINR(r.amount)}</span>}
                  </span>
                  <span className="truncate text-xs text-ink-3">{r.rule} · {r.requestedBy}</span>
                  {r.status !== "pending" && <span><StatusBadge status={r.status} /></span>}
                </button>
              </li>
            ))}
          </ul>

          {current && (
            <section className="bg-bg p-3 sm:p-5" aria-label="Request detail">
              <div className="mx-auto max-w-3xl rounded-xl border border-line bg-surface shadow-xs">
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5">
                  <div>
                    <div className="text-xs font-medium tracking-wide text-ink-3 uppercase">{APPROVAL_TYPE_LABEL[current.type]}</div>
                    <h1 className="mt-0.5 text-xl font-semibold">{current.document}</h1>
                    <div className="mt-0.5 text-sm text-ink-2">{current.party}</div>
                  </div>
                  <div className="text-right">
                    {role.seesCost && <div className="tabular text-2xl font-semibold">{formatINR(current.amount)}</div>}
                    <Link href={current.href} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline">Open document <ExternalLink className="size-3" /></Link>
                  </div>
                </header>
                <div className="space-y-5 p-5">
                  <div className="flex items-start gap-2 rounded-lg bg-warning-bg px-3 py-2.5 text-sm">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                    <span><span className="font-medium">Rule triggered:</span> {current.rule}</span>
                  </div>
                  <dl className="grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-[140px_1fr]">
                    {current.details.map((d) => (
                      <React.Fragment key={d.label}>
                        <dt className="text-ink-3">{d.label}</dt>
                        <dd>{d.value}</dd>
                      </React.Fragment>
                    ))}
                    <dt className="text-ink-3">Requested by</dt>
                    <dd>{current.requestedBy} · {formatDateTime(current.requestedAt)}</dd>
                    {current.decidedBy && (
                      <>
                        <dt className="text-ink-3">Decision</dt>
                        <dd className="flex flex-wrap items-center gap-2"><StatusBadge status={current.status} /> {current.decidedBy} · {formatDateTime(current.decidedAt!)}</dd>
                        {current.comment && (<><dt className="text-ink-3">Comment</dt><dd className="italic">“{current.comment}”</dd></>)}
                      </>
                    )}
                  </dl>

                  {current.status === "pending" && (
                    role.approves ? (
                      ownRequest ? (
                        <p className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink-2">You raised this request. Segregation of duties: another approver must decide.</p>
                      ) : (
                        <div className="border-t border-line pt-4">
                          <label htmlFor="ap-comment" className="text-sm font-medium text-ink-2">Comment <span className="font-normal text-ink-3">(required to reject)</span></label>
                          <Textarea id="ap-comment" className="mt-1.5 min-h-16" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="e.g. Approved — customer paid ₹3 L on 30-Sep" />
                          <div className="mt-3 flex flex-wrap justify-end gap-2">
                            <Button variant="danger" onClick={() => act("rejected")}><X /> Reject</Button>
                            <Button variant="primary" onClick={() => act("approved")}><Check /> Approve</Button>
                          </div>
                          <p className="mt-2 text-right text-2xs text-ink-3">Decision is recorded in the immutable audit log with your user and device.</p>
                        </div>
                      )
                    ) : (
                      <p className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink-2">Your role ({role.label}) cannot approve. The Owner or Production head decides.</p>
                    )
                  )}
                </div>
              </div>
              <p className="mx-auto mt-3 flex max-w-3xl items-center gap-1.5 text-xs text-ink-3"><CheckCheck className="size-3.5" /> Rules are configured in Settings → Approval rules. The creator of a document cannot approve it.</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
