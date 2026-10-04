"use client";

import * as React from "react";
import { Copy, Layers, Plus, Save, Tags, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { Notebook } from "@/components/erp/form-view";
import { ItemCell } from "@/components/inventory/shared";
import { ToneBadge } from "@/components/returns/shared";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Dialog, Sheet as SidePanel } from "@/components/ui/overlay";
import { itemById, items, parties, partyById } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { netRate, type PriceLine, type PriceList, type PriceListType, TYPE_LABEL, usePriceLists, validity } from "@/lib/store/pricelists";
import { cn, daysBetween, formatDate, formatDateTime, formatINR, TODAY } from "@/lib/utils";

const VALIDITY: Record<string, { tone: Tone; label: string }> = {
  active: { tone: "success", label: "Active" },
  scheduled: { tone: "info", label: "Scheduled" },
  expired: { tone: "neutral", label: "Expired" },
  inactive: { tone: "neutral", label: "Inactive" },
};

const TYPE_TONE: Record<PriceListType, Tone> = { standard: "neutral", customer: "brand", volume: "progress" };

const customersOf = parties.filter((p) => p.type.includes("customer"));
const fgItems = items.filter((i) => i.type === "fg");

export default function PriceListsPage() {
  const lists = usePriceLists((s) => s.lists);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  const active = lists.filter((l) => validity(l) === "active");
  const covered = new Set(active.flatMap((l) => l.customers));
  const expiring = active.filter((l) => l.validTo && daysBetween(TODAY, l.validTo) <= 90);
  const scheduled = lists.filter((l) => validity(l) === "scheduled");

  const columns: Column<PriceList>[] = [
    {
      key: "name",
      header: "Price list",
      value: (r) => r.name,
      cell: (r) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{r.name}</div>
          <div className="font-mono text-2xs text-ink-3">{r.code}</div>
        </div>
      ),
    },
    { key: "type", header: "Type", value: (r) => r.type, cell: (r) => <Badge tone={TYPE_TONE[r.type]} dot={false}>{TYPE_LABEL[r.type]}</Badge> },
    {
      key: "customers",
      header: "Applies to",
      value: (r) => r.customers.length,
      cell: (r) =>
        r.customers.length === 0 ? (
          <span className="text-ink-3">All customers</span>
        ) : (
          <span className="block max-w-56 truncate">{r.customers.map((c) => partyById(c).name).join(", ")}</span>
        ),
    },
    { key: "items", header: "Items", align: "right", value: (r) => r.lines.length, cell: (r) => r.lines.length },
    {
      key: "valid",
      header: "Validity",
      value: (r) => r.validFrom,
      cell: (r) => {
        const left = r.validTo ? daysBetween(TODAY, r.validTo) : 999;
        return (
          <div className="whitespace-nowrap">
            <div>{formatDate(r.validFrom)} → {formatDate(r.validTo)}</div>
            {validity(r) === "active" && left <= 90 && <div className="text-2xs text-warning">Ends in {left} days</div>}
          </div>
        );
      },
    },
    { key: "priority", header: "Priority", align: "right", value: (r) => r.priority, cell: (r) => <span className="text-ink-2">{r.priority}</span> },
    { key: "status", header: "Status", value: (r) => validity(r), cell: (r) => <ToneBadge map={VALIDITY} value={validity(r)} /> },
  ];

  return (
    <>
      <ListPage
        title="Price lists"
        subtitle="Customer-specific rates, volume slabs and validity. The highest-priority valid list is applied on quotations and orders."
        crumbs={[{ label: "Sales", href: "/sales/orders" }, { label: "Price lists" }]}
        rows={lists}
        columns={columns}
        search={(r) => `${r.name} ${r.code} ${r.customers.map((c) => partyById(c).name).join(" ")} ${r.lines.map((l) => itemById(l.itemId).code).join(" ")}`}
        placeholder="Search price list, customer, item…"
        onNew={() => setCreating(true)}
        newLabel="New price list"
        onRowClick={(r) => setOpenId(r.id)}
        defaultFilters={[]}
        stats={[
          { label: "Active lists", value: active.length, hint: `${lists.length} in total`, filter: "active" },
          { label: "Customers on contract", value: `${covered.size} / ${customersOf.length}`, hint: "Others use the standard list" },
          { label: "Ending within 90 days", value: expiring.length, hint: expiring.map((l) => l.code).join(", ") || "None", tone: expiring.length ? "warning" : "default", filter: "ending" },
          { label: "Scheduled", value: scheduled.length, hint: scheduled[0] ? `From ${formatDate(scheduled[0].validFrom)}` : "—", tone: "info", filter: "scheduled" },
        ]}
        filters={[
          { key: "active", label: "Active", group: "v", test: (r) => validity(r) === "active" },
          { key: "scheduled", label: "Scheduled", group: "v", test: (r) => validity(r) === "scheduled" },
          { key: "expired", label: "Expired or inactive", group: "v", test: (r) => ["expired", "inactive"].includes(validity(r)) },
          { key: "ending", label: "Ending within 90 days", group: "e", test: (r) => validity(r) === "active" && !!r.validTo && daysBetween(TODAY, r.validTo) <= 90 },
          { key: "cust", label: "Customer-specific", group: "t", test: (r) => r.type === "customer" },
          { key: "vol", label: "Volume slabs", group: "t", test: (r) => r.type === "volume" },
        ]}
        groups={[
          { key: "type", label: "Type", by: (r) => TYPE_LABEL[r.type] },
          { key: "status", label: "Status", by: (r) => VALIDITY[validity(r)].label },
        ]}
      />
      {openId && <PriceListPanel key={openId} id={openId} onClose={() => setOpenId(null)} />}
      <NewPriceListDialog open={creating} onOpenChange={setCreating} onCreated={setOpenId} />
    </>
  );
}

function PriceListPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const role = useRole();
  const saved = usePriceLists((s) => s.lists.find((l) => l.id === id))!;
  const update = usePriceLists((s) => s.update);
  const add = usePriceLists((s) => s.add);
  const [d, setD] = React.useState<PriceList>(saved);
  const dirty = JSON.stringify(d) !== JSON.stringify(saved);
  const canEdit = role.key === "owner" || role.key === "sales" || role.key === "accountant";
  const [previewQty, setPreviewQty] = React.useState(500);

  const setLine = (itemId: string, patch: Partial<PriceLine>) => setD((x) => ({ ...x, lines: x.lines.map((l) => (l.itemId === itemId ? { ...l, ...patch } : l)) }));
  const unpriced = fgItems.filter((i) => !d.lines.some((l) => l.itemId === i.id));

  const save = () => {
    if (d.validTo && d.validTo < d.validFrom) return toast.error("Valid-to date is before valid-from");
    if (d.lines.some((l) => l.rate <= 0)) return toast.error("Every item needs a rate above zero");
    update(id, d, role.user);
    toast.success(`${d.code} saved`, { description: "Applies to new quotations and draft orders" });
  };

  return (
    <SidePanel
      open
      onOpenChange={(o) => !o && onClose()}
      width={760}
      title={
        <span className="flex items-center gap-2">
          <Tags className="size-4 text-primary-600" /> {saved.name}
        </span>
      }
      footer={
        <>
          <Button
            onClick={() => {
              const copy = add({ ...saved, code: `${saved.code}-COPY`, name: `${saved.name} (copy)`, customers: [] }, role.user);
              toast.success("Price list duplicated", { description: copy.code });
            }}
          >
            <Copy /> Duplicate
          </Button>
          {dirty && <Button onClick={() => setD(saved)}>Discard</Button>}
          <Button variant="primary" disabled={!dirty || !canEdit} onClick={save}><Save /> Save changes</Button>
        </>
      }
    >
      <fieldset disabled={!canEdit} className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <ToneBadge map={VALIDITY} value={validity(d)} />
          <Badge tone={TYPE_TONE[d.type]} dot={false}>{TYPE_LABEL[d.type]}</Badge>
          <span className="font-mono text-xs text-ink-3">{d.code}</span>
          <span className="ml-auto text-xs text-ink-3">Updated {formatDateTime(saved.updatedAt)} by {saved.updatedBy}</span>
        </div>

        <Notebook
          tabs={[
            {
              key: "items",
              label: "Item rates",
              count: d.lines.length,
              content: (
                <div className="space-y-3">
                  {d.type === "volume" && (
                    <div className="flex items-center gap-2 rounded-lg bg-progress-bg px-3 py-2 text-xs text-progress">
                      <Layers className="size-4" /> Preview net rate at quantity
                      <Input type="number" className="h-7 w-24 text-right" aria-label="Preview quantity" value={previewQty} onChange={(e) => setPreviewQty(Number(e.target.value))} />
                    </div>
                  )}
                  <div className="overflow-x-auto rounded-lg border border-line">
                    <table className="w-full min-w-[620px] text-sm">
                      <thead className="bg-surface-2 text-xs text-ink-2">
                        <tr className="border-b border-line">
                          <th className="px-3 py-2 text-left font-semibold">Item</th>
                          <th className="px-2 py-2 text-right font-semibold">Std. price</th>
                          <th className="w-28 px-2 py-2 text-right font-semibold">List rate</th>
                          <th className="w-20 px-2 py-2 text-right font-semibold">Disc %</th>
                          <th className="px-2 py-2 text-right font-semibold">Net rate</th>
                          {role.seesCost && <th className="px-2 py-2 text-right font-semibold">Margin</th>}
                          <th className="w-9" />
                        </tr>
                      </thead>
                      <tbody>
                        {d.lines.map((l) => {
                          const it = itemById(l.itemId);
                          const net = netRate(l, d.type === "volume" ? previewQty : 0);
                          const margin = net ? ((net - it.standardCost) / net) * 100 : 0;
                          const diff = it.salePrice ? ((l.rate - it.salePrice) / it.salePrice) * 100 : 0;
                          return (
                            <React.Fragment key={l.itemId}>
                              <tr className={cn("border-line", l.slabs.length ? "" : "border-b last:border-0")}>
                                <td className="px-3 py-2"><ItemCell id={l.itemId} /></td>
                                <td className="tabular px-2 py-2 text-right text-ink-3">{it.salePrice ? formatINR(it.salePrice) : "—"}</td>
                                <td className="px-2 py-2">
                                  <Input type="number" min={0} step="0.01" className="text-right" aria-label={`Rate for ${it.code}`} value={l.rate || ""} onChange={(e) => setLine(l.itemId, { rate: Number(e.target.value) })} />
                                  {Math.abs(diff) >= 0.5 && <div className={cn("mt-0.5 text-right text-2xs", diff < 0 ? "text-warning" : "text-success")}>{diff > 0 ? "+" : ""}{diff.toFixed(1)}% vs std</div>}
                                </td>
                                <td className="px-2 py-2"><Input type="number" min={0} max={100} step="0.5" className="text-right" aria-label={`Discount for ${it.code}`} placeholder="0" value={l.discountPct || ""} onChange={(e) => setLine(l.itemId, { discountPct: Number(e.target.value) })} /></td>
                                <td className="tabular px-2 py-2 text-right font-semibold">{formatINR(net)}</td>
                                {role.seesCost && (
                                  <td className={cn("tabular px-2 py-2 text-right text-xs font-medium", margin < 15 ? "text-danger" : margin < 25 ? "text-warning" : "text-success")}>{margin.toFixed(1)}%</td>
                                )}
                                <td className="pr-2">
                                  <Button variant="ghost" size="icon-sm" aria-label="Remove item" onClick={() => setD((x) => ({ ...x, lines: x.lines.filter((y) => y.itemId !== l.itemId) }))}><Trash2 /></Button>
                                </td>
                              </tr>
                              {(d.type === "volume" || l.slabs.length > 0) && (
                                <tr className="border-b border-line bg-surface-2/60 last:border-0">
                                  <td colSpan={role.seesCost ? 7 : 6} className="px-3 py-2">
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                      <span className="font-medium text-ink-2">Slabs</span>
                                      {l.slabs.map((s, si) => (
                                        <span key={si} className="flex items-center gap-1 rounded-md border border-line bg-surface px-1.5 py-1">
                                          ≥
                                          <Input type="number" className="h-6 w-16 px-1.5 text-right text-xs" aria-label="Minimum quantity" value={s.minQty} onChange={(e) => setLine(l.itemId, { slabs: l.slabs.map((x, xi) => (xi === si ? { ...x, minQty: Number(e.target.value) } : x)) })} />
                                          @ ₹
                                          <Input type="number" className="h-6 w-16 px-1.5 text-right text-xs" aria-label="Slab rate" value={s.rate} onChange={(e) => setLine(l.itemId, { slabs: l.slabs.map((x, xi) => (xi === si ? { ...x, rate: Number(e.target.value) } : x)) })} />
                                          <button className="rounded p-0.5 text-ink-3 hover:bg-surface-3 hover:text-danger" aria-label="Remove slab" onClick={() => setLine(l.itemId, { slabs: l.slabs.filter((_, xi) => xi !== si) })}>×</button>
                                        </span>
                                      ))}
                                      <Button size="xs" variant="ghost" onClick={() => setLine(l.itemId, { slabs: [...l.slabs, { minQty: (l.slabs.at(-1)?.minQty ?? 0) + 500, rate: Math.round((l.slabs.at(-1)?.rate ?? l.rate) * 0.98) }] })}>
                                        <Plus /> Slab
                                      </Button>
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
                  {unpriced.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Select
                        aria-label="Add item"
                        className="w-72"
                        value=""
                        onChange={(e) => {
                          const it = itemById(e.target.value);
                          setD((x) => ({ ...x, lines: [...x.lines, { itemId: it.id, rate: it.salePrice ?? 0, discountPct: 0, slabs: [] }] }));
                        }}
                      >
                        <option value="">+ Add an item…</option>
                        {unpriced.map((i) => <option key={i.id} value={i.id}>{i.code} — {i.name}</option>)}
                      </Select>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: "customers",
              label: "Customers",
              count: d.customers.length,
              content:
                d.type === "standard" ? (
                  <p className="rounded-lg bg-surface-3 px-4 py-3 text-sm text-ink-2">
                    A standard list applies to every customer without a higher-priority list. Switch the type to assign specific customers.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {customersOf.map((c) => {
                      const on = d.customers.includes(c.id);
                      return (
                        <label key={c.id} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5", on ? "border-primary-500 bg-primary-50/60" : "border-line hover:border-line-strong")}>
                          <Checkbox checked={on} onChange={() => setD((x) => ({ ...x, customers: on ? x.customers.filter((y) => y !== c.id) : [...x.customers, c.id] }))} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{c.name}</span>
                            <span className="block text-xs text-ink-3">{c.city} · {c.code}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ),
            },
            {
              key: "settings",
              label: "Validity & rules",
              content: (
                <div className="grid gap-x-8 gap-y-3 lg:grid-cols-2">
                  <Field label="Name" layout="vertical" htmlFor="pn"><Input id="pn" value={d.name} onChange={(e) => setD((x) => ({ ...x, name: e.target.value }))} /></Field>
                  <Field label="Type" layout="vertical" htmlFor="pt">
                    <Select id="pt" value={d.type} onChange={(e) => setD((x) => ({ ...x, type: e.target.value as PriceListType }))}>
                      {(Object.keys(TYPE_LABEL) as PriceListType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                    </Select>
                  </Field>
                  <Field label="Valid from" layout="vertical" htmlFor="vf"><Input id="vf" type="date" value={d.validFrom} onChange={(e) => setD((x) => ({ ...x, validFrom: e.target.value }))} /></Field>
                  <Field label="Valid to" layout="vertical" htmlFor="vto" error={d.validTo && d.validTo < d.validFrom ? "Must be after valid from" : undefined}>
                    <Input id="vto" type="date" value={d.validTo} onChange={(e) => setD((x) => ({ ...x, validTo: e.target.value }))} />
                  </Field>
                  <Field label="Priority" layout="vertical" htmlFor="pr" hint="Higher wins when several lists match a customer">
                    <Input id="pr" type="number" value={d.priority} onChange={(e) => setD((x) => ({ ...x, priority: Number(e.target.value) }))} />
                  </Field>
                  <Field label="Status" layout="vertical">
                    <label className="flex h-8 items-center gap-2 text-sm">
                      <Checkbox checked={d.active} onChange={() => setD((x) => ({ ...x, active: !x.active }))} /> Active
                    </label>
                  </Field>
                  <Field label="Notes" layout="vertical" htmlFor="pnotes" className="lg:col-span-2">
                    <Textarea id="pnotes" className="min-h-16" value={d.notes} onChange={(e) => setD((x) => ({ ...x, notes: e.target.value }))} placeholder="Contract reference, escalation clause…" />
                  </Field>
                </div>
              ),
            },
          ]}
        />
      </fieldset>
    </SidePanel>
  );
}

function NewPriceListDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const role = useRole();
  const add = usePriceLists((s) => s.add);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<PriceListType>("customer");
  const [customer, setCustomer] = React.useState("");
  const [from, setFrom] = React.useState(TODAY);
  const [to, setTo] = React.useState("2027-03-31");
  const [uplift, setUplift] = React.useState(0);
  const ok = name.trim() && (type === "standard" || customer) && (!to || to >= from);

  const create = () => {
    const code = `PL-${(customer ? partyById(customer).code : "STD").replace(/\W/g, "")}-${from.slice(2, 4)}`;
    const p = add(
      {
        code, name, type, validFrom: from, validTo: to, customers: customer ? [customer] : [], active: true, priority: type === "standard" ? 0 : 10, notes: "",
        lines: fgItems.map((i) => ({ itemId: i.id, rate: Math.round((i.salePrice ?? 0) * (1 + uplift / 100)), discountPct: 0, slabs: [] })),
      },
      role.user,
    );
    toast.success(`${p.code} created`, { description: "Rates copied from the standard list" });
    onOpenChange(false);
    setName("");
    onCreated(p.id);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New price list"
      description="Starts from standard selling prices — adjust rates afterwards."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" disabled={!ok} onClick={create}>Create</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Name" required layout="vertical" htmlFor="nn"><Input id="nn" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kaveri Engineering — FY27 contract" /></Field>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Type">
          {(Object.keys(TYPE_LABEL) as PriceListType[]).map((t) => (
            <button
              key={t}
              role="radio"
              aria-checked={type === t}
              onClick={() => setType(t)}
              className={cn("rounded-lg border px-3 py-2 text-left", type === t ? "border-primary-500 bg-primary-50/60 ring-3 ring-primary-500/15" : "border-line hover:border-line-strong")}
            >
              <div className="flex items-center gap-1.5 text-sm font-medium">{t === "standard" ? <Tags className="size-3.5" /> : t === "customer" ? <Users className="size-3.5" /> : <Layers className="size-3.5" />}{TYPE_LABEL[t]}</div>
            </button>
          ))}
        </div>
        {type !== "standard" && (
          <Field label="Customer" required layout="vertical" htmlFor="nc">
            <Select id="nc" value={customer} onChange={(e) => setCustomer(e.target.value)}>
              <option value="">Select customer…</option>
              {customersOf.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        )}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Valid from" layout="vertical" htmlFor="nf"><Input id="nf" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="Valid to" layout="vertical" htmlFor="nt"><Input id="nt" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <Field label="Adjust std. by %" layout="vertical" htmlFor="nu"><Input id="nu" type="number" step="0.5" className="text-right" value={uplift} onChange={(e) => setUplift(Number(e.target.value))} /></Field>
        </div>
      </div>
    </Dialog>
  );
}
