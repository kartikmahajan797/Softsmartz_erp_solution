"use client";

import Link from "next/link";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  Factory,
  FileText,
  IndianRupee,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Printer,
  Trash2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import {
  Banner,
  Chatter,
  FieldGrid,
  FormPage,
  Notebook,
  Sheet,
  SheetTitle,
  SmartButton,
  SmartButtons,
  StatusBar,
  Totals,
} from "@/components/erp/form-view";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Field, Input, ReadValue, Select, Textarea } from "@/components/ui/form";
import { Dialog, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/overlay";
import { company, itemById, items, parties, partyById } from "@/lib/data/masters";
import { useApp, useRole } from "@/lib/store/app";
import { type SOLine, type SalesOrder, lineTaxable, soTotals, useSales } from "@/lib/store/sales";
import { amountInWords, cn, formatDate, formatINR, formatLakh, formatNum, TODAY } from "@/lib/utils";

const STEPS = [
  { key: "draft", label: "Draft" },
  { key: "confirmed", label: "Confirmed" },
  { key: "partially_delivered", label: "Partly delivered" },
  { key: "delivered", label: "Delivered" },
  { key: "closed", label: "Closed" },
];

const blank = (): Omit<SalesOrder, "id" | "number" | "activities" | "workOrders" | "deliveries" | "invoices"> => ({
  customerId: "",
  date: TODAY,
  deliveryDate: "",
  customerPo: "",
  status: "draft",
  lines: [{ id: "l1", itemId: "", qty: 0, rate: 0, discountPct: 0, delivered: 0, invoiced: 0 }],
  paymentTermsDays: 30,
  notes: "",
});

export default function SalesOrderPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const router = useRouter();
  const role = useRole();
  const lang = useApp((s) => s.lang);
  const so = useSales((s) => s.orders.find((o) => o.id === id));
  const { addOrder, updateOrder, setStatus, logNote, deliver, linkWorkOrders } = useSales.getState();

  const [draft, setDraft] = React.useState(() => (so ? { ...so } : blank()));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [deliverOpen, setDeliverOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);

  React.useEffect(() => {
    if (so) setDraft({ ...so });
  }, [so]);

  if (!isNew && !so) {
    return (
      <div className="p-10 text-center text-sm text-ink-3">
        Sales order not found. <Link href="/sales/orders" className="text-primary-700 underline">Back to list</Link>
      </div>
    );
  }

  const editable = isNew || so!.status === "draft";
  const customer = draft.customerId ? partyById(draft.customerId) : undefined;
  const totals = draft.customerId ? soTotals(draft) : null;
  // Exposure = outstanding invoices + this order's value not yet invoiced.
  const uninvoiced = totals ? totals.total * (1 - draft.lines.reduce((a, l) => a + l.invoiced, 0) / Math.max(1, draft.lines.reduce((a, l) => a + l.qty, 0))) : 0;
  const creditUsed = customer?.creditLimit ? customer.outstanding + uninvoiced : 0;
  const overCredit = !!customer?.creditLimit && creditUsed > customer.creditLimit;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!draft.customerId) e.customer = "Select a customer";
    if (!draft.deliveryDate) e.deliveryDate = "Delivery date is required";
    else if (draft.deliveryDate < draft.date) e.deliveryDate = "Cannot be before the order date";
    const valid = draft.lines.filter((l) => l.itemId);
    if (!valid.length) e.lines = "Add at least one line";
    draft.lines.forEach((l) => {
      if (l.itemId && l.qty <= 0) e[`qty-${l.id}`] = "> 0";
      if (l.itemId && l.rate <= 0) e[`rate-${l.id}`] = "> 0";
      if (l.discountPct < 0 || l.discountPct > 100) e[`disc-${l.id}`] = "0-100";
    });
    setErrors(e);
    if (Object.keys(e).length) toast.error("Please fix the highlighted fields");
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validate()) return null;
    const clean = { ...draft, lines: draft.lines.filter((l) => l.itemId) };
    if (isNew) {
      const created = addOrder(clean, role.user);
      toast.success(`${created.number} saved as draft`);
      router.replace(`/sales/orders/${created.id}`);
      return created;
    }
    updateOrder(so!.id, clean);
    toast.success("Changes saved");
    return so!;
  };

  const confirm = () => {
    const saved = save();
    if (!saved) return;
    if (overCredit) {
      setStatus(saved.id, "pending_approval", role.user, `Sent for approval: credit limit ${formatLakh(customer!.creditLimit!)} exceeded (${formatLakh(creditUsed)} with this order)`, "system");
      toast.warning("Sent for approval", { description: "Customer credit limit exceeded (FR-SP-01, FR-PL-04)" });
    } else {
      setStatus(saved.id, "confirmed", role.user, "Confirmed · credit check passed");
      toast.success("Sales order confirmed");
    }
  };

  const setLine = (lid: string, patch: Partial<SOLine>) =>
    setDraft((d) => ({ ...d, lines: d.lines.map((l) => (l.id === lid ? { ...l, ...patch } : l)) }));

  const name = (iid: string) => {
    const it = itemById(iid);
    return lang === "hi" ? it.nameHi : it.name;
  };

  const actions = isNew ? (
    <>
      <Button variant="primary" onClick={confirm}>Confirm</Button>
      <Button onClick={save}>Save draft</Button>
      <Button variant="ghost" onClick={() => router.push("/sales/orders")}>Discard</Button>
    </>
  ) : (
    <>
      {so!.status === "draft" && (
        <>
          <Button variant="primary" onClick={confirm}>Confirm</Button>
          <Button onClick={save}>Save</Button>
        </>
      )}
      {so!.status === "pending_approval" &&
        (role.approves ? (
          <>
            <Button variant="primary" onClick={() => { setStatus(so!.id, "confirmed", role.user, "Approved credit override", "approved"); toast.success("Approved and confirmed"); }}>
              Approve
            </Button>
            <Button variant="danger" onClick={() => { setStatus(so!.id, "draft", role.user, "Approval rejected — returned to draft", "status"); toast("Returned to draft"); }}>
              Reject
            </Button>
          </>
        ) : (
          <span className="text-sm text-ink-3">Waiting for Owner approval</span>
        ))}
      {["confirmed", "partially_delivered"].includes(so!.status) && (
        <>
          {so!.workOrders.length === 0 ? (
            <Button
              variant="primary"
              onClick={() => {
                const wos = so!.lines.map((_, i) => `WO-2026-${String(190 + i).padStart(5, "0")}`);
                linkWorkOrders(so!.id, wos, role.user);
                toast.success("Production plan generated", {
                  description: `Multi-level BOM exploded · ${wos.length} work order(s) · 1 shortage`,
                  action: { label: "Open plan", onClick: () => router.push("/manufacturing/plans") },
                });
              }}
            >
              <Factory /> Generate production plan
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setDeliverOpen(true)}>
              <Truck /> Create delivery
            </Button>
          )}
          {so!.workOrders.length > 0 && <Button onClick={() => router.push("/finance/invoices")}>Create invoice</Button>}
        </>
      )}
      <Menu>
        <MenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More actions"><MoreHorizontal /></Button>
        </MenuTrigger>
        <MenuContent align="start">
          <MenuItem icon={<Printer />} onSelect={() => toast.success("PDF generated", { description: "Branded order acknowledgement (FR-PL-07)" })}>Print acknowledgement</MenuItem>
          <MenuItem icon={<MessageCircle />} onSelect={() => toast.success(`Sent on WhatsApp to ${customer?.contact}`, { description: customer?.phone })}>Send on WhatsApp</MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Ban />} danger disabled={so!.deliveries.length > 0 || ["cancelled", "closed"].includes(so!.status)} onSelect={() => setCancelOpen(true)}>
            Cancel order
          </MenuItem>
        </MenuContent>
      </Menu>
    </>
  );

  return (
    <FormPage
      crumbs={[{ label: "Sales", href: "/sales/orders" }, { label: "Sales orders", href: "/sales/orders" }, { label: isNew ? "New" : so!.number }]}
      actions={actions}
      status={
        !isNew && so!.status !== "cancelled" ? (
          <StatusBar steps={STEPS} current={so!.status === "pending_approval" ? "draft" : so!.status} />
        ) : !isNew ? (
          <StatusBadge status="cancelled" />
        ) : null
      }
      banner={
        !isNew && so!.status === "pending_approval" ? (
          <Banner tone="warning" icon={<AlertTriangle />}>
            Waiting for approval: credit limit of {customer && formatLakh(customer.creditLimit ?? 0)} exceeded. Outstanding {customer && formatLakh(customer.outstanding)} + this order {totals && formatLakh(totals.total)}.
          </Banner>
        ) : editable && overCredit ? (
          <Banner tone="warning" icon={<AlertTriangle />}>
            This order takes {customer?.name} over its credit limit. Confirming will route it to the Owner for approval.
          </Banner>
        ) : null
      }
      chatter={!isNew ? <Chatter activities={so!.activities} onLog={(t) => logNote(so!.id, role.user, t)} /> : undefined}
    >
      <Sheet>
        {!isNew && (
          <SmartButtons>
            <SmartButton icon={<Factory />} label="Work orders" value={so!.workOrders.length} href="/manufacturing/work-orders" />
            <SmartButton icon={<Truck />} label="Deliveries" value={so!.deliveries.length} href="/sales/deliveries" />
            <SmartButton icon={<FileText />} label="Invoices" value={so!.invoices.length} href="/finance/invoices" />
            {role.seesCost && customer && <SmartButton icon={<IndianRupee />} label="Outstanding" value={formatLakh(customer.outstanding)} href="/finance/ageing" />}
          </SmartButtons>
        )}

        <SheetTitle label="Sales order" title={isNew ? "New" : so!.number} badge={!isNew && <StatusBadge status={so!.status} />} />

        <FieldGrid>
          <div className="space-y-3">
            <Field label="Customer" required error={errors.customer} htmlFor="customer">
              {editable ? (
                <Select
                  id="customer"
                  aria-invalid={!!errors.customer}
                  value={draft.customerId}
                  onChange={(e) => {
                    const p = partyById(e.target.value);
                    setDraft((d) => ({ ...d, customerId: e.target.value, paymentTermsDays: p?.paymentTermsDays ?? 30 }));
                  }}
                >
                  <option value="">Select customer…</option>
                  {parties.filter((p) => p.type.includes("customer")).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              ) : (
                <ReadValue>
                  <Link href="/sales/customers" className="font-medium text-primary-700 hover:underline">{customer?.name}</Link>
                </ReadValue>
              )}
            </Field>
            <Field label="GSTIN">
              <ReadValue mono>{customer?.gstin ?? "—"}</ReadValue>
            </Field>
            <Field label="Place of supply" hint={customer ? (customer.stateCode === company.stateCode ? "Intra-state · CGST + SGST" : "Inter-state · IGST") : undefined}>
              <ReadValue>{customer ? `${customer.stateCode} - ${customer.state}` : "—"}</ReadValue>
            </Field>
            <Field label="Customer PO" htmlFor="po">
              {editable ? (
                <Input id="po" value={draft.customerPo} onChange={(e) => setDraft((d) => ({ ...d, customerPo: e.target.value }))} placeholder="e.g. DML/PO/26/4471" />
              ) : (
                <ReadValue mono>{so!.customerPo || "—"}</ReadValue>
              )}
            </Field>
          </div>
          <div className="space-y-3">
            <Field label="Order date" required htmlFor="date">
              {editable ? (
                <Input id="date" type="date" value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />
              ) : (
                <ReadValue>{formatDate(so!.date)}</ReadValue>
              )}
            </Field>
            <Field label="Delivery date" required error={errors.deliveryDate} htmlFor="dd">
              {editable ? (
                <Input id="dd" type="date" aria-invalid={!!errors.deliveryDate} value={draft.deliveryDate} onChange={(e) => setDraft((d) => ({ ...d, deliveryDate: e.target.value }))} />
              ) : (
                <ReadValue>{formatDate(so!.deliveryDate)}</ReadValue>
              )}
            </Field>
            <Field label="Payment terms" htmlFor="terms">
              {editable ? (
                <Select id="terms" value={draft.paymentTermsDays} onChange={(e) => setDraft((d) => ({ ...d, paymentTermsDays: Number(e.target.value) }))}>
                  {[0, 15, 30, 45, 60, 90].map((n) => (
                    <option key={n} value={n}>{n === 0 ? "Immediate" : `${n} days`}</option>
                  ))}
                </Select>
              ) : (
                <ReadValue>{so!.paymentTermsDays} days</ReadValue>
              )}
            </Field>
            {role.seesCost && customer?.creditLimit && (
              <Field label="Credit limit">
                <div className="pt-1.5">
                  <div className="flex justify-between text-xs">
                    <span className={cn(overCredit ? "font-medium text-danger" : "text-ink-2")}>{formatLakh(creditUsed)} used</span>
                    <span className="text-ink-3">of {formatLakh(customer.creditLimit)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div className={cn("h-full rounded-full", overCredit ? "bg-danger" : "bg-primary-600")} style={{ width: `${Math.min(100, (creditUsed / customer.creditLimit) * 100)}%` }} />
                  </div>
                </div>
              </Field>
            )}
          </div>
        </FieldGrid>

        <Notebook
          tabs={[
            {
              key: "lines",
              label: "Order lines",
              count: draft.lines.filter((l) => l.itemId).length,
              content: (
                <div>
                  {errors.lines && <p className="mb-2 text-xs text-danger">{errors.lines}</p>}
                  <div className="overflow-x-auto rounded-lg border border-line">
                    <table className="w-full min-w-[700px] text-sm">
                      <thead className="bg-surface-2 text-xs text-ink-2">
                        <tr className="border-b border-line">
                          <th className="px-3 py-2 text-left font-semibold">Item</th>
                          <th className="w-[72px] px-2 py-2 text-left font-semibold">HSN</th>
                          <th className="w-20 px-2 py-2 text-right font-semibold">Qty</th>
                          <th className="w-12 px-2 py-2 text-left font-semibold">UoM</th>
                          <th className="w-24 px-2 py-2 text-right font-semibold">Rate (₹)</th>
                          <th className="w-[68px] px-2 py-2 text-right font-semibold">Disc %</th>
                          <th className="w-14 px-2 py-2 text-right font-semibold">GST</th>
                          <th className="w-28 px-3 py-2 text-right font-semibold">Taxable (₹)</th>
                          {editable && <th className="w-10" />}
                        </tr>
                      </thead>
                      <tbody>
                        {draft.lines.map((l) => {
                          const it = l.itemId ? itemById(l.itemId) : undefined;
                          return (
                            <tr key={l.id} className="border-b border-line last:border-0">
                              <td className="px-3 py-1.5">
                                {editable ? (
                                  <Select
                                    aria-label="Item"
                                    value={l.itemId}
                                    onChange={(e) => {
                                      const ni = itemById(e.target.value);
                                      setLine(l.id, { itemId: e.target.value, rate: ni?.salePrice ?? 0 });
                                    }}
                                  >
                                    <option value="">Select item…</option>
                                    {items.filter((i) => i.type === "fg").map((i) => (
                                      <option key={i.id} value={i.id}>{i.code} — {lang === "hi" ? i.nameHi : i.name}</option>
                                    ))}
                                  </Select>
                                ) : (
                                  <div>
                                    <div className="font-medium">{name(l.itemId)}</div>
                                    <div className="font-mono text-2xs text-ink-3">{it?.code}</div>
                                  </div>
                                )}
                              </td>
                              <td className="px-2 py-1.5 font-mono text-xs text-ink-2">{it?.hsn ?? ""}</td>
                              <td className="px-2 py-1.5 text-right">
                                {editable ? (
                                  <Input type="number" min={0} aria-label="Quantity" aria-invalid={!!errors[`qty-${l.id}`]} className="text-right" value={l.qty || ""} onChange={(e) => setLine(l.id, { qty: Number(e.target.value) })} />
                                ) : (
                                  <span className="tabular">{formatNum(l.qty)}</span>
                                )}
                              </td>
                              <td className="px-2 py-1.5 text-ink-2">{it?.uom}</td>
                              <td className="px-2 py-1.5 text-right">
                                {editable ? (
                                  <Input type="number" min={0} step="0.01" aria-label="Rate" aria-invalid={!!errors[`rate-${l.id}`]} className="text-right" value={l.rate || ""} onChange={(e) => setLine(l.id, { rate: Number(e.target.value) })} />
                                ) : (
                                  <span className="tabular">{formatNum(l.rate)}</span>
                                )}
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                {editable ? (
                                  <Input type="number" min={0} max={100} aria-label="Discount percent" aria-invalid={!!errors[`disc-${l.id}`]} className="text-right" value={l.discountPct || ""} onChange={(e) => setLine(l.id, { discountPct: Number(e.target.value) })} />
                                ) : (
                                  <span className="tabular">{l.discountPct}</span>
                                )}
                              </td>
                              <td className="tabular px-2 py-1.5 text-right text-ink-2">{it ? `${it.gstRate}%` : ""}</td>
                              <td className="tabular px-3 py-1.5 text-right font-medium">{l.itemId ? formatNum(lineTaxable(l)) : ""}</td>
                              {editable && (
                                <td className="pr-2">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Remove line"
                                    onClick={() => setDraft((d) => ({ ...d, lines: d.lines.length > 1 ? d.lines.filter((x) => x.id !== l.id) : d.lines }))}
                                  >
                                    <Trash2 />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {editable && (
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => setDraft((d) => ({ ...d, lines: [...d.lines, { id: `l${Date.now()}`, itemId: "", qty: 0, rate: 0, discountPct: 0, delivered: 0, invoiced: 0 }] }))}
                    >
                      <Plus /> Add a line
                    </Button>
                  )}
                  {totals && (
                    <div className="mt-4 flex flex-col gap-4 border-t border-line pt-4 md:flex-row md:items-start">
                      <p className="flex-1 text-xs text-ink-3 italic">{amountInWords(totals.total)}</p>
                      <Totals
                        rows={[
                          { label: "Taxable value", value: formatINR(totals.taxable) },
                          ...(totals.interstate
                            ? [{ label: "IGST", value: formatINR(totals.igst) }]
                            : [
                                { label: "CGST", value: formatINR(totals.cgst) },
                                { label: "SGST", value: formatINR(totals.sgst) },
                              ]),
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
                    key: "fulfil",
                    label: "Delivery & invoicing",
                    content: (
                      <div className="overflow-x-auto rounded-lg border border-line">
                        <table className="w-full min-w-[640px] text-sm">
                          <thead className="bg-surface-2 text-xs text-ink-2">
                            <tr className="border-b border-line">
                              <th className="px-3 py-2 text-left font-semibold">Item</th>
                              <th className="px-3 py-2 text-right font-semibold">Ordered</th>
                              <th className="px-3 py-2 text-right font-semibold">Delivered</th>
                              <th className="px-3 py-2 text-right font-semibold">Invoiced</th>
                              <th className="px-3 py-2 text-right font-semibold">FG free stock</th>
                              <th className="w-40 px-3 py-2 font-semibold">Progress</th>
                            </tr>
                          </thead>
                          <tbody>
                            {so!.lines.map((l) => {
                              const it = itemById(l.itemId);
                              return (
                                <tr key={l.id} className="border-b border-line last:border-0">
                                  <td className="px-3 py-2 font-medium">{name(l.itemId)}</td>
                                  <td className="tabular px-3 py-2 text-right">{formatNum(l.qty)}</td>
                                  <td className="tabular px-3 py-2 text-right">{formatNum(l.delivered)}</td>
                                  <td className="tabular px-3 py-2 text-right">{formatNum(l.invoiced)}</td>
                                  <td className="tabular px-3 py-2 text-right text-ink-2">{formatNum(it.onHand - it.reserved + (l.qty - l.delivered))}</td>
                                  <td className="px-3 py-2">
                                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                                      <div className="h-full rounded-full bg-primary-600" style={{ width: `${(l.delivered / l.qty) * 100}%` }} />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
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
                  <Field label="Internal notes" layout="vertical">
                    {editable ? (
                      <Textarea value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} placeholder="Packing, delivery instructions…" />
                    ) : (
                      <ReadValue>{so!.notes || "—"}</ReadValue>
                    )}
                  </Field>
                  <div className="space-y-3">
                    <Field label="Company GSTIN"><ReadValue mono>{company.gstin}</ReadValue></Field>
                    <Field label="Fiscal year"><ReadValue>{company.fiscalYear}</ReadValue></Field>
                    <Field label="Salesperson"><ReadValue>Neha Kulkarni</ReadValue></Field>
                  </div>
                </FieldGrid>
              ),
            },
          ]}
        />
      </Sheet>

      {!isNew && (
        <DeliveryDialog
          open={deliverOpen}
          onOpenChange={setDeliverOpen}
          so={so!}
          onPost={(qty, vehicle) => {
            const n = deliver(so!.id, qty, vehicle, role.user);
            setDeliverOpen(false);
            toast.success(`Delivery ${n} posted`, { description: "Stock moved out of Finished Goods Stores · challan PDF ready" });
          }}
        />
      )}

      <Dialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this sales order?"
        description="Reserved stock is released. This is recorded in the audit trail."
        size="sm"
        footer={
          <>
            <Button onClick={() => setCancelOpen(false)}>Keep order</Button>
            <Button
              variant="danger"
              onClick={() => {
                setStatus(so!.id, "cancelled", role.user, "Order cancelled");
                setCancelOpen(false);
                toast("Sales order cancelled");
              }}
            >
              Cancel order
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">Orders with deliveries cannot be cancelled; short-close them instead.</p>
      </Dialog>
    </FormPage>
  );
}

function DeliveryDialog({
  open,
  onOpenChange,
  so,
  onPost,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  so: SalesOrder;
  onPost: (qty: Record<string, number>, vehicle: string) => void;
}) {
  const [qty, setQty] = React.useState<Record<string, number>>({});
  const [vehicle, setVehicle] = React.useState("");
  const [err, setErr] = React.useState("");
  React.useEffect(() => {
    if (open) {
      setQty(Object.fromEntries(so.lines.map((l) => [l.id, Math.min(l.qty - l.delivered, itemById(l.itemId).onHand)])));
      setVehicle("");
      setErr("");
    }
  }, [open, so]);

  const submit = () => {
    const bad = so.lines.find((l) => (qty[l.id] ?? 0) > l.qty - l.delivered || (qty[l.id] ?? 0) < 0);
    if (bad) return setErr(`Quantity for ${itemById(bad.itemId).code} exceeds the remaining ${bad.qty - bad.delivered}`);
    if (!Object.values(qty).some((v) => v > 0)) return setErr("Enter a quantity on at least one line");
    if (!/^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{0,3}\s?\d{3,4}$/i.test(vehicle.trim())) return setErr("Enter a valid vehicle number, e.g. MH14 GU 4471");
    onPost(Object.fromEntries(Object.entries(qty).filter(([, v]) => v > 0)), vehicle.toUpperCase());
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Deliver ${so.number}`}
      description="Posts a delivery challan and moves stock out of Finished Goods Stores (FIFO batches)."
      size="lg"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" onClick={submit}><Truck /> Post delivery</Button>
        </>
      }
    >
      <table className="w-full text-sm">
        <thead className="text-xs text-ink-3">
          <tr className="border-b border-line">
            <th className="py-2 text-left font-medium">Item</th>
            <th className="py-2 text-right font-medium">Remaining</th>
            <th className="py-2 text-right font-medium">In stock</th>
            <th className="w-32 py-2 text-right font-medium">Deliver now</th>
          </tr>
        </thead>
        <tbody>
          {so.lines.map((l) => {
            const it = itemById(l.itemId);
            return (
              <tr key={l.id} className="border-b border-line">
                <td className="py-2">
                  <div className="font-medium">{it.name}</div>
                  <div className="font-mono text-2xs text-ink-3">{it.code}</div>
                </td>
                <td className="tabular py-2 text-right">{formatNum(l.qty - l.delivered)}</td>
                <td className="tabular py-2 text-right text-ink-2">{formatNum(it.onHand)}</td>
                <td className="py-2 pl-3">
                  <Input type="number" min={0} className="text-right" aria-label={`Deliver quantity for ${it.code}`} value={qty[l.id] ?? 0} onChange={(e) => setQty((q) => ({ ...q, [l.id]: Number(e.target.value) }))} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Vehicle number" required layout="vertical" htmlFor="veh">
          <Input id="veh" value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="MH14 GU 4471" />
        </Field>
        <Field label="e-Way bill" layout="vertical" hint="Generated from the invoice if consignment value needs it">
          <ReadValue>Auto (via GSP)</ReadValue>
        </Field>
      </div>
      {err && <p className="mt-3 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{err}</p>}
    </Dialog>
  );
}
