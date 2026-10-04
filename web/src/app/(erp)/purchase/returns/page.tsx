"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, FilePlus2, Printer, Truck, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { Chatter } from "@/components/erp/form-view";
import { ItemCell, PartyCell } from "@/components/inventory/shared";
import { KV, NoteBadge, Stepper, ToneBadge } from "@/components/returns/shared";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Dialog, Sheet as SidePanel } from "@/components/ui/overlay";
import { company, itemById, partyById } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { usePurchase } from "@/lib/store/purchase";
import {
  EWB_THRESHOLD,
  type PurchaseReturn,
  type PurchaseReturnLine,
  RETURN_REASONS,
  returnValue,
  useReturns,
} from "@/lib/store/returns";
import { formatDate, formatINR, formatLakh, formatNum, TODAY } from "@/lib/utils";

const STATUS: Record<string, { tone: Tone; label: string }> = {
  draft: { tone: "neutral", label: "Draft" },
  dispatched: { tone: "progress", label: "Dispatched" },
  acknowledged: { tone: "info", label: "Acknowledged" },
  debited: { tone: "success", label: "Debited" },
  cancelled: { tone: "danger", label: "Cancelled" },
};

const STEPS = [
  { key: "draft", label: "Draft" },
  { key: "dispatched", label: "Dispatched" },
  { key: "acknowledged", label: "Vendor ack." },
  { key: "debited", label: "Debit note" },
];

const qtyOf = (r: PurchaseReturn) => r.lines.reduce((a, l) => a + l.returnQty, 0);
const valueOf = (r: PurchaseReturn) => returnValue(r.lines, r.vendorId).total;
const ewbNeeded = (r: PurchaseReturn) => valueOf(r) > EWB_THRESHOLD || partyById(r.vendorId).stateCode !== company.stateCode;

