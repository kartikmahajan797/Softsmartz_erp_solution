"use client";

import * as React from "react";
import {
  Archive,
  ClipboardList,
  Coffee,
  Package,
  PackageX,
  Pencil,
  Plus,
  RefreshCw,
  Ruler,
  Scan,
  Search,
  Settings,
  TriangleAlert,
  Wrench,
  X,
  ZapOff,
} from "lucide-react";
import { toast } from "sonner";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { Dialog } from "@/components/ui/overlay";
import { useRole } from "@/lib/store/app";
import { type MasterKey, useAdminSettings } from "@/lib/store/admin-settings";
import { cn, formatDate, TODAY } from "@/lib/utils";

type Row = { id: string; active?: boolean } & Record<string, unknown>;

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "time" | "checkbox";
  options?: { value: string; label: string }[];
  required?: boolean;
  mono?: boolean;
  upper?: boolean;
  hint?: string;
  lang?: string;
  validate?: (v: unknown, row: Row) => string | undefined;
  wide?: boolean;
}

interface ColDef {
  header: string;
  cell: (r: Row) => React.ReactNode;
  align?: "right";
}

interface TabDef {
  key: MasterKey;
  label: string;
  singular: string;
  desc: string;
  columns: ColDef[];
  fields: FieldDef[];
  blank: () => Row;
  search: (r: Row) => string;
  unique?: string;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ruler: Ruler,
  scan: Scan,
  "package-x": PackageX,
  settings: Settings,
  wrench: Wrench,
  "zap-off": ZapOff,
  "triangle-alert": TriangleAlert,
  package: Package,
  coffee: Coffee,
  "refresh-cw": RefreshCw,
  "clipboard-list": ClipboardList,
  archive: Archive,
};

const KIND_TONE: Record<string, Tone> = { scrap: "danger", rework: "warning", adjustment: "info", downtime: "progress" };
const s = (v: unknown) => String(v ?? "");
const mono = (v: unknown) => <span className="font-mono text-[12.5px] font-medium">{s(v)}</span>;
const hi = (v: unknown) => <span lang="hi" className="text-ink-2">{s(v)}</span>;

