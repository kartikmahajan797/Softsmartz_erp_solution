"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Download, Lock } from "lucide-react";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/erp/control-panel";
import { EmptyState } from "@/components/erp/form-view";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { itemById, partyById } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { type SalesOrder, useSales } from "@/lib/store/sales";
import { cn, formatINR, formatLakh, formatNum } from "@/lib/utils";

/**
 * Order costing (FR-MF-06, US-5). Actuals would come from cost entries per work order;
 * here they are derived from standard cost with per-order variance factors (mock).
 */
const VARIANCE: Record<string, { mat: number; lab: number; ovh: number; scrapPct: number }> = {
  so1: { mat: 1.04, lab: 1.08, ovh: 1.02, scrapPct: 2.6 },
  so6: { mat: 0.99, lab: 0.96, ovh: 1.0, scrapPct: 1.4 },
  so7: { mat: 1.07, lab: 1.12, ovh: 1.05, scrapPct: 3.8 },
  so8: { mat: 1.01, lab: 1.0, ovh: 0.98, scrapPct: 1.1 },
};

const SPLIT = { mat: 0.62, lab: 0.14, ovh: 0.2, scrap: 0.04 };

function costOf(so: SalesOrder) {
  const v = VARIANCE[so.id] ?? { mat: 1, lab: 1, ovh: 1, scrapPct: 1.5 };
  let revenue = 0;
  let std = 0;
  let qty = 0;
  so.lines.forEach((l) => {
    const q = l.invoiced || l.delivered;
    const it = itemById(l.itemId);
    revenue += q * l.rate * (1 - l.discountPct / 100);
    std += q * it.standardCost;
    qty += q;
  });
  const stdMat = std * SPLIT.mat;
  const stdLab = std * SPLIT.lab;
  const stdOvh = std * SPLIT.ovh;
  const stdScrap = std * SPLIT.scrap;
  const material = stdMat * v.mat;
  const labour = stdLab * v.lab;
  const overhead = stdOvh * v.ovh;
  const scrap = (std * v.scrapPct) / 100;
  const actual = material + labour + overhead + scrap;
  const margin = revenue - actual;
  return {
    revenue, qty, std, actual, margin, marginPct: revenue ? (margin / revenue) * 100 : 0,
    rows: [
      { k: "Material", std: stdMat, act: material },
      { k: "Labour", std: stdLab, act: labour },
      { k: "Overhead", std: stdOvh, act: overhead },
      { k: "Scrap", std: stdScrap, act: scrap },
    ],
    scrapPct: v.scrapPct,
  };
}