export default function PurchaseReturnsPage() {
  const returns = useReturns((s) => s.purchase);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const current = returns.find((r) => r.id === openId);

  const toDispatch = returns.filter((r) => r.status === "draft");
  const inTransit = returns.filter((r) => r.status === "dispatched" || r.status === "acknowledged");
  const dnPending = returns.filter((r) => r.status !== "cancelled" && r.status !== "debited" && r.status !== "draft");
  const rejectionValue = returns.filter((r) => r.source === "grn_rejection" && r.status !== "cancelled").reduce((a, r) => a + valueOf(r), 0);

  const columns: Column<PurchaseReturn>[] = [
    { key: "number", header: "Return", value: (r) => r.number, cell: (r) => <span className="font-mono text-[12.5px] font-medium whitespace-nowrap">{r.number}</span> },
    { key: "date", header: "Date", value: (r) => r.date, cell: (r) => <span className="whitespace-nowrap">{formatDate(r.date)}</span> },
    { key: "vendor", header: "Vendor", value: (r) => partyById(r.vendorId).name, cell: (r) => <PartyCell id={r.vendorId} /> },
    {
      key: "grn",
      header: "Against GRN",
      value: (r) => r.grnNumber,
      cell: (r) => (
        <div>
          <div className="font-mono text-xs whitespace-nowrap">{r.grnNumber}</div>
          <div className="font-mono text-2xs whitespace-nowrap text-ink-3">{r.poNumber}</div>
        </div>
      ),
    },
    {
      key: "source",
      header: "Type",
      value: (r) => r.source,
      cell: (r) => <Badge tone={r.source === "grn_rejection" ? "warning" : "neutral"} dot={false}>{r.source === "grn_rejection" ? "GRN rejection" : "Post-GRN return"}</Badge>,
    },
    { key: "qty", header: "Qty", align: "right", value: qtyOf, cell: (r) => <span className="whitespace-nowrap">{formatNum(qtyOf(r))} {itemById(r.lines[0].itemId).uom}</span> },
    { key: "value", header: "Value", align: "right", cost: true, value: valueOf, cell: (r) => <span className="font-medium">{formatINR(valueOf(r))}</span>, total: (rows) => formatLakh(rows.reduce((a, r) => a + valueOf(r), 0)) },
    {
      key: "challan",
      header: "Return challan",
      value: (r) => r.returnChallan ?? "",
      cell: (r) =>
        r.returnChallan ? (
          <div>
            <div className="font-mono text-xs">{r.returnChallan}</div>
            {r.ewayBill && <div className="font-mono text-2xs text-ink-3">EWB {r.ewayBill}</div>}
          </div>
        ) : ewbNeeded(r) ? (
          <Badge tone="warning">EWB required</Badge>
        ) : (
          <span className="text-ink-3">—</span>
        ),
    },
    { key: "dn", header: "Debit note", value: (r) => r.debitNoteStatus, cell: (r) => <NoteBadge state={r.debitNoteStatus} number={r.debitNote} /> },
    { key: "status", header: "Status", value: (r) => r.status, cell: (r) => <ToneBadge map={STATUS} value={r.status} /> },
  ];

  return (
    <>
      <ListPage
        title="Purchase returns"
        subtitle="Rejected or excess material going back to vendors — return challan, e-way bill and debit note."
        crumbs={[{ label: "Purchase", href: "/purchase/orders" }, { label: "Purchase returns" }]}
        rows={returns}
        columns={columns}
        search={(r) => `${r.number} ${r.grnNumber} ${r.poNumber} ${partyById(r.vendorId).name} ${r.returnChallan ?? ""}`}
        placeholder="Search return, GRN, PO, vendor…"
        onNew={() => setCreating(true)}
        newLabel="New return"
        onRowClick={(r) => setOpenId(r.id)}
        stats={[
          { label: "To dispatch", value: toDispatch.length, hint: toDispatch.length ? `${formatNum(toDispatch.reduce((a, r) => a + qtyOf(r), 0))} units in QC Hold` : "Nothing waiting", tone: toDispatch.length ? "warning" : "default", filter: "draft" },
          { label: "With vendor", value: inTransit.length, hint: "Dispatched or acknowledged", filter: "transit" },
          { label: "Debit note pending", value: dnPending.filter((r) => r.debitNoteStatus !== "posted").length, hint: formatINR(dnPending.reduce((a, r) => a + valueOf(r), 0)), tone: "info", filter: "dn" },
          { label: "GRN rejections (FY)", value: formatLakh(rejectionValue), hint: "Feeds vendor rating" },
        ]}
        filters={[
          { key: "draft", label: "To dispatch", group: "s", test: (r) => r.status === "draft" },
          { key: "transit", label: "With vendor", group: "s", test: (r) => r.status === "dispatched" || r.status === "acknowledged" },
          { key: "dn", label: "Debit note pending", group: "s", test: (r) => !["debited", "cancelled", "draft"].includes(r.status) },
          { key: "rej", label: "GRN rejections", group: "t", test: (r) => r.source === "grn_rejection" },
          { key: "post", label: "Post-GRN returns", group: "t", test: (r) => r.source === "post_grn_return" },
        ]}
        groups={[
          { key: "vendor", label: "Vendor", by: (r) => partyById(r.vendorId).name },
          { key: "status", label: "Status", by: (r) => STATUS[r.status].label },
        ]}
      />

      <SidePanel
        open={!!current}
        onOpenChange={(o) => !o && setOpenId(null)}
        width={660}
        title={current ? <span className="flex items-center gap-2"><Undo2 className="size-4 text-primary-600" /><span className="font-mono">{current.number}</span></span> : ""}
        footer={current && <Actions r={current} onDone={() => setOpenId(null)} />}
      >
        {current && <Detail r={current} />}
      </SidePanel>

      <NewPurchaseReturn open={creating} onOpenChange={setCreating} onCreated={setOpenId} />
    </>
  );
}