function useTabs(): TabDef[] {
  const uoms = useAdminSettings((st) => st.uoms);
  const uomOptions = uoms.filter((u) => u.active).map((u) => ({ value: u.code, label: `${u.code} — ${u.name}` }));
  return [
    {
      key: "uoms",
      label: "Units of measure",
      singular: "unit",
      desc: "Base units used on items, BOMs and documents. Decimal places control rounding of quantities.",
      unique: "code",
      columns: [
        { header: "Code", cell: (r) => mono(r.code) },
        { header: "Name", cell: (r) => <span className="font-medium">{s(r.name)}</span> },
        { header: "Type", cell: (r) => <span className="capitalize">{s(r.kind)}</span> },
        { header: "Decimals", align: "right", cell: (r) => s(r.decimals) },
      ],
      fields: [
        { key: "code", label: "Code", type: "text", required: true, mono: true, upper: true, hint: "As on e-invoice (UQC), e.g. NOS, KGS", validate: (v) => (/^[A-Z]{2,4}$/.test(s(v)) ? undefined : "2-4 capital letters") },
        { key: "name", label: "Name", type: "text", required: true },
        { key: "kind", label: "Type", type: "select", options: ["count", "weight", "length", "volume", "area", "time"].map((k) => ({ value: k, label: k[0].toUpperCase() + k.slice(1) })) },
        { key: "decimals", label: "Decimal places", type: "number", validate: (v) => (Number(v) >= 0 && Number(v) <= 4 ? undefined : "0 to 4") },
      ],
      blank: () => ({ id: `u${Date.now()}`, code: "", name: "", kind: "count", decimals: 0, active: true }),
      search: (r) => `${s(r.code)} ${s(r.name)} ${s(r.kind)}`,
    },
    {
      key: "conversions",
      label: "UoM conversions",
      singular: "conversion",
      desc: "Global conversions apply to all items; item-specific ones (e.g. bar stock metres → kg) override them.",
      columns: [
        { header: "Conversion", cell: (r) => <span><span className="font-mono text-[12.5px]">1 {s(r.from)}</span> <span className="text-ink-3">=</span> <span className="font-mono text-[12.5px] font-medium">{s(r.factor)} {s(r.to)}</span></span> },
        { header: "Applies to", cell: (r) => (r.item ? <span>{s(r.item)}</span> : <Badge tone="brand" dot={false}>All items</Badge>) },
      ],
      fields: [
        { key: "from", label: "From unit", type: "select", options: uomOptions },
        { key: "to", label: "To unit", type: "select", options: uomOptions, validate: (v, r) => (v === r.from ? "Must differ from the 'from' unit" : undefined) },
        { key: "factor", label: "Factor", type: "number", required: true, hint: "1 from-unit = factor × to-unit", validate: (v) => (Number(v) > 0 ? undefined : "Must be greater than zero") },
        { key: "item", label: "Item (optional)", type: "text", hint: "Leave blank for a global conversion" },
      ],
      blank: () => ({ id: `c${Date.now()}`, from: "MTR", to: "KGS", factor: 1, item: "" }),
      search: (r) => `${s(r.from)} ${s(r.to)} ${s(r.item)}`,
    },
    {
      key: "reasons",
      label: "Reason codes",
      singular: "reason code",
      desc: "Shown as icons on the operator terminal for rejects and pauses, and on scrap, rework and stock adjustments. Hindi names appear when the terminal language is Hindi.",
      unique: "code",
      columns: [
        {
          header: "Code",
          cell: (r) => {
            const Icon = ICONS[s(r.icon)] ?? Package;
            return (
              <span className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-md bg-surface-3 text-ink-2"><Icon className="size-4" /></span>
                {mono(r.code)}
              </span>
            );
          },
        },
        { header: "Name (English)", cell: (r) => <span className="font-medium">{s(r.name)}</span> },
        { header: "Name (हिन्दी)", cell: (r) => hi(r.nameHi) },
        { header: "Used for", cell: (r) => <Badge tone={KIND_TONE[s(r.kind)]} className="capitalize">{s(r.kind)}</Badge> },
      ],
      fields: [
        { key: "code", label: "Code", type: "text", required: true, mono: true, upper: true, validate: (v) => (/^[A-Z0-9-]{2,8}$/.test(s(v)) ? undefined : "2-8 characters: A-Z, 0-9, -") },
        { key: "kind", label: "Used for", type: "select", options: ["scrap", "rework", "adjustment", "downtime"].map((k) => ({ value: k, label: k[0].toUpperCase() + k.slice(1) })) },
        { key: "name", label: "Name (English)", type: "text", required: true, wide: true },
        { key: "nameHi", label: "Name (Hindi)", type: "text", required: true, lang: "hi", wide: true, hint: "Operators see this on Hindi terminals" },
        { key: "icon", label: "Icon", type: "select", options: Object.keys(ICONS).map((k) => ({ value: k, label: k })) },
      ],
      blank: () => ({ id: `rc${Date.now()}`, code: "", name: "", nameHi: "", icon: "package", kind: "scrap", active: true }),
      search: (r) => `${s(r.code)} ${s(r.name)} ${s(r.nameHi)} ${s(r.kind)}`,
    },
    {
      key: "hsn",
      label: "HSN / SAC & GST",
      singular: "HSN / SAC rate",
      desc: "Tax engine rates are effective-dated: a new row with a later date supersedes the old rate from that date without changing posted invoices.",
      columns: [
        { header: "Code", cell: (r) => <span className="flex items-center gap-2">{mono(r.code)}<span className="text-2xs text-ink-3">{s(r.type)}</span></span> },
        { header: "Description", cell: (r) => <span className="line-clamp-1">{s(r.description)}</span> },
        { header: "GST", align: "right", cell: (r) => <span className="font-medium">{s(r.rate)}%</span> },
        { header: "Cess", align: "right", cell: (r) => (Number(r.cess) ? `${s(r.cess)}%` : <span className="text-ink-3">—</span>) },
        { header: "Effective from", cell: (r) => <span className={cn(s(r.effectiveFrom) > TODAY && "text-info")}>{formatDate(s(r.effectiveFrom))}{s(r.effectiveFrom) > TODAY && " (future)"}</span> },
      ],
      fields: [
        { key: "type", label: "Type", type: "select", options: [{ value: "HSN", label: "HSN (goods)" }, { value: "SAC", label: "SAC (services)" }] },
        {
          key: "code",
          label: "Code",
          type: "text",
          required: true,
          mono: true,
          hint: "4 digits up to ₹5 Cr turnover, 6 digits above",
          validate: (v, r) => (r.type === "SAC" ? (/^99\d{4}$/.test(s(v)) ? undefined : "SAC is 6 digits starting with 99") : /^(\d{4}|\d{6}|\d{8})$/.test(s(v)) ? undefined : "HSN must be 4, 6 or 8 digits"),
        },
        { key: "description", label: "Description", type: "text", required: true, wide: true },
        { key: "rate", label: "GST rate", type: "select", options: ["0", "0.25", "3", "5", "12", "18", "28", "40"].map((v) => ({ value: v, label: `${v}%` })) },
        { key: "cess", label: "Cess %", type: "number", validate: (v) => (Number(v) >= 0 ? undefined : "Cannot be negative") },
        { key: "effectiveFrom", label: "Effective from", type: "date", required: true },
      ],
      blank: () => ({ id: `h${Date.now()}`, type: "HSN", code: "", description: "", rate: 18, cess: 0, effectiveFrom: TODAY, active: true }),
      search: (r) => `${s(r.code)} ${s(r.description)} ${s(r.rate)}%`,
    },
    {
      key: "terms",
      label: "Payment terms",
      singular: "payment term",
      desc: "Due dates drive ageing and WhatsApp reminders. MSME-compliant terms keep vendor payments within 45 days (MSMED Act / s.43B(h)).",
      unique: "name",
      columns: [
        { header: "Name", cell: (r) => <span className="font-medium">{s(r.name)}</span> },
        { header: "Credit days", align: "right", cell: (r) => s(r.days) },
        { header: "Advance", align: "right", cell: (r) => (Number(r.advancePct) ? `${s(r.advancePct)}%` : <span className="text-ink-3">—</span>) },
        { header: "Due from", cell: (r) => ({ invoice: "Invoice date", month_end: "Month end", delivery: "Delivery date" })[s(r.basis)] },
        { header: "MSME", cell: (r) => (r.msme ? <Badge tone="success">≤ 45 days</Badge> : <span className="text-ink-3">—</span>) },
      ],
      fields: [
        { key: "name", label: "Name", type: "text", required: true, wide: true },
        { key: "days", label: "Credit days", type: "number", validate: (v) => (Number(v) >= 0 && Number(v) <= 365 ? undefined : "0 to 365") },
        { key: "advancePct", label: "Advance %", type: "number", validate: (v) => (Number(v) >= 0 && Number(v) <= 100 ? undefined : "0 to 100") },
        { key: "basis", label: "Due from", type: "select", options: [{ value: "invoice", label: "Invoice date" }, { value: "month_end", label: "Month end" }, { value: "delivery", label: "Delivery date" }] },
        { key: "msme", label: "MSME compliant (vendor payments within 45 days)", type: "checkbox", validate: (v, r) => (v && Number(r.days) > 45 ? "MSME terms cannot exceed 45 days" : undefined) },
      ],
      blank: () => ({ id: `t${Date.now()}`, name: "", days: 30, advancePct: 0, basis: "invoice", msme: false, active: true }),
      search: (r) => `${s(r.name)} ${s(r.days)}`,
    },
    {
      key: "shifts",
      label: "Shifts",
      singular: "shift",
      desc: "Production entries, the owner dashboard and labour cost roll up by shift. Overnight shifts end the next day.",
      unique: "code",
      columns: [
        { header: "Code", cell: (r) => mono(r.code) },
        { header: "Name", cell: (r) => <span className="font-medium">{s(r.name)}</span> },
        { header: "हिन्दी", cell: (r) => hi(r.nameHi) },
        { header: "Timing", cell: (r) => <span className="tabular">{s(r.start)} – {s(r.end)}{s(r.end) <= s(r.start) && <span className="ml-1 text-2xs text-ink-3">(+1 day)</span>}</span> },
        { header: "Hours", align: "right", cell: (r) => shiftHours(r).toFixed(1) },
        { header: "Break", align: "right", cell: (r) => `${s(r.breakMins)} min` },
      ],
      fields: [
        { key: "code", label: "Code", type: "text", required: true, mono: true, upper: true, validate: (v) => (/^[A-Z0-9]{1,3}$/.test(s(v)) ? undefined : "1-3 characters") },
        { key: "name", label: "Name", type: "text", required: true },
        { key: "nameHi", label: "Name (Hindi)", type: "text", lang: "hi" },
        { key: "breakMins", label: "Break (minutes)", type: "number", validate: (v, r) => (Number(v) >= 0 && Number(v) < shiftHours(r) * 60 ? undefined : "Break must be shorter than the shift") },
        { key: "start", label: "Start", type: "time", required: true },
        { key: "end", label: "End", type: "time", required: true, validate: (v, r) => (v === r.start ? "End must differ from start" : undefined) },
      ],
      blank: () => ({ id: `s${Date.now()}`, code: "", name: "", nameHi: "", start: "07:00", end: "15:00", breakMins: 30, active: true }),
      search: (r) => `${s(r.code)} ${s(r.name)} ${s(r.nameHi)}`,
    },
    {
      key: "states",
      label: "States",
      singular: "state",
      desc: "GST state codes decide place of supply: same state → CGST + SGST, different state → IGST. Codes are fixed by GSTN.",
      unique: "code",
      columns: [
        { header: "Code", cell: (r) => mono(r.code) },
        { header: "State / UT", cell: (r) => <span className="font-medium">{s(r.name)}</span> },
        { header: "Type", cell: (r) => (r.ut ? <Badge tone="info" dot={false}>Union territory</Badge> : <Badge tone="neutral" dot={false}>State</Badge>) },
        { header: "Tax with Maharashtra (27)", cell: (r) => (r.code === "27" ? "CGST + SGST" : r.ut ? "IGST (UTGST intra-UT)" : "IGST") },
      ],
      fields: [
        { key: "code", label: "GST state code", type: "text", required: true, mono: true, validate: (v) => (/^\d{2}$/.test(s(v)) ? undefined : "2 digits") },
        { key: "name", label: "Name", type: "text", required: true },
        { key: "ut", label: "Union territory", type: "checkbox" },
      ],
      blank: () => ({ id: `st${Date.now()}`, code: "", name: "", ut: false, active: true }),
      search: (r) => `${s(r.code)} ${s(r.name)}`,
    },
  ];
}

