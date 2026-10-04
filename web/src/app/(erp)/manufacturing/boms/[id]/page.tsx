"use client";

import Link from "next/link";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, ChevronRight, Copy, Factory, GitBranch, Info, Printer } from "lucide-react";
import { toast } from "sonner";
import { Banner, FieldGrid, FormPage, Notebook, Sheet, SheetTitle, SmartButton, SmartButtons, Totals } from "@/components/erp/form-view";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, ReadValue, Select } from "@/components/ui/form";
import { fmtMin } from "@/components/manufacturing/common";
import { itemById } from "@/lib/data/masters";
import { useApp, useRole } from "@/lib/store/app";
import { activeBomFor, type Bom, itemName, LOT, stdCost, useMfg, wcName } from "@/lib/store/manufacturing";
import { formatDate, formatINR, formatNum } from "@/lib/utils";

interface TreeRow {
  key: string;
  itemId: string;
  level: number;
  qty: number;
  perParent: number;
  scrapPct: number;
  method: string;
  bom?: Bom;
  hasKids: boolean;
}

export default function BomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const bom = useMfg((s) => s.boms.find((b) => b.id === id));
  const boms = useMfg((s) => s.boms);
  const wos = useMfg((s) => s.wos);
  const wcs = useMfg((s) => s.wcs);
  const role = useRole();
  const lang = useApp((s) => s.lang);
  const [collapsed, setCollapsed] = React.useState<string[]>([]);

  if (!bom) return <div className="p-10 text-center text-sm text-ink-3">BOM not found. <Link className="text-primary-700 underline" href="/manufacturing/boms">Back</Link></div>;

  const versions = boms.filter((b) => b.itemId === bom.itemId).sort((a, b) => b.version - a.version);
  const cost = stdCost(bom, boms);
  const editable = bom.status === "draft";
  const usedBy = wos.filter((w) => w.bomId === bom.id);
  const it = itemById(bom.itemId);

  const updateLine = (lineId: string, patch: Partial<Bom["lines"][number]>) =>
    useMfg.setState((s) => ({ boms: s.boms.map((b) => (b.id === bom.id ? { ...b, lines: b.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)) } : b)) }));

  // multi-level structure (quantities per 1 finished unit)
  const rows: TreeRow[] = [];
  const walk = (b: Bom, level: number, mult: number, prefix: string) => {
    b.lines.forEach((l, i) => {
      const key = `${prefix}.${i}`;
      const sub = activeBomFor(l.itemId, boms);
      const qty = mult * l.qty * (1 + l.scrapPct / 100);
      rows.push({ key, itemId: l.itemId, level, qty, perParent: l.qty, scrapPct: l.scrapPct, method: l.issueMethod, bom: sub, hasKids: !!sub });
      if (sub && !collapsed.includes(key)) walk(sub, level + 1, qty, key);
    });
  };
  walk(bom, 0, 1, "r");

  return (
    <FormPage
      crumbs={[{ label: "Manufacturing", href: "/manufacturing/work-orders" }, { label: "Bills of materials", href: "/manufacturing/boms" }, { label: `${bom.code} v${bom.version}` }]}
      actions={
        <>
          {bom.status === "draft" && (
            <Button
              variant="primary"
              onClick={() => {
                useMfg.getState().activateBom(bom.id);
                toast.success(`v${bom.version} is now active`, { description: "Previous version marked obsolete. Open work orders keep their pinned version." });
              }}
            >
              <CheckCircle2 /> Activate version
            </Button>
          )}
          {bom.status === "active" && (
            <Button
              variant="primary"
              onClick={() => {
                const nid = useMfg.getState().newBomVersion(bom.id, role.user);
                toast.success("New draft version created", { description: "Edit components, then activate. Engineering change control is P2 (FR-MF-12)." });
                router.push(`/manufacturing/boms/${nid}`);
              }}
            >
              <Copy /> New version
            </Button>
          )}
          <Button onClick={() => toast.success("BOM structure PDF generated")}><Printer /> Print</Button>
        </>
      }
      status={<StatusBadge status={bom.status} />}
      banner={
        bom.status === "obsolete" ? (
          <Banner tone="info" icon={<Info />}>Obsolete version — kept for traceability of past work orders. Read-only.</Banner>
        ) : bom.status === "draft" ? (
          <Banner tone="warning" icon={<Info />}>Draft version — quantities are editable. Activate to use it in new production plans.</Banner>
        ) : undefined
      }
    >
      <Sheet>
        <SmartButtons>
          <SmartButton icon={<Factory />} label="Work orders" value={usedBy.length} href="/manufacturing/work-orders" />
          <SmartButton icon={<GitBranch />} label="Versions" value={versions.length} onClick={() => toast(`${versions.length} versions: ${versions.map((v) => `v${v.version} (${v.status})`).join(", ")}`)} />
        </SmartButtons>

        <SheetTitle label="Bill of materials" title={<span>{bom.code} <span className="text-ink-3">v{bom.version}</span></span>} subtitle={`${itemName(bom.itemId, lang)} · ${it.code}`} />

        <FieldGrid>
          <div className="space-y-3">
            <Field label="Product"><ReadValue><span className="font-medium">{itemName(bom.itemId, lang)}</span></ReadValue></Field>
            <Field label="Version" htmlFor="ver">
              <Select id="ver" value={bom.id} onChange={(e) => router.push(`/manufacturing/boms/${e.target.value}`)}>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>v{v.version} — {v.status}{v.status === "active" ? " (in use)" : ""}</option>
                ))}
              </Select>
            </Field>
            <Field label="Quantity"><ReadValue>{bom.qtyPer} {it.uom}</ReadValue></Field>
          </div>
          <div className="space-y-3">
            <Field label="Routing"><ReadValue mono>{bom.routingCode}</ReadValue></Field>
            <Field label="Effective from"><ReadValue>{formatDate(bom.effectiveFrom)}</ReadValue></Field>
            <Field label="Notes"><ReadValue>{bom.notes || "—"}</ReadValue></Field>
          </div>
        </FieldGrid>

        <Notebook
          tabs={[
            {
              key: "lines",
              label: "Components",
              count: bom.lines.length,
              content: (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-surface-2 text-xs text-ink-2">
                      <tr className="border-b border-line">
                        <th className="px-3 py-2 text-left font-semibold">Component</th>
                        <th className="w-24 px-2 py-2 text-right font-semibold">Qty</th>
                        <th className="w-14 px-2 py-2 text-left font-semibold">UoM</th>
                        <th className="w-24 px-2 py-2 text-right font-semibold">Scrap %</th>
                        <th className="w-28 px-2 py-2 text-left font-semibold">Issue</th>
                        <th className="px-3 py-2 text-left font-semibold">Alternate</th>
                        {role.seesCost && <th className="w-28 px-3 py-2 text-right font-semibold">Cost / unit</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {bom.lines.map((l) => {
                        const ci = itemById(l.itemId);
                        const sub = activeBomFor(l.itemId, boms);
                        const unit = sub ? stdCost(sub, boms).total : ci.standardCost;
                        return (
                          <tr key={l.id} className="border-b border-line last:border-0">
                            <td className="px-3 py-2">
                              <div className="font-medium">
                                {itemName(l.itemId, lang)} {sub && <Link href={`/manufacturing/boms/${sub.id}`}><Badge tone="progress" dot={false}>Sub-BOM v{sub.version}</Badge></Link>}
                              </div>
                              <div className="font-mono text-2xs text-ink-3">{ci.code}</div>
                            </td>
                            <td className="px-2 py-2 text-right">
                              {editable ? (
                                <Input type="number" min={0} step="0.01" className="h-7 text-right" aria-label="Quantity" value={l.qty} onChange={(e) => updateLine(l.id, { qty: Math.max(0, Number(e.target.value)) })} />
                              ) : (
                                <span className="tabular">{formatNum(l.qty)}</span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-ink-2">{ci.uom}</td>
                            <td className="px-2 py-2 text-right">
                              {editable ? (
                                <Input type="number" min={0} max={50} step="0.5" className="h-7 text-right" aria-label="Scrap percent" value={l.scrapPct} onChange={(e) => updateLine(l.id, { scrapPct: Math.min(50, Math.max(0, Number(e.target.value))) })} />
                              ) : (
                                <span className="tabular">{l.scrapPct}</span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {editable ? (
                                <Select className="h-7" aria-label="Issue method" value={l.issueMethod} onChange={(e) => updateLine(l.id, { issueMethod: e.target.value as "manual" | "backflush" })}>
                                  <option value="manual">Manual</option>
                                  <option value="backflush">Backflush</option>
                                </Select>
                              ) : l.issueMethod === "backflush" ? (
                                <Badge tone="progress" dot={false}>Backflush</Badge>
                              ) : (
                                <Badge tone="neutral" dot={false}>Manual</Badge>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-ink-2">{l.alternate ?? "—"}</td>
                            {role.seesCost && <td className="tabular px-3 py-2 text-right">{formatINR(l.qty * (1 + l.scrapPct / 100) * unit)}</td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ),
            },
            {
              key: "tree",
              label: "Structure",
              content: (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-surface-2 text-xs text-ink-2">
                      <tr className="border-b border-line">
                        <th className="px-3 py-2 text-left font-semibold">Level · component</th>
                        <th className="w-28 px-2 py-2 text-right font-semibold">Per parent</th>
                        <th className="w-36 px-2 py-2 text-right font-semibold">Per 1 {it.uom} {it.code.split("-").slice(-1)}</th>
                        <th className="w-28 px-3 py-2 text-left font-semibold">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-line bg-surface-2/60">
                        <td className="px-3 py-2 font-semibold" colSpan={4}>{itemName(bom.itemId, lang)} <span className="font-mono text-xs font-normal text-ink-3">{it.code}</span></td>
                      </tr>
                      {rows.map((r) => (
                        <tr key={r.key} className="border-b border-line last:border-0">
                          <td className="px-3 py-1.5">
                            <div className="flex items-center gap-1" style={{ paddingLeft: 12 + r.level * 20 }}>
                              {r.hasKids ? (
                                <button className="rounded p-0.5 text-ink-3 hover:bg-surface-3" aria-label="Toggle" onClick={() => setCollapsed((c) => (c.includes(r.key) ? c.filter((x) => x !== r.key) : [...c, r.key]))}>
                                  {collapsed.includes(r.key) ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                                </button>
                              ) : (
                                <span className="w-5 border-b border-l border-line-strong" style={{ height: 10, marginTop: -8 }} />
                              )}
                              <span className="text-2xs text-ink-3 tabular">L{r.level + 1}</span>
                              <span className="font-medium">{itemName(r.itemId, lang)}</span>
                              <span className="font-mono text-2xs text-ink-3">{itemById(r.itemId).code}</span>
                            </div>
                          </td>
                          <td className="tabular px-2 py-1.5 text-right text-ink-2">{formatNum(r.perParent)}{r.scrapPct ? ` +${r.scrapPct}%` : ""}</td>
                          <td className="tabular px-2 py-1.5 text-right font-medium">{r.qty.toFixed(3).replace(/\.?0+$/, "")} {itemById(r.itemId).uom}</td>
                          <td className="px-3 py-1.5">{r.bom ? <Badge tone="progress" dot={false}>Make</Badge> : <Badge tone="neutral" dot={false}>Buy</Badge>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ),
            },
            {
              key: "ops",
              label: "Operations",
              count: bom.routing.length,
              content: (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead className="bg-surface-2 text-xs text-ink-2">
                      <tr className="border-b border-line">
                        <th className="w-14 px-3 py-2 text-left font-semibold">Seq</th>
                        <th className="px-3 py-2 text-left font-semibold">Operation</th>
                        <th className="px-2 py-2 text-left font-semibold">Work centre</th>
                        <th className="w-24 px-2 py-2 text-right font-semibold">Setup</th>
                        <th className="w-28 px-2 py-2 text-right font-semibold">Run / unit</th>
                        <th className="w-32 px-3 py-2 text-right font-semibold">Lot of {LOT}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bom.routing.map((r) => (
                        <tr key={r.seq} className="border-b border-line last:border-0">
                          <td className="tabular px-3 py-2 text-ink-3">{r.seq}</td>
                          <td className="px-3 py-2 font-medium">{lang === "hi" ? r.nameHi : r.name}</td>
                          <td className="px-2 py-2">{r.wcId === "jw" ? <span>{r.jobWorker} <Badge tone="info" dot={false}>Job-work</Badge></span> : wcName(r.wcId, wcs, lang)}</td>
                          <td className="tabular px-2 py-2 text-right">{r.wcId === "jw" ? "—" : `${r.setupMin} min`}</td>
                          <td className="tabular px-2 py-2 text-right">{r.wcId === "jw" ? "—" : `${r.runMin} min`}</td>
                          <td className="tabular px-3 py-2 text-right text-ink-2">{r.wcId === "jw" ? "Lead time 3 days" : fmtMin(r.setupMin + r.runMin * LOT)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ),
            },
            {
              key: "byp",
              label: "Outputs & by-products",
              count: bom.outputs.length,
              content: (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead className="bg-surface-2 text-xs text-ink-2">
                      <tr className="border-b border-line">
                        <th className="px-3 py-2 text-left font-semibold">Output</th>
                        <th className="w-24 px-2 py-2 text-right font-semibold">Qty</th>
                        <th className="w-28 px-2 py-2 text-left font-semibold">Type</th>
                        <th className="w-28 px-2 py-2 text-right font-semibold">Cost share</th>
                        {role.seesCost && <th className="w-36 px-3 py-2 text-right font-semibold">Recovery value</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {bom.outputs.map((o) => (
                        <tr key={o.id} className="border-b border-line last:border-0">
                          <td className="px-3 py-2 font-medium">{o.name}</td>
                          <td className="tabular px-2 py-2 text-right">{o.qty} {o.uom}</td>
                          <td className="px-2 py-2">{o.isMain ? <Badge tone="brand" dot={false}>Main</Badge> : <Badge tone="neutral" dot={false}>By-product</Badge>}</td>
                          <td className="tabular px-2 py-2 text-right">{o.costSharePct}%</td>
                          {role.seesCost && <td className="tabular px-3 py-2 text-right">{o.recoveryRate ? `${formatINR(o.qty * o.recoveryRate)} (₹${o.recoveryRate}/${o.uom})` : "—"}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ),
            },
            ...(role.seesCost
              ? [
                  {
                    key: "cost",
                    label: "Cost roll-up",
                    content: (
                      <div className="flex flex-col gap-4 md:flex-row md:items-start">
                        <p className="flex-1 text-sm text-ink-2">
                          Standard cost per {it.uom}, rolled up through sub-assembly BOMs at item standard costs. Setup time is spread over a lot of {LOT}; labour and overhead use work-centre hourly rates.
                        </p>
                        <Totals
                          rows={[
                            { label: "Material", value: formatINR(cost.material) },
                            { label: "Scrap allowance", value: formatINR(cost.scrap) },
                            { label: "Labour", value: formatINR(cost.labour) },
                            { label: "Overhead", value: formatINR(cost.overhead) },
                            ...(cost.jobwork ? [{ label: "Job-work", value: formatINR(cost.jobwork) }] : []),
                            ...(cost.byproduct ? [{ label: "Less by-product recovery", value: `−${formatINR(cost.byproduct)}`, muted: true }] : []),
                            { label: "Standard cost / unit", value: formatINR(cost.total), strong: true },
                          ]}
                        />
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Sheet>
    </FormPage>
  );
}

