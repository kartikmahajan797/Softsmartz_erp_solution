"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Dialog } from "@/components/ui/overlay";
import { itemById, partyById } from "@/lib/data/masters";
import { type Note, invTotals, useFinance } from "@/lib/store/finance";
import { formatINR } from "@/lib/utils";

/** New credit / debit note against a posted invoice (FR-FI-02). */
export function CreditNoteDialog({
  open,
  onOpenChange,
  invoiceNumber,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  invoiceNumber?: string;
}) {
  const allInvoices = useFinance((s) => s.invoices);
  const invoices = allInvoices.filter((i) => i.status === "posted");
  const addNote = useFinance((s) => s.addNote);
  const [type, setType] = React.useState<"credit" | "debit">("credit");
  const [invNo, setInvNo] = React.useState(invoiceNumber ?? "");
  const [reason, setReason] = React.useState<Note["reason"]>("Sales return");
  const [qty, setQty] = React.useState(0);
  const [rateDiff, setRateDiff] = React.useState(0);
  const [remarks, setRemarks] = React.useState("");
  const [err, setErr] = React.useState("");

  const [wasOpen, setWasOpen] = React.useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setInvNo(invoiceNumber ?? "");
      setType("credit");
      setReason("Sales return");
      setQty(0);
      setRateDiff(0);
      setErr("");
      setRemarks("");
    }
  }

  const inv = invoices.find((i) => i.number === invNo);
  const line = inv?.lines[0];
  const item = line ? itemById(line.itemId) : undefined;
  const taxable =
    line && item ? (reason === "Sales return" || reason === "Short supply" ? qty * line.rate * (1 - line.discountPct / 100) : rateDiff * line.qty) : 0;
  const gst = item ? (taxable * item.gstRate) / 100 : 0;

  const submit = () => {
    if (!inv || !line) return setErr("Select a posted invoice");
    if (reason === "Sales return" || reason === "Short supply") {
      if (qty <= 0 || qty > line.qty) return setErr(`Quantity must be between 1 and ${line.qty}`);
    } else if (rateDiff <= 0 || rateDiff >= line.rate) return setErr(`Rate difference must be between ₹0 and ₹${line.rate}`);
    if (taxable + gst > invTotals(inv).total) return setErr("Note value cannot exceed the invoice value");
    const n = addNote({ type, date: "2026-10-02", partyId: inv.customerId, invoiceNumber: inv.number, reason, taxable, gst });
    toast.success(`${n.number} posted`, {
      description: `${formatINR(taxable + gst)} against ${inv.number}${reason === "Sales return" ? " · goods received into QC Hold" : ""} · IRN requested`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={type === "credit" ? "New credit note" : "New debit note"}
      description="Posted invoices are never edited — corrections are notes linked to the original invoice."
      size="lg"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Post note</Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type" layout="vertical" htmlFor="cn-type">
          <Select id="cn-type" value={type} onChange={(e) => { const t = e.target.value as "credit" | "debit"; setType(t); setReason(t === "credit" ? "Sales return" : "Price escalation"); }}>
            <option value="credit">Credit note (reduce)</option>
            <option value="debit">Debit note (increase)</option>
          </Select>
        </Field>
        <Field label="Against invoice" required layout="vertical" htmlFor="cn-inv">
          <Select id="cn-inv" value={invNo} onChange={(e) => setInvNo(e.target.value)}>
            <option value="">Select invoice…</option>
            {invoices.map((i) => (
              <option key={i.id} value={i.number}>{i.number} · {partyById(i.customerId).name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Reason" layout="vertical" htmlFor="cn-r">
          <Select id="cn-r" value={reason} onChange={(e) => setReason(e.target.value as Note["reason"])}>
            {type === "credit" ? (
              <>
                <option>Sales return</option>
                <option>Rate difference</option>
                <option>Short supply</option>
              </>
            ) : (
              <option>Price escalation</option>
            )}
          </Select>
        </Field>
        {reason === "Sales return" || reason === "Short supply" ? (
          <Field label={`Quantity${line ? ` (max ${line.qty})` : ""}`} required layout="vertical" htmlFor="cn-q">
            <Input id="cn-q" type="number" min={0} className="text-right" value={qty || ""} onChange={(e) => setQty(Number(e.target.value))} />
          </Field>
        ) : (
          <Field label="Rate difference per unit (₹)" required layout="vertical" htmlFor="cn-rd">
            <Input id="cn-rd" type="number" min={0} className="text-right" value={rateDiff || ""} onChange={(e) => setRateDiff(Number(e.target.value))} />
          </Field>
        )}
        <Field label="Remarks" layout="vertical" htmlFor="cn-rm" className="sm:col-span-2">
          <Textarea id="cn-rm" className="min-h-14" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. 12 pcs rejected at customer incoming inspection" />
        </Field>
      </div>
      {inv && item && (
        <div className="mt-4 rounded-lg border border-line bg-surface-2 p-3 text-sm">
          <div className="flex justify-between"><span className="text-ink-3">Item</span><span>{item.name} · HSN {item.hsn}</span></div>
          <div className="flex justify-between"><span className="text-ink-3">Taxable</span><span className="tabular">{formatINR(taxable)}</span></div>
          <div className="flex justify-between"><span className="text-ink-3">GST @{item.gstRate}% ({invTotals(inv).interstate ? "IGST" : "CGST+SGST"})</span><span className="tabular">{formatINR(gst)}</span></div>
          <div className="mt-1 flex justify-between border-t border-line pt-1 font-semibold"><span>Note value</span><span className="tabular">{formatINR(taxable + gst)}</span></div>
        </div>
      )}
      {err && <p className="mt-3 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{err}</p>}
    </Dialog>
  );
}