function shiftHours(r: Row) {
  const [sh, sm] = s(r.start).split(":").map(Number);
  const [eh, em] = s(r.end).split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return (mins - Number(r.breakMins || 0)) / 60;
}

export default function MastersPage() {
  const role = useRole();
  const canEdit = role.key === "owner" || role.key === "accountant" || role.key === "production";
  const tabs = useTabs();
  const store = useAdminSettings();
  const upsert = useAdminSettings((st) => st.upsert);
  const [tabKey, setTabKey] = React.useState<MasterKey>("uoms");
  const [q, setQ] = React.useState("");
  const [showInactive, setShowInactive] = React.useState(false);
  const [edit, setEdit] = React.useState<Row | null>(null);
  const tab = tabs.find((t) => t.key === tabKey)!;
  const all = store[tabKey] as unknown as Row[];
  const rows = all.filter((r) => (showInactive || r.active !== false) && tab.search(r).toLowerCase().includes(q.trim().toLowerCase()));
  const inactive = all.filter((r) => r.active === false).length;
  const hasActive = all.some((r) => "active" in r);

  const save = (r: Row) => {
    upsert(tabKey, r as never);
    toast.success(`${tab.singular[0].toUpperCase()}${tab.singular.slice(1)} saved`, { description: "Recorded in the audit log" });
    setEdit(null);
  };

  return (
    <SettingsShell
      title="Master data"
      actions={canEdit && (
        <Button variant="primary" onClick={() => setEdit(tab.blank())}>
          <Plus /> Add {tab.singular}
        </Button>
      )}
    >
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 text-sm text-ink-2">Reference lists used by the tax engine, shop floor, inventory and costing. Records in use are deactivated, never deleted.</p>

        <div role="tablist" aria-label="Master lists" className="scroll-thin mb-4 flex gap-1 overflow-x-auto border-b border-line">
          {tabs.map((t) => {
            const n = (store[t.key] as unknown as Row[]).filter((r) => r.active !== false).length;
            const on = t.key === tabKey;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={on}
                onClick={() => { setTabKey(t.key); setQ(""); }}
                className={cn(
                  "relative -mb-px flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium whitespace-nowrap",
                  on ? "border-primary-600 text-ink" : "border-transparent text-ink-3 hover:text-ink",
                )}
              >
                {t.label}
                <span className="rounded-full bg-surface-3 px-1.5 text-xs text-ink-3">{n}</span>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-line bg-surface shadow-xs">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
            <p className="min-w-60 flex-1 text-xs text-ink-3">{tab.desc}</p>
            <div className="flex w-full items-center gap-3 sm:w-auto">
              <div className="flex h-8 flex-1 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2 shadow-xs focus-within:border-primary-500 focus-within:ring-3 focus-within:ring-primary-500/15 sm:w-64 sm:flex-none">
                <Search className="size-4 text-ink-3" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${tab.label.toLowerCase()}…`} aria-label="Search" className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-3" />
                {q && <button onClick={() => setQ("")} aria-label="Clear search" className="rounded p-0.5 text-ink-3 hover:bg-surface-3"><X className="size-3.5" /></button>}
              </div>
              {hasActive && (
                <label className="flex items-center gap-1.5 text-xs whitespace-nowrap text-ink-2">
                  <Checkbox checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
                  Inactive ({inactive})
                </label>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-surface-2 text-xs text-ink-3">
                <tr>
                  {tab.columns.map((c) => <th key={c.header} className={cn("h-9 px-4 font-semibold", c.align === "right" ? "text-right" : "text-left")}>{c.header}</th>)}
                  {hasActive && <th className="h-9 w-20 px-4 text-left font-semibold">Active</th>}
                  <th className="h-9 w-12 px-4" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={cn("group border-t border-line hover:bg-surface-2", r.active === false && "text-ink-3 [&_*]:!text-ink-3")}>
                    {tab.columns.map((c) => <td key={c.header} className={cn("h-11 px-4", c.align === "right" && "tabular text-right")}>{c.cell(r)}</td>)}
                    {hasActive && (
                      <td className="px-4">
                        <Toggle
                          checked={r.active !== false}
                          disabled={!canEdit}
                          label={`Active ${s(r.code ?? r.name)}`}
                          onChange={() => {
                            upsert(tabKey, { ...r, active: !r.active } as never);
                            toast(r.active ? "Deactivated — hidden from new documents" : "Re-activated");
                          }}
                        />
                      </td>
                    )}
                    <td className="px-4 text-right">
                      {canEdit && (
                        <Button size="icon-sm" variant="ghost" aria-label="Edit" className="opacity-60 group-hover:opacity-100" onClick={() => setEdit(r)}>
                          <Pencil />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={tab.columns.length + 2} className="py-14 text-center text-sm text-ink-3">
                      No {tab.label.toLowerCase()} match “{q}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line bg-surface-2 px-4 py-2 text-xs text-ink-3 rounded-b-xl">
            {rows.length} of {all.length} shown
          </div>
        </div>
      </div>

      <MasterDialog tab={tab} row={edit} all={all} onClose={() => setEdit(null)} onSave={save} />
    </SettingsShell>
  );
}

function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50", checked ? "bg-primary-600" : "bg-line-strong")}
    >
      <span className={cn("inline-block size-4 rounded-full bg-white shadow-xs transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

function MasterDialog({ tab, row, all, onClose, onSave }: { tab: TabDef; row: Row | null; all: Row[]; onClose: () => void; onSave: (r: Row) => void }) {
  const [r, setR] = React.useState<Row | null>(row);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [prev, setPrev] = React.useState(row);
  if (row !== prev) {
    setPrev(row);
    setR(row);
    setErrors({});
  }
  if (!r) return null;
  const isNew = !all.some((x) => x.id === r.id);

  const submit = () => {
    const e: Record<string, string> = {};
    tab.fields.forEach((f) => {
      const v = r[f.key];
      if (f.required && (v === undefined || s(v).trim() === "")) e[f.key] = "Required";
      else if (f.validate) {
        const msg = f.validate(v, r);
        if (msg) e[f.key] = msg;
      }
    });
    if (tab.unique && !e[tab.unique] && all.some((x) => x.id !== r.id && s(x[tab.unique!]).toLowerCase() === s(r[tab.unique!]).toLowerCase())) {
      e[tab.unique] = "Already exists";
    }
    setErrors(e);
    if (Object.keys(e).length === 0) onSave(r);
  };

  return (
    <Dialog
      open={!!row}
      onOpenChange={(o) => !o && onClose()}
      title={`${isNew ? "New" : "Edit"} ${tab.singular}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Save</Button>
        </>
      }
    >
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {tab.fields.map((f) => {
          const id = `m-${f.key}`;
          const v = r[f.key];
          const err = errors[f.key];
          if (f.type === "checkbox")
            return (
              <div key={f.key} className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={!!v} onChange={(e) => setR({ ...r, [f.key]: e.target.checked })} />
                  {f.label}
                </label>
                {err && <p className="mt-1 text-xs text-danger">{err}</p>}
              </div>
            );
          return (
            <Field key={f.key} label={f.label} required={f.required} error={err} hint={f.hint} layout="vertical" htmlFor={id} className={cn(f.wide && "sm:col-span-2")}>
              {f.type === "select" ? (
                <Select id={id} value={s(v)} onChange={(e) => setR({ ...r, [f.key]: f.key === "rate" ? Number(e.target.value) : e.target.value })}>
                  {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              ) : (
                <Input
                  id={id}
                  type={f.type}
                  lang={f.lang}
                  aria-invalid={!!err}
                  className={cn(f.mono && "font-mono", f.upper && "uppercase", f.type === "number" && "text-right")}
                  value={s(v)}
                  onChange={(e) =>
                    setR({ ...r, [f.key]: f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : f.upper ? e.target.value.toUpperCase() : e.target.value })
                  }
                />
              )}
            </Field>
          );
        })}
        <button type="submit" className="hidden" />
      </form>
    </Dialog>
  );
}
