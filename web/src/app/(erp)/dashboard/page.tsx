"use client";

import Link from "next/link";
import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  CheckCheck,
  CloudOff,
  Factory,
  FileWarning,
  Gauge,
  PackageCheck,
  RefreshCw,
  ShoppingCart,
  Timer,
  Truck,
  Waypoints,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Card } from "@/components/erp/form-view";
import { Breadcrumbs } from "@/components/erp/control-panel";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { items, partyById, workCentres } from "@/lib/data/masters";
import { useApp, useRole } from "@/lib/store/app";
import { soTotals, useSales } from "@/lib/store/sales";
import { cn, daysBetween, formatDate, formatLakh, formatNum, TODAY } from "@/lib/utils";

/* Shop-floor aggregates for today (would come from the daily aggregate tables, arch §7). */
const hourly = [
  { h: "07", good: 168, reject: 4 },
  { h: "08", good: 212, reject: 6 },
  { h: "09", good: 236, reject: 3 },
  { h: "10", good: 198, reject: 9 },
  { h: "11", good: 224, reject: 5 },
  { h: "12", good: 141, reject: 2 },
  { h: "13", good: 206, reject: 4 },
  { h: "14", good: 0, reject: 0 },
];

const wcOutput = [
  { wc: "wc1", plan: 320, good: 248, reject: 6 },
  { wc: "wc2", plan: 300, good: 226, reject: 9 },
  { wc: "wc3", plan: 180, good: 62, reject: 4 },
  { wc: "wc4", plan: 600, good: 512, reject: 8 },
  { wc: "wc5", plan: 120, good: 54, reject: 0 },
  { wc: "wc6", plan: 260, good: 198, reject: 3 },
  { wc: "wc7", plan: 400, good: 85, reject: 3 },
];

const cash = { inToday: 412500, outToday: 186300, bank: 2864100 };

const ageing = [
  { b: "Not due", v: 2810000 },
  { b: "1-30", v: 1940000 },
  { b: "31-60", v: 812000 },
  { b: "61-90", v: 298000 },
  { b: "90+", v: 112000 },
];

const recent = [
  { at: "13:58", who: "Ramesh Yadav", what: "reported 48 good, 1 reject on JC-2026-00412 (CNC Lathe 01)", icon: Factory },
  { at: "13:41", who: "Santosh Kale", what: "posted GRN-2026-00318 · Mahalaxmi Steel Traders · 2.4 t EN8 bar", icon: PackageCheck },
  { at: "13:20", who: "Meera Iyer", what: "posted INV/26-27/0412 · Varun Auto Components · IRN retrying", icon: FileWarning },
  { at: "12:55", who: "Santosh Kale", what: "sent JWC/26-27/0034 to Shree Ganesh Plating · 1,000 brackets", icon: Waypoints },
  { at: "12:10", who: "Prakash Deshmukh", what: "released WO-2026-00189 · Pulley Assembly PA-110 × 200", icon: Factory },
  { at: "11:32", who: "Neha Kulkarni", what: "created SO-2026-00235 · Narmada Pumps & Valves", icon: ShoppingCart },
];

