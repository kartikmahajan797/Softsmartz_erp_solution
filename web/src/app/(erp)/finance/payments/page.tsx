"use client";

import * as React from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { ReceiptDialog } from "@/components/finance/dialogs";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Dialog, Sheet as SidePanel } from "@/components/ui/overlay";
import { parties, partyById } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { type PayMode, type Payment, useFinance } from "@/lib/store/finance";
import { useSettings } from "@/lib/store/settings";
import { cn, formatDate, formatINR, formatLakh, TODAY } from "@/lib/utils";

export default function PaymentsPage() {
  const role = useRole();
  const payments = useFinance((s) => s.payments);
  const approve = useFinance((s) => s.approvePayment);
  const [receipt, setReceipt] = React.useState(false);
  const [payOpen, setPayOpen] = React.useState(false);
  const [view, setView] = React.useState<Payment | null>(null);

  const columns: Column<Payment>[] = [
    { key: "number", header: "Number", value: (r) => r.number, cell: (r) => <span className="font-mono text-[12.5px] font-medium">{r.number}</span> },
    {
      key: "kind",
      header: "Type",
      value: (r) => r.kind,
      cell: (r) =>
        r.kind === "receipt" ? (
          <span className="inline-flex items-center gap-1 text-success"><ArrowDownLeft className="size-3.5" /> Receipt</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-danger"><ArrowUpRight className="size-3.5" /> Payment</span>
        ),
    },
    { key: "date", header: "Date", value: (r) => r.date, cell: (r) => formatDate(r.date) },
    {
      key: "party",
      header: "Party",
      value: (r) => partyById(r.partyId).name,
      cell: (r) => (
        <span className="flex items-center gap-1.5 font-medium">
          {partyById(r.partyId).name}
          {partyById(r.partyId).msme && <Badge tone="brand" dot={false} className="h-[18px] px-1.5 text-2xs">MSME</Badge>}
        </span>
      ),
    },
    { key: "mode", header: "Mode", value: (r) => r.mode, cell: (r) => r.mode },
    { key: "bank", header: "Bank", value: (r) => r.bank, cell: (r) => <span className="text-ink-2">{r.bank}</span> },
    { key: "ref", header: "Reference", value: (r) => r.reference, cell: (r) => <span className="font-mono text-xs text-ink-2">{r.reference}</span> },
    { key: "alloc", header: "Against", sortable: false, cell: (r) => <span className="font-mono text-xs">{r.allocations.map((a) => a.doc).join(", ") || "Advance"}</span> },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      value: (r) => r.amount,
      cell: (r) => <span className={cn("font-medium", r.kind === "receipt" ? "text-success" : "text-ink")}>{formatINR(r.amount)}</span>,
      total: (rows) => {
        const net = rows.reduce((a, r) => a + (r.kind === "receipt" ? r.amount : -r.amount), 0);
        return <span title="Receipts − payments">{formatLakh(net)} net</span>;
      },
    },
    { key: "status", header: "Status", value: (r) => r.status, cell: (r) => <StatusBadge status={r.status} /> },
  ];

  if (!role.seesCost) {
    return <div className="p-10 text-center text-sm text-ink-3">Your role does not have access to receipts and payments.</div>;
  }

  return (
    <>
      <ListPage
        title="Receipts & payments"
        crumbs={[{ label: "Finance & GST", href: "/finance/invoices" }, { label: "Receipts & payments" }]}
        rows={payments}
        columns={columns}
        search={(r) => `${r.number} ${partyById(r.partyId).name} ${r.reference} ${r.allocations.map((a) => a.doc).join(" ")}`}
        placeholder="Search number, party, UTR, invoice…"
        onNew={() => setReceipt(true)}
        newLabel="Record receipt"
        extraActions={<Button onClick={() => setPayOpen(true)}>Record payment</Button>}
        onRowClick={setView}
        filters={[
          { key: "r", label: "Receipts", group: "k", test: (r) => r.kind === "receipt" },
          { key: "p", label: "Payments", group: "k", test: (r) => r.kind === "payment" },
          { key: "today", label: "Today", group: "d", test: (r) => r.date === TODAY },
          { key: "appr", label: "Waiting approval", group: "s", test: (r) => r.status === "pending_approval" },
        ]}
        groups={[
          { key: "party", label: "Party", by: (r) => partyById(r.partyId).name },
          { key: "mode", label: "Mode", by: (r) => r.mode },
          { key: "date", label: "Date", by: (r) => formatDate(r.date) },
        ]}
      />

      <ReceiptDialog open={receipt} onOpenChange={setReceipt} />
      <PaymentDialog open={payOpen} onOpenChange={setPayOpen} />

      <SidePanel open={!!view} onOpenChange={(o) => !o && setView(null)} title={<span className="font-mono">{view?.number}</span>} width={440}
        footer={
          view?.status === "pending_approval" && role.approves ? (
            <Button variant="primary" onClick={() => { approve(view.id); toast.success(`${view.number} approved`, { description: "Released for bank upload" }); setView(null); }}>
              Approve payment
            </Button>
          ) : undefined
        }
      >
        {view && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <StatusBadge status={view.status} />
              <span className="tabular text-xl font-semibold">{formatINR(view.amount)}</span>
            </div>
            <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-sm">
              <dt className="text-ink-3">Party</dt><dd className="font-medium">{partyById(view.partyId).name}</dd>
              <dt className="text-ink-3">Date</dt><dd>{formatDate(view.date)}</dd>
              <dt className="text-ink-3">Mode</dt><dd>{view.mode}</dd>
              <dt className="text-ink-3">Bank</dt><dd>{view.bank}</dd>
              <dt className="text-ink-3">Reference</dt><dd className="font-mono text-xs">{view.reference}</dd>
            </dl>
            <div>
              <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-ink-3 uppercase">Allocation</h3>
              <ul className="divide-y divide-line rounded-lg border border-line text-sm">
                {view.allocations.map((a) => (
                  <li key={a.doc} className="flex justify-between px-3 py-2"><span className="font-mono text-xs">{a.doc}</span><span className="tabular">{formatINR(a.amount)}</span></li>
                ))}
              </ul>
            </div>
            <p className="rounded-md bg-surface-3 px-3 py-2 text-xs text-ink-2">
              Ledger: {view.kind === "receipt" ? `${view.bank} Dr / ${partyById(view.partyId).name} Cr` : `${partyById(view.partyId).name} Dr / ${view.bank} Cr`}
            </p>
          </div>
        )}
      </SidePanel>
    </>
  );
}

function PaymentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const record = useFinance((s) => s.recordPayment);
  const rules = useSettings((s) => s.rules);
  const limit = rules.find((r) => r.docType === "Vendor payment" && r.active)?.threshold ?? Infinity;
  const vendors = parties.filter((p) => p.type.includes("vendor"));
  const [partyId, setPartyId] = React.useState("");
  const [amount, setAmount] = React.useState(0);
  const [mode, setMode] = React.useState<PayMode>("NEFT");
  const [bill, setBill] = React.useState("");
  const [err, setErr] = React.useState("");
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setPartyId(""); setAmount(0); setMode("NEFT"); setBill(""); setErr(""); }
  }
  const vendor = partyId ? partyById(partyId) : undefined;
  const needsApproval = amount > limit;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record vendor payment"
      description="Posts Vendor Dr / Bank Cr. Payments above the approval limit wait for the Owner."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!vendor) return setErr("Select a vendor");
              if (amount <= 0) return setErr("Enter an amount");
              if (amount > vendor.outstanding && vendor.outstanding > 0) return setErr(`Amount exceeds payable of ${formatINR(vendor.outstanding)}`);
              const p = record({ date: TODAY, partyId, amount, mode, bank: "HDFC Bank ··4417", reference: "—", allocations: bill ? [{ doc: bill, amount }] : [] }, needsApproval);
              toast.success(needsApproval ? `${p.number} sent for approval` : `${p.number} posted`, { description: needsApproval ? `Above ${formatINR(limit)} limit (FR-PL-04)` : vendor.name });
              onOpenChange(false);
            }}
          >
            {needsApproval ? "Submit for approval" : "Post payment"}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Vendor" required layout="vertical" htmlFor="vp-v">
          <Select id="vp-v" value={partyId} onChange={(e) => setPartyId(e.target.value)}>
            <option value="">Select vendor…</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}{v.msme ? " (MSME)" : ""}</option>)}
          </Select>
        </Field>
        <Field label="Amount (₹)" required layout="vertical" htmlFor="vp-a" hint={vendor ? `Payable ${formatINR(vendor.outstanding)}` : undefined}>
          <Input id="vp-a" type="number" className="text-right" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} />
        </Field>
        <Field label="Mode" layout="vertical" htmlFor="vp-m">
          <Select id="vp-m" value={mode} onChange={(e) => setMode(e.target.value as PayMode)}>
            {["NEFT", "RTGS", "UPI", "Cheque", "Cash"].map((m) => <option key={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label="Against bill" layout="vertical" htmlFor="vp-b">
          <Input id="vp-b" value={bill} onChange={(e) => setBill(e.target.value)} placeholder="PB/26-27/0287" />
        </Field>
      </div>
      {vendor?.msme && (
        <p className="mt-3 rounded-md bg-info-bg px-3 py-2 text-xs text-info">MSME supplier — pay within the agreed terms (max 45 days) to keep the expense deductible.</p>
      )}
      {needsApproval && <p className="mt-3 rounded-md bg-warning-bg px-3 py-2 text-xs text-warning">Above the {formatINR(limit)} limit — will be routed to the Owner for approval.</p>}
      {err && <p className="mt-3 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{err}</p>}
    </Dialog>
  );
}
