"use client";

import * as React from "react";
import Link from "next/link";
import { ClipboardCheck, FileMinus, PackageOpen, Printer, Truck, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { Chatter } from "@/components/erp/form-view";
import { ItemCell, PartyCell } from "@/components/inventory/shared";
import { KV, NoteBadge, Stepper, ToneBadge } from "@/components/returns/shared";
import type { Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Dialog, Sheet as SidePanel } from "@/components/ui/overlay";
import { itemById, partyById } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { useFinance } from "@/lib/store/finance";
import {
  DISPOSITIONS,
  type Disposition,
  RETURN_REASONS,
  returnValue,
  type SalesReturn,
  type SalesReturnLine,
  useReturns,
} from "@/lib/store/returns";
import { cn, formatDate, formatINR, formatLakh, formatNum, TODAY } from "@/lib/utils";

const STATUS: Record<string, { tone: Tone; label: string }> = {
  draft: { tone: "neutral", label: "Draft" },
  received: { tone: "warning", label: "In QC" },
  inspected: { tone: "info", label: "Inspected" },
  credited: { tone: "success", label: "Credited" },
  cancelled: { tone: "danger", label: "Cancelled" },
};

const STEPS = [
  { key: "draft", label: "Draft" },
  { key: "received", label: "Received" },
  { key: "inspected", label: "QC done" },
  { key: "credited", label: "Credited" },
];

const DISP_TONE: Record<Disposition, string> = {
  pending_qc: "text-warning",
  restock: "text-success",
  rework: "text-progress",
  scrap: "text-danger",
};

const qtyOf = (r: SalesReturn) => r.lines.reduce((a, l) => a + l.returnQty, 0);
const valueOf = (r: SalesReturn) => returnValue(r.lines, r.customerId).total;

export default function SalesReturnsPage() {
  const returns = useReturns((s) => s.sales);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const current = returns.find((r) => r.id === openId);

  const open = returns.filter((r) => ["draft", "received", "inspected"].includes(r.status));
  const pendingQc = returns.filter((r) => r.status === "received").reduce((a, r) => a + r.lines.filter((l) => l.disposition === "pending_qc").reduce((b, l) => b + l.returnQty, 0), 0);
  const awaitingCn = returns.filter((r) => r.status === "inspected");
  const monthValue = returns.filter((r) => r.date.slice(0, 7) >= "2026-09" && r.status !== "cancelled").reduce((a, r) => a + valueOf(r), 0);

  const columns: Column<SalesReturn>[] = [
    { key: "number", header: "Return", value: (r) => r.number, cell: (r) => <span className="font-mono text-[12.5px] font-medium whitespace-nowrap">{r.number}</span> },
    { key: "date", header: "Date", value: (r) => r.date, cell: (r) => <span className="whitespace-nowrap">{formatDate(r.date)}</span> },
    { key: "customer", header: "Customer", value: (r) => partyById(r.customerId).name, cell: (r) => <PartyCell id={r.customerId} /> },
    {
      key: "invoice",
      header: "Against",
      value: (r) => r.invoiceNumber,
      cell: (r) => (
        <div>
          <div className="font-mono text-xs">{r.invoiceNumber}</div>
          <div className="font-mono text-2xs text-ink-3">{r.dcNumber}</div>
        </div>
      ),
    },
    {
      key: "reason",
      header: "Main reason",
      value: (r) => r.lines[0]?.reason ?? "",
      cell: (r) => <span className="text-ink-2">{r.lines[0]?.reason}{r.lines.length > 1 && <span className="text-ink-3"> +{r.lines.length - 1}</span>}</span>,
    },
    { key: "qty", header: "Qty", align: "right", value: qtyOf, cell: (r) => formatNum(qtyOf(r)) },
    { key: "value", header: "Value", align: "right", cost: true, value: valueOf, cell: (r) => <span className="font-medium">{formatINR(valueOf(r))}</span>, total: (rows) => formatLakh(rows.reduce((a, r) => a + valueOf(r), 0)) },
    { key: "cn", header: "Credit note", value: (r) => r.creditNoteStatus, cell: (r) => <NoteBadge state={r.creditNoteStatus} number={r.creditNote} /> },
    { key: "status", header: "Status", value: (r) => r.status, cell: (r) => <ToneBadge map={STATUS} value={r.status} /> },
  ];

  return (
    <>
      <ListPage
        title="Sales returns"
        subtitle="Goods returned by customers — inspect, restock or scrap, then raise the credit note."
        crumbs={[{ label: "Sales", href: "/sales/orders" }, { label: "Sales returns" }]}
        rows={returns}
        columns={columns}
        search={(r) => `${r.number} ${r.invoiceNumber} ${r.dcNumber} ${partyById(r.customerId).name} ${r.lines.map((l) => l.reason).join(" ")}`}
        placeholder="Search return, invoice, customer, reason…"
        onNew={() => setCreating(true)}
        newLabel="New return"
        onRowClick={(r) => setOpenId(r.id)}
        stats={[
          { label: "Open returns", value: open.length, hint: `${formatNum(open.reduce((a, r) => a + qtyOf(r), 0))} units in process`, filter: "open" },
          { label: "Awaiting QC", value: `${formatNum(pendingQc)} nos`, hint: "Held in QC Hold (QCH)", tone: pendingQc ? "warning" : "default", filter: "qc" },
          { label: "Credit note pending", value: awaitingCn.length, hint: awaitingCn.length ? formatINR(awaitingCn.reduce((a, r) => a + valueOf(r), 0)) : "All credited", tone: awaitingCn.length ? "info" : "success", filter: "cn" },
          { label: "Returned since Sep", value: formatLakh(monthValue), hint: "Incl. GST, excl. cancelled" },
        ]}
        filters={[
          { key: "open", label: "Open", group: "s", test: (r) => ["draft", "received", "inspected"].includes(r.status) },
          { key: "qc", label: "Awaiting QC", group: "s", test: (r) => r.status === "received" },
          { key: "cn", label: "Credit note pending", group: "s", test: (r) => r.status === "inspected" },
          { key: "done", label: "Credited", group: "s", test: (r) => r.status === "credited" },
          { key: "scrap", label: "Has scrap", group: "d", test: (r) => r.lines.some((l) => l.disposition === "scrap") },
        ]}
        groups={[
          { key: "customer", label: "Customer", by: (r) => partyById(r.customerId).name },
          { key: "status", label: "Status", by: (r) => STATUS[r.status].label },
          { key: "reason", label: "Reason", by: (r) => r.lines[0]?.reason ?? "—" },
        ]}
        kanban={{
          columns: [
            { key: "draft", label: "Draft", tone: "bg-neutral" },
            { key: "received", label: "In QC", tone: "bg-warning" },
            { key: "inspected", label: "Inspected", tone: "bg-info" },
            { key: "credited", label: "Credited", tone: "bg-success" },
          ],
          columnOf: (r) => r.status,
          card: (r) => (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-medium">{r.number}</span>
                <span className="text-2xs text-ink-3">{formatDate(r.date)}</span>
              </div>
              <div className="text-sm font-medium">{partyById(r.customerId).name}</div>
              <div className="text-xs text-ink-3">{r.lines[0]?.reason}</div>
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-ink-2">{formatNum(qtyOf(r))} nos</span>
                <span className="tabular font-semibold">{formatINR(valueOf(r))}</span>
              </div>
            </div>
          ),
        }}
      />

      <SidePanel
        open={!!current}
        onOpenChange={(o) => !o && setOpenId(null)}
        width={680}
        title={current ? <span className="flex items-center gap-2"><Undo2 className="size-4 text-primary-600" /><span className="font-mono">{current.number}</span></span> : ""}
        footer={current && <ReturnActions r={current} onDone={() => setOpenId(null)} />}
      >
        {current && <ReturnDetail r={current} />}
      </SidePanel>

      <NewReturnDialog open={creating} onOpenChange={setCreating} onCreated={(id) => setOpenId(id)} />
    </>
  );
}

function ReturnDetail({ r }: { r: SalesReturn }) {
  const role = useRole();
  const update = useReturns((s) => s.updateSalesReturn);
  const v = returnValue(r.lines, r.customerId);
  const editable = r.status === "received";
  const setLine = (id: string, patch: Partial<SalesReturnLine>) => update(r.id, { lines: r.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-line bg-surface-2 px-4 py-3">
        <Stepper steps={STEPS} current={r.status} />
      </div>

      <KV
        rows={[
          ["Customer", <PartyCell key="c" id={r.customerId} sub={partyById(r.customerId).gstin} />],
          ["Against invoice", <span key="i" className="font-mono text-[13px]">{r.invoiceNumber}</span>],
          ["Delivery challan", <span key="d" className="font-mono text-[13px]">{r.dcNumber}</span>],
          ["Return date", formatDate(r.date)],
          ["Vehicle", r.vehicle || <span className="text-ink-3">Not recorded</span>],
          ["Credit note", <NoteBadge key="n" state={r.creditNoteStatus} number={r.creditNote} />],
        ]}
      />

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Returned lines</h3>
          {editable && <span className="text-xs text-warning">Set QC disposition for each line</span>}
        </div>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-surface-2 text-xs text-ink-2">
              <tr className="border-b border-line">
                <th className="px-3 py-2 text-left font-semibold">Item</th>
                <th className="px-2 py-2 text-right font-semibold">Invoiced</th>
                <th className="px-2 py-2 text-right font-semibold">Returned</th>
                <th className="px-3 py-2 text-left font-semibold">Reason</th>
                <th className="w-40 px-3 py-2 text-left font-semibold">Disposition</th>
              </tr>
            </thead>
            <tbody>
              {r.lines.map((l) => (
                <tr key={l.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2">
                    <ItemCell id={l.itemId} />
                    <div className="font-mono text-2xs text-ink-3">Batch {l.batch}</div>
                  </td>
                  <td className="tabular px-2 py-2 text-right text-ink-3">{formatNum(l.invoicedQty)}</td>
                  <td className="tabular px-2 py-2 text-right font-semibold">{formatNum(l.returnQty)} <span className="font-normal text-ink-3">{itemById(l.itemId).uom}</span></td>
                  <td className="px-3 py-2 text-xs text-ink-2">{l.reason}</td>
                  <td className="px-3 py-2">
                    {editable ? (
                      <Select aria-label="Disposition" value={l.disposition} onChange={(e) => setLine(l.id, { disposition: e.target.value as Disposition })}>
                        {(Object.keys(DISPOSITIONS) as Disposition[]).map((d) => (
                          <option key={d} value={d}>{DISPOSITIONS[d].label}</option>
                        ))}
                      </Select>
                    ) : (
                      <div>
                        <div className={cn("text-sm font-medium", DISP_TONE[l.disposition])}>{DISPOSITIONS[l.disposition].label}</div>
                        <div className="text-2xs text-ink-3">→ {DISPOSITIONS[l.disposition].warehouse}</div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {role.seesCost && (
          <dl className="mt-3 ml-auto w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-ink-3">Taxable value</dt><dd className="tabular">{formatINR(v.taxable)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-3">{v.interstate ? "IGST" : "CGST + SGST"}</dt><dd className="tabular">{formatINR(v.tax)}</dd></div>
            <div className="flex justify-between border-t border-line-strong pt-1.5 font-semibold"><dt>Credit value</dt><dd className="tabular">{formatINR(v.total)}</dd></div>
          </dl>
        )}
      </section>

      {editable && (
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(DISPOSITIONS) as Disposition[]).filter((d) => d !== "pending_qc").map((d) => (
            <div key={d} className="rounded-lg border border-line px-3 py-2">
              <div className={cn("text-xs font-semibold", DISP_TONE[d])}>{DISPOSITIONS[d].label}</div>
              <div className="text-2xs text-ink-3">{DISPOSITIONS[d].hint}</div>
            </div>
          ))}
        </div>
      )}

      <Chatter activities={r.activities} onLog={(t) => update(r.id, {}, role.user, t, "note")} />
    </div>
  );
}

function ReturnActions({ r, onDone }: { r: SalesReturn; onDone: () => void }) {
  const role = useRole();
  const update = useReturns((s) => s.updateSalesReturn);
  const v = returnValue(r.lines, r.customerId);
  const pending = r.lines.some((l) => l.disposition === "pending_qc");

  const print = (
    <Button onClick={() => toast.success("Return note PDF generated", { description: "Branded template (FR-PL-07)" })}>
      <Printer /> Print
    </Button>
  );

  if (r.status === "draft")
    return (
      <>
        <Button variant="danger" onClick={() => { update(r.id, { status: "cancelled" }, role.user, "Return cancelled"); toast("Return cancelled"); onDone(); }}>Cancel return</Button>
        <Button
          variant="primary"
          onClick={() => {
            update(r.id, { status: "received", date: TODAY }, role.user, `Goods received · ${formatNum(qtyOf(r))} units moved to QC Hold`);
            toast.success("Goods received into QC Hold", { description: "Stock movement posted (append-only ledger)" });
          }}
        >
          <PackageOpen /> Receive goods
        </Button>
      </>
    );
  if (r.status === "received")
    return (
      <>
        {print}
        <Button
          variant="primary"
          disabled={pending}
          title={pending ? "Set a disposition for every line first" : undefined}
          onClick={() => {
            const summary = r.lines.map((l) => `${l.returnQty} ${DISPOSITIONS[l.disposition].label.toLowerCase()}`).join(", ");
            update(r.id, { status: "inspected" }, role.user, `QC complete · ${summary}`);
            toast.success("QC complete", { description: "Stock moved from QC Hold per disposition" });
          }}
        >
          <ClipboardCheck /> Complete QC
        </Button>
      </>
    );
  if (r.status === "inspected")
    return (
      <>
        {print}
        <Button
          variant="primary"
          onClick={() => {
            const noteNo = r.creditNote ?? "CN/26-27/0017";
            update(r.id, { status: "credited", creditNote: noteNo, creditNoteStatus: "posted" }, role.user, `Credit note ${noteNo} posted · ${formatINR(v.total)}`, "posted");
            toast.success(`Credit note ${noteNo} posted`, { description: "IRN requested from GSP · ledger updated" });
          }}
        >
          <FileMinus /> Post credit note · {formatINR(v.total)}
        </Button>
      </>
    );
  return (
    <>
      {print}
      <Link href="/finance/notes"><Button variant="primary"><FileMinus /> View credit note</Button></Link>
    </>
  );
}

function NewReturnDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const role = useRole();
  const invoices = useFinance((s) => s.invoices).filter((i) => i.status === "posted");
  const add = useReturns((s) => s.addSalesReturn);
  const [invId, setInvId] = React.useState("");
  const [qty, setQty] = React.useState<Record<string, number>>({});
  const [reason, setReason] = React.useState<Record<string, string>>({});
  const [vehicle, setVehicle] = React.useState("");
  const inv = invoices.find((i) => i.id === invId);
  const total = inv ? inv.lines.reduce((a, l) => a + (qty[l.id] ?? 0), 0) : 0;
  const invalid = inv?.lines.some((l) => (qty[l.id] ?? 0) > l.qty || (qty[l.id] ?? 0) < 0);

  const reset = () => { setInvId(""); setQty({}); setReason({}); setVehicle(""); };

  const create = () => {
    if (!inv) return;
    const lines: SalesReturnLine[] = inv.lines
      .filter((l) => (qty[l.id] ?? 0) > 0)
      .map((l) => ({
        id: l.id, itemId: l.itemId, invoicedQty: l.qty, returnQty: qty[l.id], rate: l.rate * (1 - l.discountPct / 100),
        reason: reason[l.id] ?? RETURN_REASONS[0], disposition: "pending_qc", batch: "—",
      }));
    const r = add({ date: TODAY, customerId: inv.customerId, invoiceNumber: inv.number, dcNumber: inv.dcNumber, vehicle, status: "draft", lines }, role.user);
    toast.success(`${r.number} created`, { description: "Receive the goods to move them into QC Hold" });
    onOpenChange(false);
    reset();
    onCreated(r.id);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title="New sales return"
      description="Pick the invoice the goods were billed on, then enter returned quantities."
      size="lg"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" disabled={!inv || total <= 0 || invalid} onClick={create}><Truck /> Create return</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Invoice" required layout="vertical" htmlFor="inv">
          <Select id="inv" value={invId} onChange={(e) => { setInvId(e.target.value); setQty({}); }}>
            <option value="">Select a posted invoice…</option>
            {invoices.map((i) => (
              <option key={i.id} value={i.id}>{i.number} · {partyById(i.customerId).name} · {formatDate(i.date)}</option>
            ))}
          </Select>
        </Field>
        {inv && (
          <>
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-surface-2 text-xs text-ink-2">
                  <tr className="border-b border-line">
                    <th className="px-3 py-2 text-left font-semibold">Item</th>
                    <th className="px-2 py-2 text-right font-semibold">Invoiced</th>
                    <th className="w-24 px-2 py-2 text-right font-semibold">Return qty</th>
                    <th className="w-52 px-3 py-2 text-left font-semibold">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.lines.map((l) => (
                    <tr key={l.id} className="border-b border-line last:border-0">
                      <td className="px-3 py-2"><ItemCell id={l.itemId} /></td>
                      <td className="tabular px-2 py-2 text-right text-ink-2">{formatNum(l.qty)}</td>
                      <td className="px-2 py-2">
                        <Input
                          type="number" min={0} max={l.qty} className="text-right" aria-label="Return quantity"
                          aria-invalid={(qty[l.id] ?? 0) > l.qty}
                          value={qty[l.id] || ""}
                          onChange={(e) => setQty((q) => ({ ...q, [l.id]: Number(e.target.value) }))}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Select aria-label="Reason" value={reason[l.id] ?? RETURN_REASONS[0]} onChange={(e) => setReason((x) => ({ ...x, [l.id]: e.target.value }))}>
                          {RETURN_REASONS.map((x) => <option key={x}>{x}</option>)}
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {invalid && <p className="text-xs text-danger">Return quantity cannot exceed the invoiced quantity.</p>}
            <Field label="Vehicle (if known)" layout="vertical" htmlFor="veh" hint="Goods are received into QC Hold first; nothing is restocked until QC.">
              <Input id="veh" value={vehicle} onChange={(e) => setVehicle(e.target.value.toUpperCase())} placeholder="MH14 GU 4471" />
            </Field>
          </>
        )}
      </div>
    </Dialog>
  );
}