export default function DashboardPage() {
  const role = useRole();
  const lang = useApp((s) => s.lang);
  const orders = useSales((s) => s.orders);
  const deliveries = useSales((s) => s.deliveries);
  const [range, setRange] = React.useState<"today" | "yesterday" | "week">("today");

  const totalGood = wcOutput.reduce((a, w) => a + w.good, 0);
  const totalReject = wcOutput.reduce((a, w) => a + w.reject, 0);
  const totalPlan = wcOutput.reduce((a, w) => a + w.plan, 0);
  const rejectPct = (totalReject / (totalGood + totalReject)) * 100;

  const dispatchedToday = deliveries.filter((d) => d.date === TODAY && d.status === "posted");
  const dispatchValue = 318600 + dispatchedToday.reduce((a, d) => a + d.value, 0);
  const pending = orders.filter((o) => ["confirmed", "partially_delivered", "pending_approval"].includes(o.status));
  const pendingValue = pending.reduce((a, o) => a + soTotals(o).total, 0);
  const late = pending.filter((o) => daysBetween(TODAY, o.deliveryDate) < 0);
  const atRisk = pending
    .map((o) => {
      const ordered = o.lines.reduce((a, l) => a + l.qty, 0);
      const delivered = o.lines.reduce((a, l) => a + l.delivered, 0);
      return { o, ordered, delivered, days: daysBetween(TODAY, o.deliveryDate) };
    })
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);
  const lowStock = items.filter((i) => i.reorderLevel > 0 && i.onHand - i.reserved < i.reorderLevel);
  const running = workCentres.filter((w) => w.status === "running").length;
  const idle = workCentres.filter((w) => w.status === "idle").length;
  const down = workCentres.filter((w) => w.status === "down").length;
  const approvals = orders.filter((o) => o.status === "pending_approval").length + 2;

  const hour = 14;
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col">
      <div className="border-b border-line bg-surface px-4 py-2.5 sm:px-6">
        <Breadcrumbs items={[{ label: "Dashboard" }]} />
      </div>

      <div className="mx-auto w-full max-w-[1480px] space-y-4 p-3 sm:p-5">
        {/* Heading */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {greeting}, {role.user.split(" ")[0]}
            </h1>
            <p className="mt-0.5 text-sm text-ink-3">
              Friday, {formatDate(TODAY)} · Shift A running (07:00-15:30) · data as of 14:02
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-line-strong bg-surface p-0.5 text-xs shadow-xs" role="group" aria-label="Period">
              {(["today", "yesterday", "week"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  aria-pressed={range === r}
                  className={cn("h-7 rounded px-2.5 font-medium", range === r ? "bg-primary-600 text-white" : "text-ink-2 hover:bg-surface-3")}
                >
                  {r === "week" ? "This week" : r === "today" ? "Today" : "Yesterday"}
                </button>
              ))}
            </div>
            <Button size="md" onClick={() => toast.success("Dashboard refreshed", { description: "Aggregates recomputed from latest events" })}>
              <RefreshCw /> Refresh
            </Button>
          </div>
        </div>

        {/* KPI strip — compact, one card */}
        <section className="grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-surface shadow-xs md:grid-cols-3 xl:grid-cols-6" aria-label="Key figures">
          <Kpi
            icon={<Factory />}
            label="Produced today"
            value={`${formatNum(totalGood)} pcs`}
            sub={
              <>
                {Math.round((totalGood / totalPlan) * 100)}% of plan ·{" "}
                <span className={rejectPct > 2.5 ? "text-danger" : "text-ink-3"}>{rejectPct.toFixed(1)}% rejects</span>
              </>
            }
            href="/manufacturing/job-cards"
          />
          <Kpi icon={<Truck />} label="Dispatched today" value={role.seesCost ? formatLakh(dispatchValue) : `${dispatchedToday.length + 2} challans`} sub={`${dispatchedToday.length + 2} challans · 3 vehicles`} href="/sales/deliveries" />
          <Kpi
            icon={<ShoppingCart />}
            label="Pending orders"
            value={`${pending.length}`}
            sub={
              <>
                {role.seesCost && <>{formatLakh(pendingValue)} · </>}
                <span className={late.length ? "text-danger" : ""}>{late.length} late</span>
              </>
            }
            href="/sales/orders"
          />
          <Kpi icon={<Boxes />} label="Below reorder level" value={`${lowStock.length} items`} sub={<span className="text-warning">{lowStock.filter((i) => i.onHand - i.reserved < 0).length} short for open orders</span>} href="/inventory/stock" />
          {role.seesCost ? (
            <Kpi
              icon={<ArrowDownLeft />}
              label="Cash in / out today"
              value={
                <span className="flex items-baseline gap-1.5">
                  <span className="text-success">{formatLakh(cash.inToday)}</span>
                  <span className="text-sm text-ink-3">/</span>
                  <span className="text-base text-danger">{formatLakh(cash.outToday)}</span>
                </span>
              }
              sub={`Bank balance ${formatLakh(cash.bank)}`}
              href="/finance/payments"
            />
          ) : (
            <Kpi icon={<CheckCheck />} label="GRNs today" value="3" sub="1 with rejected qty" href="/purchase/receipts" />
          )}
          <Kpi
            icon={<Gauge />}
            label="Machines"
            value={
              <span className="flex items-center gap-2 text-lg">
                <Dot c="bg-success" n={running} />
                <Dot c="bg-ink-3" n={idle} />
                <Dot c="bg-danger" n={down} />
              </span>
            }
            sub="running · idle · down"
            href="/manufacturing/work-centres"
          />
        </section>

        {/* Production + machine board */}
        <div className="grid gap-4 xl:grid-cols-3">
          <Card
            className="xl:col-span-2"
            title="Production by work centre"
            action={<Link href="/manufacturing/job-cards" className="text-xs font-medium text-primary-700 hover:underline">Job cards</Link>}
            bodyClassName="p-0"
          >
            <div className="grid lg:grid-cols-[1fr_300px]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-ink-3">
                      <th className="px-4 py-2 font-medium">Work centre</th>
                      <th className="px-2 py-2 text-right font-medium">Plan</th>
                      <th className="px-2 py-2 text-right font-medium">Good</th>
                      <th className="px-2 py-2 text-right font-medium">Reject</th>
                      <th className="w-[34%] px-4 py-2 font-medium">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wcOutput.map((w) => {
                      const wc = workCentres.find((x) => x.id === w.wc)!;
                      const pct = Math.min(100, Math.round((w.good / w.plan) * 100));
                      return (
                        <tr key={w.wc} className="border-b border-line last:border-0">
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span className={cn("size-2 rounded-full", wc.status === "running" ? "bg-success" : wc.status === "down" ? "bg-danger" : "bg-ink-3")} />
                              <span className="font-medium whitespace-nowrap">{lang === "hi" ? wc.nameHi : wc.name}</span>
                            </div>
                          </td>
                          <td className="tabular px-2 py-2 text-right text-ink-2">{formatNum(w.plan)}</td>
                          <td className="tabular px-2 py-2 text-right font-medium">{formatNum(w.good)}</td>
                          <td className={cn("tabular px-2 py-2 text-right", w.reject > 5 ? "text-danger" : "text-ink-2")}>{w.reject}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                                <div className={cn("h-full rounded-full", pct < 40 ? "bg-danger" : pct < 70 ? "bg-accent-500" : "bg-primary-600")} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="tabular w-9 text-right text-xs text-ink-3">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-line-strong bg-surface-2 font-semibold">
                      <td className="px-4 py-2">Total</td>
                      <td className="tabular px-2 py-2 text-right">{formatNum(totalPlan)}</td>
                      <td className="tabular px-2 py-2 text-right">{formatNum(totalGood)}</td>
                      <td className="tabular px-2 py-2 text-right">{totalReject}</td>
                      <td className="px-4 py-2 text-xs font-normal text-ink-3">{Math.round((totalGood / totalPlan) * 100)}% of today&apos;s plan</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="border-t border-line p-4 lg:border-t-0 lg:border-l">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-xs font-medium text-ink-2">Good pieces per hour</span>
                  <span className="text-2xs text-ink-3">Shift A</span>
                </div>
                <div className="h-[190px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourly} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="h" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--text-3)" }} tickFormatter={(h) => `${h}h`} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--text-3)" }} />
                      <Tooltip
                        cursor={{ fill: "var(--surface-3)" }}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)", boxShadow: "var(--shadow-pop)" }}
                        formatter={(v, n) => [v, n === "good" ? "Good" : "Reject"]}
                        labelFormatter={(h) => `${h}:00-${h}:59`}
                      />
                      <Bar dataKey="good" fill="var(--primary-600)" radius={[3, 3, 0, 0]} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Machine status" action={<span className="text-2xs text-ink-3">Live from operator events</span>} bodyClassName="p-0">
            <ul>
              {workCentres.map((w) => (
                <li key={w.id} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg text-2xs font-semibold",
                      w.status === "running" ? "bg-success-bg text-success" : w.status === "down" ? "bg-danger-bg text-danger" : "bg-neutral-bg text-neutral",
                    )}
                  >
                    {w.code.split("-")[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{lang === "hi" ? w.nameHi : w.name}</span>
                    </div>
                    <div className="truncate text-xs text-ink-3">
                      {w.status === "running" ? `${w.currentJob} · ${w.operator}` : w.status === "down" ? w.downReason : "No job running"}
                    </div>
                  </div>
                  <StatusBadge status={w.status} />
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Orders at risk / low stock / attention */}
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <Card title="Orders by due date" action={<Link href="/sales/orders" className="text-xs font-medium text-primary-700 hover:underline">All orders</Link>} bodyClassName="p-0">
            <ul>
              {atRisk.map(({ o, ordered, delivered, days }) => (
                <li key={o.id}>
                  <Link href={`/sales/orders/${o.id}`} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0 hover:bg-surface-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12.5px] font-medium">{o.number}</span>
                        {days < 0 && <Badge tone="danger">{-days}d late</Badge>}
                        {days >= 0 && days <= 7 && <Badge tone="warning">Due in {days}d</Badge>}
                      </div>
                      <div className="truncate text-xs text-ink-3">{partyById(o.customerId).name}</div>
                    </div>
                    <div className="w-28 shrink-0">
                      <div className="mb-1 flex justify-between text-2xs text-ink-3">
                        <span>Delivered</span>
                        <span className="tabular">{Math.round((delivered / ordered) * 100)}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                        <div className="h-full rounded-full bg-primary-600" style={{ width: `${(delivered / ordered) * 100}%` }} />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Low stock" action={<Link href="/inventory/stock" className="text-xs font-medium text-primary-700 hover:underline">Stock overview</Link>} bodyClassName="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-3">
                  <th className="px-4 py-2 font-medium">Item</th>
                  <th className="px-2 py-2 text-right font-medium">Free</th>
                  <th className="px-2 py-2 text-right font-medium">Reorder at</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {lowStock.map((i) => {
                  const free = i.onHand - i.reserved;
                  return (
                    <tr key={i.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-2">
                        <div className="max-w-[180px] truncate font-medium" title={i.name}>{lang === "hi" ? i.nameHi : i.name}</div>
                        <div className="font-mono text-2xs text-ink-3">{i.code}</div>
                      </td>
                      <td className={cn("tabular px-2 py-2 text-right font-medium whitespace-nowrap", free < 0 ? "text-danger" : "text-warning")}>
                        {formatNum(free)} {i.uom}
                      </td>
                      <td className="tabular px-2 py-2 text-right text-ink-2">{formatNum(i.reorderLevel)}</td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          size="xs"
                          variant="subtle"
                          onClick={() => toast.success(`Purchase requisition created for ${i.code}`, { description: `${formatNum(i.reorderQty)} ${i.uom} · suggested vendor from last PO` })}
                        >
                          Create PR
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <Card title="Needs attention" bodyClassName="p-2">
            <ul className="space-y-1">
              <Attention href="/approvals" icon={<CheckCheck />} tone="warning" title={`${approvals} approvals waiting`} body="PO over limit, credit override, stock adjustment" />
              <Attention href="/finance/einvoice" icon={<FileWarning />} tone="danger" title="1 e-invoice failed" body="INV/26-27/0412 · GSP timeout · auto-retry on" />
              <Attention href="/manufacturing/sync-exceptions" icon={<CloudOff />} tone="danger" title="2 shop-floor sync exceptions" body="Qty over released on JC-2026-00409" />
              <Attention href="/jobwork/challans" icon={<Timer />} tone="warning" title="1 job-work challan near limit" body="JWC/26-27/0031 · 18 days to 1-year limit" />
              <Attention href="/manufacturing/work-centres" icon={<AlertTriangle />} tone="danger" title="VMC 01 down since 08:51" body="Spindle alarm — maintenance called" />
            </ul>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {role.seesCost ? (
            <Card title="Receivables ageing" action={<Link href="/finance/ageing" className="text-xs font-medium text-primary-700 hover:underline">Details</Link>}>
              <div className="mb-3 flex items-baseline gap-2">
                <span className="text-xl font-semibold">{formatLakh(ageing.reduce((a, b) => a + b.v, 0))}</span>
                <span className="text-xs text-ink-3">outstanding from 4 customers</span>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full" role="img" aria-label="Receivables by age bucket">
                {ageing.map((a, i) => (
                  <div
                    key={a.b}
                    style={{ width: `${(a.v / ageing.reduce((x, y) => x + y.v, 0)) * 100}%` }}
                    className={["bg-primary-600", "bg-primary-500/70", "bg-accent-500", "bg-[#d9622b]", "bg-danger"][i]}
                  />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {ageing.map((a, i) => (
                  <div key={a.b}>
                    <div className="flex items-center gap-1.5 text-2xs text-ink-3">
                      <span className={cn("size-2 rounded-sm", ["bg-primary-600", "bg-primary-500/70", "bg-accent-500", "bg-[#d9622b]", "bg-danger"][i])} />
                      {a.b} {i > 0 && "days"}
                    </div>
                    <div className="tabular mt-0.5 text-sm font-medium">{formatLakh(a.v)}</div>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="subtle" className="mt-4" onClick={() => toast.success("WhatsApp reminders queued", { description: "3 customers with dues over 30 days" })}>
                <ArrowUpRight /> Send WhatsApp reminders
              </Button>
            </Card>
          ) : (
            <Card title="Today's receipts and issues">
              <p className="text-sm text-ink-2">3 GRNs, 14 material issues, 2 transfers posted today.</p>
            </Card>
          )}

          <Card title="Recent activity" bodyClassName="p-0">
            <ol>
              {recent.map((r, i) => {
                const Icon = r.icon;
                return (
                  <li key={i} className="flex gap-3 border-b border-line px-4 py-2.5 last:border-0">
                    <Icon className="mt-0.5 size-4 shrink-0 text-ink-3" />
                    <div className="min-w-0 flex-1 text-sm">
                      <span className="font-medium">{r.who}</span> <span className="text-ink-2">{r.what}</span>
                    </div>
                    <span className="tabular shrink-0 text-xs text-ink-3">{r.at}</span>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, sub, href }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub: React.ReactNode; href: string }) {
  return (
    <Link href={href} className="group border-r border-b border-line p-4 transition-colors hover:bg-surface-2 xl:border-b-0 [&:nth-child(6)]:border-r-0">
      <div className="flex items-center gap-1.5 text-xs font-medium text-ink-3 [&_svg]:size-3.5">
        {icon}
        {label}
        <ArrowRight className="ml-auto opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="tabular mt-1.5 text-xl font-semibold tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs text-ink-3">{sub}</div>
    </Link>
  );
}

function Dot({ c, n }: { c: string; n: number }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn("size-2.5 rounded-full", c)} />
      <span className="tabular">{n}</span>
    </span>
  );
}

function Attention({ href, icon, tone, title, body }: { href: string; icon: React.ReactNode; tone: "warning" | "danger"; title: string; body: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-surface-2">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4", tone === "danger" ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning")}>
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{title}</span>
          <span className="block truncate text-xs text-ink-3">{body}</span>
        </span>
        <ArrowRight className="size-4 text-ink-3" />
      </Link>
    </li>
  );
}
