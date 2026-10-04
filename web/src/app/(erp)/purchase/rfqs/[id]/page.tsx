"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Award, Ban, BellRing, Clock, FileText, Mail, MessageCircle, MoreHorizontal, PenLine, Printer, Send, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Banner, Chatter, FieldGrid, FormPage, Notebook, Sheet, SheetTitle, StatusBar } from "@/components/erp/form-view";
import { EmptyState } from "@/components/erp/form-view";
import { ItemCell, MsmeBadge } from "@/components/inventory/shared";
import { ToneBadge } from "@/components/returns/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, ReadValue, Select, Textarea } from "@/components/ui/form";
import { Dialog, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/overlay";
import { itemById, partyById } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { usePurchase } from "@/lib/store/purchase";
import { LAST_RATE, lowestVendor, quoteResponded, quoteTotal, type Rfq, RFQ_STATUS, useRfq, type VendorQuote } from "@/lib/store/rfq";
import { cn, daysBetween, formatDate, formatDateTime, formatINR, formatNum, TODAY } from "@/lib/utils";

const STEPS = [
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "quotes_received", label: "Compare" },
  { key: "awarded", label: "Awarded" },
];

export default function RfqPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const role = useRole();
  const rfq = useRfq((s) => s.rfqs.find((r) => r.id === id));
  const update = useRfq((s) => s.update);
  const setQuote = useRfq((s) => s.setQuote);
  const [quoteFor, setQuoteFor] = React.useState<string | null>(null);
  const [awardTo, setAwardTo] = React.useState<string | null>(null);

  if (!rfq) {
    return (
      <FormPage crumbs={[{ label: "Purchase", href: "/purchase/orders" }, { label: "RFQs", href: "/purchase/rfqs" }, { label: "Not found" }]}>
        <Sheet><EmptyState icon={<FileText />} title="RFQ not found" body="It may have been removed." action={<Link href="/purchase/rfqs"><Button>Back to RFQs</Button></Link>} /></Sheet>
      </FormPage>
    );
  }

  const l1 = lowestVendor(rfq);
  const pending = rfq.vendors.filter((v) => v.sentAt && !quoteResponded(v));
  const live = rfq.status === "sent" || rfq.status === "quotes_received";
  const dueIn = daysBetween(TODAY, rfq.quoteDue);

  const send = () => {
    rfq.vendors.forEach((v) => setQuote(rfq.id, v.vendorId, { sentVia: "WhatsApp + Email", sentAt: `${TODAY}T${new Date().toTimeString().slice(0, 8)}` }));
    update(rfq.id, { status: "sent" }, role.user, `RFQ sent to ${rfq.vendors.length} vendors on WhatsApp + email`);
    toast.success(`RFQ sent to ${rfq.vendors.length} vendors`, { description: "PDF with item specs attached · replies are logged automatically" });
  };

  const remind = () => {
    update(rfq.id, {}, role.user, `Reminder sent to ${pending.map((v) => partyById(v.vendorId).name).join(", ")}`, "system");
    toast.success(`Reminder sent to ${pending.length} vendor${pending.length > 1 ? "s" : ""}`, { description: "WhatsApp template: rfq_reminder" });
  };

  return (
    <FormPage
      crumbs={[{ label: "Purchase", href: "/purchase/orders" }, { label: "RFQs", href: "/purchase/rfqs" }, { label: rfq.number }]}
      actions={
        <>
          {rfq.status === "draft" && <Button variant="primary" onClick={send}><Send /> Send to vendors</Button>}
          {live && l1 && <Button variant="primary" onClick={() => setAwardTo(l1)}><Trophy /> Award to L1</Button>}
          {live && <Button onClick={() => setQuoteFor(pending[0]?.vendorId ?? rfq.vendors[0].vendorId)}><PenLine /> Record quote</Button>}
          {live && pending.length > 0 && <Button onClick={remind}><BellRing /> Remind {pending.length}</Button>}
          {rfq.status === "awarded" && rfq.poNumber && (
            <Button variant="primary" onClick={() => router.push(rfq.poId ? `/purchase/orders/${rfq.poId}` : "/purchase/orders")}><FileText /> Open {rfq.poNumber}</Button>
          )}
          <Menu>
            <MenuTrigger asChild><Button size="icon" aria-label="More actions"><MoreHorizontal /></Button></MenuTrigger>
            <MenuContent>
              <MenuItem icon={<Printer />} onSelect={() => toast.success("RFQ PDF generated")}>Print RFQ</MenuItem>
              <MenuItem icon={<MessageCircle />} onSelect={() => toast.success("Comparison shared on WhatsApp", { description: "Sent to Rajesh Agarwal for approval" })}>Share comparison</MenuItem>
              <MenuSeparator />
              <MenuItem icon={<Ban />} danger disabled={rfq.status === "awarded" || rfq.status === "cancelled"} onSelect={() => { update(rfq.id, { status: "cancelled" }, role.user, "RFQ cancelled"); toast("RFQ cancelled"); }}>
                Cancel RFQ
              </MenuItem>
            </MenuContent>
          </Menu>
        </>
      }
      status={rfq.status === "cancelled" ? <ToneBadge map={RFQ_STATUS} value="cancelled" /> : <StatusBar steps={STEPS} current={rfq.status} />}
      banner={
        rfq.status === "sent" && dueIn < 0 ? (
          <Banner tone="danger" icon={<Clock />} action={pending.length > 0 && <Button size="sm" onClick={remind}>Send reminder</Button>}>
            Quote deadline passed {-dueIn} day{dueIn < -1 ? "s" : ""} ago · {pending.length} vendor{pending.length !== 1 ? "s have" : " has"} not replied.
          </Banner>
        ) : rfq.status === "awarded" ? (
          <Banner tone="success" icon={<Award />}>
            Awarded to <b>{partyById(rfq.awardedVendorId!).name}</b> · purchase order <span className="font-mono">{rfq.poNumber}</span>
          </Banner>
        ) : undefined
      }
      chatter={<Chatter activities={rfq.activities} onLog={(t) => update(rfq.id, {}, role.user, t, "note")} />}
    >
      <Sheet>
        <SheetTitle label="Request for quotation" title={<span className="font-mono">{rfq.number}</span>} subtitle={rfq.title} badge={<ToneBadge map={RFQ_STATUS} value={rfq.status} />} />
        <FieldGrid>
          <Field label="RFQ date"><ReadValue>{formatDate(rfq.date)}</ReadValue></Field>
          <Field label="Quotes due">
            <ReadValue>
              {formatDate(rfq.quoteDue)}{" "}
              {live && <span className={cn("text-xs", dueIn < 0 ? "text-danger" : "text-ink-3")}>{dueIn < 0 ? `${-dueIn}d overdue` : dueIn === 0 ? "today" : `in ${dueIn}d`}</span>}
            </ReadValue>
          </Field>
          <Field label="Requisitions">
            <ReadValue mono>{rfq.prNumbers.length ? rfq.prNumbers.join(", ") : <span className="font-sans text-ink-3">Manual RFQ</span>}</ReadValue>
          </Field>
          <Field label="Responses">
            <ReadValue>{rfq.vendors.filter(quoteResponded).length} of {rfq.vendors.length} vendors quoted</ReadValue>
          </Field>
        </FieldGrid>

        <Notebook
          tabs={[
            {
              key: "compare",
              label: "Quote comparison",
              content: <Comparison rfq={rfq} l1={l1} onAward={setAwardTo} onRecord={setQuoteFor} />,
            },
            {
              key: "items",
              label: "Items",
              count: rfq.lines.length,
              content: (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-surface-2 text-xs text-ink-2">
                      <tr className="border-b border-line">
                        <th className="px-3 py-2 text-left font-semibold">Item</th>
                        <th className="px-3 py-2 text-left font-semibold">Specification</th>
                        <th className="px-3 py-2 text-right font-semibold">Qty</th>
                        <th className="px-3 py-2 text-left font-semibold">Required by</th>
                        {role.seesCost && <th className="px-3 py-2 text-right font-semibold">Last purchase rate</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {rfq.lines.map((l) => (
                        <tr key={l.id} className="border-b border-line last:border-0">
                          <td className="px-3 py-2"><ItemCell id={l.itemId} /></td>
                          <td className="px-3 py-2 text-xs text-ink-2">{l.spec ?? <span className="text-ink-3">—</span>}</td>
                          <td className="tabular px-3 py-2 text-right">{formatNum(l.qty)} {itemById(l.itemId).uom}</td>
                          <td className="px-3 py-2">{formatDate(l.requiredBy)}</td>
                          {role.seesCost && (
                            <td className="px-3 py-2 text-right">
                              {LAST_RATE[l.itemId] ? (
                                <div>
                                  <div className="tabular">{formatINR(LAST_RATE[l.itemId].rate)}</div>
                                  <div className="text-2xs text-ink-3">{LAST_RATE[l.itemId].vendor} · {formatDate(LAST_RATE[l.itemId].date)}</div>
                                </div>
                              ) : "—"}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ),
            },
            {
              key: "vendors",
              label: "Invitations",
              count: rfq.vendors.length,
              content: (
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {rfq.vendors.map((v) => {
                    const p = partyById(v.vendorId);
                    return (
                      <li key={v.vendorId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 font-medium">{p.name}{p.msme && <MsmeBadge />}</div>
                          <div className="text-xs text-ink-3">{p.contact} · {p.phone}</div>
                        </div>
                        <div className="text-xs text-ink-2">
                          {v.sentAt ? <>Sent {formatDateTime(v.sentAt)} · {v.sentVia}</> : <span className="text-ink-3">Not sent yet</span>}
                        </div>
                        {quoteResponded(v) ? (
                          <Badge tone="success">Quoted {formatDate(v.respondedAt)}</Badge>
                        ) : v.sentAt ? (
                          <Badge tone="warning">Awaiting reply</Badge>
                        ) : (
                          <Badge tone="neutral">Draft</Badge>
                        )}
                        <div className="flex gap-1">
                          <Button size="icon-sm" variant="ghost" aria-label="Send on WhatsApp" onClick={() => toast.success(`RFQ sent on WhatsApp to ${p.contact}`, { description: p.phone })}><MessageCircle /></Button>
                          <Button size="icon-sm" variant="ghost" aria-label="Send by email" onClick={() => toast.success(`RFQ emailed to ${p.contact}`)}><Mail /></Button>
                          {live && <Button size="sm" onClick={() => setQuoteFor(v.vendorId)}>{quoteResponded(v) ? "Edit quote" : "Record quote"}</Button>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ),
            },
          ]}
        />
      </Sheet>

      {quoteFor && <QuoteDialog rfq={rfq} vendorId={quoteFor} onVendor={setQuoteFor} onClose={() => setQuoteFor(null)} />}
      {awardTo && <AwardDialog rfq={rfq} vendorId={awardTo} l1={l1} onClose={() => setAwardTo(null)} />}
    </FormPage>
  );
}

function Comparison({ rfq, l1, onAward, onRecord }: { rfq: Rfq; l1?: string; onAward: (v: string) => void; onRecord: (v: string) => void }) {
  const role = useRole();
  const live = rfq.status === "sent" || rfq.status === "quotes_received";
  const vendors = rfq.vendors;

  if (!role.seesCost) {
    return <EmptyState icon={<FileText />} title="Rates are hidden for your role" body="Field rules hide purchase rates. Ask the production head or owner to compare quotes." />;
  }
  if (!vendors.some(quoteResponded)) {
    return (
      <EmptyState
        icon={<Clock />}
        title={rfq.status === "draft" ? "Send the RFQ to start collecting quotes" : "No quotes received yet"}
        body="Vendor replies on WhatsApp or email are recorded here and compared line by line against your last purchase rate."
      />
    );
  }

  const lowestRate = (lineId: string) => {
    const rates = vendors.map((v) => v.lines[lineId]?.rate).filter((x): x is number => x !== undefined);
    return rates.length ? Math.min(...rates) : undefined;
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-[1] w-64 border-b border-line bg-surface-2 px-3 py-2.5 text-left text-xs font-semibold text-ink-2">Item · last rate</th>
            {vendors.map((v) => {
              const p = partyById(v.vendorId);
              const isL1 = v.vendorId === l1;
              const won = rfq.awardedVendorId === v.vendorId;
              return (
                <th key={v.vendorId} className={cn("min-w-48 border-b border-l border-line px-3 py-2.5 text-left align-top", isL1 || won ? "bg-success-bg/60" : "bg-surface-2")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">{p.name}</div>
                      <div className="text-2xs font-normal text-ink-3">{p.city}{p.msme ? " · MSME" : ""}</div>
                    </div>
                    {won ? <Badge tone="success" dot={false}><Trophy className="size-3" /> Awarded</Badge> : isL1 ? <Badge tone="success" dot={false}>L1</Badge> : null}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rfq.lines.map((l) => {
            const low = lowestRate(l.id);
            const last = LAST_RATE[l.itemId];
            return (
              <tr key={l.id}>
                <td className="sticky left-0 z-[1] border-b border-line bg-surface px-3 py-2.5 align-top">
                  <ItemCell id={l.itemId} />
                  <div className="mt-0.5 text-2xs text-ink-3">
                    {formatNum(l.qty)} {itemById(l.itemId).uom}{last && <> · last {formatINR(last.rate)}</>}
                  </div>
                </td>
                {vendors.map((v) => {
                  const q = v.lines[l.id];
                  if (!q)
                    return (
                      <td key={v.vendorId} className="border-b border-l border-line px-3 py-2.5 align-top text-xs text-ink-3">
                        {v.sentAt ? "Awaiting quote" : "Not sent"}
                      </td>
                    );
                  const best = q.rate === low;
                  const delta = last ? ((q.rate - last.rate) / last.rate) * 100 : undefined;
                  return (
                    <td key={v.vendorId} className={cn("border-b border-l border-line px-3 py-2.5 align-top", best && "bg-success-bg/40")}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={cn("tabular text-[15px] font-semibold", best && "text-success")}>{formatINR(q.rate)}</span>
                        {delta !== undefined && (
                          <span className={cn("tabular text-2xs font-medium", delta > 0.05 ? "text-danger" : delta < -0.05 ? "text-success" : "text-ink-3")}>
                            {delta > 0 ? "▲" : delta < 0 ? "▼" : ""} {Math.abs(delta).toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <div className="tabular mt-0.5 text-xs text-ink-2">{formatINR(q.rate * l.qty)}</div>
                      <div className="mt-0.5 text-2xs text-ink-3">{q.leadDays} days lead time</div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {(
            [
              ["Taxable value", (v: VendorQuote) => { const t = quoteTotal(rfq, v); return t.taxable ? <span className="tabular font-semibold">{formatINR(t.taxable)}</span> : "—"; }],
              ["GST (est.)", (v: VendorQuote) => { const t = quoteTotal(rfq, v); return t.gst ? <span className="tabular text-ink-2">{formatINR(t.gst)}</span> : "—"; }],
              ["Total", (v: VendorQuote) => { const t = quoteTotal(rfq, v); return t.total ? <span className="tabular text-[15px] font-semibold">{formatINR(t.total)}</span> : "—"; }],
              ["Longest lead time", (v: VendorQuote) => (quoteResponded(v) ? `${quoteTotal(rfq, v).maxLead} days` : "—")],
              ["Payment terms", (v: VendorQuote) => (quoteResponded(v) ? `${v.paymentTermsDays} days` : "—")],
              ["Freight", (v: VendorQuote) => (quoteResponded(v) ? <span className={cn(v.freight !== "Included" && "text-warning")}>{v.freight}</span> : "—")],
              ["Valid till", (v: VendorQuote) => (v.validTill ? formatDate(v.validTill) : "—")],
              ["Remarks", (v: VendorQuote) => <span className="text-xs text-ink-2">{v.remarks ?? "—"}</span>],
            ] as [string, (v: VendorQuote) => React.ReactNode][]
          ).map(([label, render], i) => (
            <tr key={label} className={cn(i === 0 && "[&>td]:border-t [&>td]:border-t-line-strong")}>
              <td className="sticky left-0 z-[1] border-b border-line bg-surface-2 px-3 py-2 text-xs font-medium text-ink-2">{label}</td>
              {vendors.map((v) => (
                <td key={v.vendorId} className="border-b border-l border-line bg-surface-2/50 px-3 py-2 text-sm">{render(v)}</td>
              ))}
            </tr>
          ))}
          {live && (
            <tr>
              <td className="sticky left-0 z-[1] bg-surface px-3 py-2.5" />
              {vendors.map((v) => (
                <td key={v.vendorId} className="border-l border-line px-3 py-2.5">
                  {quoteResponded(v) && quoteTotal(rfq, v).complete ? (
                    <Button size="sm" variant={v.vendorId === l1 ? "primary" : "secondary"} className="w-full justify-center" onClick={() => onAward(v.vendorId)}>
                      <Trophy /> Award
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" className="w-full justify-center" onClick={() => onRecord(v.vendorId)}>
                      <PenLine /> Record quote
                    </Button>
                  )}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function QuoteDialog({ rfq, vendorId, onVendor, onClose }: { rfq: Rfq; vendorId: string; onVendor: (v: string) => void; onClose: () => void }) {
  const role = useRole();
  const setQuote = useRfq((s) => s.setQuote);
  const update = useRfq((s) => s.update);
  const v = rfq.vendors.find((x) => x.vendorId === vendorId)!;
  const [lines, setLines] = React.useState<Record<string, { rate: number; leadDays: number }>>(() =>
    Object.fromEntries(rfq.lines.map((l) => [l.id, v.lines[l.id] ?? { rate: 0, leadDays: 7 }])),
  );
  const [terms, setTerms] = React.useState(v.paymentTermsDays);
  const [freight, setFreight] = React.useState<VendorQuote["freight"]>(v.freight);
  const [valid, setValid] = React.useState(v.validTill || "2026-10-31");
  const [remarks, setRemarks] = React.useState(v.remarks ?? "");
  const ok = rfq.lines.every((l) => lines[l.id]?.rate > 0);

  const save = () => {
    setQuote(rfq.id, vendorId, { lines, paymentTermsDays: terms, freight, validTill: valid, remarks: remarks || undefined, respondedAt: v.respondedAt ?? `${TODAY}T${new Date().toTimeString().slice(0, 8)}`, sentAt: v.sentAt ?? `${TODAY}T09:00:00` });
    const respondedAfter = rfq.vendors.filter((x) => x.vendorId === vendorId || quoteResponded(x)).length;
    update(rfq.id, respondedAfter >= 2 ? { status: "quotes_received" } : {}, role.user, `Quote recorded for ${partyById(vendorId).name}`);
    toast.success("Quote recorded", { description: "Comparison updated" });
    onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Record vendor quote"
      description="Enter rates per stock UoM, before GST."
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!ok} onClick={save}>Save quote</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Vendor" layout="vertical" htmlFor="qv">
          <Select id="qv" value={vendorId} onChange={(e) => onVendor(e.target.value)}>
            {rfq.vendors.map((x) => <option key={x.vendorId} value={x.vendorId}>{partyById(x.vendorId).name}{quoteResponded(x) ? " (quoted)" : ""}</option>)}
          </Select>
        </Field>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-surface-2 text-xs text-ink-2">
              <tr className="border-b border-line">
                <th className="px-3 py-2 text-left font-semibold">Item</th>
                <th className="px-2 py-2 text-right font-semibold">Qty</th>
                <th className="w-28 px-2 py-2 text-right font-semibold">Rate (₹)</th>
                <th className="w-24 px-2 py-2 text-right font-semibold">Lead days</th>
              </tr>
            </thead>
            <tbody>
              {rfq.lines.map((l) => (
                <tr key={l.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2">
                    <ItemCell id={l.itemId} />
                    {LAST_RATE[l.itemId] && <div className="text-2xs text-ink-3">Last rate {formatINR(LAST_RATE[l.itemId].rate)}</div>}
                  </td>
                  <td className="tabular px-2 py-2 text-right text-ink-2">{formatNum(l.qty)} {itemById(l.itemId).uom}</td>
                  <td className="px-2 py-2"><Input type="number" min={0} step="0.01" className="text-right" aria-label="Rate" value={lines[l.id]?.rate || ""} onChange={(e) => setLines((x) => ({ ...x, [l.id]: { ...x[l.id], rate: Number(e.target.value) } }))} /></td>
                  <td className="px-2 py-2"><Input type="number" min={0} className="text-right" aria-label="Lead days" value={lines[l.id]?.leadDays || ""} onChange={(e) => setLines((x) => ({ ...x, [l.id]: { ...x[l.id], leadDays: Number(e.target.value) } }))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Payment terms (days)" layout="vertical" htmlFor="pt"><Input id="pt" type="number" value={terms} onChange={(e) => setTerms(Number(e.target.value))} /></Field>
          <Field label="Freight" layout="vertical" htmlFor="fr">
            <Select id="fr" value={freight} onChange={(e) => setFreight(e.target.value as VendorQuote["freight"])}>
              <option>Included</option>
              <option>Extra at actuals</option>
              <option>Ex-works</option>
            </Select>
          </Field>
          <Field label="Valid till" layout="vertical" htmlFor="vt"><Input id="vt" type="date" value={valid} onChange={(e) => setValid(e.target.value)} /></Field>
        </div>
        <Field label="Remarks" layout="vertical" htmlFor="rm"><Textarea id="rm" className="min-h-14" value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
      </div>
    </Dialog>
  );
}

function AwardDialog({ rfq, vendorId, l1, onClose }: { rfq: Rfq; vendorId: string; l1?: string; onClose: () => void }) {
  const role = useRole();
  const router = useRouter();
  const update = useRfq((s) => s.update);
  const addPO = usePurchase((s) => s.addPO);
  const v = rfq.vendors.find((x) => x.vendorId === vendorId)!;
  const t = quoteTotal(rfq, v);
  const notL1 = l1 && vendorId !== l1;
  const l1Total = l1 ? quoteTotal(rfq, rfq.vendors.find((x) => x.vendorId === l1)!).taxable : 0;
  const [reason, setReason] = React.useState("");

  const award = () => {
    const po = addPO(
      {
        vendorId,
        date: TODAY,
        expectedDate: rfq.lines.map((l) => l.requiredBy).sort()[0],
        status: "draft",
        paymentTermsDays: v.paymentTermsDays,
        notes: `From ${rfq.number}${notL1 ? ` · not L1: ${reason}` : ""}`,
        prNumbers: rfq.prNumbers,
        lines: rfq.lines.map((l, i) => ({ id: `l${i + 1}`, itemId: l.itemId, qty: l.qty, rate: v.lines[l.id].rate, received: 0 })),
      },
      role.user,
    );
    update(rfq.id, { status: "awarded", awardedVendorId: vendorId, poNumber: po.number, poId: po.id }, role.user, `Awarded to ${partyById(vendorId).name} · ${po.number} created${notL1 ? ` (not L1: ${reason})` : ""}`, "approved");
    toast.success(`${po.number} created for ${partyById(vendorId).name}`, {
      description: "Draft PO with quoted rates — review and submit for approval",
      action: { label: "Open PO", onClick: () => router.push(`/purchase/orders/${po.id}`) },
    });
    onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Award to ${partyById(vendorId).name}`}
      description="Creates a draft purchase order with the quoted rates. PO approval rules still apply."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!!notL1 && !reason.trim()} onClick={award}><Trophy /> Award &amp; create PO</Button>
        </>
      }
    >
      <div className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-surface-2 p-4 text-sm">
          <div><dt className="text-xs text-ink-3">Taxable value</dt><dd className="tabular text-base font-semibold">{formatINR(t.taxable)}</dd></div>
          <div><dt className="text-xs text-ink-3">Total incl. GST</dt><dd className="tabular text-base font-semibold">{formatINR(t.total)}</dd></div>
          <div><dt className="text-xs text-ink-3">Lead time</dt><dd>{t.maxLead} days</dd></div>
          <div><dt className="text-xs text-ink-3">Payment terms · freight</dt><dd>{v.paymentTermsDays} days · {v.freight}</dd></div>
        </dl>
        {notL1 && (
          <>
            <p className="rounded-md bg-warning-bg px-3 py-2 text-sm text-warning">
              This vendor is {formatINR(t.taxable - l1Total)} costlier than L1 ({partyById(l1!).name}). A reason is recorded in the audit log.
            </p>
            <Field label="Reason for not choosing L1" required layout="vertical" htmlFor="why">
              <Textarea id="why" className="min-h-14" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. faster delivery needed for SO-2026-00228" />
            </Field>
          </>
        )}
      </div>
    </Dialog>
  );
}
