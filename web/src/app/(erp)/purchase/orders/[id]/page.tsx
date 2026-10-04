"use client";

import Link from "next/link";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, Ban, ClipboardList, FileText, Mail, MessageCircle, MoreHorizontal, PackageCheck, Plus, Printer, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Banner, Chatter, FieldGrid, FormPage, Notebook, Sheet, SheetTitle, SmartButton, SmartButtons, StatusBar, Totals } from "@/components/erp/form-view";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Field, Input, ReadValue, Select, Textarea } from "@/components/ui/form";
import { Dialog, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/overlay";
import { MsmeBadge, useItemName } from "@/components/inventory/shared";
import { company, parties, partyById } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { useInventory } from "@/lib/store/inventory";
import { type POLine, type PurchaseOrder, PO_APPROVAL_LIMIT, poTotals, usePurchase } from "@/lib/store/purchase";
import { amountInWords, formatDate, formatINR, formatNum, TODAY } from "@/lib/utils";

const STEPS = [
  { key: "draft", label: "Draft" },
  { key: "pending_approval", label: "Approval" },
  { key: "approved", label: "Approved" },
  { key: "partially_received", label: "Partly received" },
  { key: "received", label: "Received" },
  { key: "closed", label: "Closed" },
];

type Draft = Omit<PurchaseOrder, "id" | "number" | "activities" | "grns" | "bills">;

const blank = (): Draft => ({
  vendorId: "",
  date: TODAY,
  expectedDate: "",
  status: "draft",
  lines: [{ id: "l1", itemId: "", qty: 0, rate: 0, received: 0 }],
  paymentTermsDays: 30,
  notes: "",
  prNumbers: [],
});

export default function PurchaseOrderPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const router = useRouter();
  const role = useRole();
  const name = useItemName();
  const items = useInventory((s) => s.items);
  const po = usePurchase((s) => s.orders.find((o) => o.id === id));
  const receipts = usePurchase((s) => s.receipts);
  const bills = usePurchase((s) => s.bills);
  const { addPO, updatePO, setPOStatus, logPO, createGRN } = usePurchase.getState();
  const [d, setD] = React.useState<Draft>(() => (po ? { ...po } : blank()));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [cancelOpen, setCancelOpen] = React.useState(false);

  React.useEffect(() => {
    if (po) setD({ ...po });
  }, [po]);

  if (!isNew && !po) return <div className="p-10 text-center text-sm text-ink-3">Purchase order not found. <Link href="/purchase/orders" className="text-primary-700 underline">Back</Link></div>;

  const it = (iid: string) => items.find((i) => i.id === iid)!;
  const editable = isNew || po!.status === "draft";
  const showRates = role.key !== "store";
  const vendor = d.vendorId ? partyById(d.vendorId) : undefined;
  const totals = d.vendorId ? poTotals(d) : null;
  const overLimit = !!totals && totals.total > PO_APPROVAL_LIMIT;

  const setLine = (lid: string, patch: Partial<POLine>) => setD((x) => ({ ...x, lines: x.lines.map((l) => (l.id === lid ? { ...l, ...patch } : l)) }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!d.vendorId) e.vendor = "Select a vendor";
    if (!d.expectedDate) e.expected = "Expected date is required";
    else if (d.expectedDate < d.date) e.expected = "Cannot be before the order date";
    if (!d.lines.some((l) => l.itemId)) e.lines = "Add at least one line";
    d.lines.forEach((l) => {
      if (l.itemId && !(l.qty > 0)) e[`qty-${l.id}`] = "> 0";
      if (l.itemId && !(l.rate > 0)) e[`rate-${l.id}`] = "> 0";
    });
    setErrors(e);
    if (Object.keys(e).length) toast.error("Please fix the highlighted fields");
    return !Object.keys(e).length;
  };

  const save = () => {
    if (!validate()) return null;
    const clean = { ...d, lines: d.lines.filter((l) => l.itemId) };
    if (isNew) {
      const created = addPO(clean, role.user);
      toast.success(`${created.number} saved as draft`);
      router.replace(`/purchase/orders/${created.id}`);
      return created;
    }
    updatePO(po!.id, clean);
    toast.success("Changes saved");
    return po!;
  };

  const confirm = () => {
    const saved = save();
    if (!saved) return;
    if (overLimit) {
      setPOStatus(saved.id, "pending_approval", role.user, `Sent for approval: ${formatINR(totals!.total)} exceeds the ${formatINR(PO_APPROVAL_LIMIT)} PO limit`, "system");
      toast.warning("Sent for approval", { description: `Above the ${formatINR(PO_APPROVAL_LIMIT)} limit (FR-PL-04)` });
    } else {
      setPOStatus(saved.id, "approved", role.user, "Confirmed · within limit, auto-approved", "approved");
      toast.success("Purchase order approved");
    }
  };

  const receive = () => {
    const draftGrn = receipts.find((g) => g.poId === po!.id && g.status === "draft");
    const g = draftGrn ?? createGRN(po!.id, role.user);
    if (!draftGrn) toast.success(`${g.number} created`, { description: "Enter received, accepted and rejected quantities, then post" });
    router.push(`/purchase/receipts/${g.id}`);
  };

  const actions = isNew ? (
    <>
      <Button variant="primary" onClick={confirm}>Confirm order</Button>
      <Button onClick={save}>Save draft</Button>
      <Button variant="ghost" onClick={() => router.push("/purchase/orders")}>Discard</Button>
    </>
  ) : (
    <>
      {po!.status === "draft" && (
        <>
          <Button variant="primary" onClick={confirm}>Confirm order</Button>
          <Button onClick={save}>Save</Button>
        </>
      )}
      {po!.status === "pending_approval" &&
        (role.approves ? (
          <>
            <Button variant="primary" onClick={() => { setPOStatus(po!.id, "approved", role.user, `Approved ${formatINR(poTotals(po!).total)}`, "approved"); toast.success("Purchase order approved", { description: "Vendor can now be sent the PO" }); }}>Approve</Button>
            <Button variant="danger" onClick={() => { setPOStatus(po!.id, "draft", role.user, "Approval rejected — returned to draft"); toast("Returned to draft"); }}>Reject</Button>
          </>
        ) : (
          <span className="text-sm text-ink-3">Waiting for Owner approval</span>
        ))}
      {["approved", "partially_received"].includes(po!.status) && (
        <>
          <Button variant="primary" onClick={receive}><PackageCheck /> Receive goods</Button>
          <Button onClick={() => toast.success(`PO sent on WhatsApp to ${vendor?.contact}`, { description: `${vendor?.phone} · PDF with company branding` })}><MessageCircle /> Send on WhatsApp</Button>
        </>
      )}
      <Menu>
        <MenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More actions"><MoreHorizontal /></Button>
        </MenuTrigger>
        <MenuContent align="start">
          <MenuItem icon={<Printer />} onSelect={() => toast.success("PO PDF generated (FR-PL-07)")}>Print PO</MenuItem>
          <MenuItem icon={<Mail />} onSelect={() => toast.success(`PO emailed to ${vendor?.name}`)}>Email to vendor</MenuItem>
          {po!.status === "partially_received" && (
            <MenuItem icon={<ClipboardList />} onSelect={() => { setPOStatus(po!.id, "closed", role.user, "Short-closed · balance quantity cancelled"); toast("PO short-closed"); }}>Short-close</MenuItem>
          )}
          <MenuSeparator />
          <MenuItem icon={<Ban />} danger disabled={po!.grns.length > 0 || ["cancelled", "closed", "received"].includes(po!.status)} onSelect={() => setCancelOpen(true)}>Cancel PO</MenuItem>
        </MenuContent>
      </Menu>
    </>
  );

  const vendors = parties.filter((p) => p.type.includes("vendor"));

  return (
    <FormPage
      crumbs={[{ label: "Purchase", href: "/purchase/orders" }, { label: "Purchase orders", href: "/purchase/orders" }, { label: isNew ? "New" : po!.number }]}
      actions={actions}
      status={!isNew && po!.status !== "cancelled" ? <StatusBar steps={STEPS} current={po!.status} /> : !isNew ? <StatusBadge status="cancelled" /> : null}
      banner={
        !isNew && po!.status === "pending_approval" ? (
          <Banner tone="warning" icon={<AlertTriangle />}>
            Waiting for approval: {formatINR(poTotals(po!).total)} exceeds the {formatINR(PO_APPROVAL_LIMIT)} PO approval limit.
          </Banner>
        ) : editable && overLimit ? (
          <Banner tone="info" icon={<AlertTriangle />}>This order is above {formatINR(PO_APPROVAL_LIMIT)} — confirming routes it to the Owner for approval.</Banner>
        ) : undefined
      }
      chatter={!isNew ? <Chatter activities={po!.activities} onLog={(t) => logPO(po!.id, role.user, t)} /> : undefined}
    >
      <Sheet>
        {!isNew && (
          <SmartButtons>
            <SmartButton icon={<FileText />} label="Requisitions" value={po!.prNumbers.length} href="/purchase/requisitions" />
            <SmartButton icon={<PackageCheck />} label="Receipts" value={po!.grns.length} href="/purchase/receipts" />
            <SmartButton icon={<Receipt />} label="Bills" value={bills.filter((b) => b.poId === po!.id).length} href="/purchase/bills" />
          </SmartButtons>
        )}
        <SheetTitle label="Purchase order" title={isNew ? "New" : po!.number} badge={!isNew && <StatusBadge status={po!.status} />} />

        <FieldGrid>
          <div className="space-y-3">
            <Field label="Vendor" required error={errors.vendor} htmlFor="vendor">
              {editable ? (
                <Select
                  id="vendor"
                  aria-invalid={!!errors.vendor}
                  value={d.vendorId}
                  onChange={(e) => setD((x) => ({ ...x, vendorId: e.target.value, paymentTermsDays: partyById(e.target.value)?.paymentTermsDays ?? 30 }))}
                >
                  <option value="">Select vendor…</option>
                  {vendors.map((p) => <option key={p.id} value={p.id}>{p.name}{p.msme ? " (MSME)" : ""}</option>)}
                </Select>
              ) : (
                <ReadValue>
                  <span className="flex items-center gap-2">
                    <Link href="/purchase/vendors" className="font-medium text-primary-700 hover:underline">{vendor?.name}</Link>
                    {vendor?.msme && <MsmeBadge />}
                  </span>
                </ReadValue>
              )}
            </Field>
            <Field label="GSTIN"><ReadValue mono>{vendor?.gstin ?? "—"}</ReadValue></Field>
            <Field label="Supply from" hint={vendor ? (vendor.stateCode === company.stateCode ? "Intra-state · input CGST + SGST" : "Inter-state · input IGST") : undefined}>
              <ReadValue>{vendor ? `${vendor.stateCode} - ${vendor.state}` : "—"}</ReadValue>
            </Field>
          </div>
          <div className="space-y-3">
            <Field label="Order date" required htmlFor="date">
              {editable ? <Input id="date" type="date" value={d.date} onChange={(e) => setD((x) => ({ ...x, date: e.target.value }))} /> : <ReadValue>{formatDate(po!.date)}</ReadValue>}
            </Field>
            <Field label="Expected delivery" required error={errors.expected} htmlFor="exp">
              {editable ? <Input id="exp" type="date" aria-invalid={!!errors.expected} value={d.expectedDate} onChange={(e) => setD((x) => ({ ...x, expectedDate: e.target.value }))} /> : <ReadValue>{formatDate(po!.expectedDate)}</ReadValue>}
            </Field>
            <Field label="Payment terms" htmlFor="terms" hint={vendor?.msme ? "MSME supplier: pay within the agreed term, max 45 days [verify with CA]" : undefined}>
              {editable ? (
                <Select id="terms" value={d.paymentTermsDays} onChange={(e) => setD((x) => ({ ...x, paymentTermsDays: Number(e.target.value) }))}>
                  {[0, 15, 30, 45, 60].map((n) => <option key={n} value={n}>{n === 0 ? "Advance" : `${n} days`}</option>)}
                </Select>
              ) : (
                <ReadValue>{po!.paymentTermsDays} days</ReadValue>
              )}
            </Field>
          </div>
        </FieldGrid>

        <Notebook
          tabs={[
            {
              key: "lines",
              label: "Order lines",
              count: d.lines.filter((l) => l.itemId).length,
              content: (
                <div>
                  {errors.lines && <p className="mb-2 text-xs text-danger">{errors.lines}</p>}
                  <div className="overflow-x-auto rounded-lg border border-line">
                    <table className="w-full min-w-[680px] text-sm">
                      <thead className="bg-surface-2 text-xs text-ink-2">
                        <tr className="border-b border-line">
                          <th className="px-3 py-2 text-left font-semibold">Item</th>
                          <th className="w-[72px] px-2 py-2 text-left font-semibold">HSN</th>
                          <th className="w-24 px-2 py-2 text-right font-semibold">Qty</th>
                          <th className="w-12 px-2 py-2 text-left font-semibold">UoM</th>
                          {showRates && <th className="w-24 px-2 py-2 text-right font-semibold">Rate (₹)</th>}
                          <th className="w-14 px-2 py-2 text-right font-semibold">GST</th>
                          {showRates && <th className="w-28 px-3 py-2 text-right font-semibold">Amount (₹)</th>}
                          {editable && <th className="w-10" />}
                        </tr>
                      </thead>
                      <tbody>
                        {d.lines.map((l) => {
                          const item = l.itemId ? it(l.itemId) : undefined;
                          return (
                            <tr key={l.id} className="border-b border-line last:border-0">
                              <td className="px-3 py-1.5">
                                {editable ? (
                                  <Select aria-label="Item" value={l.itemId} onChange={(e) => setLine(l.id, { itemId: e.target.value, rate: it(e.target.value)?.standardCost ?? 0 })}>
                                    <option value="">Select item…</option>
                                    {items.filter((i) => i.type !== "fg").map((i) => <option key={i.id} value={i.id}>{i.code} — {i.name}</option>)}
                                  </Select>
                                ) : (
                                  <div>
                                    <div className="font-medium">{name(l.itemId)}</div>
                                    <div className="font-mono text-2xs text-ink-3">{item?.code}</div>
                                  </div>
                                )}
                              </td>
                              <td className="px-2 py-1.5 font-mono text-xs text-ink-2">{item?.hsn}</td>
                              <td className="px-2 py-1.5 text-right">
                                {editable ? <Input type="number" min={0} aria-label="Quantity" aria-invalid={!!errors[`qty-${l.id}`]} className="text-right" value={l.qty || ""} onChange={(e) => setLine(l.id, { qty: Number(e.target.value) })} /> : <span className="tabular">{formatNum(l.qty)}</span>}
                              </td>
                              <td className="px-2 py-1.5 text-ink-2">{item?.uom}</td>
                              {showRates && (
                                <td className="px-2 py-1.5 text-right">
                                  {editable ? <Input type="number" min={0} step="0.01" aria-label="Rate" aria-invalid={!!errors[`rate-${l.id}`]} className="text-right" value={l.rate || ""} onChange={(e) => setLine(l.id, { rate: Number(e.target.value) })} /> : <span className="tabular">{formatNum(l.rate)}</span>}
                                </td>
                              )}
                              <td className="tabular px-2 py-1.5 text-right text-ink-2">{item ? `${item.gstRate}%` : ""}</td>
                              {showRates && <td className="tabular px-3 py-1.5 text-right font-medium">{l.itemId ? formatNum(l.qty * l.rate) : ""}</td>}
                              {editable && (
                                <td className="pr-2">
                                  <Button variant="ghost" size="icon-sm" aria-label="Remove line" onClick={() => setD((x) => ({ ...x, lines: x.lines.length > 1 ? x.lines.filter((y) => y.id !== l.id) : x.lines }))}><Trash2 /></Button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {editable && (
                    <Button variant="link" className="mt-2" onClick={() => setD((x) => ({ ...x, lines: [...x.lines, { id: `l${Date.now()}`, itemId: "", qty: 0, rate: 0, received: 0 }] }))}>
                      <Plus /> Add a line
                    </Button>
                  )}
                  {totals && showRates && (
                    <div className="mt-4 flex flex-col gap-4 border-t border-line pt-4 md:flex-row md:items-start">
                      <p className="flex-1 text-xs text-ink-3 italic">{amountInWords(totals.total)}</p>
                      <Totals
                        rows={[
                          { label: "Taxable value", value: formatINR(totals.taxable) },
                          ...(totals.interstate ? [{ label: "IGST (input)", value: formatINR(totals.igst) }] : [{ label: "CGST (input)", value: formatINR(totals.cgst) }, { label: "SGST (input)", value: formatINR(totals.sgst) }]),
                          { label: "Round off", value: formatINR(totals.roundOff), muted: true },
                          { label: "Total", value: formatINR(totals.total), strong: true },
                        ]}
                      />
                    </div>
                  )}
                </div>
              ),
            },
            ...(!isNew
              ? [
                  {
                    key: "receipts",
                    label: "Receipts",
                    count: po!.grns.length,
                    content: (
                      <div className="overflow-x-auto rounded-lg border border-line">
                        <table className="w-full min-w-[560px] text-sm">
                          <thead className="bg-surface-2 text-xs text-ink-2">
                            <tr className="border-b border-line">
                              <th className="px-3 py-2 text-left font-semibold">Item</th>
                              <th className="px-3 py-2 text-right font-semibold">Ordered</th>
                              <th className="px-3 py-2 text-right font-semibold">Received</th>
                              <th className="px-3 py-2 text-right font-semibold">Pending</th>
                              <th className="w-40 px-3 py-2 font-semibold">Progress</th>
                            </tr>
                          </thead>
                          <tbody>
                            {po!.lines.map((l) => (
                              <tr key={l.id} className="border-b border-line last:border-0">
                                <td className="px-3 py-2 font-medium">{name(l.itemId)}</td>
                                <td className="tabular px-3 py-2 text-right">{formatNum(l.qty)}</td>
                                <td className="tabular px-3 py-2 text-right">{formatNum(l.received)}</td>
                                <td className="tabular px-3 py-2 text-right font-medium">{formatNum(Math.max(0, l.qty - l.received))}</td>
                                <td className="px-3 py-2">
                                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-primary-600" style={{ width: `${Math.min(100, (l.received / l.qty) * 100)}%` }} /></div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {po!.grns.length > 0 && (
                          <div className="flex flex-wrap gap-2 border-t border-line px-3 py-2 text-xs">
                            {po!.grns.map((n) => {
                              const g = receipts.find((x) => x.number === n);
                              return g ? <Link key={n} href={`/purchase/receipts/${g.id}`} className="font-mono text-primary-700 hover:underline">{n}</Link> : <span key={n} className="font-mono">{n}</span>;
                            })}
                          </div>
                        )}
                      </div>
                    ),
                  },
                ]
              : []),
            {
              key: "other",
              label: "Other info",
              content: (
                <FieldGrid>
                  <Field label="Terms & notes" layout="vertical">
                    {editable ? <Textarea value={d.notes} onChange={(e) => setD((x) => ({ ...x, notes: e.target.value }))} placeholder="Test certificates, packing, delivery address…" /> : <ReadValue>{po!.notes || "—"}</ReadValue>}
                  </Field>
                  <div className="space-y-3">
                    <Field label="Deliver to"><ReadValue>{company.plant}</ReadValue></Field>
                    <Field label="Company GSTIN"><ReadValue mono>{company.gstin}</ReadValue></Field>
                  </div>
                </FieldGrid>
              ),
            },
          ]}
        />
      </Sheet>

      <Dialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        size="sm"
        title="Cancel this purchase order?"
        description="Linked requisitions go back to open. Recorded in the audit trail."
        footer={
          <>
            <Button onClick={() => setCancelOpen(false)}>Keep PO</Button>
            <Button variant="danger" onClick={() => { setPOStatus(po!.id, "cancelled", role.user, "PO cancelled"); setCancelOpen(false); toast("Purchase order cancelled"); }}>Cancel PO</Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">POs with goods receipts cannot be cancelled; short-close them instead.</p>
      </Dialog>
    </FormPage>
  );
}
