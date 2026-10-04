"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Dialog } from "@/components/ui/overlay";
import { parties, partyById } from "@/lib/data/masters";
import { balanceDue, type Invoice, type PayMode, invTotals, useFinance } from "@/lib/store/finance";
import { cn, formatDate, formatINR, TODAY } from "@/lib/utils";

const MODES: PayMode[] = ["NEFT", "RTGS", "UPI", "Cheque", "Cash"];
const BANKS = ["HDFC Bank ··4417", "ICICI Bank ··0921", "Cash in hand"];

/** Record a customer receipt with allocation against open invoices (oldest first). */
export function ReceiptDialog({
  open,
  onOpenChange,
  customerId: fixedCustomer,
  invoiceNumber,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customerId?: string;
  invoiceNumber?: string;
}) {
  const invoices = useFinance((s) => s.invoices);
  const record = useFinance((s) => s.recordReceipt);
  const [customerId, setCustomerId] = React.useState(fixedCustomer ?? "");
  const [amount, setAmount] = React.useState(0);
  const [mode, setMode] = React.useState<PayMode>("NEFT");
  const [bank, setBank] = React.useState(BANKS[0]);
  const [reference, setReference] = React.useState("");
  const [date, setDate] = React.useState(TODAY);
  const [alloc, setAlloc] = React.useState<Record<string, number>>({});
  const [err, setErr] = React.useState("");

  const openInv = invoices
    .filter((i) => i.customerId === customerId && i.status === "posted" && balanceDue(i) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  const [wasOpen, setWasOpen] = React.useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setCustomerId(fixedCustomer ?? "");
      setErr("");
      setReference("");
      setMode("NEFT");
      setDate(TODAY);
      const inv = invoices.find((i) => i.number === invoiceNumber);
      if (inv) {
        setAmount(balanceDue(inv));
        setAlloc({ [inv.number]: balanceDue(inv) });
      } else {
        setAmount(0);
        setAlloc({});
      }
    }
  }

  const autoAllocate = (amt: number, list: Invoice[] = openInv) => {
    let left = amt;
    const a: Record<string, number> = {};
    list.forEach((i) => {
      const take = Math.min(left, balanceDue(i));
      if (take > 0) a[i.number] = Math.round(take * 100) / 100;
      left -= take;
    });
    setAlloc(a);
  };

  const allocated = Object.values(alloc).reduce((x, y) => x + (y || 0), 0);
  const unallocated = amount - allocated;

  const submit = () => {
    if (!customerId) return setErr("Select a customer");
    if (amount <= 0) return setErr("Enter an amount greater than zero");
    if (allocated - amount > 0.5) return setErr(`Allocated ${formatINR(allocated)} exceeds the receipt amount ${formatINR(amount)}`);
    const over = openInv.find((i) => (alloc[i.number] ?? 0) - balanceDue(i) > 0.5);
    if (over) return setErr(`Allocation on ${over.number} exceeds its balance ${formatINR(balanceDue(over))}`);
    if (mode !== "Cash" && !reference.trim()) return setErr("Enter the UTR / UPI / cheque reference");
    const pay = record({
      date,
      partyId: customerId,
      amount,
      mode,
      bank,
      reference: reference.trim() || "Cash",
      allocations: Object.entries(alloc).filter(([, v]) => v > 0).map(([doc, v]) => ({ doc, amount: v })),
    });
    toast.success(`Receipt ${pay.number} posted`, {
      description: `${formatINR(amount)} from ${partyById(customerId).name}${unallocated > 0.5 ? ` · ${formatINR(unallocated)} kept as advance` : ""}`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record receipt"
      description="Allocate against open invoices — oldest first by default. Posts Bank Dr / Customer Cr."
      size="lg"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Post receipt</Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Customer" required layout="vertical" htmlFor="rc-cust">
          <Select id="rc-cust" value={customerId} disabled={!!fixedCustomer} onChange={(e) => { setCustomerId(e.target.value); setAlloc({}); }}>
            <option value="">Select customer…</option>
            {parties.filter((p) => p.type.includes("customer")).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Amount (₹)" required layout="vertical" htmlFor="rc-amt">
          <Input id="rc-amt" type="number" min={0} className="text-right" value={amount || ""} onChange={(e) => { const v = Number(e.target.value); setAmount(v); autoAllocate(v); }} />
        </Field>
        <Field label="Date" layout="vertical" htmlFor="rc-date">
          <Input id="rc-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Mode" layout="vertical" htmlFor="rc-mode">
          <Select id="rc-mode" value={mode} onChange={(e) => setMode(e.target.value as PayMode)}>
            {MODES.map((m) => <option key={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label="Deposited to" layout="vertical" htmlFor="rc-bank">
          <Select id="rc-bank" value={bank} onChange={(e) => setBank(e.target.value)}>
            {BANKS.map((b) => <option key={b}>{b}</option>)}
          </Select>
        </Field>
        <Field label="Reference (UTR / UPI / cheque)" required={mode !== "Cash"} layout="vertical" htmlFor="rc-ref">
          <Input id="rc-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR HDFCN2627…" />
        </Field>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Allocate to invoices</h3>
        <Button size="xs" variant="subtle" onClick={() => autoAllocate(amount)} disabled={!openInv.length}>Auto-allocate oldest first</Button>
      </div>
      {customerId ? (
        openInv.length ? (
          <table className="mt-2 w-full text-sm">
            <thead className="text-xs text-ink-3">
              <tr className="border-b border-line">
                <th className="py-1.5 text-left font-medium">Invoice</th>
                <th className="py-1.5 text-left font-medium">Due</th>
                <th className="py-1.5 text-right font-medium">Balance</th>
                <th className="w-36 py-1.5 text-right font-medium">Allocate</th>
              </tr>
            </thead>
            <tbody>
              {openInv.map((i) => (
                <tr key={i.id} className="border-b border-line">
                  <td className="py-1.5 font-mono text-xs">{i.number}</td>
                  <td className={cn("py-1.5", i.dueDate < TODAY && "text-danger")}>{formatDate(i.dueDate)}</td>
                  <td className="tabular py-1.5 text-right">{formatINR(balanceDue(i))}</td>
                  <td className="py-1.5 pl-3">
                    <Input type="number" min={0} className="h-7 text-right" aria-label={`Allocate to ${i.number}`} value={alloc[i.number] || ""} onChange={(e) => setAlloc((a) => ({ ...a, [i.number]: Number(e.target.value) }))} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-sm">
                <td colSpan={3} className="py-2 text-right text-ink-3">Allocated</td>
                <td className="tabular py-2 text-right font-semibold">{formatINR(allocated)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="text-right text-xs text-ink-3">Unallocated (advance)</td>
                <td className={cn("tabular text-right text-xs", unallocated < -0.5 ? "font-medium text-danger" : "text-ink-2")}>{formatINR(unallocated)}</td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <p className="mt-2 text-sm text-ink-3">No open invoices. The receipt will be recorded as an advance.</p>
        )
      ) : (
        <p className="mt-2 text-sm text-ink-3">Select a customer to see open invoices.</p>
      )}
      {err && <p className="mt-3 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{err}</p>}
    </Dialog>
  );
}

/** Generate an e-way bill for a posted invoice. */
export function EwayDialog({ inv, open, onOpenChange }: { inv: Invoice; open: boolean; onOpenChange: (o: boolean) => void }) {
  const gen = useFinance((s) => s.generateEway);
  const [vehicle, setVehicle] = React.useState(inv.vehicle);
  const [distance, setDistance] = React.useState(0);
  const [transporter, setTransporter] = React.useState("Own vehicle");
  const [err, setErr] = React.useState("");
  const [wasOpen, setWasOpen] = React.useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setVehicle(inv.vehicle);
      setDistance(partyById(inv.customerId).stateCode === "27" ? 35 : 840);
      setErr("");
    }
  }
  const value = invTotals(inv).total;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Generate e-way bill"
      description={`Part A from ${inv.number}; Part B needs the vehicle. Value ${formatINR(value)}.`}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!/^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{0,3}\s?\d{3,4}$/i.test(vehicle.trim())) return setErr("Enter a valid vehicle number, e.g. MH14 GU 4471");
              if (distance <= 0 || distance > 4000) return setErr("Approximate distance must be between 1 and 4,000 km");
              const n = gen(inv.id, vehicle.toUpperCase(), distance);
              toast.success(`e-Way bill ${n} generated`, { description: "Via GSP · validity from distance" });
              onOpenChange(false);
            }}
          >
            Generate
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Vehicle number" required layout="vertical" htmlFor="ew-v">
          <Input id="ew-v" value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="MH14 GU 4471" />
        </Field>
        <Field label="Distance (km)" required layout="vertical" htmlFor="ew-d" hint="Validity: 1 day per 200 km">
          <Input id="ew-d" type="number" value={distance || ""} onChange={(e) => setDistance(Number(e.target.value))} />
        </Field>
        <Field label="Transporter" layout="vertical" htmlFor="ew-t">
          <Select id="ew-t" value={transporter} onChange={(e) => setTransporter(e.target.value)}>
            <option>Own vehicle</option>
            <option>VRL Logistics</option>
            <option>Gati Ltd</option>
          </Select>
        </Field>
        <Field label="Supply type" layout="vertical">
          <div className="pt-1.5 text-sm">Outward · Supply</div>
        </Field>
      </div>
      {err && <p className="mt-3 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{err}</p>}
    </Dialog>
  );
}
