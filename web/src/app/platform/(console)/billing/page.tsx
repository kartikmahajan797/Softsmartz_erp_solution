"use client";

import * as React from "react";
import Link from "next/link";
import { BellRing, Ban, CheckCircle2, Download, FilePlus2, MoreHorizontal, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { type Column, DataTable } from "@/components/erp/data-table";
import { PlatformPage } from "@/components/platform/platform-shell";
import { downloadCsv, StatCard, useTenantName } from "@/components/platform/p2-ui";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Dialog, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/overlay";
import { mrrOf, planPrice, PLANS, PLATFORM_USER, type SubscriptionInvoice, usePlatform } from "@/lib/store/platform";
import { daysBetween, formatDate, formatINR, formatLakh, TODAY } from "@/lib/utils";

const STATUS: Record<SubscriptionInvoice["status"], { tone: Tone; label: string }> = {
  paid: { tone: "success", label: "Paid" },
  due: { tone: "info", label: "Due" },
  overdue: { tone: "danger", label: "Overdue" },
  draft: { tone: "neutral", label: "Draft" },
  void: { tone: "neutral", label: "Void" },
};

const total = (i: SubscriptionInvoice) => Math.round(i.amount + i.gst);

export default function PlatformBillingPage() {
  const invoices = usePlatform((s) => s.invoices);
  const tenants = usePlatform((s) => s.tenants);
  const addInvoice = usePlatform((s) => s.addInvoice);
  const setStatus = usePlatform((s) => s.setInvoiceStatus);
  const log = usePlatform((s) => s.log);
  const tenantName = useTenantName();

  const [q, setQ] = React.useState("");
  const [status, setStatusFilter] = React.useState<"" | SubscriptionInvoice["status"]>("");
  const [open, setOpen] = React.useState(false);

  // Overdue is derived: a "due" invoice past its due date reads as overdue.
  const effective = (i: SubscriptionInvoice): SubscriptionInvoice["status"] => (i.status === "due" && daysBetween(TODAY, i.dueDate) < 0 ? "overdue" : i.status);

  const rows = invoices.filter((i) => {
    const s = q.trim().toLowerCase();
    return (!status || effective(i) === status) && (!s || `${i.number} ${tenantName(i.tenantId)} ${i.description} ${i.period}`.toLowerCase().includes(s));
  });

  const mrr = tenants.reduce((a, t) => a + mrrOf(t), 0);
  const collected = invoices.filter((i) => i.status === "paid" && i.paidOn && i.paidOn >= "2026-10-01").reduce((a, i) => a + total(i), 0);
  const due = invoices.filter((i) => effective(i) === "due").reduce((a, i) => a + total(i), 0);
  const overdue = invoices.filter((i) => effective(i) === "overdue");
  const drafts = invoices.filter((i) => i.status === "draft").length;

  const billable = tenants.filter((t) => t.status === "active" || t.status === "past_due");
  const alreadyOct = (tid: string) => invoices.some((i) => i.tenantId === tid && i.period === "Oct 2026" && i.status !== "void");
  const toGenerate = billable.filter((t) => !alreadyOct(t.id));

  const generate = () => {
    if (!toGenerate.length) return toast("October invoices already exist for every billable tenant");
    toGenerate.forEach((t) => {
      const amount = planPrice(t.plan, t.cycle);
      addInvoice({
        tenantId: t.id, date: TODAY, dueDate: "2026-10-15", period: "Oct 2026",
        description: `${PLANS[t.plan].name} plan · ${t.cycle === "annual" ? "annual (monthly instalment)" : "monthly"}`,
        amount, gst: Math.round(amount * 0.18 * 100) / 100, status: "draft",
      });
    });
    log(PLATFORM_USER.name, "billing.generate", `Generated ${toGenerate.length} draft invoices for Oct 2026`);
    toast.success(`${toGenerate.length} draft invoices created`, { description: "Review and send — nothing is emailed until you send" });
  };

  const act = (i: SubscriptionInvoice, next: SubscriptionInvoice["status"], msg: string) => {
    setStatus(i.id, next);
    log(PLATFORM_USER.name, `billing.${next}`, `${i.number} · ${tenantName(i.tenantId)} → ${STATUS[next].label}`, i.tenantId);
    toast.success(msg);
  };

  const columns: Column<SubscriptionInvoice>[] = [
    { key: "number", header: "Invoice", value: (i) => i.number, cell: (i) => <span className="font-mono text-[12.5px] font-medium whitespace-nowrap">{i.number}</span> },
    {
      key: "tenant", header: "Tenant", value: (i) => tenantName(i.tenantId),
      cell: (i) => (
        <Link href={`/platform/tenants/${i.tenantId}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:text-primary-700 hover:underline">
          {tenantName(i.tenantId)}
        </Link>
      ),
    },
    {
      key: "period", header: "Period", value: (i) => i.period,
      cell: (i) => (
        <div className="leading-tight">
          <div>{i.period}</div>
          <div className="max-w-56 truncate text-xs text-ink-3">{i.description}</div>
        </div>
      ),
    },
    { key: "date", header: "Issued", value: (i) => i.date, cell: (i) => <span className="whitespace-nowrap">{formatDate(i.date)}</span> },
    { key: "amount", header: "Amount", align: "right", value: (i) => i.amount, cell: (i) => formatINR(i.amount) },
    { key: "gst", header: "GST 18%", align: "right", value: (i) => i.gst, cell: (i) => <span className="text-ink-2">{formatINR(i.gst)}</span> },
    { key: "total", header: "Total", align: "right", value: total, cell: (i) => <span className="font-semibold">{formatINR(total(i))}</span>, total: (rs) => formatLakh(rs.filter((r) => r.status !== "void").reduce((a, r) => a + total(r), 0)) },
    {
      key: "due", header: "Due", value: (i) => i.dueDate,
      cell: (i) => {
        const e = effective(i);
        const d = daysBetween(TODAY, i.dueDate);
        return (
          <div className="leading-tight whitespace-nowrap">
            <div className={e === "overdue" ? "text-danger" : undefined}>{formatDate(i.dueDate)}</div>
            {i.status === "paid" ? (
              <div className="text-xs text-success">Paid {formatDate(i.paidOn)}</div>
            ) : e === "overdue" ? (
              <div className="text-xs text-danger">{-d} days overdue</div>
            ) : e === "due" ? (
              <div className="text-xs text-ink-3">in {d} days</div>
            ) : null}
          </div>
        );
      },
    },
    { key: "status", header: "Status", value: (i) => effective(i), cell: (i) => <Badge tone={STATUS[effective(i)].tone}>{STATUS[effective(i)].label}</Badge> },
    {
      key: "actions", header: "", sortable: false,
      cell: (i) => (
        <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
          <Menu>
            <MenuTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${i.number}`}><MoreHorizontal /></Button>
            </MenuTrigger>
            <MenuContent className="w-52">
              {i.status === "draft" && <MenuItem icon={<FilePlus2 />} onSelect={() => act(i, "due", `${i.number} sent to ${tenantName(i.tenantId)}`)}>Send invoice</MenuItem>}
              <MenuItem icon={<CheckCircle2 />} disabled={i.status === "paid" || i.status === "void"} onSelect={() => act(i, "paid", `${i.number} marked paid`)}>Mark paid</MenuItem>
              <MenuItem
                icon={<BellRing />}
                disabled={!["due", "overdue"].includes(effective(i))}
                onSelect={() => {
                  log(PLATFORM_USER.name, "billing.reminder", `Payment reminder for ${i.number}`, i.tenantId);
                  toast.success("Reminder sent", { description: `WhatsApp + email to ${tenants.find((t) => t.id === i.tenantId)?.owner.email}` });
                }}
              >
                Send reminder
              </MenuItem>
              <MenuItem icon={<Download />} onSelect={() => toast.success(`${i.number}.pdf downloaded`)}>Download PDF</MenuItem>
              <MenuSeparator />
              <MenuItem icon={<Ban />} danger disabled={i.status === "paid" || i.status === "void"} onSelect={() => act(i, "void", `${i.number} voided`)}>Void</MenuItem>
            </MenuContent>
          </Menu>
        </div>
      ),
    },
  ];

  return (
    <PlatformPage
      title="Subscription billing"
      subtitle="Manual invoicing of tenant subscriptions and onboarding packages (R1) — GST at 18%"
      crumbs={[{ label: "Platform", href: "/platform" }, { label: "Subscription billing" }]}
      actions={
        <>
          <Button onClick={() => downloadCsv("subscription-invoices.csv", ["Invoice", "Tenant", "Period", "Issued", "Due", "Amount", "GST", "Total", "Status"], rows.map((i) => [i.number, tenantName(i.tenantId), i.period, i.date, i.dueDate, i.amount, i.gst, total(i), effective(i)]))}>
            <Download /> Export
          </Button>
          <Button onClick={generate}><Sparkles /> Generate October invoices{toGenerate.length ? ` (${toGenerate.length})` : ""}</Button>
          <Button variant="primary" onClick={() => setOpen(true)}><FilePlus2 /> New invoice</Button>
        </>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="MRR" value={formatLakh(mrr)} hint={`ARR ${formatLakh(mrr * 12)} · excl. GST`} />
        <StatCard label="Collected in October" value={formatLakh(collected)} hint="Incl. GST" tone="success" />
        <StatCard label="Due" value={formatLakh(due)} hint={`${drafts} drafts not yet sent`} tone="info" />
        <StatCard label="Overdue" value={formatLakh(overdue.reduce((a, i) => a + total(i), 0))} hint={`${overdue.length} invoice${overdue.length === 1 ? "" : "s"} · dunning on`} tone={overdue.length ? "danger" : undefined} />
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-3" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search invoice, tenant, period…" className="pl-8" aria-label="Search invoices" />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Status filter">
            {(["", "draft", "due", "overdue", "paid", "void"] as const).map((s) => (
              <button
                key={s || "all"}
                onClick={() => setStatusFilter(s)}
                aria-pressed={status === s}
                className={`h-7 rounded-full border px-3 text-xs font-medium ${status === s ? "border-primary-600 bg-primary-600 text-white" : "border-line-strong bg-surface text-ink-2 hover:bg-surface-3"}`}
              >
                {s ? STATUS[s].label : "All"} <span className="opacity-70">{s ? invoices.filter((i) => effective(i) === s).length : invoices.length}</span>
              </button>
            ))}
          </div>
        </div>
        <DataTable rows={rows} columns={columns} selectable={false} />
      </div>

      <NewInvoiceDialog open={open} onOpenChange={setOpen} />
    </PlatformPage>
  );
}

function NewInvoiceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const tenants = usePlatform((s) => s.tenants);
  const addInvoice = usePlatform((s) => s.addInvoice);
  const log = usePlatform((s) => s.log);
  const [tenantId, setTenantId] = React.useState("");
  const [period, setPeriod] = React.useState("Oct 2026");
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [dueDate, setDueDate] = React.useState("2026-10-16");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const amt = Number(amount) || 0;
  const gst = Math.round(amt * 0.18 * 100) / 100;

  const reset = () => {
    setTenantId(""); setPeriod("Oct 2026"); setDescription(""); setAmount(""); setDueDate("2026-10-16"); setErrors({});
  };

  const prefill = (id: string) => {
    setTenantId(id);
    const t = tenants.find((x) => x.id === id);
    if (t && !description) setDescription(`${PLANS[t.plan].name} plan · ${t.cycle === "annual" ? "annual (monthly instalment)" : "monthly"}`);
    if (t && !amount) setAmount(String(planPrice(t.plan, t.cycle)));
  };

  const save = (send: boolean) => {
    const e: Record<string, string> = {};
    if (!tenantId) e.tenant = "Choose a tenant";
    if (!description.trim()) e.description = "Required";
    if (!(amt > 0)) e.amount = "Enter an amount above zero";
    if (!dueDate || dueDate < TODAY) e.due = "Due date cannot be in the past";
    setErrors(e);
    if (Object.keys(e).length) return;
    addInvoice({ tenantId, date: TODAY, dueDate, period, description: description.trim(), amount: amt, gst, status: send ? "due" : "draft" });
    const t = tenants.find((x) => x.id === tenantId)!;
    log(PLATFORM_USER.name, "billing.create", `${send ? "Sent" : "Drafted"} invoice for ${t.shortName} · ${formatINR(amt + gst)}`, tenantId);
    toast.success(send ? "Invoice sent" : "Draft saved", { description: send ? `Emailed to ${t.owner.email}` : "Send it when ready" });
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title="New subscription invoice"
      description="Numbered from the FE/SUB series for FY 2026-27"
      footer={
        <>
          <Button onClick={() => save(false)}>Save draft</Button>
          <Button variant="primary" onClick={() => save(true)}>Save & send</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Tenant" required layout="vertical" error={errors.tenant} htmlFor="ni-t">
          <Select id="ni-t" value={tenantId} onChange={(e) => prefill(e.target.value)} aria-invalid={!!errors.tenant}>
            <option value="">Select tenant…</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.shortName} · {PLANS[t.plan].name}</option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Period" layout="vertical" htmlFor="ni-p">
            <Select id="ni-p" value={period} onChange={(e) => setPeriod(e.target.value)}>
              {["Oct 2026", "Nov 2026", "Onboarding", "Add-on", "One-time"].map((p) => <option key={p}>{p}</option>)}
            </Select>
          </Field>
          <Field label="Due date" layout="vertical" error={errors.due} htmlFor="ni-d">
            <Input id="ni-d" type="date" value={dueDate} min={TODAY} onChange={(e) => setDueDate(e.target.value)} aria-invalid={!!errors.due} />
          </Field>
        </div>
        <Field label="Description" required layout="vertical" error={errors.description} htmlFor="ni-desc">
          <Input id="ni-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Growth plan · monthly" aria-invalid={!!errors.description} />
        </Field>
        <Field label="Amount (excl. GST)" required layout="vertical" error={errors.amount} htmlFor="ni-a">
          <Input id="ni-a" type="number" min={0} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular" aria-invalid={!!errors.amount} />
        </Field>
        <dl className="rounded-lg bg-surface-2 px-4 py-3 text-sm">
          <div className="flex justify-between py-0.5"><dt className="text-ink-3">Taxable</dt><dd className="tabular">{formatINR(amt)}</dd></div>
          <div className="flex justify-between py-0.5"><dt className="text-ink-3">IGST / CGST+SGST @ 18%</dt><dd className="tabular">{formatINR(gst)}</dd></div>
          <div className="mt-1 flex justify-between border-t border-line pt-1.5 font-semibold"><dt>Total</dt><dd className="tabular">{formatINR(amt + gst)}</dd></div>
        </dl>
      </div>
    </Dialog>
  );
}
