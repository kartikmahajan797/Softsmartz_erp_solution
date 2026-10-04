"use client";

import Link from "next/link";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Download,
  FileMinus,
  IndianRupee,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Printer,
  RefreshCw,
  Truck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Banner, Card, FormPage, StatusBar } from "@/components/erp/form-view";
import { InvoiceDocument } from "@/components/finance/invoice-document";
import { EwayDialog, ReceiptDialog } from "@/components/finance/dialogs";
import { CreditNoteDialog } from "@/components/finance/credit-note-dialog";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/form";
import { Dialog, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/overlay";
import { partyById } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { balanceDue, invTotals, payStatus, useFinance } from "@/lib/store/finance";
import { cn, formatDate, formatDateTime, formatINR } from "@/lib/utils";

const STEPS = [
  { key: "draft", label: "Draft" },
  { key: "posted", label: "Posted" },
  { key: "irn", label: "IRN" },
  { key: "paid", label: "Paid" },
];

const toneDot = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-ink-3",
};

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const role = useRole();
  const inv = useFinance((s) => s.invoices.find((i) => i.id === id));
  const payments = useFinance((s) => s.payments);
  const { postInvoice, retryIrn, cancelIrn } = useFinance.getState();
  const [receipt, setReceipt] = React.useState(false);
  const [eway, setEway] = React.useState(false);
  const [cancel, setCancel] = React.useState(false);
  const [cn_, setCn] = React.useState(false);
  const [reason, setReason] = React.useState("Data entry mistake");

  if (!inv) {
    return (
      <div className="p-10 text-center text-sm text-ink-3">
        Invoice not found. <Link href="/finance/invoices" className="text-primary-700 underline">Back to invoices</Link>
      </div>
    );
  }

  const t = invTotals(inv);
  const party = partyById(inv.customerId);
  const pay = payStatus(inv);
  const due = balanceDue(inv);
  const linked = payments.filter((p) => p.allocations.some((a) => a.doc === inv.number));
  const ackHours = inv.ackDate ? (Date.parse("2026-10-02T14:00:00") - Date.parse(inv.ackDate)) / 36e5 : 99;
  const canCancelIrn = inv.irnStatus === "irn_generated" && ackHours < 24;
  const current = inv.status === "draft" ? "draft" : pay === "paid" ? "paid" : inv.irnStatus === "irn_generated" ? "irn" : "posted";
  const pending = inv.irnStatus === "irn_pending";

  const actions = (
    <>
      {inv.status === "draft" && (
        <Button
          variant="primary"
          onClick={() => {
            postInvoice(inv.id);
            toast.success(`${inv.number} posted`, { description: "Number locked · requesting IRN from GSP" });
          }}
        >
          Post invoice
        </Button>
      )}
      {(inv.irnStatus === "irn_failed" || pending) && (
        <Button
          variant="primary"
          disabled={pending}
          onClick={() => {
            retryIrn(inv.id);
            toast("Retrying IRN request…", { description: `Attempt ${inv.attempts + 1}` });
          }}
        >
          {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />} {pending ? "Waiting for IRP…" : "Retry IRN"}
        </Button>
      )}
      {inv.status === "posted" && !inv.ewayBill && inv.irnStatus === "irn_generated" && (
        <Button onClick={() => setEway(true)}><Truck /> e-Way bill</Button>
      )}
      {inv.status === "posted" && due > 0 && role.seesCost && (
        <Button variant={inv.irnStatus === "irn_generated" ? "primary" : "secondary"} onClick={() => setReceipt(true)}>
          <IndianRupee /> Record payment
        </Button>
      )}
      <Button onClick={() => toast.success("PDF generated", { description: `${inv.number}.pdf · branded template` })}><Printer /> Print</Button>
      <Menu>
        <MenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More actions"><MoreHorizontal /></Button>
        </MenuTrigger>
        <MenuContent align="start">
          <MenuItem icon={<MessageCircle />} onSelect={() => toast.success(`Invoice sent on WhatsApp to ${party.contact}`, { description: `${party.phone} · PDF + payment link` })}>Send on WhatsApp</MenuItem>
          <MenuItem icon={<Download />} onSelect={() => toast.success("e-Invoice JSON downloaded")}>Download e-invoice JSON</MenuItem>
          <MenuSeparator />
          <MenuItem icon={<FileMinus />} disabled={inv.status !== "posted"} onSelect={() => setCn(true)}>Create credit note</MenuItem>
          <MenuItem icon={<Ban />} danger disabled={!canCancelIrn} onSelect={() => setCancel(true)}>
            Cancel IRN {canCancelIrn ? "(within 24 h)" : "(window closed)"}
          </MenuItem>
        </MenuContent>
      </Menu>
    </>
  );

  return (
    <FormPage
      crumbs={[{ label: "Finance & GST", href: "/finance/invoices" }, { label: "Invoices", href: "/finance/invoices" }, { label: inv.number }]}
      actions={actions}
      status={inv.status === "cancelled" ? <StatusBadge status="cancelled" /> : <StatusBar steps={STEPS} current={current} />}
      banner={
        inv.irnStatus === "irn_failed" ? (
          <Banner tone="danger" icon={<AlertTriangle />}>
            IRN request failed after {inv.attempts} attempts: {inv.lastError}. The invoice is in the retry queue — goods should not leave without the signed QR.
          </Banner>
        ) : inv.status === "draft" ? (
          <Banner tone="info" icon={<Clock />}>
            Draft — editable until posted. Posting locks the number from the FY series and requests an IRN (e-invoice applicable to this GSTIN).
          </Banner>
        ) : inv.status === "posted" ? (
          <Banner tone="success" icon={<CheckCircle2 />}>
            Posted invoices are read-only. Corrections go through a credit or debit note.
          </Banner>
        ) : null
      }
      chatter={
        <div className="space-y-4">
          <Card title="Summary" bodyClassName="space-y-2 text-sm">
            <Line k="Customer" v={<Link href="/sales/customers" className="text-primary-700 hover:underline">{party.name}</Link>} />
            <Line k="Total" v={<span className="tabular font-semibold">{formatINR(t.total)}</span>} />
            <Line k="Paid" v={<span className="tabular">{formatINR(inv.paid)}</span>} />
            <Line k="Balance due" v={<span className={cn("tabular font-semibold", due > 0 ? "text-danger" : "text-success")}>{formatINR(due)}</span>} />
            <Line k="Payment" v={inv.status === "posted" ? <StatusBadge status={pay} /> : "—"} />
            <Line k="e-Invoice" v={<StatusBadge status={inv.irnStatus} />} />
            {inv.ewayBill && <Line k="e-Way bill" v={<span className="font-mono text-xs">{inv.ewayBill}</span>} />}
          </Card>

          <Card title="e-Invoice timeline" bodyClassName="pt-3">
            <ol className="relative ml-1.5 border-l border-line">
              {inv.timeline.map((e, i) => (
                <li key={i} className="relative pb-3 pl-4 last:pb-0">
                  <span className={cn("absolute top-1 -left-[5px] size-2.5 rounded-full ring-2 ring-surface", toneDot[e.tone])} />
                  <div className="text-sm font-medium">{e.label}</div>
                  {e.detail && <div className="text-xs text-ink-2">{e.detail}</div>}
                  <div className="text-2xs text-ink-3">{formatDateTime(e.at)}</div>
                </li>
              ))}
              {pending && (
                <li className="relative pl-4">
                  <Loader2 className="absolute top-0.5 -left-[7px] size-3.5 animate-spin bg-surface text-warning" />
                  <div className="text-sm text-ink-2">Waiting for IRP response…</div>
                </li>
              )}
            </ol>
          </Card>

          <Card title="Payments" bodyClassName="p-0">
            {linked.length ? (
              <ul>
                {linked.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 border-b border-line px-4 py-2 text-sm last:border-0">
                    <span className="font-mono text-xs">{p.number}</span>
                    <span className="text-xs text-ink-3">{formatDate(p.date)} · {p.mode}</span>
                    <span className="tabular ml-auto font-medium">{formatINR(p.allocations.find((a) => a.doc === inv.number)!.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-3 text-sm text-ink-3">No payments yet.</p>
            )}
          </Card>
        </div>
      }
    >
      <InvoiceDocument inv={inv} />

      <ReceiptDialog open={receipt} onOpenChange={setReceipt} customerId={inv.customerId} invoiceNumber={inv.number} />
      <EwayDialog inv={inv} open={eway} onOpenChange={setEway} />
      <CreditNoteDialog open={cn_} onOpenChange={setCn} invoiceNumber={inv.number} />
      <Dialog
        open={cancel}
        onOpenChange={setCancel}
        title={`Cancel IRN for ${inv.number}?`}
        description="Cancellation is reported to the IRP and cannot be undone. The invoice number cannot be reused."
        size="sm"
        footer={
          <>
            <Button onClick={() => setCancel(false)}>Keep</Button>
            <Button
              variant="danger"
              onClick={() => {
                cancelIrn(inv.id, reason);
                setCancel(false);
                toast("IRN cancelled", { description: reason });
                router.refresh();
              }}
            >
              <XCircle /> Cancel IRN
            </Button>
          </>
        }
      >
        <Field label="Reason" layout="vertical" htmlFor="cr">
          <Select id="cr" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option>Data entry mistake</option>
            <option>Duplicate</option>
            <option>Order cancelled</option>
            <option>Others</option>
          </Select>
        </Field>
      </Dialog>
    </FormPage>
  );
}

function Line({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-3">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
