"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Boxes, History, Lock, Plus, ShoppingCart, Trash2, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { Chatter, FieldGrid, FormPage, Notebook, Sheet, SheetTitle, SmartButton, SmartButtons } from "@/components/erp/form-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, ReadValue, Select, Textarea } from "@/components/ui/form";
import { Tip } from "@/components/ui/overlay";
import { WarehouseChip } from "@/components/inventory/shared";
import { company, whById } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { type StockItem, useInventory } from "@/lib/store/inventory";
import { usePurchase } from "@/lib/store/purchase";
import { formatINR, formatNum } from "@/lib/utils";

const blank = (): StockItem => ({
  id: "",
  code: "",
  name: "",
  nameHi: "",
  type: "raw",
  category: "",
  uom: "nos",
  hsn: "",
  gstRate: 18,
  valuation: "FIFO",
  batchTracked: true,
  reorderLevel: 0,
  reorderQty: 0,
  standardCost: 0,
  onHand: 0,
  reserved: 0,
  avgCost: 0,
  uoms: [{ uom: "nos", factor: 1, use: "Stock, BOM" }],
  hasMovements: false,
  activities: [],
});

const CATEGORIES = ["Steel bars", "Steel sheets", "Bought-out", "Fasteners", "Castings", "Packaging", "Consumables", "Semi-finished", "Shafts", "Brackets", "Assemblies", "Couplings"];
const UOMS = ["nos", "kg", "tonne", "m", "ltr", "box", "set", "pair"];

