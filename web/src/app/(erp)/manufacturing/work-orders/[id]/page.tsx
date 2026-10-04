"use client";

import Link from "next/link";
import * as React from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeftRight,
  Ban,
  ClipboardList,
  Lock,
  MoreHorizontal,
  PackageMinus,
  Play,
  Printer,
  QrCode,
  ShoppingCart,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Banner, Chatter, FieldGrid, FormPage, Notebook, Sheet, SheetTitle, SmartButton, SmartButtons, StatusBar } from "@/components/erp/form-view";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, ReadValue, Select } from "@/components/ui/form";
import { Dialog, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Sheet as SidePanel } from "@/components/ui/overlay";
import { Availability, fmtMin, Mono, Progress, Variance } from "@/components/manufacturing/common";
import { itemById, reasonCodes, whById, warehouses } from "@/lib/data/masters";
import { useApp, useRole } from "@/lib/store/app";
import { itemName, operatorName, useMfg, wcName, woCosting, woRequired, type WorkOrder } from "@/lib/store/manufacturing";
import { cn, daysBetween, formatDate, formatDateTime, formatINR, formatNum, TODAY } from "@/lib/utils";

const STEPS = [
  { key: "draft", label: "Draft" },
  { key: "released", label: "Released" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "closed", label: "Closed" },
];

