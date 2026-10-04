"use client";

import * as React from "react";
import { AlertTriangle, Check, CheckCircle2, Download, FileSpreadsheet, FileUp, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { cn } from "@/lib/utils";

type Source = "excel" | "tally";
type Entity = "items" | "customers" | "vendors" | "opening";

const ENTITIES: { k: Entity; l: string; d: string; target: string[] }[] = [
  { k: "items", l: "Items", d: "Codes, names, UoM, HSN, GST rate, reorder levels", target: ["Item code", "Item name", "Hindi name", "Stock UoM", "HSN code", "GST rate %", "Item type", "Reorder level", "Standard cost"] },
  { k: "customers", l: "Customers", d: "GSTIN, state, credit limits, terms", target: ["Customer name", "GSTIN", "State", "Contact person", "Mobile", "Credit limit", "Payment terms (days)"] },
  { k: "vendors", l: "Vendors", d: "GSTIN, MSME status, terms", target: ["Vendor name", "GSTIN", "State", "MSME (Udyam no.)", "Mobile", "Payment terms (days)"] },
  { k: "opening", l: "Opening stock", d: "Quantity and value by warehouse and batch", target: ["Item code", "Warehouse", "Batch", "Quantity", "Unit cost"] },
];

/* Source columns as they appear in a typical Tally / Excel export, with the auto-suggested target and confidence (AI-05). */
const SOURCE_COLS: Record<Entity, { src: string; sample: string; target: string; conf: number }[]> = {
  items: [
    { src: "Stock Item Code", sample: "RM-BAR-EN8-32", target: "Item code", conf: 98 },
    { src: "Name of Item", sample: "MS Round Bar EN8 32mm", target: "Item name", conf: 96 },
    { src: "Unit", sample: "Kgs", target: "Stock UoM", conf: 91 },
    { src: "HSN/SAC", sample: "721420", target: "HSN code", conf: 99 },
    { src: "GST %", sample: "18", target: "GST rate %", conf: 97 },
    { src: "Group", sample: "Raw Material", target: "Item type", conf: 72 },
    { src: "Min Qty", sample: "1500", target: "Reorder level", conf: 64 },
    { src: "Rate", sample: "68", target: "Standard cost", conf: 58 },
    { src: "Godown", sample: "Main Store", target: "", conf: 0 },
  ],
  customers: [
    { src: "Party Name", sample: "Deccan Motors Ltd", target: "Customer name", conf: 97 },
    { src: "GSTIN/UIN", sample: "27AABCD1234E1Z2", target: "GSTIN", conf: 99 },
    { src: "State Name", sample: "Maharashtra", target: "State", conf: 95 },
    { src: "Contact", sample: "Anil Joshi", target: "Contact person", conf: 88 },
    { src: "Phone", sample: "9822011223", target: "Mobile", conf: 84 },
    { src: "Credit Limit", sample: "2500000", target: "Credit limit", conf: 96 },
    { src: "Credit Period", sample: "45 Days", target: "Payment terms (days)", conf: 81 },
  ],
  vendors: [
    { src: "Ledger Name", sample: "Mahalaxmi Steel Traders", target: "Vendor name", conf: 90 },
    { src: "GSTIN/UIN", sample: "27AAJFM4410D1Z6", target: "GSTIN", conf: 99 },
    { src: "State Name", sample: "Maharashtra", target: "State", conf: 95 },
    { src: "MSME Reg No", sample: "UDYAM-MH-26-0012345", target: "MSME (Udyam no.)", conf: 86 },
    { src: "Mobile", sample: "9823055871", target: "Mobile", conf: 93 },
    { src: "Credit Period", sample: "30", target: "Payment terms (days)", conf: 81 },
  ],
  opening: [
    { src: "Item Code", sample: "RM-BAR-EN8-32", target: "Item code", conf: 98 },
    { src: "Godown", sample: "Main Store", target: "Warehouse", conf: 77 },
    { src: "Batch No", sample: "B-EN8-0926", target: "Batch", conf: 92 },
    { src: "Closing Qty", sample: "1180", target: "Quantity", conf: 88 },
    { src: "Closing Rate", sample: "69.40", target: "Unit cost", conf: 83 },
  ],
};

const ERRORS: Record<Entity, { row: number; field: string; value: string; error: string; kind: "error" | "warning" }[]> = {
  items: [
    { row: 14, field: "HSN code", value: "8708", error: "4-digit HSN not allowed above ₹5 Cr turnover — 6 digits required", kind: "error" },
    { row: 27, field: "Item code", value: "BO-BRG-6204", error: "Duplicate of row 9 (same code)", kind: "error" },
    { row: 31, field: "GST rate %", value: "12.5", error: "Not a valid GST slab (0, 5, 12, 18, 28)", kind: "error" },
    { row: 42, field: "Stock UoM", value: "Mtrs", error: "Unknown UoM — mapped to 'm' (metre)", kind: "warning" },
    { row: 56, field: "Item name", value: "Bearing 6204 2RS", error: "Possible duplicate of 'Bearing 6204-2RS' (94% similar)", kind: "warning" },
  ],
  customers: [
    { row: 6, field: "GSTIN", value: "27AABCD1234E1Z", error: "GSTIN must be 15 characters", kind: "error" },
    { row: 11, field: "State", value: "Maharastra", error: "State corrected to 'Maharashtra' from GSTIN prefix 27", kind: "warning" },
  ],
  vendors: [{ row: 4, field: "GSTIN", value: "29AAKFA7754M1Z0", error: "State in GSTIN (29) differs from State 'Maharashtra'", kind: "error" }],
  opening: [
    { row: 8, field: "Item code", value: "RM-CST-PUL2", error: "Item not found — import items first", kind: "error" },
    { row: 19, field: "Unit cost", value: "0", error: "Zero cost will value stock at ₹0", kind: "warning" },
  ],
};

const STEPS = ["Source", "Upload", "Map columns", "Validate", "Import"];

export default function ImportPage() {
  const [step, setStep] = React.useState(0);
  const [source, setSource] = React.useState<Source>("excel");
  const [entity, setEntity] = React.useState<Entity>("items");
  const [file, setFile] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [mapping, setMapping] = React.useState<Record<string, string>>({});
  const [validating, setValidating] = React.useState(false);
  const [committing, setCommitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const ent = ENTITIES.find((e) => e.k === entity)!;
  const cols = SOURCE_COLS[entity];
  const errs = ERRORS[entity];
  const totalRows = { items: 214, customers: 38, vendors: 61, opening: 187 }[entity];
  const hardErrors = errs.filter((e) => e.kind === "error").length;

  const reset = () => { setStep(0); setFile(null); setMapping({}); setDone(false); };

  const upload = () => {
    setUploading(true);
    setTimeout(() => {
      const name = source === "tally" ? `Tally_${entity === "opening" ? "StockSummary" : ent.l.replace(" ", "")}.xml` : `${ent.l.toLowerCase().replace(" ", "_")}_master.xlsx`;
      setFile(name);
      setUploading(false);
      setMapping(Object.fromEntries(cols.map((c) => [c.src, c.target])));
      toast.success(`${name} read · ${totalRows} rows`, { description: "Columns auto-mapped — review low-confidence matches" });
      setStep(2);
    }, 900);
  };

  const validate = () => {
    const required = ent.target.slice(0, 2);
    const mapped = Object.values(mapping);
    const missing = required.filter((r) => !mapped.includes(r));
    if (missing.length) return toast.error(`Map required field${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
    const dupes = mapped.filter((m, i) => m && mapped.indexOf(m) !== i);
    if (dupes.length) return toast.error(`'${dupes[0]}' is mapped twice`);
    setValidating(true);
    setTimeout(() => { setValidating(false); setStep(3); }, 900);
  };

  const commit = () => {
    setCommitting(true);
    setTimeout(() => {
      setCommitting(false);
      setDone(true);
      setStep(4);
      toast.success(`${totalRows - hardErrors} ${ent.l.toLowerCase()} imported`, { description: `${hardErrors} rows skipped · see error report` });
    }, 1300);
  };

  const downloadErrors = () => {
    const csv = ["Row,Field,Value,Error,Severity", ...errs.map((e) => [e.row, e.field, JSON.stringify(e.value), JSON.stringify(e.error), e.kind].join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `import-errors-${entity}.csv`;
    a.click();
  };

  return (
    <SettingsShell title="Data import" actions={step > 0 && <Button onClick={reset}><RotateCcw /> Start over</Button>}>
      <div className="mx-auto max-w-5xl">
        {/* Stepper */}
        <ol className="mb-5 flex flex-wrap items-center gap-2" aria-label="Import steps">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className={cn("flex size-6 items-center justify-center rounded-full text-xs font-semibold", i < step || done ? "bg-primary-600 text-white" : i === step ? "bg-primary-50 text-primary-700 ring-2 ring-primary-500" : "bg-surface-3 text-ink-3")}>
                {i < step || done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={cn("text-sm", i === step ? "font-semibold" : "text-ink-3")}>{s}</span>
              {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-line-strong sm:w-10" />}
            </li>
          ))}
        </ol>

        <div className="rounded-xl border border-line bg-surface shadow-xs">
          {step === 0 && (
            <div className="space-y-6 p-5">
              <div>
                <h2 className="mb-2 text-sm font-semibold">1. Where is the data coming from?</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([["excel", "Excel or CSV", "Use our template or your own sheet", FileSpreadsheet], ["tally", "Tally XML", "Export from Tally: Display, List of Accounts or Stock Summary, then Export as XML", FileUp]] as const).map(([k, l, d, Icon]) => (
                    <label key={k} className={cn("flex cursor-pointer gap-3 rounded-lg border p-4", source === k ? "border-primary-500 bg-primary-50/60 ring-3 ring-primary-500/10" : "border-line hover:border-line-strong")}>
                      <input type="radio" name="src" className="sr-only" checked={source === k} onChange={() => setSource(k)} />
                      <Icon className="size-6 text-primary-600" />
                      <span><span className="block text-sm font-medium">{l}</span><span className="block text-xs text-ink-3">{d}</span></span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="mb-2 text-sm font-semibold">2. What are you importing?</h2>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {ENTITIES.map((e) => (
                    <label key={e.k} className={cn("cursor-pointer rounded-lg border p-3", entity === e.k ? "border-primary-500 bg-primary-50/60" : "border-line hover:border-line-strong")}>
                      <input type="radio" name="ent" className="sr-only" checked={entity === e.k} onChange={() => setEntity(e.k)} />
                      <span className="block text-sm font-medium">{e.l}</span>
                      <span className="block text-xs text-ink-3">{e.d}</span>
                    </label>
                  ))}
                </div>
                {entity === "opening" && <p className="mt-2 text-xs text-warning">Import items and warehouses first; opening stock posts an “opening” movement dated at go-live.</p>}
              </div>
              <div className="flex justify-between">
                <Button variant="link" onClick={() => toast.success(`${ent.l} template downloaded`)}><Download /> Download template</Button>
                <Button variant="primary" onClick={() => setStep(1)}>Continue</Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="p-5">
              <button
                onClick={upload}
                disabled={uploading}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-surface-2 px-6 py-14 text-center transition-colors hover:border-primary-500 hover:bg-primary-50/40"
              >
                {uploading ? <Loader2 className="size-8 animate-spin text-primary-600" /> : <FileUp className="size-8 text-primary-600" />}
                <span className="text-sm font-medium">{uploading ? "Reading file…" : `Drop your ${source === "tally" ? "Tally XML" : "Excel / CSV"} file here, or click to choose`}</span>
                <span className="text-xs text-ink-3">Max 10 MB · first sheet is read · header row auto-detected</span>
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
                <div className="text-sm"><span className="font-medium">{file}</span> <span className="text-ink-3">· {totalRows} rows · {cols.length} columns</span></div>
                <span className="flex items-center gap-1.5 text-xs text-progress"><Sparkles className="size-3.5" /> Smart mapping suggested {cols.filter((c) => c.target).length} of {cols.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-surface-2 text-xs text-ink-2">
                    <tr>{["Column in your file", "Sample", "Maps to", "Confidence"].map((h) => <th key={h} className="px-5 py-2 text-left font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {cols.map((c) => (
                      <tr key={c.src} className="border-t border-line">
                        <td className="px-5 py-2 font-medium">{c.src}</td>
                        <td className="px-5 py-2 font-mono text-xs text-ink-2">{c.sample}</td>
                        <td className="w-64 px-5 py-2">
                          <Select aria-label={`Map ${c.src}`} value={mapping[c.src] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [c.src]: e.target.value }))}>
                            <option value="">— Skip column —</option>
                            {ent.target.map((t) => <option key={t}>{t}</option>)}
                          </Select>
                        </td>
                        <td className="px-5 py-2">
                          {mapping[c.src] && mapping[c.src] === c.target ? (
                            <Badge tone={c.conf >= 85 ? "success" : c.conf >= 70 ? "warning" : "danger"}>{c.conf}% {c.conf >= 85 ? "match" : "check"}</Badge>
                          ) : mapping[c.src] ? (
                            <Badge tone="info">Manual</Badge>
                          ) : (
                            <span className="text-xs text-ink-3">Skipped</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between border-t border-line px-5 py-3">
                <Button onClick={() => setStep(1)}>Back</Button>
                <Button variant="primary" onClick={validate} disabled={validating}>{validating && <Loader2 className="animate-spin" />} Validate {totalRows} rows</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="grid grid-cols-3 border-b border-line">
                <Stat n={totalRows - errs.length} l="Ready" tone="text-success" />
                <Stat n={errs.filter((e) => e.kind === "warning").length} l="Warnings (will import)" tone="text-warning" />
                <Stat n={hardErrors} l="Errors (will be skipped)" tone="text-danger" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-surface-2 text-xs text-ink-2">
                    <tr>{["Row", "Field", "Value", "Issue"].map((h) => <th key={h} className="px-5 py-2 text-left font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {errs.map((e) => (
                      <tr key={e.row} className="border-t border-line">
                        <td className="tabular px-5 py-2">{e.row}</td>
                        <td className="px-5 py-2">{e.field}</td>
                        <td className="px-5 py-2 font-mono text-xs">{e.value}</td>
                        <td className="px-5 py-2">
                          <span className={cn("flex items-start gap-1.5", e.kind === "error" ? "text-danger" : "text-warning")}>
                            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{e.error}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap justify-between gap-2 border-t border-line px-5 py-3">
                <div className="flex gap-2">
                  <Button onClick={() => setStep(2)}>Back to mapping</Button>
                  <Button onClick={downloadErrors}><Download /> Error report (CSV)</Button>
                </div>
                <Button variant="primary" onClick={commit} disabled={committing}>
                  {committing && <Loader2 className="animate-spin" />} Import {totalRows - hardErrors} rows
                </Button>
              </div>
            </div>
          )}

          {step === 4 && done && (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <CheckCircle2 className="size-10 text-success" />
              <h2 className="text-lg font-semibold">Import complete</h2>
              <p className="text-sm text-ink-2">{totalRows - hardErrors} {ent.l.toLowerCase()} created or updated · {hardErrors} skipped · idempotent by {entity === "items" || entity === "opening" ? "item code" : "GSTIN"} — re-running updates rather than duplicates.</p>
              <div className="mt-3 flex gap-2">
                <Button onClick={downloadErrors}><Download /> Skipped rows</Button>
                <Button variant="primary" onClick={reset}>Import more</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SettingsShell>
  );
}

function Stat({ n, l, tone }: { n: number; l: string; tone: string }) {
  return (
    <div className="border-r border-line p-4 last:border-r-0">
      <div className={cn("tabular text-2xl font-semibold", tone)}>{n}</div>
      <div className="text-xs text-ink-3">{l}</div>
    </div>
  );
}