export default function ItemPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const router = useRouter();
  const role = useRole();
  const item = useInventory((s) => s.items.find((i) => i.id === id));
  const lots = useInventory((s) => s.lots);
  const movements = useInventory((s) => s.movements);
  const pos = usePurchase((s) => s.orders);
  const { saveItem, logItemNote } = useInventory.getState();
  const [d, setD] = React.useState<StockItem>(() => item ?? blank());
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [dirty, setDirty] = React.useState(isNew);

  React.useEffect(() => {
    if (item) {
      setD(item);
      setDirty(false);
    }
  }, [item]);

  if (!isNew && !item) return <div className="p-10 text-center text-sm text-ink-3">Item not found. <Link href="/inventory/items" className="text-primary-700 underline">Back</Link></div>;

  const set = (patch: Partial<StockItem>) => {
    setD((x) => ({ ...x, ...patch }));
    setDirty(true);
  };
  const myLots = lots.filter((l) => l.itemId === d.id && l.qty !== 0);
  const onHand = myLots.filter((l) => !["w5", "w6", "w7"].includes(l.warehouseId)).reduce((a, l) => a + l.qty, 0);
  const moveCount = movements.filter((m) => m.itemId === d.id).length;
  const openPOs = pos.filter((p) => ["approved", "partially_received", "pending_approval"].includes(p.status) && p.lines.some((l) => l.itemId === d.id));
  const locked = d.hasMovements;
  const needs6 = company.turnoverBand !== "< ₹5 Cr";

  const save = () => {
    const e: Record<string, string> = {};
    if (!d.code.trim()) e.code = "Code is required";
    else if (!/^[A-Z0-9-]+$/.test(d.code)) e.code = "Use capitals, digits and hyphens";
    else if (useInventory.getState().items.some((i) => i.code === d.code && i.id !== d.id)) e.code = "Code already exists";
    if (!d.name.trim()) e.name = "Name is required";
    if (!d.category) e.category = "Select a category";
    if (!/^\d{4,8}$/.test(d.hsn)) e.hsn = "HSN must be 4-8 digits";
    else if (needs6 && d.hsn.length < 6) e.hsn = "6-digit HSN required — turnover above ₹5 Cr (PRD §12)";
    if (d.uoms.some((u) => !(u.factor > 0))) e.uoms = "Every conversion factor must be greater than 0";
    if (d.reorderLevel < 0 || d.reorderQty < 0) e.reorder = "Cannot be negative";
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    const saved = saveItem({ ...d, id: d.id || `i${Date.now()}`, uoms: d.uoms.map((u, i) => (i === 0 ? { ...u, uom: d.uom } : u)) }, role.user);
    setDirty(false);
    toast.success(isNew ? `${saved.code} created` : "Item saved");
    if (isNew) router.replace(`/inventory/items/${saved.id}`);
  };

  return (
    <FormPage
      crumbs={[{ label: "Inventory", href: "/inventory/stock" }, { label: "Items", href: "/inventory/items" }, { label: isNew ? "New" : d.code }]}
      actions={
        <>
          <Button variant="primary" onClick={save} disabled={!dirty}>Save</Button>
          {dirty && !isNew && <Button variant="ghost" onClick={() => { setD(item!); setDirty(false); setErrors({}); }}>Discard</Button>}
          {isNew && <Button variant="ghost" onClick={() => router.push("/inventory/items")}>Discard</Button>}
        </>
      }
      chatter={!isNew ? <Chatter activities={item!.activities} onLog={(t) => logItemNote(item!.id, role.user, t)} /> : undefined}
    >
      <Sheet>
        {!isNew && (
          <SmartButtons>
            <SmartButton icon={<Boxes />} label="On hand" value={`${formatNum(onHand)} ${d.uom}`} href="/inventory/stock" />
            <SmartButton icon={<History />} label="Movements" value={moveCount} href="/inventory/movements" />
            <SmartButton icon={<ShoppingCart />} label="Open POs" value={openPOs.length} href="/purchase/orders" />
          </SmartButtons>
        )}
        <SheetTitle
          label="Item"
          title={isNew ? "New item" : d.name}
          badge={!isNew && <Badge tone="brand" dot={false}>{d.code}</Badge>}
          subtitle={!isNew && d.nameHi ? <span lang="hi">{d.nameHi}</span> : undefined}
        />

        <FieldGrid>
          <div className="space-y-3">
            <Field label="Item code" required error={errors.code} htmlFor="code">
              <Input id="code" aria-invalid={!!errors.code} className="font-mono" value={d.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="RM-BAR-EN8-40" disabled={locked} />
            </Field>
            <Field label="Name" required error={errors.name} htmlFor="name">
              <Input id="name" aria-invalid={!!errors.name} value={d.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label="Name (हिन्दी)" htmlFor="namehi" hint="Shown to operators on the shop-floor app">
              <Input id="namehi" lang="hi" value={d.nameHi} onChange={(e) => set({ nameHi: e.target.value })} placeholder="हिन्दी नाम" />
            </Field>
          </div>
          <div className="space-y-3">
            <Field label="Item type" required htmlFor="type">
              <Select id="type" value={d.type} onChange={(e) => set({ type: e.target.value as StockItem["type"] })} disabled={locked}>
                <option value="raw">Raw material</option>
                <option value="wip">Semi-finished</option>
                <option value="fg">Finished good</option>
                <option value="consumable">Consumable</option>
              </Select>
            </Field>
            <Field label="Category" required error={errors.category} htmlFor="cat">
              <Select id="cat" aria-invalid={!!errors.category} value={d.category} onChange={(e) => set({ category: e.target.value })}>
                <option value="">Select…</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Stock UoM" required htmlFor="uom" hint={locked ? "Locked — movements exist in this UoM" : undefined}>
              <Select id="uom" value={d.uom} onChange={(e) => set({ uom: e.target.value })} disabled={locked}>
                {UOMS.map((u) => <option key={u}>{u}</option>)}
              </Select>
            </Field>
          </div>
        </FieldGrid>

        <Notebook
          tabs={[
            {
              key: "uom",
              label: "Units & conversions",
              count: d.uoms.length,
              content: (
                <div>
                  {errors.uoms && <p className="mb-2 text-xs text-danger">{errors.uoms}</p>}
                  <div className="overflow-x-auto rounded-lg border border-line">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead className="bg-surface-2 text-xs text-ink-2">
                        <tr className="border-b border-line">
                          <th className="px-3 py-2 text-left font-semibold">Unit</th>
                          <th className="px-3 py-2 text-right font-semibold">= {d.uom}</th>
                          <th className="px-3 py-2 text-left font-semibold">Used for</th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {d.uoms.map((u, idx) => (
                          <tr key={idx} className="border-b border-line last:border-0">
                            <td className="px-3 py-1.5">
                              {idx === 0 ? (
                                <span className="font-medium">{d.uom} <span className="text-xs font-normal text-ink-3">(stock unit)</span></span>
                              ) : (
                                <Select aria-label="Unit" value={u.uom} onChange={(e) => set({ uoms: d.uoms.map((x, j) => (j === idx ? { ...x, uom: e.target.value } : x)) })}>
                                  {UOMS.map((x) => <option key={x}>{x}</option>)}
                                </Select>
                              )}
                            </td>
                            <td className="w-40 px-3 py-1.5 text-right">
                              {idx === 0 ? <span className="tabular">1</span> : (
                                <Input type="number" min={0} step="0.0001" aria-label="Conversion factor" className="text-right" value={u.factor || ""} onChange={(e) => set({ uoms: d.uoms.map((x, j) => (j === idx ? { ...x, factor: Number(e.target.value) } : x)) })} />
                              )}
                            </td>
                            <td className="px-3 py-1.5">
                              <Input aria-label="Used for" value={u.use} onChange={(e) => set({ uoms: d.uoms.map((x, j) => (j === idx ? { ...x, use: e.target.value } : x)) })} />
                            </td>
                            <td className="pr-2">
                              {idx > 0 && (
                                <Button variant="ghost" size="icon-sm" aria-label="Remove unit" onClick={() => set({ uoms: d.uoms.filter((_, j) => j !== idx) })}>
                                  <Trash2 />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button variant="link" className="mt-2" onClick={() => set({ uoms: [...d.uoms, { uom: "box", factor: 1, use: "Purchase" }] })}>
                    <Plus /> Add a unit
                  </Button>
                  <p className="mt-1 text-xs text-ink-3">Example: 1 tonne = 1,000 kg. Documents can be entered in any unit; stock is always kept in {d.uom}.</p>
                </div>
              ),
            },
            {
              key: "tax",
              label: "GST",
              content: (
                <FieldGrid>
                  <Field label="HSN code" required error={errors.hsn} htmlFor="hsn" hint={needs6 ? "Turnover above ₹5 Cr: 6-digit HSN on B2B invoices" : "Up to ₹5 Cr turnover: 4-digit HSN is enough"}>
                    <Input id="hsn" aria-invalid={!!errors.hsn} inputMode="numeric" className="font-mono" value={d.hsn} onChange={(e) => set({ hsn: e.target.value.replace(/\D/g, "") })} placeholder="848310" />
                  </Field>
                  <Field label="GST rate" required htmlFor="gst" hint="Effective-dated rates are kept per HSN in the tax engine">
                    <Select id="gst" value={d.gstRate} onChange={(e) => set({ gstRate: Number(e.target.value) })}>
                      {[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}
                    </Select>
                  </Field>
                </FieldGrid>
              ),
            },
            {
              key: "inv",
              label: "Inventory & costing",
              content: (
                <FieldGrid>
                  <div className="space-y-3">
                    <Field label="Valuation" htmlFor="val">
                      <div className="flex items-center gap-2">
                        <Select id="val" className="flex-1" value={d.valuation} onChange={(e) => set({ valuation: e.target.value as StockItem["valuation"] })} disabled={locked}>
                          <option>FIFO</option>
                          <option>Weighted avg</option>
                        </Select>
                        {locked && (
                          <Tip label="Locked after the first stock movement so past costs never change (arch §12.2)">
                            <span className="flex size-8 items-center justify-center rounded-md bg-surface-3 text-ink-3" aria-label="Locked"><Lock className="size-4" /></span>
                          </Tip>
                        )}
                      </div>
                    </Field>
                    <Field label="Batch / lot tracking">
                      <label className="flex h-8 items-center gap-2 text-sm">
                        <Checkbox checked={d.batchTracked} disabled={locked} onChange={(e) => set({ batchTracked: e.target.checked })} />
                        Track batches (traceability, FIFO by batch)
                      </label>
                    </Field>
                    <Field label="Variants" htmlFor="var">
                      <Textarea id="var" className="min-h-14" value={d.variantNote ?? ""} onChange={(e) => set({ variantNote: e.target.value })} placeholder="e.g. Variants: -ZN zinc plated, -PC powder coated" />
                    </Field>
                  </div>
                  <div className="space-y-3">
                    <Field label="Reorder level" error={errors.reorder} htmlFor="rl">
                      <Input id="rl" type="number" min={0} className="text-right" value={d.reorderLevel} onChange={(e) => set({ reorderLevel: Number(e.target.value) })} />
                    </Field>
                    <Field label="Reorder quantity" htmlFor="rq">
                      <Input id="rq" type="number" min={0} className="text-right" value={d.reorderQty} onChange={(e) => set({ reorderQty: Number(e.target.value) })} />
                    </Field>
                    {role.seesCost && (
                      <>
                        <Field label="Standard cost (₹)" htmlFor="std" hint="Used for standard-vs-actual order costing">
                          <Input id="std" type="number" min={0} step="0.01" className="text-right" value={d.standardCost} onChange={(e) => set({ standardCost: Number(e.target.value) })} />
                        </Field>
                        <Field label="Average cost">
                          <ReadValue>{formatINR(d.avgCost)}</ReadValue>
                        </Field>
                      </>
                    )}
                  </div>
                </FieldGrid>
              ),
            },
            ...(!isNew
              ? [
                  {
                    key: "stock",
                    label: "Stock by warehouse",
                    count: myLots.length,
                    content: myLots.length ? (
                      <div className="overflow-x-auto rounded-lg border border-line">
                        <table className="w-full min-w-[520px] text-sm">
                          <thead className="bg-surface-2 text-xs text-ink-2">
                            <tr className="border-b border-line">
                              <th className="px-3 py-2 text-left font-semibold">Warehouse</th>
                              <th className="px-3 py-2 text-left font-semibold">Batch</th>
                              <th className="px-3 py-2 text-right font-semibold">Quantity</th>
                              {role.seesCost && <th className="px-3 py-2 text-right font-semibold">Value</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {myLots.map((l) => (
                              <tr key={l.id} className="border-b border-line last:border-0">
                                <td className="px-3 py-2"><div className="flex items-center gap-2"><WarehouseChip id={l.warehouseId} /> {whById(l.warehouseId).name}</div></td>
                                <td className="px-3 py-2 font-mono text-xs">{l.batch}</td>
                                <td className="tabular px-3 py-2 text-right font-medium">{formatNum(l.qty)} {d.uom}</td>
                                {role.seesCost && <td className="tabular px-3 py-2 text-right">{formatINR(l.qty * l.unitCost)}</td>}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 py-10 text-sm text-ink-3">
                        <Warehouse className="size-5" /> No stock yet
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