function Detail({ r }: { r: PurchaseReturn }) {
  const role = useRole();
  const update = useReturns((s) => s.updatePurchaseReturn);
  const v = returnValue(r.lines, r.vendorId);
  const need = ewbNeeded(r);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-line bg-surface-2 px-4 py-3">
        <Stepper steps={STEPS} current={r.status} />
      </div>

      <KV
        rows={[
          ["Vendor", <PartyCell key="v" id={r.vendorId} sub={partyById(r.vendorId).gstin} />],
          ["Against GRN", <span key="g" className="font-mono text-[13px]">{r.grnNumber}</span>],
          ["Purchase order", <span key="p" className="font-mono text-[13px]">{r.poNumber}</span>],
          ["Type", r.source === "grn_rejection" ? "Rejected at GRN inspection" : "Returned after acceptance"],
          ["Return challan", r.returnChallan ? <span key="c" className="font-mono text-[13px]">{r.returnChallan}</span> : <span className="text-ink-3">Issued on dispatch</span>],
          [
            "e-Way bill",
            r.ewayBill ? (
              <span key="e" className="font-mono text-[13px]">{r.ewayBill}</span>
            ) : need ? (
              <Badge key="e" tone="warning">Required · value over ₹50,000</Badge>
            ) : (
              <span className="text-ink-3">Not required</span>
            ),
          ],
          ["Debit note", <NoteBadge key="d" state={r.debitNoteStatus} number={r.debitNote} />],
        ]}
      />

      {r.status === "draft" && (
        <Field label="Vehicle number" layout="vertical" htmlFor="veh" hint="Needed for the return challan and e-way bill">
          <Input id="veh" value={r.vehicle} onChange={(e) => update(r.id, { vehicle: e.target.value.toUpperCase() })} placeholder="MH12 QW 6620" />
        </Field>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold">Lines</h3>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-surface-2 text-xs text-ink-2">
              <tr className="border-b border-line">
                <th className="px-3 py-2 text-left font-semibold">Item</th>
                <th className="px-2 py-2 text-right font-semibold">Received</th>
                <th className="px-2 py-2 text-right font-semibold">Returned</th>
                {role.seesCost && <th className="px-2 py-2 text-right font-semibold">Rate</th>}
                <th className="px-3 py-2 text-left font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody>
              {r.lines.map((l) => (
                <tr key={l.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2"><ItemCell id={l.itemId} /><div className="font-mono text-2xs text-ink-3">Batch {l.batch}</div></td>
                  <td className="tabular px-2 py-2 text-right text-ink-3">{formatNum(l.receivedQty)}</td>
                  <td className="tabular px-2 py-2 text-right font-semibold">{formatNum(l.returnQty)} <span className="font-normal text-ink-3">{itemById(l.itemId).uom}</span></td>
                  {role.seesCost && <td className="tabular px-2 py-2 text-right">{formatINR(l.rate)}</td>}
                  <td className="px-3 py-2 text-xs text-ink-2">{l.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {role.seesCost && (
          <dl className="mt-3 ml-auto w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-ink-3">Taxable value</dt><dd className="tabular">{formatINR(v.taxable)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-3">{v.interstate ? "IGST" : "CGST + SGST"}</dt><dd className="tabular">{formatINR(v.tax)}</dd></div>
            <div className="flex justify-between border-t border-line-strong pt-1.5 font-semibold"><dt>Debit value</dt><dd className="tabular">{formatINR(v.total)}</dd></div>
          </dl>
        )}
      </section>

      <Chatter activities={r.activities} onLog={(t) => update(r.id, {}, role.user, t, "note")} />
    </div>
  );
}

function Actions({ r, onDone }: { r: PurchaseReturn; onDone: () => void }) {
  const role = useRole();
  const update = useReturns((s) => s.updatePurchaseReturn);
  const v = valueOf(r);
  const print = (
    <Button onClick={() => toast.success("Return challan PDF generated", { description: "Rule 55 delivery challan format" })}>
      <Printer /> Print challan
    </Button>
  );

  if (r.status === "draft")
    return (
      <>
        <Button variant="danger" onClick={() => { update(r.id, { status: "cancelled" }, role.user, "Return cancelled"); onDone(); }}>Cancel</Button>
        <Button
          variant="primary"
          disabled={!r.vehicle.trim()}
          title={!r.vehicle.trim() ? "Enter vehicle number first" : undefined}
          onClick={() => {
            const challan = `RDC/26-27/${r.number.slice(-4)}`;
            const ewb = ewbNeeded(r) ? "2710 4499 3021" : undefined;
            update(r.id, { status: "dispatched", returnChallan: challan, ewayBill: ewb }, role.user, `Dispatched on ${challan}${ewb ? ` · e-way bill ${ewb}` : ""} · stock out of QC Hold`);
            toast.success(`Return challan ${challan} issued`, { description: ewb ? `e-Way bill ${ewb} generated via GSP` : "No e-way bill needed below ₹50,000" });
          }}
        >
          <Truck /> Dispatch to vendor
        </Button>
      </>
    );
  if (r.status === "dispatched")
    return (
      <>
        {print}
        <Button variant="primary" onClick={() => update(r.id, { status: "acknowledged" }, role.user, "Vendor acknowledged receipt")}>
          <CheckCircle2 /> Mark acknowledged
        </Button>
      </>
    );
  if (r.status === "acknowledged")
    return (
      <>
        {print}
        <Button
          variant="primary"
          onClick={() => {
            const dn = r.debitNote ?? "DN/26-27/0008";
            update(r.id, { status: "debited", debitNote: dn, debitNoteStatus: "posted" }, role.user, `Debit note ${dn} posted · ${formatINR(v)}`, "posted");
            toast.success(`Debit note ${dn} posted`, { description: "Vendor payable reduced" });
          }}
        >
          <FilePlus2 /> Raise debit note · {formatINR(v)}
        </Button>
      </>
    );
  return (
    <>
      {print}
      <Link href="/finance/notes"><Button variant="primary">View debit note</Button></Link>
    </>
  );
}

function NewPurchaseReturn({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const role = useRole();
  const receipts = usePurchase((s) => s.receipts).filter((g) => g.status === "posted");
  const orders = usePurchase((s) => s.orders);
  const add = useReturns((s) => s.addPurchaseReturn);
  const [grnId, setGrnId] = React.useState("");
  const [qty, setQty] = React.useState<Record<string, number>>({});
  const [reason, setReason] = React.useState<Record<string, string>>({});
  const grn = receipts.find((g) => g.id === grnId);

  const pick = (id: string) => {
    setGrnId(id);
    const g = receipts.find((x) => x.id === id);
    setQty(Object.fromEntries((g?.lines ?? []).map((l) => [l.id, l.rejected])));
    setReason(Object.fromEntries((g?.lines ?? []).map((l) => [l.id, l.reason || RETURN_REASONS[2]])));
  };

  const total = grn ? grn.lines.reduce((a, l) => a + (qty[l.id] ?? 0), 0) : 0;
  const invalid = grn?.lines.some((l) => (qty[l.id] ?? 0) > l.received);

  const create = () => {
    if (!grn) return;
    const po = orders.find((o) => o.id === grn.poId);
    const lines: PurchaseReturnLine[] = grn.lines
      .filter((l) => (qty[l.id] ?? 0) > 0)
      .map((l) => ({
        id: l.id, itemId: l.itemId, receivedQty: l.received, returnQty: qty[l.id], reason: reason[l.id], batch: l.batch || "—",
        rate: po?.lines.find((pl) => pl.id === l.poLineId)?.rate ?? itemById(l.itemId).standardCost,
      }));
    const anyRejected = grn.lines.some((l) => l.rejected > 0);
    const r = add({ date: TODAY, vendorId: grn.vendorId, grnNumber: grn.number, poNumber: po?.number ?? "—", source: anyRejected ? "grn_rejection" : "post_grn_return", status: "draft", lines, vehicle: "" }, role.user);
    toast.success(`${r.number} created`);
    onOpenChange(false);
    setGrnId("");
    onCreated(r.id);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New purchase return"
      description="Rejected quantities from the GRN are pre-filled. Adjust for excess or later returns."
      size="lg"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" disabled={!grn || total <= 0 || invalid} onClick={create}>Create return</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Goods receipt (GRN)" required layout="vertical" htmlFor="grn">
          <Select id="grn" value={grnId} onChange={(e) => pick(e.target.value)}>
            <option value="">Select a posted GRN…</option>
            {receipts.map((g) => (
              <option key={g.id} value={g.id}>{g.number} · {partyById(g.vendorId).name} · {formatDate(g.date)}</option>
            ))}
          </Select>
        </Field>
        {grn && (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-surface-2 text-xs text-ink-2">
                <tr className="border-b border-line">
                  <th className="px-3 py-2 text-left font-semibold">Item</th>
                  <th className="px-2 py-2 text-right font-semibold">Received</th>
                  <th className="px-2 py-2 text-right font-semibold">Rejected</th>
                  <th className="w-24 px-2 py-2 text-right font-semibold">Return</th>
                  <th className="w-48 px-3 py-2 text-left font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody>
                {grn.lines.map((l) => (
                  <tr key={l.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-2"><ItemCell id={l.itemId} /></td>
                    <td className="tabular px-2 py-2 text-right text-ink-2">{formatNum(l.received)}</td>
                    <td className="tabular px-2 py-2 text-right">{l.rejected ? <span className="font-medium text-danger">{formatNum(l.rejected)}</span> : <span className="text-ink-3">0</span>}</td>
                    <td className="px-2 py-2">
                      <Input type="number" min={0} className="text-right" aria-label="Return quantity" aria-invalid={(qty[l.id] ?? 0) > l.received} value={qty[l.id] || ""} onChange={(e) => setQty((q) => ({ ...q, [l.id]: Number(e.target.value) }))} />
                    </td>
                    <td className="px-3 py-2">
                      <Select aria-label="Reason" value={reason[l.id]} onChange={(e) => setReason((x) => ({ ...x, [l.id]: e.target.value }))}>
                        {RETURN_REASONS.map((x) => <option key={x}>{x}</option>)}
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {invalid && <p className="text-xs text-danger">Return quantity cannot exceed received quantity.</p>}
      </div>
    </Dialog>
  );
}
