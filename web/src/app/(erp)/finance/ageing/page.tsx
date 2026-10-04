"use client";

import * as React from "react";
import { Tabs as RT } from "radix-ui";
import { Download, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/erp/control-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/form";
import { Dialog } from "@/components/ui/overlay";
import { type Party, parties } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { balanceDue, useFinance } from "@/lib/store/finance";
import { cn, daysBetween, formatINR, formatLakh, TODAY } from "@/lib/utils";

const BUCKETS = ["Not due", "1-30", "31-60", "61-90", "90+"] as const;
type Bucket = (typeof BUCKETS)[number];

function bucketOf(dueDate: string): Bucket {
  const d = daysBetween(dueDate, TODAY);
  if (d <= 0) return "Not due";
  if (d <= 30) return "1-30";
  if (d <= 60) return "31-60";
  if (d <= 90) return "61-90";
  return "90+";
}

/* Payables (purchase bills) — mock split of vendor outstanding by age. */
const payableSplit: Record<string, number[]> = {
  p6: [0.42, 0.38, 0.2, 0, 0],
  p7: [0, 1, 0, 0, 0],
  p8: [1, 0, 0, 0, 0],
  p9: [0.5, 0.5, 0, 0, 0],
  p10: [0.3, 0.3, 0.4, 0, 0],
};

interface Row {
  party: Party;
  buckets: Record<Bucket, number>;
  total: number;
  docs: number;
}

export default function AgeingPage() {
  const role = useRole();
  const invoices = useFinance((s) => s.invoices);
  const [tab, setTab] = React.useState("ar");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [preview, setPreview] = React.useState(false);

  const ar: Row[] = React.useMemo(() => {
    const m = new Map<string, Row>();
    invoices
      .filter((i) => i.status === "posted" && balanceDue(i) > 0)
      .forEach((i) => {
        const p = parties.find((x) => x.id === i.customerId)!;
        const r = m.get(p.id) ?? { party: p, buckets: { "Not due": 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 }, total: 0, docs: 0 };
        const b = balanceDue(i);
        r.buckets[bucketOf(i.dueDate)] += b;
        r.total += b;
        r.docs += 1;
        m.set(p.id, r);
      });
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [invoices]);

  const ap: Row[] = parties
    .filter((p) => p.type.includes("vendor") && p.outstanding > 0)
    .map((p) => {
      const split = payableSplit[p.id] ?? [1, 0, 0, 0, 0];
      const buckets = Object.fromEntries(BUCKETS.map((b, i) => [b, Math.round(p.outstanding * split[i])])) as Record<Bucket, number>;
      return { party: p, buckets, total: p.outstanding, docs: split.filter(Boolean).length };
    })
    .sort((a, b) => b.total - a.total);

  if (!role.seesCost) return <div className="p-10 text-center text-sm text-ink-3">Your role does not have access to receivables and payables.</div>;

  const rows = tab === "ar" ? ar : ap;
  const sum = (b: Bucket) => rows.reduce((a, r) => a + r.buckets[b], 0);
  const grand = rows.reduce((a, r) => a + r.total, 0);
  const selRows = ar.filter((r) => selected.includes(r.party.id));

  const table = (kind: "ar" | "ap") => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-xs text-ink-2">
            {kind === "ar" && (
              <th className="w-10 border-b border-line bg-surface-2 px-3 py-2">
                <Checkbox aria-label="Select all" checked={selected.length === ar.length && ar.length > 0} onChange={() => setSelected(selected.length === ar.length ? [] : ar.map((r) => r.party.id))} />
              </th>
            )}
            <th className="border-b border-line bg-surface-2 px-3 py-2 text-left font-semibold">{kind === "ar" ? "Customer" : "Vendor"}</th>
            {BUCKETS.map((b) => (
              <th key={b} className="border-b border-line bg-surface-2 px-3 py-2 text-right font-semibold">{b}{b !== "Not due" && " days"}</th>
            ))}
            <th className="border-b border-line bg-surface-2 px-3 py-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {(kind === "ar" ? ar : ap).map((r) => (
            <tr key={r.party.id} className={cn("hover:bg-surface-2", selected.includes(r.party.id) && kind === "ar" && "bg-primary-50/60")}>
              {kind === "ar" && (
                <td className="border-b border-line px-3 py-2">
                  <Checkbox aria-label={`Select ${r.party.name}`} checked={selected.includes(r.party.id)} onChange={() => setSelected((s) => (s.includes(r.party.id) ? s.filter((x) => x !== r.party.id) : [...s, r.party.id]))} />
                </td>
              )}
              <td className="border-b border-line px-3 py-2">
                <div className="flex items-center gap-2 font-medium">
                  {r.party.name}
                  {kind === "ap" && r.party.msme && <Badge tone="brand" dot={false} className="h-[18px] px-1.5 text-2xs">MSME</Badge>}
                </div>
                <div className="text-xs text-ink-3">{r.docs} open {kind === "ar" ? "invoice" : "bill"}{r.docs > 1 ? "s" : ""} · {r.party.paymentTermsDays}-day terms</div>
              </td>
              {BUCKETS.map((b, i) => (
                <td key={b} className={cn("tabular border-b border-line px-3 py-2 text-right", r.buckets[b] === 0 ? "text-ink-3" : i >= 3 ? "font-medium text-danger" : i === 2 ? "text-warning" : "")}>
                  {r.buckets[b] ? formatINR(r.buckets[b]) : "—"}
                </td>
              ))}
              <td className="tabular border-b border-line px-3 py-2 text-right font-semibold">{formatINR(r.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            {kind === "ar" && <td className="bg-surface-2" />}
            <td className="bg-surface-2 px-3 py-2">Total</td>
            {BUCKETS.map((b) => (
              <td key={b} className="tabular bg-surface-2 px-3 py-2 text-right">{formatINR(sum(b))}</td>
            ))}
            <td className="tabular bg-surface-2 px-3 py-2 text-right">{formatINR(grand)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-2.5 sm:px-6">
        <Breadcrumbs items={[{ label: "Finance & GST", href: "/finance/invoices" }, { label: "Receivables & payables" }]} />
        <div className="ml-auto flex gap-2">
          {tab === "ar" && (
            <Button variant="primary" disabled={!selected.length} onClick={() => setPreview(true)}>
              <MessageCircle /> Send WhatsApp reminder{selected.length > 1 ? "s" : ""}{selected.length ? ` (${selected.length})` : ""}
            </Button>
          )}
          <Button onClick={() => toast.success("Ageing exported to Excel", { description: `As of 02-Oct-2026 · ${rows.length} parties` })}><Download /> Export</Button>
        </div>
      </div>

      <RT.Root value={tab} onValueChange={(v) => { setTab(v); setSelected([]); }} className="flex flex-1 flex-col">
        <RT.List className="flex gap-1 border-b border-line bg-surface px-4 sm:px-6" aria-label="Ageing type">
          {[
            { k: "ar", l: "Receivables", v: ar.reduce((a, r) => a + r.total, 0) },
            { k: "ap", l: "Payables", v: ap.reduce((a, r) => a + r.total, 0) },
          ].map((t) => (
            <RT.Trigger key={t.k} value={t.k} className="relative -mb-px flex h-10 items-center gap-2 border-b-2 border-transparent px-3 text-sm font-medium text-ink-3 hover:text-ink data-[state=active]:border-primary-600 data-[state=active]:text-ink">
              {t.l}
              <span className="tabular rounded-full bg-surface-3 px-2 text-xs text-ink-2">{formatLakh(t.v)}</span>
            </RT.Trigger>
          ))}
        </RT.List>

        <div className="space-y-4 p-3 sm:p-5">
          {/* Bucket summary strip */}
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-surface shadow-xs sm:grid-cols-5">
            {BUCKETS.map((b, i) => (
              <div key={b} className="border-r border-b border-line p-3 last:border-r-0 sm:border-b-0">
                <div className="flex items-center gap-1.5 text-xs text-ink-3">
                  <span className={cn("size-2 rounded-sm", ["bg-primary-600", "bg-primary-500/70", "bg-accent-500", "bg-[#d9622b]", "bg-danger"][i])} />
                  {b}{b !== "Not due" && " days"}
                </div>
                <div className="tabular mt-1 text-lg font-semibold">{formatLakh(sum(b))}</div>
                <div className="text-2xs text-ink-3">{grand ? Math.round((sum(b) / grand) * 100) : 0}% of total</div>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
            <RT.Content value="ar">{table("ar")}</RT.Content>
            <RT.Content value="ap">
              {table("ap")}
              <p className="border-t border-line px-4 py-2.5 text-xs text-ink-3">MSME suppliers are flagged: payments beyond the agreed terms (max 45 days) can be disallowed as an expense. Confirm treatment with your CA.</p>
            </RT.Content>
          </div>
        </div>
      </RT.Root>

      <Dialog
        open={preview}
        onOpenChange={setPreview}
        title="Send payment reminders"
        description="Uses the approved WhatsApp template 'payment_due'. One message per customer contact."
        size="lg"
        footer={
          <>
            <Button onClick={() => setPreview(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => { toast.success(`${selRows.length} reminder(s) sent on WhatsApp`, { description: "Delivery status updates in notifications" }); setPreview(false); setSelected([]); }}>
              <MessageCircle /> Send {selRows.length}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {selRows.map((r) => {
            const overdue = r.total - r.buckets["Not due"];
            return (
              <div key={r.party.id} className="rounded-lg border border-line">
                <div className="flex items-center justify-between border-b border-line px-3 py-2 text-sm">
                  <span className="font-medium">{r.party.contact} · {r.party.name}</span>
                  <span className="font-mono text-xs text-ink-3">{r.party.phone}</span>
                </div>
                <div className="bg-[#e7f6ec] p-3">
                  <div className="max-w-[420px] rounded-lg rounded-tl-none bg-white p-3 text-sm shadow-xs">
                    Namaste {r.party.contact.split(" ")[0]} ji, this is a reminder from Shakti Precision Components. {formatINR(r.total)} is outstanding across {r.docs} invoice{r.docs > 1 ? "s" : ""}
                    {overdue > 0 ? `, of which ${formatINR(overdue)} is past due` : ""}. Please arrange payment to HDFC Bank A/c 50200041874417 (IFSC HDFC0001287) or via the UPI link. Thank you.
                    <div className="mt-1 text-right text-2xs text-ink-3">14:05 ✓✓</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Dialog>
    </div>
  );
}
