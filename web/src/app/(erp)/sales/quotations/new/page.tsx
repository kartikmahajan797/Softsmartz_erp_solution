"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageCircle, Plus, Save, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FieldGrid, FormPage, Notebook, Sheet, SheetTitle, Totals } from "@/components/erp/form-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, ReadValue, Select, Textarea } from "@/components/ui/form";
import { company, itemById, items, parties, partyById } from "@/lib/data/masters";
import { useApp, useRole } from "@/lib/store/app";
import { netRate, type PriceList, usePriceLists, validity } from "@/lib/store/pricelists";
import { lineTaxable, type SOLine, soTotals, useSales } from "@/lib/store/sales";
import { amountInWords, cn, formatDate, formatINR, formatNum, TODAY } from "@/lib/utils";

interface QLine {
  id: string;
  itemId: string;
  qty: number;
  rate: number;
  discountPct: number;
  /** Price list the rate came from, if any. */
  source?: string;
}

const addDays = (iso: string, n: number) => new Date(Date.parse(iso) + n * 864e5).toISOString().slice(0, 10);

/** Highest-priority valid list for the customer (customer-specific first, then standard). */
function listFor(lists: PriceList[], customerId: string, itemId: string) {
  return lists
    .filter((l) => validity(l) === "active" && (l.customers.length === 0 || l.customers.includes(customerId)) && l.lines.some((x) => x.itemId === itemId))
    .sort((a, b) => b.priority - a.priority)[0];
}

