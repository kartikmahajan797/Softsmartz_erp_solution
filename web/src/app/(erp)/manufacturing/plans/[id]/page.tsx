"use client";

import Link from "next/link";
import * as React from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, ChevronDown, ChevronRight, Factory, ShoppingCart, Truck } from "lucide-react";
import { toast } from "sonner";
import { Banner, Card, Chatter, FieldGrid, FormPage, Notebook, Sheet, SheetTitle, SmartButton, SmartButtons, StatusBar } from "@/components/erp/form-view";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, ReadValue } from "@/components/ui/form";
import { Mono } from "@/components/manufacturing/common";
import { itemById } from "@/lib/data/masters";
import { useApp, useRole } from "@/lib/store/app";
import { activeBomFor, explodePlan, type ExplosionNode, flatten, itemName, useMfg } from "@/lib/store/manufacturing";
import { cn, formatDate, formatNum } from "@/lib/utils";

const STEPS = [
  { key: "draft", label: "Draft" },
  { key: "confirmed", label: "Work orders created" },
  { key: "completed", label: "Completed" },
];

export default function PlanPage() {
  const { id } = useParams<{ id: string }>();
  const plan = useMfg((s) => s.plans.find((p) => p.id === id));
  const boms = useMfg((s) => s.boms);
  const wos = useMfg((s) => s.wos);
  const { createPR, createPlanWOs, planLog } = useMfg.getState();
  const role = useRole();
  const lang = useApp((s) => s.lang);
  const [collapsed, setCollapsed] = React.useState<string[]>([]);
  const [sel, setSel] = React.useState<string[]>([]);

  const tree = React.useMemo(() => (plan ? explodePlan(plan, boms) : []), [plan, boms]);
  if (!plan) return <div className="p-10 text-center text-sm text-ink-3">Plan not found. <Link className="text-primary-700 underline" href="/manufacturing/plans">Back</Link></div>;

  const flat = flatten(tree);
  const short = flat.filter((n) => n.shortage > 0);
  // aggregate shortages per item for PRs
  const shortByItem = new Map<string, number>();
  short.forEach((n) => shortByItem.set(n.itemId, (shortByItem.get(n.itemId) ?? 0) + n.shortage));
  const openShort = [...shortByItem.keys()].filter((i) => !plan.requisitions[i]);
  const makeCount = flat.filter((n) => n.make && n.toMake > 0).length;
  const planWos = wos.filter((w) => plan.workOrders.includes(w.number));

  const raisePR = (itemIds: string[]) => {
    const created = createPR(plan.id, itemIds, role.user);
    if (created.length) toast.success(`${created.length} purchase requisition(s) created`, { description: created.join(", ") + " · routed to Purchase" });
    else toast("Requisitions already raised for these items");
    setSel([]);
  };

  const visible: ExplosionNode[] = [];
  const walk = (ns: ExplosionNode[]) =>
    ns.forEach((n) => {
      visible.push(n);
      if (!collapsed.includes(n.key)) walk(n.children);
    });
  walk(tree);

  return (
    <FormPage
      crumbs={[{ label: "Manufacturing", href: "/manufacturing/work-orders" }, { label: "Production plans", href: "/manufacturing/plans" }, { label: plan.number }]}
      actions={
        <>
          {plan.status === "draft" && (
            <Button
              variant="primary"
              onClick={() => {
                const created = createPlanWOs(plan.id, role.user);
                toast.success(`${created.length} work order(s) created`, { description: created.join(", ") });
              }}
            >
              <Factory /> Create work orders
            </Button>
          )}
          {openShort.length > 0 && (
            <Button variant={plan.status === "draft" ? "secondary" : "primary"} onClick={() => raisePR(openShort)}>
              <ShoppingCart /> Requisition all shortages ({openShort.length})
            </Button>
          )}
          {plan.status === "confirmed" && planWos.length > 0 && planWos.every((w) => ["completed", "closed"].includes(w.status)) && (
            <Button onClick={() => { useMfg.setState((s) => ({ plans: s.plans.map((p) => (p.id === plan.id ? { ...p, status: "completed" } : p)) })); planLog(plan.id, role.user, "status", "Plan completed"); toast.success("Plan marked completed"); }}>
              Mark completed
            </Button>
          )}
        </>
      }
      status={<StatusBar steps={STEPS} current={plan.status} />}
      banner={
        short.length > 0 ? (
          <Banner tone={openShort.length ? "warning" : "info"} icon={<AlertTriangle />}>
            {short.length} component shortage{short.length > 1 ? "s" : ""} after netting free stock and open purchase orders.{" "}
            {openShort.length ? `${openShort.length} item(s) still need a requisition.` : "Requisitions raised for all."}
          </Banner>
        ) : undefined
      }
      chatter={<Chatter activities={plan.activities} onLog={(t) => planLog(plan.id, role.user, "note", t)} />}
    >
      <Sheet>
        <SmartButtons>
          <SmartButton icon={<Factory />} label="Work orders" value={plan.workOrders.length} href="/manufacturing/work-orders" />
          <SmartButton icon={<ShoppingCart />} label="Requisitions" value={Object.keys(plan.requisitions).length} href="/purchase/requisitions" />
          <SmartButton icon={<Truck />} label="Sales orders" value={new Set(plan.lines.map((l) => l.soNumber)).size} href="/sales/orders" />
        </SmartButtons>
        <SheetTitle label="Production plan" title={plan.number} badge={<StatusBadge status={plan.status} />} />
        <FieldGrid>
          <div className="space-y-3">
            <Field label="Plan date"><ReadValue>{formatDate(plan.date)}</ReadValue></Field>
            <Field label="Planner"><ReadValue>{plan.createdBy}</ReadValue></Field>
          </div>
          <div className="space-y-3">
            <Field label="Netting"><ReadValue>Free stock, then open purchase orders</ReadValue></Field>
            <Field label="BOM policy" hint="Work orders pin the version used here"><ReadValue>Active version per item</ReadValue></Field>
          </div>
        </FieldGrid>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Components" value={flat.length - tree.length} />
          <Stat label="To manufacture" value={makeCount} />
          <Stat label="Shortages" value={short.length} tone={short.length ? "danger" : undefined} />
          <Stat label="Requisitions" value={Object.keys(plan.requisitions).length} />
        </div>

        <Notebook
          tabs={[
            {
              key: "explosion",
              label: "BOM explosion",
              count: flat.length,
              content: (
                <div>
                  {sel.length > 0 && (
                    <div className="mb-2 flex items-center gap-2 rounded-md bg-primary-50 px-3 py-2 text-sm">
                      <span className="font-medium text-primary-800">{sel.length} selected</span>
                      <Button size="sm" variant="primary" onClick={() => raisePR(sel)}><ShoppingCart /> Create requisitions</Button>
                      <Button size="sm" variant="ghost" onClick={() => setSel([])}>Clear</Button>
                    </div>
                  )}
                  <div className="overflow-x-auto rounded-lg border border-line">
                    <table className="w-full min-w-[780px] text-sm">
                      <thead className="bg-surface-2 text-xs text-ink-2">
                        <tr className="border-b border-line">
                          <th className="w-9 px-3 py-2" />
                          <th className="px-3 py-2 text-left font-semibold">Component</th>
                          <th className="w-[68px] px-2 py-2 text-left font-semibold">Source</th>
                          <th className="w-[84px] px-2 py-2 text-right font-semibold">Required</th>
                          <th className="w-[84px] px-2 py-2 text-right font-semibold">Free stock</th>
                          <th className="w-[84px] px-2 py-2 text-right font-semibold">On order</th>
                          <th className="w-[84px] px-2 py-2 text-right font-semibold">Make</th>
                          <th className="w-[84px] px-2 py-2 text-right font-semibold">Shortage</th>
                          <th className="w-[116px] px-3 py-2 text-right font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map((n) => {
                          const it = itemById(n.itemId);
                          const hasKids = n.children.length > 0;
                          const pr = plan.requisitions[n.itemId];
                          return (
                            <tr key={n.key} className={cn("border-b border-line last:border-0", n.shortage > 0 && "bg-danger-bg/40", n.level === 0 && "bg-surface-2/60")}>
                              <td className="px-3 py-1.5">
                                {n.shortage > 0 && !pr && (
                                  <Checkbox aria-label={`Select ${it.code}`} checked={sel.includes(n.itemId)} onChange={() => setSel((s) => (s.includes(n.itemId) ? s.filter((x) => x !== n.itemId) : [...s, n.itemId]))} />
                                )}
                              </td>
                              <td className="px-3 py-1.5">
                                <div className="flex items-center gap-1" style={{ paddingLeft: n.level * 20 }}>
                                  {hasKids ? (
                                    <button
                                      className="rounded p-0.5 text-ink-3 hover:bg-surface-3"
                                      aria-label={collapsed.includes(n.key) ? "Expand" : "Collapse"}
                                      onClick={() => setCollapsed((c) => (c.includes(n.key) ? c.filter((x) => x !== n.key) : [...c, n.key]))}
                                    >
                                      {collapsed.includes(n.key) ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                                    </button>
                                  ) : (
                                    <span className="w-5" />
                                  )}
                                  <div className="min-w-0">
                                    <div className={cn("truncate", n.level === 0 ? "font-semibold" : "font-medium")}>{itemName(n.itemId, lang)}</div>
                                    <div className="font-mono text-2xs text-ink-3">
                                      {it.code}
                                      {n.bomCode && ` · ${n.bomCode} v${n.bomVersion}`}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 py-1.5">{n.make ? <Badge tone="progress">Make</Badge> : <Badge tone="neutral">Buy</Badge>}</td>
                              <td className="tabular px-2 py-1.5 text-right">{formatNum(n.required)} <span className="text-2xs text-ink-3">{it.uom}</span></td>
                              <td className="tabular px-2 py-1.5 text-right text-ink-2">{n.level === 0 ? "—" : formatNum(n.available)}</td>
                              <td className="tabular px-2 py-1.5 text-right text-ink-2">{n.make ? "—" : formatNum(n.onOrder)}</td>
                              <td className="tabular px-2 py-1.5 text-right text-ink-2">{n.make ? formatNum(n.toMake) : "—"}</td>
                              <td className={cn("tabular px-2 py-1.5 text-right", n.shortage > 0 ? "font-semibold text-danger" : "text-ink-3")}>{n.shortage > 0 ? formatNum(n.shortage) : "—"}</td>
                              <td className="px-3 py-1.5 text-right">
                                {n.shortage > 0 &&
                                  (pr ? (
                                    <Link href="/purchase/requisitions"><Badge tone="info">{pr}</Badge></Link>
                                  ) : (
                                    <Button size="xs" variant="subtle" onClick={() => raisePR([n.itemId])}>Create PR</Button>
                                  ))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-ink-3">Required quantities include BOM scrap %. Free stock is allocated across the whole plan in line order, so a component is never counted twice.</p>
                </div>
              ),
            },
            {
              key: "demand",
              label: "Demand",
              count: plan.lines.length,
              content: (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-surface-2 text-xs text-ink-2">
                      <tr className="border-b border-line">
                        <th className="px-3 py-2 text-left font-semibold">Sales order</th>
                        <th className="px-3 py-2 text-left font-semibold">Customer</th>
                        <th className="px-3 py-2 text-left font-semibold">Item</th>
                        <th className="px-3 py-2 text-right font-semibold">Qty</th>
                        <th className="px-3 py-2 text-left font-semibold">Due</th>
                        <th className="px-3 py-2 text-left font-semibold">BOM / routing pinned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.lines.map((l) => {
                        const b = activeBomFor(l.itemId, boms);
                        return (
                          <tr key={l.id} className="border-b border-line last:border-0">
                            <td className="px-3 py-2"><Link className="font-mono text-[12.5px] font-medium text-primary-700 hover:underline" href={`/sales/orders/${l.soId}`}>{l.soNumber}</Link></td>
                            <td className="px-3 py-2">{l.customer}</td>
                            <td className="px-3 py-2 font-medium">{itemName(l.itemId, lang)}</td>
                            <td className="tabular px-3 py-2 text-right">{formatNum(l.qty)}</td>
                            <td className="px-3 py-2">{formatDate(l.due)}</td>
                            <td className="px-3 py-2 font-mono text-xs">{b ? `${b.code} v${b.version} · ${b.routingCode}` : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ),
            },
            {
              key: "wos",
              label: "Work orders",
              count: planWos.length,
              content: planWos.length ? (
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {planWos.map((w) => (
                    <li key={w.id}>
                      <Link href={`/manufacturing/work-orders/${w.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-2">
                        <Mono>{w.number}</Mono>
                        <span className="flex-1 truncate text-sm">{itemName(w.itemId, lang)} × {formatNum(w.qty)}</span>
                        <span className="text-xs text-ink-3">{formatDate(w.plannedEnd)}</span>
                        <StatusBadge status={w.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <Card><p className="text-sm text-ink-3">No work orders yet. Use “Create work orders” to create one per manufactured item (finished goods and sub-assemblies).</p></Card>
              ),
            },
          ]}
        />
      </Sheet>
    </FormPage>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  return (
    <div className="rounded-lg border border-line px-3 py-2">
      <div className="text-xs text-ink-3">{label}</div>
      <div className={cn("tabular text-lg font-semibold", tone === "danger" && "text-danger")}>{value}</div>
    </div>
  );
}