export default function WorkOrderPage() {
  const { id } = useParams<{ id: string }>();
  const wo = useMfg((s) => s.wos.find((w) => w.id === id));
  const boms = useMfg((s) => s.boms);
  const allJcs = useMfg((s) => s.jcs);
  const wcs = useMfg((s) => s.wcs);
  const scrap = useMfg((s) => s.scrap);
  const { setWoStatus, releaseWo, woLog } = useMfg.getState();
  const role = useRole();
  const lang = useApp((s) => s.lang);
  const [dlg, setDlg] = React.useState<null | "issue" | "report" | "close" | "cancel">(null);
  const [movesOpen, setMovesOpen] = React.useState(false);

  if (!wo) return <div className="p-10 text-center text-sm text-ink-3">Work order not found. <Link className="text-primary-700 underline" href="/manufacturing/work-orders">Back</Link></div>;

  const bom = boms.find((b) => b.id === wo.bomId)!;
  const jcs = allJcs.filter((j) => j.woId === wo.id).sort((a, b) => a.seq - b.seq);
  const req = woRequired(wo, bom);
  const shortLines = req.filter((r) => {
    const rem = r.required - (wo.issued[r.line.itemId] ?? 0);
    return rem > 0 && itemById(r.line.itemId).onHand < rem && r.line.issueMethod === "manual";
  });
  const isLate = ["released", "in_progress"].includes(wo.status) && daysBetween(TODAY, wo.plannedEnd) < 0;
  const cost = woCosting(wo, boms, allJcs);
  const woScrap = scrap.filter((s) => s.woId === wo.id);
  const canAct = role.key === "owner" || role.key === "production" || role.key === "store";

  const actions = (
    <>
      {wo.status === "draft" && (
        <Button variant="primary" onClick={() => { releaseWo(wo.id, role.user); toast.success("Work order released", { description: "Job cards created for each routing operation" }); }}>
          Release
        </Button>
      )}
      {wo.status === "released" && (
        <Button variant="primary" onClick={() => { setWoStatus(wo.id, "in_progress", role.user, "Production started"); toast.success("Production started"); }}>
          <Play /> Start production
        </Button>
      )}
      {wo.status === "in_progress" && (
        <Button variant="primary" onClick={() => setDlg("report")}>
          <ClipboardList /> Report production
        </Button>
      )}
      {["released", "in_progress"].includes(wo.status) && canAct && (
        <Button onClick={() => setDlg("issue")}>
          <PackageMinus /> Issue materials
        </Button>
      )}
      {wo.status === "in_progress" && (
        <Button
          disabled={wo.produced === 0}
          onClick={() => {
            setWoStatus(wo.id, "completed", role.user, `Completed · ${formatNum(wo.produced)} good, ${formatNum(wo.rejected)} rejected`);
            toast.success("Work order completed", { description: "Close it to freeze cost and post variance" });
          }}
        >
          <CheckCircle2 /> Mark completed
        </Button>
      )}
      {wo.status === "completed" && (
        <Button variant="primary" onClick={() => setDlg("close")}>
          <Lock /> Close & post variance
        </Button>
      )}
      <Menu>
        <MenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More actions"><MoreHorizontal /></Button>
        </MenuTrigger>
        <MenuContent align="start">
          <MenuItem icon={<Printer />} onSelect={() => toast.success("Job cards PDF generated", { description: `${jcs.length} job cards with QR codes` })}>Print job cards</MenuItem>
          <MenuItem icon={<QrCode />} onSelect={() => toast.success("Traveller label generated", { description: `${wo.number} · QR for shop-floor scanning` })}>Print traveller with QR</MenuItem>
          <MenuItem icon={<ArrowLeftRight />} onSelect={() => setMovesOpen(true)}>Stock moves</MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Ban />} danger disabled={!["draft", "released"].includes(wo.status)} onSelect={() => setDlg("cancel")}>Cancel work order</MenuItem>
        </MenuContent>
      </Menu>
    </>
  );

  return (
    <FormPage
      crumbs={[{ label: "Manufacturing", href: "/manufacturing/work-orders" }, { label: "Work orders", href: "/manufacturing/work-orders" }, { label: wo.number }]}
      actions={actions}
      status={wo.status === "cancelled" ? <StatusBadge status="cancelled" /> : <StatusBar steps={STEPS} current={wo.status} />}
      banner={
        wo.status === "closed" ? (
          <Banner tone="info" icon={<Lock />}>Closed — cost is frozen. Corrections are posted as reversal documents, never edits.</Banner>
        ) : isLate ? (
          <Banner tone="danger" icon={<AlertTriangle />}>
            {-daysBetween(TODAY, wo.plannedEnd)} day(s) past the deadline of {formatDate(wo.plannedEnd)} · {formatNum(wo.qty - wo.produced)} still to produce.
          </Banner>
        ) : shortLines.length && ["released", "in_progress"].includes(wo.status) ? (
          <Banner tone="warning" icon={<AlertTriangle />}>
            {shortLines.length} component(s) short in stores: {shortLines.map((r) => itemById(r.line.itemId).code).join(", ")}.
          </Banner>
        ) : undefined
      }
      chatter={<Chatter activities={wo.activities} onLog={(t) => woLog(wo.id, role.user, "note", t)} />}
    >
      <Sheet>
        <SmartButtons>
          <SmartButton icon={<ClipboardList />} label="Job cards" value={jcs.length} href="/manufacturing/job-cards" />
          <SmartButton icon={<ArrowLeftRight />} label="Stock moves" value={wo.moves.length} onClick={() => setMovesOpen(true)} />
          {wo.soId && <SmartButton icon={<ShoppingCart />} label="Sales order" value={wo.soNumber} href={`/sales/orders/${wo.soId}`} />}
          <SmartButton icon={<Trash2 />} label="Scrap & rework" value={woScrap.length} href="/manufacturing/scrap" />
        </SmartButtons>

        <SheetTitle label="Work order" title={wo.number} badge={<StatusBadge status={wo.status} />} />

        <FieldGrid>
          <div className="space-y-3">
            <Field label="Product">
              <ReadValue>
                <span className="font-medium">{itemName(wo.itemId, lang)}</span>
                <span className="ml-2 font-mono text-xs text-ink-3">{itemById(wo.itemId).code}</span>
              </ReadValue>
            </Field>
            <Field label="Quantity">
              <div className="pt-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span>
                    <span className="tabular font-semibold">{formatNum(wo.produced)}</span>
                    <span className="text-ink-3"> / {formatNum(wo.qty)} {itemById(wo.itemId).uom} produced</span>
                  </span>
                  {wo.rejected > 0 && <span className="text-xs text-danger">{formatNum(wo.rejected)} rejected</span>}
                </div>
                <Progress value={wo.produced} max={wo.qty} className="mt-1.5" />
              </div>
            </Field>
            <Field label="Bill of materials" hint="Pinned at release; later BOM edits do not change this order">
              <ReadValue>
                <Link href={`/manufacturing/boms/${bom.id}`} className="font-mono text-[12.5px] text-primary-700 hover:underline">{bom.code} v{bom.version}</Link>
                <span className="ml-2 font-mono text-xs text-ink-3">{bom.routingCode}</span>
              </ReadValue>
            </Field>
            <Field label="Source">
              <ReadValue>
                {wo.soId ? (
                  <Link href={`/sales/orders/${wo.soId}`} className="font-mono text-[12.5px] text-primary-700 hover:underline">{wo.soNumber}</Link>
                ) : wo.parentWo ? (
                  <span className="font-mono text-[12.5px]">Sub-assembly for {wo.parentWo}</span>
                ) : (
                  "Make to stock"
                )}
              </ReadValue>
            </Field>
          </div>
          <div className="space-y-3">
            <Field label="Planned start"><ReadValue>{formatDate(wo.plannedStart)}</ReadValue></Field>
            <Field label="Deadline"><ReadValue><span className={cn(isLate && "font-medium text-danger")}>{formatDate(wo.plannedEnd)}</span></ReadValue></Field>
            <Field label="Finished goods to"><ReadValue>{warehouses.find((w) => w.code === wo.warehouse)?.name ?? wo.warehouse}</ReadValue></Field>
            <Field label="Responsible"><ReadValue>Prakash Deshmukh</ReadValue></Field>
          </div>
        </FieldGrid>

        <Notebook
          tabs={[
            {
              key: "components",
              label: "Components",
              count: bom.lines.length,
              content: (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-surface-2 text-xs text-ink-2">
                      <tr className="border-b border-line">
                        <th className="px-3 py-2 text-left font-semibold">Component</th>
                        <th className="w-24 px-2 py-2 text-left font-semibold">Issue</th>
                        <th className="w-24 px-2 py-2 text-right font-semibold">Required</th>
                        <th className="w-24 px-2 py-2 text-right font-semibold">Issued</th>
                        <th className="w-24 px-2 py-2 text-right font-semibold">In stock</th>
                        <th className="w-36 px-3 py-2 text-left font-semibold">Availability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {req.map(({ line, required }) => {
                        const it = itemById(line.itemId);
                        const issued = wo.issued[line.itemId] ?? 0;
                        return (
                          <tr key={line.id} className="border-b border-line last:border-0">
                            <td className="px-3 py-2">
                              <div className="font-medium">{itemName(line.itemId, lang)}</div>
                              <div className="font-mono text-2xs text-ink-3">
                                {it.code} · {line.qty} {it.uom}/unit{line.scrapPct ? ` + ${line.scrapPct}% scrap` : ""}
                              </div>
                              {line.alternate && <div className="text-2xs text-progress">Alternate: {line.alternate}</div>}
                            </td>
                            <td className="px-2 py-2">{line.issueMethod === "backflush" ? <Badge tone="progress" dot={false}>Backflush</Badge> : <Badge tone="neutral" dot={false}>Manual</Badge>}</td>
                            <td className="tabular px-2 py-2 text-right">{formatNum(required)} <span className="text-2xs text-ink-3">{it.uom}</span></td>
                            <td className="tabular px-2 py-2 text-right">{formatNum(issued)}</td>
                            <td className="tabular px-2 py-2 text-right text-ink-2">{formatNum(it.onHand)}</td>
                            <td className="px-3 py-2">
                              {["completed", "closed"].includes(wo.status) ? <Badge tone="success">Consumed</Badge> : <Availability remaining={required - issued} available={it.onHand} />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ),
            },
            {
              key: "ops",
              label: "Operations",
              count: jcs.length || bom.routing.length,
              content: (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead className="bg-surface-2 text-xs text-ink-2">
                      <tr className="border-b border-line">
                        <th className="w-12 px-3 py-2 text-left font-semibold">Seq</th>
                        <th className="px-3 py-2 text-left font-semibold">Operation</th>
                        <th className="px-2 py-2 text-left font-semibold">Work centre</th>
                        <th className="px-2 py-2 text-left font-semibold">Operator</th>
                        <th className="px-2 py-2 text-right font-semibold">Planned</th>
                        <th className="px-2 py-2 text-right font-semibold">Actual</th>
                        <th className="w-32 px-2 py-2 text-left font-semibold">Good / reject</th>
                        <th className="px-3 py-2 text-left font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bom.routing.map((r) => {
                        const j = jcs.find((x) => x.seq === r.seq);
                        return (
                          <tr key={r.seq} className="border-b border-line last:border-0">
                            <td className="tabular px-3 py-2 text-ink-3">{r.seq}</td>
                            <td className="px-3 py-2">
                              <div className="font-medium">{lang === "hi" ? r.nameHi : r.name}</div>
                              <div className="font-mono text-2xs text-ink-3">{j?.number ?? "Job card on release"}</div>
                            </td>
                            <td className="px-2 py-2">{r.wcId === "jw" ? <span>{r.jobWorker} <Badge tone="info" dot={false}>Job-work</Badge></span> : wcName(r.wcId, wcs, lang)}</td>
                            <td className="px-2 py-2 text-ink-2">{operatorName(j?.operatorId)}</td>
                            <td className="tabular px-2 py-2 text-right text-ink-2">{r.wcId === "jw" ? "—" : fmtMin(j?.plannedMin ?? r.setupMin + r.runMin * wo.qty)}</td>
                            <td className={cn("tabular px-2 py-2 text-right", j && j.plannedMin && j.actualMin > j.plannedMin * (j.good / j.qtyPlanned || 1) * 1.1 ? "text-danger" : "")}>{fmtMin(j?.actualMin ?? 0)}</td>
                            <td className="px-2 py-2">
                              {j ? (
                                <div>
                                  <div className="tabular text-xs"><span className="font-medium">{formatNum(j.good)}</span> / <span className={j.reject ? "text-danger" : "text-ink-3"}>{j.reject}</span></div>
                                  <Progress value={j.good} max={j.qtyPlanned} className="mt-1" />
                                </div>
                              ) : (
                                <span className="text-ink-3">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2">{j ? <StatusBadge status={j.status} /> : <span className="text-xs text-ink-3">Not released</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ),
            },
            ...(role.seesCost
              ? [
                  {
                    key: "cost",
                    label: "Costing",
                    content: (
                      <div>
                        <div className="overflow-x-auto rounded-lg border border-line">
                          <table className="w-full min-w-[600px] text-sm">
                            <thead className="bg-surface-2 text-xs text-ink-2">
                              <tr className="border-b border-line">
                                <th className="px-3 py-2 text-left font-semibold">Cost element</th>
                                <th className="px-3 py-2 text-right font-semibold">Standard (₹)</th>
                                <th className="px-3 py-2 text-right font-semibold">Actual (₹)</th>
                                <th className="px-3 py-2 text-right font-semibold">Variance</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(
                                [
                                  ["Material", "material"],
                                  ["Labour", "labour"],
                                  ["Overhead", "overhead"],
                                  ["Scrap", "scrap"],
                                  ["Job-work charges", "jobwork"],
                                  ["Less: by-product recovery", "byproduct"],
                                ] as const
                              ).map(([label, k]) => (
                                <tr key={k} className="border-b border-line">
                                  <td className="px-3 py-2">{label}</td>
                                  <td className="tabular px-3 py-2 text-right">{formatINR(cost.standard[k])}</td>
                                  <td className="tabular px-3 py-2 text-right">{formatINR(cost.actual[k])}</td>
                                  <td className="px-3 py-2 text-right"><Variance std={cost.standard[k]} act={cost.actual[k]} /></td>
                                </tr>
                              ))}
                              <tr className="bg-surface-2 font-semibold">
                                <td className="px-3 py-2">Total</td>
                                <td className="tabular px-3 py-2 text-right">{formatINR(cost.standard.total)}</td>
                                <td className="tabular px-3 py-2 text-right">{formatINR(cost.actual.total)}</td>
                                <td className="px-3 py-2 text-right"><Variance std={cost.standard.total} act={cost.actual.total} /></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <MiniStat label="Standard cost / unit" value={formatINR(cost.unitStd)} />
                          <MiniStat label="Actual cost / unit" value={wo.produced ? formatINR(cost.actual.total / wo.produced) : "—"} />
                          <MiniStat label="Basis" value={`${formatNum(wo.produced)} good units`} />
                        </div>
                        <p className="mt-2 text-xs text-ink-3">Standard = BOM roll-up × produced qty. Actual material = issued + backflushed qty at stock valuation; labour and overhead = job-card run time × work-centre rates.</p>
                      </div>
                    ),
                  },
                ]
              : []),
            {
              key: "scrap",
              label: "Scrap",
              count: woScrap.length,
              content: woScrap.length ? (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead className="bg-surface-2 text-xs text-ink-2">
                      <tr className="border-b border-line">
                        <th className="px-3 py-2 text-left font-semibold">Entry</th>
                        <th className="px-3 py-2 text-left font-semibold">Date</th>
                        <th className="px-3 py-2 text-left font-semibold">Type</th>
                        <th className="px-3 py-2 text-right font-semibold">Qty</th>
                        <th className="px-3 py-2 text-left font-semibold">Reason</th>
                        <th className="px-3 py-2 text-left font-semibold">Job card</th>
                      </tr>
                    </thead>
                    <tbody>
                      {woScrap.map((s) => (
                        <tr key={s.id} className="border-b border-line last:border-0">
                          <td className="px-3 py-2"><Mono>{s.number}</Mono></td>
                          <td className="px-3 py-2">{formatDate(s.date)}</td>
                          <td className="px-3 py-2"><Badge tone={s.type === "scrap" ? "danger" : "warning"}>{s.type === "scrap" ? "Scrap" : "Rework"}</Badge></td>
                          <td className="tabular px-3 py-2 text-right">{s.qty}</td>
                          <td className="px-3 py-2">{reasonCodes.find((r) => r.code === s.reason)?.name}</td>
                          <td className="px-3 py-2 font-mono text-xs">{s.jcNumber}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-ink-3">No scrap or rework recorded.</p>
              ),
            },
          ]}
        />
      </Sheet>

      {dlg === "issue" && <IssueDialog open onClose={() => setDlg(null)} wo={wo} />}
      {dlg === "report" && <ReportDialog open onClose={() => setDlg(null)} wo={wo} />}
      <CloseDialog open={dlg === "close"} onClose={() => setDlg(null)} wo={wo} variance={cost.standard.total ? ((cost.actual.total - cost.standard.total) / cost.standard.total) * 100 : 0} seesCost={role.seesCost} />
      <Dialog
        open={dlg === "cancel"}
        onOpenChange={(o) => !o && setDlg(null)}
        title="Cancel this work order?"
        description="Open job cards are cancelled and reserved components are released."
        size="sm"
        footer={
          <>
            <Button onClick={() => setDlg(null)}>Keep</Button>
            <Button variant="danger" onClick={() => { setWoStatus(wo.id, "cancelled", role.user, "Work order cancelled"); setDlg(null); toast("Work order cancelled"); }}>Cancel work order</Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">Only draft and released orders with no production can be cancelled.</p>
      </Dialog>

      <SidePanel open={movesOpen} onOpenChange={setMovesOpen} title={`Stock moves · ${wo.number}`} width={520}>
        {wo.moves.length ? (
          <ol className="space-y-2">
            {[...wo.moves].reverse().map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2">
                <Badge tone={m.type === "fg_receipt" ? "success" : m.type === "scrap" ? "danger" : m.type === "backflush" ? "progress" : "info"} dot={false}>
                  {m.type === "fg_receipt" ? "FG receipt" : m.type === "backflush" ? "Backflush" : m.type === "scrap" ? "Scrap" : m.type === "issue" ? "Issue" : "Return"}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{itemName(m.itemId, lang)}</div>
                  <div className="text-2xs text-ink-3">{formatDateTime(m.at)} · {m.warehouse}</div>
                </div>
                <span className={cn("tabular text-sm font-medium", m.type === "fg_receipt" ? "text-success" : "text-ink")}>
                  {m.type === "fg_receipt" ? "+" : "−"}
                  {formatNum(m.qty)} {itemById(m.itemId).uom}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-ink-3">No stock moves yet. Moves are append-only ledger entries; corrections create reversing entries.</p>
        )}
      </SidePanel>
    </FormPage>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line px-3 py-2">
      <div className="text-xs text-ink-3">{label}</div>
      <div className="tabular text-sm font-semibold">{value}</div>
    </div>
  );
}

function IssueDialog({ open, onClose, wo }: { open: boolean; onClose: () => void; wo: WorkOrder }) {
  const boms = useMfg((s) => s.boms);
  const role = useRole();
  const bom = boms.find((b) => b.id === wo.bomId)!;
  const req = woRequired(wo, bom);
  // Mounted only while open, so state starts fresh each time.
  const [qty, setQty] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(req.filter((r) => r.line.issueMethod === "manual").map((r) => [r.line.itemId, Math.max(0, +(r.required - (wo.issued[r.line.itemId] ?? 0)).toFixed(2))])),
  );
  const [from, setFrom] = React.useState("w1");
  const [err, setErr] = React.useState("");

  const submit = () => {
    const over = Object.entries(qty).find(([i, q]) => q > itemById(i).onHand);
    if (over) return setErr(`${itemById(over[0]).code}: only ${formatNum(itemById(over[0]).onHand)} ${itemById(over[0]).uom} in stock. Negative stock is blocked for office documents.`);
    if (Object.values(qty).some((q) => q < 0)) return setErr("Quantities cannot be negative");
    if (!Object.values(qty).some((q) => q > 0)) return setErr("Enter a quantity on at least one line");
    useMfg.getState().issueMaterials(wo.id, qty, role.user);
    toast.success("Materials issued", { description: `Stock moved from ${whById(from).name} to WIP` });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={`Issue materials · ${wo.number}`}
      description="Manual-issue components only. Backflush components are consumed automatically when production is reported."
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}><PackageMinus /> Post issue</Button>
        </>
      }
    >
      <div className="mb-3 max-w-xs">
        <Field label="From warehouse" layout="vertical" htmlFor="from">
          <Select id="from" value={from} onChange={(e) => setFrom(e.target.value)}>
            {warehouses.filter((w) => ["stores", "wip"].includes(w.type)).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
        </Field>
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs text-ink-3">
          <tr className="border-b border-line">
            <th className="py-2 text-left font-medium">Component</th>
            <th className="py-2 text-left font-medium">Method</th>
            <th className="py-2 text-right font-medium">Remaining</th>
            <th className="py-2 text-right font-medium">In stock</th>
            <th className="w-32 py-2 text-right font-medium">Issue now</th>
          </tr>
        </thead>
        <tbody>
          {req.map(({ line, required }) => {
            const it = itemById(line.itemId);
            const rem = Math.max(0, required - (wo.issued[line.itemId] ?? 0));
            return (
              <tr key={line.id} className="border-b border-line">
                <td className="py-2">
                  <div className="font-medium">{it.name}</div>
                  <div className="font-mono text-2xs text-ink-3">{it.code}{it.batchTracked ? " · batch FIFO" : ""}</div>
                </td>
                <td className="py-2">{line.issueMethod === "backflush" ? <Badge tone="progress" dot={false}>Backflush</Badge> : <Badge tone="neutral" dot={false}>Manual</Badge>}</td>
                <td className="tabular py-2 text-right">{formatNum(rem)} {it.uom}</td>
                <td className={cn("tabular py-2 text-right", it.onHand < rem ? "text-danger" : "text-ink-2")}>{formatNum(it.onHand)}</td>
                <td className="py-2 pl-3">
                  {line.issueMethod === "manual" ? (
                    <Input type="number" min={0} step="0.01" className="text-right" aria-label={`Issue quantity for ${it.code}`} value={qty[line.itemId] ?? 0} onChange={(e) => setQty((q) => ({ ...q, [line.itemId]: Number(e.target.value) }))} />
                  ) : (
                    <span className="block text-right text-xs text-ink-3">On reporting</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {err && <p className="mt-3 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{err}</p>}
    </Dialog>
  );
}

function ReportDialog({ open, onClose, wo }: { open: boolean; onClose: () => void; wo: WorkOrder }) {
  const role = useRole();
  const [good, setGood] = React.useState(0);
  const [reject, setReject] = React.useState(0);
  const [reason, setReason] = React.useState("");
  const [err, setErr] = React.useState("");
  const remaining = wo.qty - wo.produced;
  const submit = () => {
    if (good < 0 || reject < 0) return setErr("Quantities cannot be negative");
    if (good + reject === 0) return setErr("Enter good or rejected quantity");
    if (good > remaining * 1.01) return setErr(`Good quantity exceeds the remaining ${formatNum(remaining)} (+1% tolerance)`);
    if (reject > 0 && !reason) return setErr("Select a reject reason");
    useMfg.getState().reportProduction(wo.id, good, reject, reasonCodes.find((r) => r.code === reason)?.name ?? "", role.user);
    if (reject > 0) {
      useMfg.getState().addScrap({ date: TODAY, type: "scrap", woId: wo.id, itemId: wo.itemId, qty: reject, reason, wcId: "wc7", note: "Reported from work order" });
    }
    toast.success(`Reported ${good} good${reject ? `, ${reject} rejected` : ""}`, { description: "Backflush posted · stock and cost updated" });
    onClose();
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={`Report production · ${wo.number}`}
      description={`${formatNum(remaining)} ${itemById(wo.itemId).uom} remaining. Entries are append-only; corrections post reversing entries.`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Post</Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Good quantity" layout="vertical" required htmlFor="good">
          <Input id="good" type="number" min={0} value={good || ""} onChange={(e) => setGood(Number(e.target.value))} />
        </Field>
        <Field label="Rejected quantity" layout="vertical" htmlFor="rej">
          <Input id="rej" type="number" min={0} value={reject || ""} onChange={(e) => setReject(Number(e.target.value))} />
        </Field>
      </div>
      {reject > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 text-sm font-medium text-ink-2">Reject reason <span className="text-danger">*</span></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {reasonCodes.filter((r) => r.kind === "reject").map((r) => (
              <button
                key={r.code}
                onClick={() => setReason(r.code)}
                aria-pressed={reason === r.code}
                className={cn("rounded-md border px-2.5 py-2 text-left text-xs", reason === r.code ? "border-primary-600 bg-primary-50 text-primary-800" : "border-line-strong hover:bg-surface-3")}
              >
                <span className="font-medium">{r.name}</span>
                <span className="block text-2xs text-ink-3">{r.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {err && <p className="mt-3 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{err}</p>}
    </Dialog>
  );
}

function CloseDialog({ open, onClose, wo, variance, seesCost }: { open: boolean; onClose: () => void; wo: WorkOrder; variance: number; seesCost: boolean }) {
  const role = useRole();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={`Close ${wo.number}?`}
      description="Freezes cost, posts the variance journal and releases unused reservations. This cannot be undone."
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { useMfg.getState().closeWo(wo.id, variance, role.user); toast.success("Work order closed", { description: seesCost ? `Variance ${variance >= 0 ? "+" : ""}${variance.toFixed(1)}% posted` : "Cost frozen" }); onClose(); }}>
            <Lock /> Close
          </Button>
        </>
      }
    >
      <dl className="space-y-1.5 text-sm">
        <div className="flex justify-between"><dt className="text-ink-3">Produced</dt><dd className="tabular">{formatNum(wo.produced)} / {formatNum(wo.qty)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-3">Rejected</dt><dd className="tabular">{formatNum(wo.rejected)}</dd></div>
        {seesCost && (
          <div className="flex justify-between"><dt className="text-ink-3">Variance vs standard</dt><dd className={cn("tabular font-medium", variance > 0 ? "text-danger" : "text-success")}>{variance >= 0 ? "+" : ""}{variance.toFixed(1)}%</dd></div>
        )}
      </dl>
      {wo.produced < wo.qty && <p className="mt-3 rounded-md bg-warning-bg px-3 py-2 text-xs text-warning">Short-closing: {formatNum(wo.qty - wo.produced)} units will not be produced on this order.</p>}
    </Dialog>
  );
}

