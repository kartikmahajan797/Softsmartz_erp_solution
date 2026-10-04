"use client";

import Link from "next/link";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, FileCheck2, MessageCircle, PackageOpen, Plus, Printer, Send, Timer, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { Banner, Card, Chatter, FieldGrid, FormPage, Notebook, Sheet, SheetTitle, StatusBar } from "@/components/erp/form-view";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, ReadValue, Select } from "@/components/ui/form";
import { Dialog } from "@/components/ui/overlay";
import { DueChip, MsmeBadge, WarehouseChip, useItemName } from "@/components/inventory/shared";
import { company, parties, partyById } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { freeQty, useInventory } from "@/lib/store/inventory";
import { ALERT_DAYS, type Challan, type ChallanLine, challanState, dueDate, isInterstate, pendingQty, useJobwork } from "@/lib/store/jobwork";
import { cn, formatDate, formatDateTime, formatINR, formatNum, TODAY } from "@/lib/utils";

const STEPS = [
  { key: "draft", label: "Draft" },
  { key: "issued", label: "Issued" },
  { key: "partially_returned", label: "Partly returned" },
  { key: "closed", label: "Closed" },
];

/** Virtual warehouse per job-worker (arch §12.2: stock at job-worker stays on our books). */
const JW_WH: Record<string, string> = { p9: "w6", p10: "w7" };
/** Where processed goods come back to. */
const homeWh = (type: string) => (type === "fg" ? "w3" : "w2");

type Draft = Omit<Challan, "id" | "number" | "activities" | "receipts">;

const blank = (): Draft => ({
  jobWorkerId: "",
  process: "",
  goodsClass: "input",
  date: TODAY,
  status: "draft",
  vehicle: "",
  lines: [{ id: "l1", itemId: "", qty: 0, uom: "nos", valuePerUnit: 0, returned: 0, loss: 0, scrapReturned: 0 }],
});

