"use client";

import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { Banner } from "@/components/erp/form-view";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { partyById } from "@/lib/data/masters";
import { balanceDue, type Invoice, invTotals, isOverdue, payStatus, useFinance } from "@/lib/store/finance";
import { cn, daysBetween, formatDate, formatINR, formatLakh, TODAY } from "@/lib/utils";

export default function InvoicesPage() {
  const invoices = useFinance((s) => s.invoices);
  const retry = useFinance((s) => s.retryIrn);
  const failed = invoices.filter((i) => i.irnStatus === "irn_failed");

  const columns: Column<Invoice>[] = [
    { key: "number", header: "Number", value: (r) => r.number, cell: (r) => <span className="font-mono text-[12.5px] font-medium">{r.number}</span> },
    { key: "date", header: "Date", value: (r) => r.date, cell: (r) => formatDate(r.date) },
    {
      key: "customer",
      header: "Customer",
      value: (r) => partyById(r.customerId).name,
      cell: (r) => (
        <div>
          <div className="font-medium">{partyById(r.customerId).name}</div>
          <div className="text-xs text-ink-3">{r.soNumber}</div>
        </div>
      ),
    },
    { key: "taxable", header: "Taxable", align: "right", value: (r) => invTotals(r).taxable, cell: (r) => formatINR(invTotals(r).taxable), total: (rows) => formatLakh(rows.reduce((a, r) => a + invTotals(r).taxable, 0)) },
    {
      key: "gst",
      header: "GST",
      align: "right",
      value: (r) => invTotals(r).tax,
      cell: (r) => (
        <span title={invTotals(r).interstate ? "IGST" : "CGST + SGST"}>
          {formatINR(invTotals(r).tax)}
          <span className="ml-1 text-2xs text-ink-3">{invTotals(r).interstate ? "I" : "C+S"}</span>
        </span>
      ),
    },
    { key: "total", header: "Total", align: "right", value: (r) => invTotals(r).total, cell: (r) => <span className="font-medium">{formatINR(invTotals(r).total)}</span>, total: (rows) => formatLakh(rows.reduce((a, r) => a + invTotals(r).total, 0)) },
    {
      key: "due",
      header: "Due",
      value: (r) => r.dueDate,
      cell: (r) => {
        const late = isOverdue(r);
        return <span className={cn(late && "font-medium text-danger")}>{formatDate(r.dueDate)}{late && <span className="ml-1 text-xs">({daysBetween(r.dueDate, TODAY)}d)</span>}</span>;
      },
    },
    { key: "irn", header: "e-Invoice", value: (r) => r.irnStatus, cell: (r) => <StatusBadge status={r.irnStatus} /> },
    { key: "pay", header: "Payment", value: (r) => payStatus(r), cell: (r) => (r.status === "draft" ? <StatusBadge status="draft" /> : r.status === "cancelled" ? <StatusBadge status="cancelled" /> : <StatusBadge status={payStatus(r)} />) },
  ];

  return (
    <ListPage
      title="Invoices"
      subtitle="GST tax invoices — numbered per FY series, immutable once posted"
      stats={[
        { label: "Receivable", value: formatLakh(invoices.filter((r) => r.status === "posted").reduce((a, r) => a + balanceDue(r), 0)), hint: `${invoices.filter((r) => r.status === "posted" && payStatus(r) !== "paid").length} unpaid invoices`, filter: "unpaid" },
        { label: "Overdue", value: formatLakh(invoices.filter(isOverdue).reduce((a, r) => a + balanceDue(r), 0)), hint: `${invoices.filter(isOverdue).length} invoices past due`, tone: "danger", filter: "overdue" },
        { label: "IRN failed", value: invoices.filter((r) => r.irnStatus === "irn_failed").length, hint: "Auto-retry with backoff", tone: "danger", filter: "failed" },
        { label: "IRN pending", value: invoices.filter((r) => r.irnStatus === "irn_pending").length, hint: "Queued at GSP", tone: "warning", filter: "pending" },
      ]}
      crumbs={[{ label: "Finance & GST", href: "/finance/invoices" }, { label: "Invoices" }]}
      rows={invoices}
      columns={columns}
      search={(r) => `${r.number} ${partyById(r.customerId).name} ${r.soNumber} ${r.dcNumber} ${r.irn ?? ""}`}
      placeholder="Search invoice, customer, order, IRN…"
      href={(r) => `/finance/invoices/${r.id}`}
      onNew={() => toast("Invoices are created from delivery challans", { description: "Sales → Delivery challans → Create invoice" })}
      banner={
        failed.length > 0 ? (
          <Banner
            tone="danger"
            action={
              <Button size="sm" onClick={() => { failed.forEach((f) => retry(f.id)); toast.success(`Retrying ${failed.length} IRN request(s)`); }}>
                <RefreshCw /> Retry now
              </Button>
            }
          >
            {failed.length} invoice{failed.length > 1 ? "s" : ""} could not get an IRN ({failed.map((f) => f.number).join(", ")}). Auto-retry is on; do not dispatch without the signed QR.
          </Banner>
        ) : null
      }
      filters={[
        { key: "failed", label: "IRN failed", group: "irn", test: (r) => r.irnStatus === "irn_failed" },
        { key: "pending", label: "IRN pending", group: "irn", test: (r) => r.irnStatus === "irn_pending" },
        { key: "unpaid", label: "Unpaid", group: "pay", test: (r) => r.status === "posted" && payStatus(r) !== "paid" },
        { key: "overdue", label: "Overdue", group: "pay", test: isOverdue },
        { key: "draft", label: "Drafts", group: "state", test: (r) => r.status === "draft" },
        { key: "igst", label: "Inter-state (IGST)", group: "tax", test: (r) => invTotals(r).interstate },
      ]}
      groups={[
        { key: "customer", label: "Customer", by: (r) => partyById(r.customerId).name },
        { key: "month", label: "Month", by: (r) => r.date.slice(0, 7) },
        { key: "pay", label: "Payment status", by: (r) => payStatus(r).replace("_", " ") },
      ]}
      bulkActions={[
        {
          label: "Send payment reminder",
          run: (rows) => {
            const due = rows.filter((r) => r.status === "posted" && balanceDue(r) > 0);
            toast.success(`WhatsApp reminders queued for ${due.length} invoice(s)`, { description: "Uses the approved 'payment_due' template" });
          },
        },
      ]}
    />
  );
}