export default function ProfitabilityPage() {
  const role = useRole();
  const orders = useSales((s) => s.orders);
  const [open, setOpen] = React.useState<string[]>(["so7"]);

  const rows = orders
    .filter((o) => o.lines.some((l) => l.delivered > 0))
    .map((o) => ({ o, c: costOf(o) }))
    .sort((a, b) => a.c.marginPct - b.c.marginPct);

  const tot = rows.reduce(
    (a, { c }) => ({ revenue: a.revenue + c.revenue, actual: a.actual + c.actual, std: a.std + c.std }),
    { revenue: 0, actual: 0, std: 0 },
  );
  const maxRev = Math.max(...rows.map((r) => r.c.revenue), 1);

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-2.5 sm:px-6">
        <Breadcrumbs items={[{ label: "Reports", href: "/reports" }, { label: "Order profitability" }]} />
        {role.seesCost && (
          <div className="ml-auto flex gap-2">
            <Button onClick={() => toast.success("order-profitability.xlsx exported")}><Download /> Excel</Button>
            <Button onClick={() => toast.success("order-profitability.pdf exported")}><Download /> PDF</Button>
          </div>
        )}
      </div>

      {!role.seesCost ? (
        <EmptyState icon={<Lock />} title="Cost and margin are restricted" body="Your role's field rules hide cost, rate and margin. Ask the Owner for access." />
      ) : (
        <div className="mx-auto w-full max-w-[1400px] space-y-4 p-3 sm:p-5">
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-surface shadow-xs md:grid-cols-4">
            <Stat l="Invoiced value" v={formatLakh(tot.revenue)} s={`${rows.length} orders with deliveries`} />
            <Stat l="Actual cost" v={formatLakh(tot.actual)} s={`Standard ${formatLakh(tot.std)}`} />
            <Stat l="Margin" v={formatLakh(tot.revenue - tot.actual)} s={`${(((tot.revenue - tot.actual) / tot.revenue) * 100).toFixed(1)}% of invoiced value`} tone="text-success" />
            <Stat l="Cost variance" v={formatLakh(tot.actual - tot.std)} s={`${(((tot.actual - tot.std) / tot.std) * 100).toFixed(1)}% over standard`} tone={tot.actual > tot.std ? "text-danger" : "text-success"} />
          </div>

          <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
              <h2 className="text-sm font-semibold">By sales order · lowest margin first</h2>
              <span className="text-xs text-ink-3">Actuals from WO cost entries · basic standard vs actual (R1)</span>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead className="bg-surface-2 text-xs text-ink-2">
                  <tr>
                    <th className="w-8" />
                    <th className="px-3 py-2 text-left font-semibold">Order</th>
                    <th className="px-3 py-2 text-left font-semibold">Customer</th>
                    <th className="px-3 py-2 text-right font-semibold">Qty</th>
                    <th className="px-3 py-2 text-right font-semibold">Invoiced</th>
                    <th className="px-3 py-2 text-right font-semibold">Material</th>
                    <th className="px-3 py-2 text-right font-semibold">Labour</th>
                    <th className="px-3 py-2 text-right font-semibold">Overhead</th>
                    <th className="px-3 py-2 text-right font-semibold">Scrap</th>
                    <th className="px-3 py-2 text-right font-semibold">Margin</th>
                    <th className="w-44 px-3 py-2 text-left font-semibold">Cost vs revenue</th>
                    <th className="px-3 py-2 text-right font-semibold">vs std</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ o, c }) => {
                    const isOpen = open.includes(o.id);
                    const varPct = ((c.actual - c.std) / c.std) * 100;
                    return (
                      <React.Fragment key={o.id}>
                        <tr className={cn("cursor-pointer border-t border-line hover:bg-surface-2", isOpen && "bg-surface-2")} onClick={() => setOpen((x) => (x.includes(o.id) ? x.filter((y) => y !== o.id) : [...x, o.id]))}>
                          <td className="pl-3">
                            <button aria-expanded={isOpen} aria-label={`Details for ${o.number}`} className="flex size-5 items-center justify-center rounded hover:bg-surface-3">
                              <ChevronRight className={cn("size-4 text-ink-3 transition-transform", isOpen && "rotate-90")} />
                            </button>
                          </td>
                          <td className="px-3 py-2">
                            <Link href={`/sales/orders/${o.id}`} onClick={(e) => e.stopPropagation()} className="font-mono text-[12.5px] font-medium text-primary-700 hover:underline">{o.number}</Link>
                          </td>
                          <td className="px-3 py-2">{partyById(o.customerId).name}</td>
                          <td className="tabular px-3 py-2 text-right">{formatNum(c.qty)}</td>
                          <td className="tabular px-3 py-2 text-right font-medium">{formatINR(c.revenue)}</td>
                          {c.rows.map((r) => (
                            <td key={r.k} className="tabular px-3 py-2 text-right text-ink-2">{formatINR(r.act)}</td>
                          ))}
                          <td className={cn("tabular px-3 py-2 text-right font-semibold", c.marginPct < 15 ? "text-danger" : c.marginPct < 22 ? "text-warning" : "text-success")}>
                            {formatINR(c.margin)}
                            <div className="text-2xs font-normal">{c.marginPct.toFixed(1)}%</div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="relative h-3 rounded-sm bg-surface-3" style={{ width: `${(c.revenue / maxRev) * 100}%` }} title="Grey = invoiced value; colour = actual cost">
                              <div className="absolute inset-y-0 left-0 flex overflow-hidden rounded-sm" style={{ width: `${(c.actual / c.revenue) * 100}%` }}>
                                {c.rows.map((r, i) => (
                                  <div key={r.k} style={{ width: `${(r.act / c.actual) * 100}%` }} className={["bg-primary-600", "bg-primary-500/60", "bg-accent-500", "bg-danger"][i]} />
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className={cn("tabular px-3 py-2 text-right text-xs font-medium", varPct > 3 ? "text-danger" : varPct > 0 ? "text-warning" : "text-success")}>
                            {varPct > 0 ? "+" : ""}{varPct.toFixed(1)}%
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="border-t border-line bg-surface-2/60">
                            <td />
                            <td colSpan={11} className="px-3 py-3">
                              <div className="grid gap-4 lg:grid-cols-[minmax(0,520px)_1fr]">
                                <table className="w-full text-xs">
                                  <thead className="text-ink-3">
                                    <tr><th className="py-1 text-left font-medium">Element</th><th className="py-1 text-right font-medium">Standard</th><th className="py-1 text-right font-medium">Actual</th><th className="py-1 text-right font-medium">Variance</th></tr>
                                  </thead>
                                  <tbody>
                                    {c.rows.map((r) => {
                                      const v = r.act - r.std;
                                      return (
                                        <tr key={r.k} className="border-t border-line">
                                          <td className="py-1.5 font-medium">{r.k}</td>
                                          <td className="tabular py-1.5 text-right">{formatINR(r.std)}</td>
                                          <td className="tabular py-1.5 text-right">{formatINR(r.act)}</td>
                                          <td className={cn("tabular py-1.5 text-right", v > 0 ? "text-danger" : "text-success")}>{v > 0 ? "+" : ""}{formatINR(v)}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                                <div className="space-y-1.5 text-xs text-ink-2">
                                  <div className="flex flex-wrap gap-1.5">
                                    {o.workOrders.map((w) => <Badge key={w} tone="neutral" dot={false} className="font-mono">{w}</Badge>)}
                                    <StatusBadge status={o.status} />
                                  </div>
                                  <p>Scrap rate {c.scrapPct}% {c.scrapPct > 3 ? "— above the 3% norm; check rejects by reason on CNC lathes." : "— within norm."}</p>
                                  <p>Labour from job-card run time × operator rates; overhead from work-centre hourly rates.</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-4 border-t border-line px-4 py-2.5 text-2xs text-ink-3">
              {["Material", "Labour", "Overhead", "Scrap"].map((k, i) => (
                <span key={k} className="flex items-center gap-1.5"><span className={cn("size-2 rounded-sm", ["bg-primary-600", "bg-primary-500/60", "bg-accent-500", "bg-danger"][i])} />{k}</span>
              ))}
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-surface-3 ring-1 ring-line" />Margin (rest of bar = invoiced value)</span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Stat({ l, v, s, tone }: { l: string; v: string; s: string; tone?: string }) {
  return (
    <div className="border-r border-b border-line p-4 last:border-r-0 md:border-b-0">
      <div className="text-xs font-medium text-ink-3">{l}</div>
      <div className={cn("tabular mt-1 text-xl font-semibold", tone)}>{v}</div>
      <div className="mt-0.5 text-xs text-ink-3">{s}</div>
    </div>
  );
}