export default function ChallanPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const router = useRouter();
  const role = useRole();
  const name = useItemName();
  const c = useJobwork((s) => s.challans.find((x) => x.id === id));
  const items = useInventory((s) => s.items);
  const lots = useInventory((s) => s.lots);
  const postMovement = useInventory((s) => s.postMovement);
  const { addChallan, updateChallan, issue, receive, log } = useJobwork.getState();
  const [d, setD] = React.useState<Draft>(() => (c ? { ...c } : blank()));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [receiveOpen, setReceiveOpen] = React.useState(false);

  React.useEffect(() => {
    if (c) setD({ ...c });
  }, [c]);

  if (!isNew && !c) return <div className="p-10 text-center text-sm text-ink-3">Challan not found. <Link href="/jobwork/challans" className="text-primary-700 underline">Back</Link></div>;

  const editable = isNew || c!.status === "draft";
  const jw = d.jobWorkerId ? partyById(d.jobWorkerId) : undefined;
  const inter = !!jw && jw.stateCode !== company.stateCode;
  const it = (iid: string) => items.find((i) => i.id === iid)!;
  const st = c ? challanState(c) : null;
  const due = dueDate(d);
  const setLine = (lid: string, patch: Partial<ChallanLine>) => setD((x) => ({ ...x, lines: x.lines.map((l) => (l.id === lid ? { ...l, ...patch } : l)) }));
  const available = (iid: string) => freeQty(lots, iid, homeWh(it(iid).type));
  const totalValue = d.lines.reduce((a, l) => a + l.qty * l.valuePerUnit, 0);

  const validate = (forIssue: boolean) => {
    const e: Record<string, string> = {};
    if (!d.jobWorkerId) e.jw = "Select a job-worker";
    if (!d.process.trim()) e.process = "Describe the process";
    if (!d.lines.some((l) => l.itemId)) e.lines = "Add at least one line";
    d.lines.forEach((l) => {
      if (!l.itemId) return;
      if (!(l.qty > 0)) e[`qty-${l.id}`] = "> 0";
      else if (forIssue && d.goodsClass === "input" && l.qty > available(l.itemId)) e[`qty-${l.id}`] = `Only ${formatNum(available(l.itemId))} available`;
    });
    if (forIssue && inter && !d.vehicle.trim()) e.vehicle = "Vehicle number is needed for the e-way bill";
    setErrors(e);
    if (Object.keys(e).length) toast.error("Please fix the highlighted fields");
    return !Object.keys(e).length;
  };

  const save = (forIssue = false) => {
    if (!validate(forIssue)) return null;
    const clean = { ...d, lines: d.lines.filter((l) => l.itemId).map((l) => ({ ...l, uom: l.description ? l.uom : it(l.itemId).uom })) };
    if (isNew) {
      const created = addChallan(clean, role.user);
      if (!forIssue) {
        toast.success(`${created.number} saved as draft`);
        router.replace(`/jobwork/challans/${created.id}`);
      }
      return created;
    }
    updateChallan(c!.id, clean);
    if (!forIssue) toast.success("Changes saved");
    return { ...c!, ...clean };
  };

  const doIssue = () => {
    const saved = save(true);
    if (!saved) return;
    issue(saved.id, role.user);
    saved.lines.forEach((l) => {
      if (l.description) return;
      const src = homeWh(it(l.itemId).type);
      const batch = lots.find((x) => x.itemId === l.itemId && x.warehouseId === src && x.qty > 0)?.batch ?? "—";
      postMovement({ itemId: l.itemId, warehouseId: src, batch, type: "jw_out", qty: -l.qty, unitCost: l.valuePerUnit, doc: saved.number, by: role.user });
      postMovement({ itemId: l.itemId, warehouseId: JW_WH[saved.jobWorkerId] ?? "w6", batch, type: "jw_out", qty: l.qty, unitCost: l.valuePerUnit, doc: saved.number, by: role.user });
    });
    toast.success(`${saved.number} issued`, {
      description: inter ? "Stock moved to job-worker · e-way bill generated via GSP (inter-state, any value)" : "Stock moved to job-worker warehouse · challan PDF ready",
    });
    if (isNew) router.replace(`/jobwork/challans/${saved.id}`);
  };

  const actions = editable ? (
    <>
      <Button variant="primary" onClick={doIssue}><Send /> Issue challan</Button>
      <Button onClick={() => save()}>Save draft</Button>
      {isNew && <Button variant="ghost" onClick={() => router.push("/jobwork/challans")}>Discard</Button>}
    </>
  ) : (
    <>
      {c!.status !== "closed" && <Button variant="primary" onClick={() => setReceiveOpen(true)}><PackageOpen /> Receive processed goods</Button>}
      <Button onClick={() => toast.success("Delivery challan PDF generated", { description: "Rule 55 format with job-work declaration [verify with CA]" })}><Printer /> Print challan</Button>
      <Button variant="ghost" onClick={() => toast.success(`Challan sent on WhatsApp to ${jw?.contact}`)}><MessageCircle /> WhatsApp</Button>
    </>
  );

  return (
    <FormPage
      crumbs={[{ label: "Job-work", href: "/jobwork/challans" }, { label: "Challans", href: "/jobwork/challans" }, { label: isNew ? "New" : c!.number }]}
      actions={actions}
      status={!isNew ? <StatusBar steps={STEPS} current={c!.status} /> : null}
      banner={
        st && c!.status !== "closed" && c!.status !== "draft" && st.pending > 0 && st.days <= ALERT_DAYS ? (
          <Banner tone={st.days < 0 ? "danger" : "warning"} icon={<Timer />}>
            {st.days < 0
              ? `${formatNum(st.pending)} ${c!.lines[0].uom} not returned within the ${c!.goodsClass === "capital" ? "3-year" : "1-year"} limit — treated as a supply by you; GST is payable [verify with CA].`
              : `${formatNum(st.pending)} ${c!.lines[0].uom} must come back by ${formatDate(dueDate(c!))} (${st.days} days) — the ${c!.goodsClass === "capital" ? "3-year" : "1-year"} limit for ${c!.goodsClass === "capital" ? "capital goods" : "inputs"} (FR-JW-04).`}
          </Banner>
        ) : undefined
      }
      chatter={!isNew ? <Chatter activities={c!.activities} onLog={(t) => log(c!.id, role.user, t)} /> : undefined}
    >
      <Sheet>
        <SheetTitle
          label="Job-work delivery challan"
          title={isNew ? "New" : c!.number}
          badge={!isNew && <StatusBadge status={st?.overdue ? "overdue" : c!.status} />}
          subtitle={!isNew && c!.status !== "draft" ? `Sent ${formatDate(c!.date)}` : undefined}
        />

        <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
          <FieldGrid cols={1}>
            <Field label="Job-worker" required error={errors.jw} htmlFor="jw">
              {editable ? (
                <Select id="jw" aria-invalid={!!errors.jw} value={d.jobWorkerId} onChange={(e) => setD((x) => ({ ...x, jobWorkerId: e.target.value }))}>
                  <option value="">Select job-worker…</option>
                  {parties.filter((p) => p.type.includes("job_worker")).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.state}</option>)}
                </Select>
              ) : (
                <ReadValue><span className="flex items-center gap-2 font-medium">{jw?.name}{jw?.msme && <MsmeBadge />}</span></ReadValue>
              )}
            </Field>
            <Field label="GSTIN / state">
              <ReadValue>{jw ? <><span className="font-mono">{jw.gstin}</span> · {jw.state} {inter && <Badge tone="info" dot={false} className="ml-1">Inter-state</Badge>}</> : "—"}</ReadValue>
            </Field>
            <Field label="Process" required error={errors.process} htmlFor="process">
              {editable ? <Input id="process" aria-invalid={!!errors.process} value={d.process} onChange={(e) => setD((x) => ({ ...x, process: e.target.value }))} placeholder="e.g. Zinc plating, induction hardening" /> : <ReadValue>{c!.process}</ReadValue>}
            </Field>
            <Field label="Goods class" htmlFor="gc" hint={d.goodsClass === "capital" ? "Capital goods (dies, jigs, moulds) must return within 3 years" : "Inputs must return within 1 year"}>
              {editable ? (
                <Select id="gc" value={d.goodsClass} onChange={(e) => setD((x) => ({ ...x, goodsClass: e.target.value as Challan["goodsClass"] }))}>
                  <option value="input">Inputs (1-year limit)</option>
                  <option value="capital">Capital goods (3-year limit)</option>
                </Select>
              ) : (
                <ReadValue>{c!.goodsClass === "capital" ? "Capital goods" : "Inputs"}</ReadValue>
              )}
            </Field>
            <Field label="Vehicle number" error={errors.vehicle} htmlFor="veh">
              {editable ? <Input id="veh" aria-invalid={!!errors.vehicle} value={d.vehicle} onChange={(e) => setD((x) => ({ ...x, vehicle: e.target.value.toUpperCase() }))} placeholder="MH14 KL 3390" /> : <ReadValue mono>{c!.vehicle || "—"}</ReadValue>}
            </Field>
          </FieldGrid>

          <div className="space-y-3">
            <Card title={<span className="flex items-center gap-2"><Truck className="size-4 text-primary-600" /> e-Way bill</span>} bodyClassName="p-3 text-sm">
              {c?.ewayBill ? (
                <dl className="space-y-1.5">
                  <div className="flex justify-between"><dt className="text-ink-3">EWB no.</dt><dd className="font-mono font-medium">{c.ewayBill.number}</dd></div>
                  <div className="flex justify-between"><dt className="text-ink-3">Generated</dt><dd>{formatDateTime(c.ewayBill.generatedAt)}</dd></div>
                  <div className="flex justify-between"><dt className="text-ink-3">Valid till</dt><dd>{formatDateTime(c.ewayBill.validTill)}</dd></div>
                  <div className="pt-1"><Badge tone="success">Generated via GSP</Badge></div>
                </dl>
              ) : inter ? (
                <p className="text-warning">Mandatory: inter-state job-work movement needs an e-way bill regardless of value (FR-JW-05). It is generated automatically when you issue the challan.</p>
              ) : jw ? (
                <p className="text-ink-3">Not required for this intra-state movement below the value threshold.</p>
              ) : (
                <p className="text-ink-3">Select a job-worker to check e-way bill rules.</p>
              )}
            </Card>
            <Card title={<span className="flex items-center gap-2"><Timer className="size-4 text-primary-600" /> Return time limit</span>} bodyClassName="p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-3">{d.goodsClass === "capital" ? "3 years" : "1 year"} from dispatch</span>
                {st && c!.status !== "draft" && st.pending > 0 ? <DueChip days={st.days} alertDays={ALERT_DAYS} /> : null}
              </div>
              <div className="mt-1 font-medium">{c && c.status !== "draft" ? formatDate(due) : "Starts on issue"}</div>
              <p className="mt-1 text-xs text-ink-3">Alert {ALERT_DAYS} days before by WhatsApp and in-app.</p>
            </Card>
          </div>
        </div>

        <Notebook
          tabs={[
            {
              key: "goods",
              label: "Goods sent",
              count: d.lines.filter((l) => l.itemId).length,
              content: (
                <div>
                  {errors.lines && <p className="mb-2 text-xs text-danger">{errors.lines}</p>}
                  <div className="overflow-x-auto rounded-lg border border-line">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-surface-2 text-xs text-ink-2">
                        <tr className="border-b border-line">
                          <th className="px-3 py-2 text-left font-semibold">Item</th>
                          <th className="w-24 px-2 py-2 text-right font-semibold">Sent</th>
                          {role.seesCost && <th className="w-28 px-2 py-2 text-right font-semibold">Value</th>}
                          <th className="w-20 px-2 py-2 text-right font-semibold">Returned</th>
                          <th className="w-20 px-2 py-2 text-right font-semibold">Process loss</th>
                          <th className="w-20 px-2 py-2 text-right font-semibold">Scrap back</th>
                          <th className="w-20 px-3 py-2 text-right font-semibold">Pending</th>
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
                                  <>
                                    <Select aria-label="Item" value={l.itemId} onChange={(e) => { const ni = it(e.target.value); setLine(l.id, { itemId: e.target.value, valuePerUnit: ni?.avgCost || ni?.standardCost || 0, uom: ni?.uom ?? "nos" }); }}>
                                      <option value="">Select item…</option>
                                      {items.filter((i) => i.type === "wip" || i.type === "fg").map((i) => <option key={i.id} value={i.id}>{i.code} — {i.name}</option>)}
                                    </Select>
                                    {l.itemId && <p className="mt-0.5 text-2xs text-ink-3">Available in <WarehouseChip id={homeWh(it(l.itemId).type)} />: {formatNum(available(l.itemId))} {item?.uom}</p>}
                                  </>
                                ) : (
                                  <div>
                                    <div className="font-medium">{l.description ?? name(l.itemId)}</div>
                                    <div className="font-mono text-2xs text-ink-3">{l.description ? "Capital goods" : `${item?.code} · HSN ${item?.hsn}`}</div>
                                  </div>
                                )}
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                {editable ? (
                                  <>
                                    <Input type="number" min={0} aria-label="Quantity sent" aria-invalid={!!errors[`qty-${l.id}`]} className="text-right" value={l.qty || ""} onChange={(e) => setLine(l.id, { qty: Number(e.target.value) })} />
                                    {errors[`qty-${l.id}`] && <p className="mt-0.5 text-2xs text-danger">{errors[`qty-${l.id}`]}</p>}
                                  </>
                                ) : <span className="tabular font-medium">{formatNum(l.qty)} <span className="text-xs font-normal text-ink-3">{l.uom}</span></span>}
                              </td>
                              {role.seesCost && <td className="tabular px-2 py-1.5 text-right text-ink-2">{formatINR(l.qty * l.valuePerUnit)}</td>}
                              <td className="tabular px-2 py-1.5 text-right">{formatNum(l.returned)}</td>
                              <td className={cn("tabular px-2 py-1.5 text-right", l.loss > 0 && "text-warning")}>{formatNum(l.loss)}</td>
                              <td className="tabular px-2 py-1.5 text-right text-ink-2">{formatNum(l.scrapReturned)}</td>
                              <td className="tabular px-3 py-1.5 text-right font-semibold">{formatNum(pendingQty(l))}</td>
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
                    <Button variant="link" className="mt-2" onClick={() => setD((x) => ({ ...x, lines: [...x.lines, { id: `l${Date.now()}`, itemId: "", qty: 0, uom: "nos", valuePerUnit: 0, returned: 0, loss: 0, scrapReturned: 0 }] }))}>
                      <Plus /> Add a line
                    </Button>
                  )}
                  {role.seesCost && <p className="mt-3 text-right text-sm">Challan value <span className="ml-2 font-semibold">{formatINR(totalValue)}</span></p>}
                </div>
              ),
            },
            ...(!isNew
              ? [
                  {
                    key: "receipts",
                    label: "Receipts",
                    count: c!.receipts.length,
                    content: c!.receipts.length ? (
                      <div className="overflow-x-auto rounded-lg border border-line">
                        <table className="w-full min-w-[620px] text-sm">
                          <thead className="bg-surface-2 text-xs text-ink-2">
                            <tr className="border-b border-line">
                              <th className="px-3 py-2 text-left font-semibold">Receipt</th>
                              <th className="px-3 py-2 text-left font-semibold">Date</th>
                              <th className="px-3 py-2 text-right font-semibold">Returned</th>
                              <th className="px-3 py-2 text-right font-semibold">Loss</th>
                              {role.seesCost && <th className="px-3 py-2 text-right font-semibold">Charges</th>}
                              <th className="px-3 py-2 text-left font-semibold">Charges bill</th>
                            </tr>
                          </thead>
                          <tbody>
                            {c!.receipts.map((r) => (
                              <tr key={r.id} className="border-b border-line last:border-0">
                                <td className="px-3 py-2 font-mono text-xs font-medium">{r.number}</td>
                                <td className="px-3 py-2">{formatDate(r.date)}</td>
                                <td className="tabular px-3 py-2 text-right">{formatNum(r.lines.reduce((a, l) => a + l.returned, 0))}</td>
                                <td className="tabular px-3 py-2 text-right">{formatNum(r.lines.reduce((a, l) => a + l.loss, 0))}</td>
                                {role.seesCost && <td className="tabular px-3 py-2 text-right">{formatINR(r.charges)}</td>}
                                <td className="px-3 py-2 font-mono text-xs">{r.billNumber}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="py-8 text-center text-sm text-ink-3">Nothing received back yet.</p>
                    ),
                  },
                  {
                    key: "itc04",
                    label: "ITC-04 data",
                    content: (
                      <div className="rounded-lg border border-line p-4 text-sm">
                        <div className="mb-2 flex items-center gap-2 font-medium"><FileCheck2 className="size-4 text-primary-600" /> How this challan appears in ITC-04</div>
                        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                          <div className="flex justify-between"><dt className="text-ink-3">Job-worker GSTIN</dt><dd className="font-mono">{jw?.gstin}</dd></div>
                          <div className="flex justify-between"><dt className="text-ink-3">Challan no. / date</dt><dd>{c!.number} · {formatDate(c!.date)}</dd></div>
                          <div className="flex justify-between"><dt className="text-ink-3">Goods sent</dt><dd className="tabular">{formatNum(c!.lines.reduce((a, l) => a + l.qty, 0))}</dd></div>
                          <div className="flex justify-between"><dt className="text-ink-3">Received back</dt><dd className="tabular">{formatNum(c!.lines.reduce((a, l) => a + l.returned, 0))}</dd></div>
                          <div className="flex justify-between"><dt className="text-ink-3">Losses / wastage</dt><dd className="tabular">{formatNum(c!.lines.reduce((a, l) => a + l.loss, 0))}</dd></div>
                          <div className="flex justify-between"><dt className="text-ink-3">Pending with job-worker</dt><dd className="tabular font-semibold">{formatNum(st!.pending)}</dd></div>
                        </dl>
                        <Link href="/jobwork/itc04" className="mt-3 inline-block text-xs font-medium text-primary-700 hover:underline">Open ITC-04 report</Link>
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Sheet>

      {c && (
        <ReceiveDialog
          open={receiveOpen}
          onOpenChange={setReceiveOpen}
          challan={c}
          onSave={(lines, charges) => {
            const r = receive(c.id, { lines, charges, by: role.user }, role.user);
            lines.forEach((rl) => {
              const l = c.lines.find((x) => x.id === rl.lineId)!;
              if (l.description) return;
              const jwWh = JW_WH[c.jobWorkerId] ?? "w6";
              const batch = lots.find((x) => x.itemId === l.itemId && x.warehouseId === jwWh && x.qty > 0)?.batch ?? "—";
              const out = rl.returned + rl.loss;
              if (out) postMovement({ itemId: l.itemId, warehouseId: jwWh, batch, type: "jw_in", qty: -out, unitCost: l.valuePerUnit, doc: r.number, by: role.user });
              if (rl.returned) postMovement({ itemId: l.itemId, warehouseId: homeWh(it(l.itemId).type), batch, type: "jw_in", qty: rl.returned, unitCost: l.valuePerUnit, doc: r.number, by: role.user });
            });
            setReceiveOpen(false);
            toast.success(`${r.number} posted`, { description: `Stock back in stores · job-work charges bill ${r.billNumber} created${role.seesCost ? ` (${formatINR(charges)})` : ""}` });
          }}
        />
      )}
    </FormPage>
  );
}

function ReceiveDialog({
  open,
  onOpenChange,
  challan,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  challan: Challan;
  onSave: (lines: { lineId: string; returned: number; loss: number; scrap: number }[], charges: number) => void;
}) {
  const role = useRole();
  const name = useItemName();
  const [rows, setRows] = React.useState<Record<string, { returned: number; loss: number; scrap: number }>>({});
  const [charges, setCharges] = React.useState(0);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setRows(Object.fromEntries(challan.lines.map((l) => [l.id, { returned: pendingQty(l), loss: 0, scrap: 0 }])));
      setCharges(0);
      setErr("");
    }
  }, [open, challan]);

  const submit = () => {
    for (const l of challan.lines) {
      const r = rows[l.id];
      if (!r) continue;
      if (r.returned < 0 || r.loss < 0 || r.scrap < 0) return setErr("Quantities cannot be negative");
      if (r.returned + r.loss > pendingQty(l)) return setErr(`Returned + loss for ${l.description ?? name(l.itemId)} exceeds pending ${formatNum(pendingQty(l))}`);
    }
    if (!Object.values(rows).some((r) => r.returned + r.loss > 0)) return setErr("Enter a returned quantity on at least one line");
    if (charges < 0) return setErr("Charges cannot be negative");
    onSave(Object.entries(rows).map(([lineId, r]) => ({ lineId, ...r })), charges);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={`Receive against ${challan.number}`}
      description="Records goods returned, process loss and the job-worker's charges. Charges create a purchase bill."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" onClick={submit}><PackageOpen /> Post receipt</Button>
        </>
      }
    >
      <table className="w-full text-sm">
        <thead className="text-xs text-ink-3">
          <tr className="border-b border-line">
            <th className="py-2 text-left font-medium">Item</th>
            <th className="py-2 text-right font-medium">Pending</th>
            <th className="w-24 py-2 pl-2 text-right font-medium">Returned</th>
            <th className="w-24 py-2 pl-2 text-right font-medium">Process loss</th>
            <th className="w-24 py-2 pl-2 text-right font-medium">Scrap back</th>
          </tr>
        </thead>
        <tbody>
          {challan.lines.map((l) => (
            <tr key={l.id} className="border-b border-line">
              <td className="py-2 font-medium">{l.description ?? name(l.itemId)}</td>
              <td className="tabular py-2 text-right">{formatNum(pendingQty(l))}</td>
              {(["returned", "loss", "scrap"] as const).map((k) => (
                <td key={k} className="py-2 pl-2">
                  <Input
                    type="number"
                    min={0}
                    aria-label={`${k} quantity`}
                    className="text-right"
                    value={rows[l.id]?.[k] ?? 0}
                    onChange={(e) => setRows((r) => ({ ...r, [l.id]: { ...r[l.id], [k]: Number(e.target.value) } }))}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Job-work charges (₹, before GST)" layout="vertical" htmlFor="charges" hint={role.seesCost ? "Added to the processed item's cost" : undefined}>
          <Input id="charges" type="number" min={0} className="text-right" value={charges || ""} onChange={(e) => setCharges(Number(e.target.value))} />
        </Field>
        <div className="flex items-end text-xs text-ink-3">
          <AlertTriangle className="mr-1.5 size-3.5 shrink-0" /> Process loss within norms is not a supply; abnormal loss may attract GST [verify with CA].
        </div>
      </div>
      {err && <p className="mt-3 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{err}</p>}
    </Dialog>
  );
}
