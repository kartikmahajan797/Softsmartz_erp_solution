"use client";

import Link from "next/link";
import * as React from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Lock, PackageCheck, PauseCircle, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Banner, Chatter, FieldGrid, FormPage, Notebook, Sheet, SheetTitle, SmartButton, SmartButtons, StatusBar, Totals } from "@/components/erp/form-view";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, ReadValue } from "@/components/ui/form";
import { MsmeBadge, useItemName } from "@/components/inventory/shared";
import { partyById } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { useInventory } from "@/lib/store/inventory";
import { type BillLine, TOLERANCE, billMatched, billTotals, lineMatch, usePurchase } from "@/lib/store/purchase";
import { cn, formatDate, formatINR, formatNum } from "@/lib/utils";

const MATCH = {
  matched: { tone: "success" as const, label: "Matched" },
  qty: { tone: "danger" as const, label: "Qty mismatch" },
  price: { tone: "warning" as const, label: "Price mismatch" },
  both: { tone: "danger" as const, label: "Qty + price" },
};

export default function BillPage() {
  const { id } = useParams<{ id: string }>();
  const role = useRole();
  const name = useItemName();
  const b = usePurchase((s) => s.bills.find((x) => x.id === id));
  const po = usePurchase((s) => s.orders.find((o) => o.id === b?.poId));
  const receipts = usePurchase((s) => s.receipts);
  const items = useInventory((s) => s.items);
  const { updateBill, billAction } = usePurchase.getState();

  if (!b) return <div className="p-10 text-center text-sm text-ink-3">Bill not found. <Link href="/purchase/bills" className="text-primary-700 underline">Back</Link></div>;

  const vendor = partyById(b.vendorId);
  const matched = billMatched(b);
  const editable = b.status !== "posted" && b.status !== "pending_approval";
  const totals = billTotals(b);
  const it = (iid: string) => items.find((i) => i.id === iid)!;
  const varianceValue = b.lines.reduce((a, l) => a + l.billQty * l.billRate - l.grnQty * l.poRate, 0);

  const setLine = (lid: string, patch: Partial<BillLine>) => updateBill(b.id, { lines: b.lines.map((l) => (l.id === lid ? { ...l, ...patch } : l)) });

  const post = () => {
    billAction(b.id, "posted", role.user, `Posted · 3-way match OK · AP ${formatINR(totals.total)} · input GST ${formatINR(totals.tax)}`, "posted");
    toast.success(`${b.number} posted`, { description: "Vendor payable and input GST recorded" });
  };

  const actions = (
    <>
      {editable && matched && <Button variant="primary" onClick={post}><CheckCircle2 /> Post bill</Button>}
      {editable && !matched && (
        <Button variant="primary" onClick={() => { billAction(b.id, "pending_approval", role.user, `Held for approval · match variance ${formatINR(varianceValue)}`, "system"); toast.warning("Held for approval", { description: "Match exceptions need Owner / Accountant approval (FR-SP-03)" }); }}>
          <PauseCircle /> Hold for approval
        </Button>
      )}
      {b.status === "pending_approval" && role.approves && (
        <>
          <Button variant="primary" onClick={() => { billAction(b.id, "posted", role.user, `Approved with variance ${formatINR(varianceValue)} · posted (price variance booked)`, "approved"); toast.success("Approved and posted", { description: "Difference booked to purchase price variance" }); }}>Approve & post</Button>
          <Button variant="danger" onClick={() => { billAction(b.id, "mismatch", role.user, "Rejected — raise debit note / ask vendor for revised bill"); toast("Returned for correction"); }}>Reject</Button>
        </>
      )}
      {b.status === "pending_approval" && !role.approves && <span className="text-sm text-ink-3">Waiting for approval</span>}
    </>
  );

  return (
    <FormPage
      crumbs={[{ label: "Purchase", href: "/purchase/orders" }, { label: "Purchase bills", href: "/purchase/bills" }, { label: b.number }]}
      actions={actions}
      status={<StatusBar steps={[{ key: "draft", label: "Entered" }, { key: "pending_approval", label: "Approval" }, { key: "posted", label: "Posted" }]} current={b.status === "matched" || b.status === "mismatch" ? "draft" : b.status} />}
      banner={
        b.status === "posted" ? (
          <Banner tone="success" icon={<Lock />}>Posted — immutable. Use a debit note for corrections.</Banner>
        ) : !matched ? (
          <Banner tone="danger" icon={<AlertTriangle />}>
            3-way match failed beyond tolerance (qty ±{TOLERANCE.qtyPct}%, rate ±{TOLERANCE.ratePct}%). Variance {formatINR(varianceValue)}. Correct the bill or hold it for approval.
          </Banner>
        ) : (
          <Banner tone="success" icon={<CheckCircle2 />}>PO, GRN and bill agree within tolerance — ready to post.</Banner>
        )
      }
      chatter={<Chatter activities={b.activities} />}
    >
      <Sheet>
        <SmartButtons>
          <SmartButton icon={<ShoppingCart />} label="Purchase order" value={po?.number ?? "—"} href={po ? `/purchase/orders/${po.id}` : "/purchase/orders"} />
          <SmartButton icon={<PackageCheck />} label="Goods receipts" value={b.grnNumbers.length} href={receipts.find((g) => b.grnNumbers.includes(g.number)) ? `/purchase/receipts/${receipts.find((g) => b.grnNumbers.includes(g.number))!.id}` : "/purchase/receipts"} />
        </SmartButtons>
        <SheetTitle label="Purchase bill" title={b.number} badge={<StatusBadge status={b.status} />} subtitle={<>Vendor bill <span className="font-mono">{b.vendorBillNo}</span></>} />

        <FieldGrid>
          <div className="space-y-3">
            <Field label="Vendor"><ReadValue><span className="flex items-center gap-2 font-medium">{vendor.name}{vendor.msme && <MsmeBadge />}</span></ReadValue></Field>
            <Field label="GSTIN"><ReadValue mono>{vendor.gstin}</ReadValue></Field>
            <Field label="PO / GRN"><ReadValue mono>{po?.number} · {b.grnNumbers.join(", ")}</ReadValue></Field>
          </div>
          <div className="space-y-3">
            <Field label="Bill date"><ReadValue>{formatDate(b.date)}</ReadValue></Field>
            <Field label="Due date" hint={vendor.msme ? "MSME supplier — pay by due date (max 45 days) [verify with CA]" : undefined}><ReadValue>{formatDate(b.dueDate)}</ReadValue></Field>
            <Field label="Match result"><ReadValue>{matched ? <Badge tone="success">Matched</Badge> : <Badge tone="danger">Exception</Badge>}</ReadValue></Field>
          </div>
        </FieldGrid>

        <Notebook
          tabs={[
            {
              key: "match",
              label: "3-way match",
              content: (
                <div>
                  <div className="overflow-x-auto rounded-lg border border-line">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="text-xs text-ink-2">
                        <tr className="border-b border-line bg-surface-2">
                          <th rowSpan={2} className="px-3 py-2 text-left font-semibold">Item</th>
                          <th colSpan={2} className="border-l border-line px-3 py-1.5 text-center font-semibold">Purchase order</th>
                          <th className="border-l border-line px-3 py-1.5 text-center font-semibold">GRN</th>
                          <th colSpan={2} className="border-l border-line bg-primary-50 px-3 py-1.5 text-center font-semibold text-primary-800">Vendor bill</th>
                          <th rowSpan={2} className="border-l border-line px-3 py-2 text-left font-semibold">Result</th>
                        </tr>
                        <tr className="border-b border-line bg-surface-2">
                          <th className="border-l border-line px-3 py-1.5 text-right font-medium">Qty</th>
                          <th className="px-3 py-1.5 text-right font-medium">Rate</th>
                          <th className="border-l border-line px-3 py-1.5 text-right font-medium">Accepted qty</th>
                          <th className="border-l border-line bg-primary-50 px-3 py-1.5 text-right font-medium">Qty</th>
                          <th className="bg-primary-50 px-3 py-1.5 text-right font-medium">Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {b.lines.map((l) => {
                          const m = lineMatch(l);
                          const qtyBad = m === "qty" || m === "both";
                          const rateBad = m === "price" || m === "both";
                          return (
                            <tr key={l.id} className="border-b border-line last:border-0">
                              <td className="px-3 py-2">
                                <div className="font-medium">{name(l.itemId)}</div>
                                <div className="font-mono text-2xs text-ink-3">{it(l.itemId).code} · {it(l.itemId).uom}</div>
                              </td>
                              <td className="tabular border-l border-line px-3 py-2 text-right text-ink-2">{formatNum(l.poQty)}</td>
                              <td className="tabular px-3 py-2 text-right text-ink-2">{formatINR(l.poRate)}</td>
                              <td className="tabular border-l border-line px-3 py-2 text-right font-medium">{formatNum(l.grnQty)}</td>
                              <td className={cn("border-l border-line px-2 py-1.5 text-right", qtyBad && "bg-danger-bg/60")}>
                                {editable ? <Input type="number" aria-label="Bill quantity" className={cn("w-20 text-right", qtyBad && "border-danger")} value={l.billQty} onChange={(e) => setLine(l.id, { billQty: Number(e.target.value) })} /> : <span className="tabular">{formatNum(l.billQty)}</span>}
                              </td>
                              <td className={cn("px-2 py-1.5 text-right", rateBad && "bg-warning-bg/70")}>
                                {editable ? <Input type="number" step="0.01" aria-label="Bill rate" className={cn("w-20 text-right", rateBad && "border-warning")} value={l.billRate} onChange={(e) => setLine(l.id, { billRate: Number(e.target.value) })} /> : <span className="tabular">{formatINR(l.billRate)}</span>}
                              </td>
                              <td className="min-w-[150px] border-l border-line px-3 py-2">
                                <Badge tone={MATCH[m].tone}>{MATCH[m].label}</Badge>
                                {m !== "matched" && (
                                  <div className="mt-1 text-2xs text-ink-3">
                                    {qtyBad && <>Qty {l.billQty > l.grnQty ? "+" : ""}{formatNum(l.billQty - l.grnQty)} vs GRN. </>}
                                    {rateBad && <>Rate {(((l.billRate - l.poRate) / l.poRate) * 100).toFixed(1)}% vs PO.</>}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex flex-col gap-4 border-t border-line pt-4 md:flex-row md:items-start">
                    <p className="flex-1 text-xs text-ink-3">
                      Bill quantity is matched against the GRN accepted quantity; bill rate against the PO rate. Tolerances: qty ±{TOLERANCE.qtyPct}%, rate ±{TOLERANCE.ratePct}% (tenant setting).
                    </p>
                    {role.seesCost && (
                      <Totals
                        rows={[
                          { label: "Taxable value", value: formatINR(totals.taxable) },
                          ...(totals.interstate ? [{ label: "Input IGST", value: formatINR(totals.igst) }] : [{ label: "Input CGST", value: formatINR(totals.cgst) }, { label: "Input SGST", value: formatINR(totals.sgst) }]),
                          { label: "Round off", value: formatINR(totals.roundOff), muted: true },
                          { label: "Bill total", value: formatINR(totals.total), strong: true },
                        ]}
                      />
                    )}
                  </div>
                </div>
              ),
            },
          ]}
        />
      </Sheet>
    </FormPage>
  );
}
