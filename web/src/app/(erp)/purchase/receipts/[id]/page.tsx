"use client";

import Link from "next/link";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Lock, Printer, Receipt, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Banner, Chatter, FieldGrid, FormPage, Notebook, Sheet, SheetTitle, SmartButton, SmartButtons, StatusBar } from "@/components/erp/form-view";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, ReadValue, Select } from "@/components/ui/form";
import { Dialog } from "@/components/ui/overlay";
import { MsmeBadge, WarehouseChip, useItemName } from "@/components/inventory/shared";
import { partyById, warehouses, whById } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { useInventory } from "@/lib/store/inventory";
import { type GRN, type GRNLine, TOLERANCE, usePurchase } from "@/lib/store/purchase";
import { cn, formatDate, formatDateTime, formatNum } from "@/lib/utils";

const REJECT_REASONS = ["Dimension out of tolerance", "Surface defect / rust", "Wrong grade / material", "Damaged in transit", "Seal damaged", "Short supply", "No test certificate"];

export default function GRNPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const role = useRole();
  const name = useItemName();
  const g = usePurchase((s) => s.receipts.find((x) => x.id === id));
  const po = usePurchase((s) => s.orders.find((o) => o.id === g?.poId));
  const bills = usePurchase((s) => s.bills);
  const items = useInventory((s) => s.items);
  const { updateGRN, postGRN } = usePurchase.getState();
  const postMovement = useInventory((s) => s.postMovement);
  const [d, setD] = React.useState<GRN | undefined>(g);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [confirm, setConfirm] = React.useState(false);

  React.useEffect(() => setD(g), [g]);

  if (!g || !d) return <div className="p-10 text-center text-sm text-ink-3">Goods receipt not found. <Link href="/purchase/receipts" className="text-primary-700 underline">Back</Link></div>;

  const draft = g.status === "draft";
  const it = (iid: string) => items.find((i) => i.id === iid)!;
  const vendor = partyById(g.vendorId);
  const setLine = (lid: string, patch: Partial<GRNLine>) =>
    setD((x) => x && { ...x, lines: x.lines.map((l) => (l.id === lid ? { ...l, ...patch, rejected: Math.max(0, (patch.received ?? l.received) - (patch.accepted ?? l.accepted)) } : l)) });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!d.vendorChallan.trim()) e.challan = "Vendor challan / invoice number is required";
    d.lines.forEach((l) => {
      const max = l.pending * (1 + TOLERANCE.qtyPct / 100);
      if (l.received < 0) e[`rec-${l.id}`] = "Cannot be negative";
      else if (l.received > max) e[`rec-${l.id}`] = `Max ${formatNum(Math.floor(max))} (${TOLERANCE.qtyPct}% tolerance)`;
      if (l.accepted > l.received) e[`acc-${l.id}`] = "More than received";
      if (l.accepted < 0) e[`acc-${l.id}`] = "Cannot be negative";
      if (it(l.itemId).batchTracked && l.accepted > 0 && (!l.batch || l.batch === "—")) e[`batch-${l.id}`] = "Batch required";
      if (l.rejected > 0 && !l.reason) e[`reason-${l.id}`] = "Reason required";
    });
    if (!d.lines.some((l) => l.received > 0)) e.lines = "Enter a received quantity on at least one line";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = () => {
    updateGRN(g.id, d);
    toast.success("Draft saved");
  };

  const post = () => {
    updateGRN(g.id, d);
    d.lines.forEach((l) => {
      const rate = po?.lines.find((x) => x.id === l.poLineId)?.rate ?? it(l.itemId).standardCost;
      if (l.accepted > 0) postMovement({ itemId: l.itemId, warehouseId: d.warehouseId, batch: l.batch, type: "grn", qty: l.accepted, unitCost: rate, doc: g.number, by: role.user });
    });
    postGRN(g.id, role.user);
    setConfirm(false);
    toast.success(`${g.number} posted`, { description: "Stock ledger updated · GRN-not-invoiced liability recorded" });
  };

  const relatedBills = bills.filter((b) => b.grnNumbers.includes(g.number));

  return (
    <FormPage
      crumbs={[{ label: "Purchase", href: "/purchase/orders" }, { label: "Goods receipts", href: "/purchase/receipts" }, { label: g.number }]}
      actions={
        draft ? (
          <>
            <Button variant="primary" onClick={() => validate() ? setConfirm(true) : toast.error("Please fix the highlighted fields")}>Post GRN</Button>
            <Button onClick={save}>Save draft</Button>
          </>
        ) : (
          <>
            <Button onClick={() => toast.success("GRN PDF generated")}><Printer /> Print GRN</Button>
            <Button onClick={() => router.push(relatedBills[0] ? `/purchase/bills/${relatedBills[0].id}` : "/purchase/bills")}><Receipt /> {relatedBills.length ? "Open bill" : "Bills"}</Button>
          </>
        )
      }
      status={<StatusBar steps={[{ key: "draft", label: "Draft" }, { key: "posted", label: "Posted" }]} current={g.status} />}
      banner={
        !draft ? (
          <Banner tone="success" icon={<Lock />}>
            Posted {g.postedAt ? formatDateTime(g.postedAt) : ""} — immutable. Corrections are made with a purchase return or debit note.
          </Banner>
        ) : undefined
      }
      chatter={<Chatter activities={g.activities} />}
    >
      <Sheet>
        <SmartButtons>
          <SmartButton icon={<ShoppingCart />} label="Purchase order" value={po?.number ?? "—"} href={po ? `/purchase/orders/${po.id}` : "/purchase/orders"} />
          <SmartButton icon={<Receipt />} label="Bills" value={relatedBills.length} href="/purchase/bills" />
        </SmartButtons>
        <SheetTitle label="Goods receipt note" title={g.number} badge={<StatusBadge status={g.status} />} />

        <FieldGrid>
          <div className="space-y-3">
            <Field label="Vendor">
              <ReadValue><span className="flex items-center gap-2 font-medium">{vendor.name}{vendor.msme && <MsmeBadge />}</span></ReadValue>
            </Field>
            <Field label="Purchase order">
              <ReadValue>{po ? <Link href={`/purchase/orders/${po.id}`} className="font-mono text-primary-700 hover:underline">{po.number}</Link> : "—"}</ReadValue>
            </Field>
            <Field label="Vendor challan / invoice" required error={errors.challan} htmlFor="challan">
              {draft ? <Input id="challan" aria-invalid={!!errors.challan} value={d.vendorChallan} onChange={(e) => setD({ ...d, vendorChallan: e.target.value })} placeholder="MST/DC/26/1182" /> : <ReadValue mono>{g.vendorChallan}</ReadValue>}
            </Field>
          </div>
          <div className="space-y-3">
            <Field label="Receipt date"><ReadValue>{formatDate(g.date)}</ReadValue></Field>
            <Field label="Receive into" htmlFor="wh" hint={d.warehouseId === "w4" ? "QC Hold — excluded from free stock until accepted by quality" : undefined}>
              {draft ? (
                <Select id="wh" value={d.warehouseId} onChange={(e) => setD({ ...d, warehouseId: e.target.value })}>
                  {warehouses.filter((w) => ["stores", "hold"].includes(w.type)).map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
                </Select>
              ) : (
                <ReadValue><span className="flex items-center gap-2"><WarehouseChip id={g.warehouseId} /> {whById(g.warehouseId).name}</span></ReadValue>
              )}
            </Field>
            <Field label="Vehicle number" htmlFor="veh">
              {draft ? <Input id="veh" value={d.vehicle} onChange={(e) => setD({ ...d, vehicle: e.target.value.toUpperCase() })} placeholder="MH12 QW 6620" /> : <ReadValue mono>{g.vehicle || "—"}</ReadValue>}
            </Field>
          </div>
        </FieldGrid>

        <Notebook
          tabs={[
            {
              key: "lines",
              label: "Received items",
              count: d.lines.length,
              content: (
                <div>
                  {errors.lines && <p className="mb-2 text-xs text-danger">{errors.lines}</p>}
                  <div className="overflow-x-auto rounded-lg border border-line">
                    <table className="w-full min-w-[860px] text-sm">
                      <thead className="bg-surface-2 text-xs text-ink-2">
                        <tr className="border-b border-line">
                          <th className="px-3 py-2 text-left font-semibold">Item</th>
                          <th className="w-20 px-2 py-2 text-right font-semibold">Ordered</th>
                          <th className="w-20 px-2 py-2 text-right font-semibold">Pending</th>
                          <th className="w-24 px-2 py-2 text-right font-semibold">Received</th>
                          <th className="w-24 px-2 py-2 text-right font-semibold">Accepted</th>
                          <th className="w-20 px-2 py-2 text-right font-semibold">Rejected</th>
                          <th className="w-32 px-2 py-2 text-left font-semibold">Batch</th>
                          <th className="w-44 px-3 py-2 text-left font-semibold">Rejection reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.lines.map((l) => {
                          const item = it(l.itemId);
                          return (
                            <tr key={l.id} className="border-b border-line align-top last:border-0">
                              <td className="px-3 py-2">
                                <div className="font-medium">{name(l.itemId)}</div>
                                <div className="font-mono text-2xs text-ink-3">{item.code} · {item.uom}</div>
                              </td>
                              <td className="tabular px-2 py-2 text-right text-ink-2">{formatNum(l.ordered)}</td>
                              <td className="tabular px-2 py-2 text-right text-ink-2">{formatNum(l.pending)}</td>
                              <td className="px-2 py-1.5 text-right">
                                {draft ? (
                                  <>
                                    <Input type="number" min={0} aria-label="Received quantity" aria-invalid={!!errors[`rec-${l.id}`]} className="text-right" value={l.received} onChange={(e) => setLine(l.id, { received: Number(e.target.value), accepted: Number(e.target.value) - l.rejected })} />
                                    {errors[`rec-${l.id}`] && <p className="mt-0.5 text-2xs text-danger">{errors[`rec-${l.id}`]}</p>}
                                  </>
                                ) : <span className="tabular">{formatNum(l.received)}</span>}
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                {draft ? (
                                  <>
                                    <Input type="number" min={0} aria-label="Accepted quantity" aria-invalid={!!errors[`acc-${l.id}`]} className="text-right" value={l.accepted} onChange={(e) => setLine(l.id, { accepted: Number(e.target.value) })} />
                                    {errors[`acc-${l.id}`] && <p className="mt-0.5 text-2xs text-danger">{errors[`acc-${l.id}`]}</p>}
                                  </>
                                ) : <span className="tabular font-medium">{formatNum(l.accepted)}</span>}
                              </td>
                              <td className={cn("tabular px-2 py-2 text-right", l.rejected ? "font-medium text-danger" : "text-ink-3")}>{l.rejected ? formatNum(l.rejected) : "—"}</td>
                              <td className="px-2 py-1.5">
                                {draft && item.batchTracked ? (
                                  <>
                                    <Input aria-label="Batch number" aria-invalid={!!errors[`batch-${l.id}`]} className="font-mono text-xs" value={l.batch} onChange={(e) => setLine(l.id, { batch: e.target.value.toUpperCase() })} />
                                    {errors[`batch-${l.id}`] && <p className="mt-0.5 text-2xs text-danger">{errors[`batch-${l.id}`]}</p>}
                                  </>
                                ) : <span className="font-mono text-xs text-ink-2">{l.batch}</span>}
                              </td>
                              <td className="px-3 py-1.5">
                                {draft && l.rejected > 0 ? (
                                  <>
                                    <Select aria-label="Rejection reason" aria-invalid={!!errors[`reason-${l.id}`]} value={l.reason} onChange={(e) => setLine(l.id, { reason: e.target.value })}>
                                      <option value="">Select…</option>
                                      {REJECT_REASONS.map((r) => <option key={r}>{r}</option>)}
                                    </Select>
                                    {errors[`reason-${l.id}`] && <p className="mt-0.5 text-2xs text-danger">{errors[`reason-${l.id}`]}</p>}
                                  </>
                                ) : <span className="text-ink-2">{l.reason || "—"}</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-ink-3">
                    Light inspection at receipt: rejected quantity is returned to the vendor and raised as a debit note. Receipt tolerance {TOLERANCE.qtyPct}% over pending quantity.
                  </p>
                </div>
              ),
            },
          ]}
        />
      </Sheet>

      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        size="sm"
        title={`Post ${g.number}?`}
        description="Posting writes the stock ledger and the GRN-not-invoiced liability. It cannot be edited afterwards."
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>Back</Button>
            <Button variant="primary" onClick={post}>Post GRN</Button>
          </>
        }
      >
        <ul className="space-y-1.5 text-sm">
          {d.lines.map((l) => (
            <li key={l.id} className="flex justify-between gap-3">
              <span className="truncate">{name(l.itemId)}</span>
              <span className="tabular shrink-0">
                <span className="font-medium text-success">{formatNum(l.accepted)} accepted</span>
                {l.rejected > 0 && <span className="ml-2 text-danger">{formatNum(l.rejected)} rejected</span>}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-3">Into {whById(d.warehouseId).name}</p>
      </Dialog>
    </FormPage>
  );
}