export default function NewQuotationPage() {
  const router = useRouter();
  const role = useRole();
  const lang = useApp((s) => s.lang);
  const lists = usePriceLists((s) => s.lists);
  const quotations = useSales((s) => s.quotations);
  const [customerId, setCustomerId] = React.useState("");
  const [date, setDate] = React.useState(TODAY);
  const [validDays, setValidDays] = React.useState(15);
  const [reference, setReference] = React.useState("");
  const [terms, setTerms] = React.useState(
    "Prices ex-works Bhosari, Pune. GST extra as applicable. Delivery 3-4 weeks from PO. Payment as per agreed credit terms.",
  );
  const [lines, setLines] = React.useState<QLine[]>([{ id: "l1", itemId: "", qty: 0, rate: 0, discountPct: 0 }]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const customer = customerId ? partyById(customerId) : undefined;
  const validTill = addDays(date, validDays);
  const filled = lines.filter((l) => l.itemId);
  const asSo: SOLine[] = filled.map((l) => ({ ...l, delivered: 0, invoiced: 0 }));
  const totals = customerId && filled.length ? soTotals({ customerId, lines: asSo }) : null;

  const priceFor = (cid: string, itemId: string, qty: number) => {
    const pl = cid ? listFor(lists, cid, itemId) : undefined;
    const pline = pl?.lines.find((x) => x.itemId === itemId);
    if (pl && pline) return { rate: netRate({ ...pline, discountPct: 0 }, qty), discountPct: pline.discountPct, source: pl.code };
    return { rate: itemById(itemId).salePrice ?? 0, discountPct: 0, source: undefined };
  };

  const setLine = (id: string, patch: Partial<QLine>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const repriceAll = (cid: string) =>
    setLines((ls) => ls.map((l) => (l.itemId ? { ...l, ...priceFor(cid, l.itemId, l.qty) } : l)));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!customerId) e.customer = "Select a customer";
    if (!filled.length) e.lines = "Add at least one item";
    filled.forEach((l) => {
      if (l.qty <= 0) e[`qty-${l.id}`] = "Qty";
      if (l.rate <= 0) e[`rate-${l.id}`] = "Rate";
      if (l.discountPct < 0 || l.discountPct > 100) e[`disc-${l.id}`] = "0-100";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = (send?: "WhatsApp" | "email") => {
    if (!validate()) return toast.error("Please fix the highlighted fields");
    const n = Math.max(...quotations.map((q) => Number(q.number.slice(-5)))) + 1;
    const number = `QT-2026-${String(n).padStart(5, "0")}`;
    useSales.setState((s) => ({
      quotations: [
        { id: `q${Date.now()}`, number, customerId, date, validTill, status: send ? "sent" : "draft", amount: totals!.total },
        ...s.quotations,
      ],
    }));
    if (send) toast.success(`${number} sent on ${send}`, { description: send === "WhatsApp" ? `${customer!.contact} · ${customer!.phone}` : `${customer!.contact} · PDF attached` });
    else toast.success(`${number} saved as draft`);
    router.push("/sales/quotations");
  };

  const maxDisc = Math.max(0, ...filled.map((l) => l.discountPct));

  return (
    <FormPage
      crumbs={[{ label: "Sales", href: "/sales/orders" }, { label: "Quotations", href: "/sales/quotations" }, { label: "New" }]}
      actions={
        <>
          <Button variant="primary" onClick={() => save("WhatsApp")}><MessageCircle /> Save &amp; send on WhatsApp</Button>
          <Button onClick={() => save("email")}><Mail /> Send by email</Button>
          <Button onClick={() => save()}><Save /> Save draft</Button>
          <Button variant="ghost" onClick={() => router.push("/sales/quotations")}>Discard</Button>
        </>
      }
      status={<Badge tone="neutral">Draft</Badge>}
    >
      <Sheet>
        <SheetTitle label="Quotation" title="New" subtitle={customer ? `For ${customer.name}` : "Select a customer to apply their price list"} />
        <FieldGrid>
          <div className="space-y-3">
            <Field label="Customer" required error={errors.customer} htmlFor="customer">
              <Select
                id="customer"
                aria-invalid={!!errors.customer}
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  repriceAll(e.target.value);
                }}
              >
                <option value="">Select customer…</option>
                {parties.filter((p) => p.type.includes("customer")).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="GSTIN"><ReadValue mono>{customer?.gstin ?? "—"}</ReadValue></Field>
            <Field label="Place of supply" hint={customer ? (customer.stateCode === company.stateCode ? "Intra-state · CGST + SGST" : "Inter-state · IGST") : undefined}>
              <ReadValue>{customer ? `${customer.stateCode} - ${customer.state}` : "—"}</ReadValue>
            </Field>
            <Field label="Enquiry ref." htmlFor="ref">
              <Input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. RFQ email dated 01-Oct" />
            </Field>
          </div>
          <div className="space-y-3">
            <Field label="Quotation date" required htmlFor="qd"><Input id="qd" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Valid for" htmlFor="vd" hint={`Valid till ${formatDate(validTill)}`}>
              <Select id="vd" value={validDays} onChange={(e) => setValidDays(Number(e.target.value))}>
                {[7, 15, 30, 45, 60].map((n) => <option key={n} value={n}>{n} days</option>)}
              </Select>
            </Field>
            <Field label="Contact"><ReadValue>{customer ? `${customer.contact} · ${customer.phone}` : "—"}</ReadValue></Field>
            <Field label="Prepared by"><ReadValue>{role.user}</ReadValue></Field>
          </div>
        </FieldGrid>

        <Notebook
          tabs={[
            {
              key: "lines",
              label: "Items",
              count: filled.length,
              content: (
                <div>
                  {errors.lines && <p className="mb-2 text-xs text-danger">{errors.lines}</p>}
                  {maxDisc > 10 && (
                    <p className="mb-2 rounded-md bg-warning-bg px-3 py-2 text-xs text-warning">
                      Discount above 10% — the sales order created from this quotation will need Owner approval (FR-PL-04).
                    </p>
                  )}
                  <div className="overflow-x-auto rounded-lg border border-line">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-surface-2 text-xs text-ink-2">
                        <tr className="border-b border-line">
                          <th className="px-3 py-2 text-left font-semibold">Item</th>
                          <th className="w-[72px] px-2 py-2 text-left font-semibold">HSN</th>
                          <th className="w-24 px-2 py-2 text-right font-semibold">Qty</th>
                          <th className="w-12 px-2 py-2 text-left font-semibold">UoM</th>
                          <th className="w-28 px-2 py-2 text-right font-semibold">Rate (₹)</th>
                          <th className="w-[72px] px-2 py-2 text-right font-semibold">Disc %</th>
                          <th className="w-14 px-2 py-2 text-right font-semibold">GST</th>
                          <th className="w-28 px-3 py-2 text-right font-semibold">Taxable (₹)</th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((l) => {
                          const it = l.itemId ? itemById(l.itemId) : undefined;
                          return (
                            <tr key={l.id} className="border-b border-line last:border-0">
                              <td className="px-3 py-1.5">
                                <Select
                                  aria-label="Item"
                                  value={l.itemId}
                                  onChange={(e) => setLine(l.id, { itemId: e.target.value, ...(e.target.value ? priceFor(customerId, e.target.value, l.qty) : { rate: 0 }) })}
                                >
                                  <option value="">Select item…</option>
                                  {items.filter((i) => i.type === "fg").map((i) => (
                                    <option key={i.id} value={i.id}>{i.code} — {lang === "hi" ? i.nameHi : i.name}</option>
                                  ))}
                                </Select>
                                {l.source && (
                                  <div className="mt-0.5 flex items-center gap-1 text-2xs text-primary-700"><Tags className="size-3" /> Rate from {l.source}</div>
                                )}
                              </td>
                              <td className="px-2 py-1.5 font-mono text-xs text-ink-2">{it?.hsn ?? ""}</td>
                              <td className="px-2 py-1.5">
                                <Input
                                  type="number" min={0} aria-label="Quantity" className="text-right" aria-invalid={!!errors[`qty-${l.id}`]} value={l.qty || ""}
                                  onChange={(e) => {
                                    const qty = Number(e.target.value);
                                    setLine(l.id, l.source && l.itemId ? { qty, ...priceFor(customerId, l.itemId, qty) } : { qty });
                                  }}
                                />
                              </td>
                              <td className="px-2 py-1.5 text-ink-2">{it?.uom}</td>
                              <td className="px-2 py-1.5">
                                <Input type="number" min={0} step="0.01" aria-label="Rate" className="text-right" aria-invalid={!!errors[`rate-${l.id}`]} value={l.rate || ""} onChange={(e) => setLine(l.id, { rate: Number(e.target.value), source: undefined })} />
                              </td>
                              <td className="px-2 py-1.5">
                                <Input type="number" min={0} max={100} aria-label="Discount percent" placeholder="0" className={cn("text-right", l.discountPct > 10 && "text-warning")} aria-invalid={!!errors[`disc-${l.id}`]} value={l.discountPct || ""} onChange={(e) => setLine(l.id, { discountPct: Number(e.target.value) })} />
                              </td>
                              <td className="tabular px-2 py-1.5 text-right text-ink-2">{it ? `${it.gstRate}%` : ""}</td>
                              <td className="tabular px-3 py-1.5 text-right font-medium">{l.itemId ? formatNum(lineTaxable({ ...l, delivered: 0, invoiced: 0 })) : ""}</td>
                              <td className="pr-2">
                                <Button variant="ghost" size="icon-sm" aria-label="Remove line" onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.id !== l.id) : ls))}>
                                  <Trash2 />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <Button variant="link" className="mt-2" onClick={() => setLines((ls) => [...ls, { id: `l${Date.now()}`, itemId: "", qty: 0, rate: 0, discountPct: 0 }])}>
                    <Plus /> Add a line
                  </Button>
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
                          { label: "Quotation total", value: formatINR(totals.total), strong: true },
                        ]}
                      />
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: "terms",
              label: "Terms & notes",
              content: (
                <Field label="Terms printed on the quotation" layout="vertical" htmlFor="terms">
                  <Textarea id="terms" className="min-h-28" value={terms} onChange={(e) => setTerms(e.target.value)} />
                </Field>
              ),
            },
          ]}
        />
      </Sheet>
    </FormPage>
  );
}
