"use client";

import * as React from "react";
import { ClipboardList, Download, FileText, Package, RotateCcw, Save, ShoppingCart, Truck, Upload, Waypoints } from "lucide-react";
import { toast } from "sonner";
import { SettingsShell } from "@/components/settings/settings-shell";
import { ToggleRow } from "@/components/settings/toggle";
import { QrPlaceholder } from "@/components/finance/invoice-document";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { company } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { type DocTemplate, type TemplateKey, useAdmin } from "@/lib/store/admin";
import { useSettings } from "@/lib/store/settings";
import { cn, formatDateTime, formatINR } from "@/lib/utils";

const ICONS: Record<TemplateKey, React.ReactNode> = {
  invoice: <FileText />,
  delivery: <Truck />,
  jobwork: <Waypoints />,
  po: <ShoppingCart />,
  jobcard: <ClipboardList />,
};
const SWATCHES = ["#0d7377", "#2459c2", "#b45309", "#15803d", "#7c3aed", "#be123c", "#17202a"];
const COPIES = ["Original", "Duplicate", "Triplicate"] as const;

export default function TemplatesPage() {
  const role = useRole();
  const templates = useAdmin((s) => s.templates);
  const saveTemplate = useAdmin((s) => s.saveTemplate);
  const [key, setKey] = React.useState<TemplateKey>("invoice");
  const saved = templates.find((t) => t.key === key)!;
  const [draft, setDraft] = React.useState<DocTemplate>(saved);
  const [prevKey, setPrevKey] = React.useState(key);
  if (prevKey !== key) {
    setPrevKey(key);
    setDraft(saved);
  }
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const canEdit = role.key === "owner" || role.key === "accountant";
  const set = <K extends keyof DocTemplate>(k: K, v: DocTemplate[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    saveTemplate({ ...draft, updatedAt: new Date().toISOString().slice(0, 19), updatedBy: role.user });
    toast.success(`${draft.name} template saved`, { description: "New documents use it immediately; posted PDFs are not re-rendered." });
  };

  return (
    <SettingsShell
      title="Document templates"
      actions={
        canEdit && (
          <>
            {dirty && <Button onClick={() => setDraft(saved)}><RotateCcw /> Discard</Button>}
            <Button variant="primary" disabled={!dirty} onClick={save}><Save /> Save template</Button>
          </>
        )
      }
    >
      <div className="mx-auto max-w-[1400px]">
        <p className="mb-4 text-sm text-ink-2">
          Branded PDF layouts for printed and shared documents (FR-PL-07). Changes apply to new documents; already posted PDFs stay as issued.
        </p>
        <div className="grid gap-4 xl:grid-cols-[210px_300px_minmax(0,1fr)] lg:grid-cols-[230px_minmax(0,1fr)]">
          {/* Template list */}
          <nav aria-label="Templates" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {templates.map((t) => (
              <button
                key={t.key}
                onClick={() => setKey(t.key)}
                aria-current={t.key === key ? "true" : undefined}
                className={cn(
                  "flex min-w-56 items-start gap-3 rounded-xl border bg-surface p-3 text-left shadow-xs transition-colors lg:min-w-0",
                  t.key === key ? "border-primary-500 ring-3 ring-primary-500/15" : "border-line hover:border-line-strong",
                )}
              >
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4", t.key === key ? "bg-primary-600 text-white" : "bg-surface-3 text-ink-2")}>
                  {ICONS[t.key]}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{t.name}</span>
                  <span className="mt-0.5 block text-xs text-ink-3">{t.description}</span>
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    <Badge dot={false} tone="neutral">{t.paper}</Badge>
                    {t.qr && <Badge dot={false} tone="brand">QR</Badge>}
                  </span>
                </span>
              </button>
            ))}
          </nav>

          {/* Editor */}
          <fieldset disabled={!canEdit} className="rounded-xl border border-line bg-surface shadow-xs">
            <div className="border-b border-line px-4 py-3">
              <div className="text-sm font-semibold">{draft.name}</div>
              <div className="text-xs text-ink-3">Last edited {formatDateTime(saved.updatedAt)} by {saved.updatedBy}</div>
            </div>
            <div className="divide-y divide-line px-4">
              <div className="py-3">
                <div className="mb-2 text-xs font-semibold text-ink-2">Logo</div>
                <div className="flex items-center gap-3">
                  <Logo colour={draft.brandColour} size={40} />
                  <Button size="sm" onClick={() => toast("Upload a PNG or SVG, up to 1 MB")}><Upload /> Replace</Button>
                </div>
                <ToggleRow title="Show logo" checked={draft.showLogo} onChange={(v) => set("showLogo", v)} />
              </div>
              <div className="py-3">
                <div className="mb-2 text-xs font-semibold text-ink-2">Brand colour</div>
                <div className="flex flex-wrap gap-2">
                  {SWATCHES.map((c) => (
                    <button
                      key={c}
                      aria-label={`Colour ${c}`}
                      aria-pressed={draft.brandColour === c}
                      onClick={() => set("brandColour", c)}
                      className={cn("size-7 rounded-full border-2 transition-transform", draft.brandColour === c ? "scale-110 border-ink" : "border-white shadow-xs")}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="py-1">
                <ToggleRow title="HSN / SAC summary" desc="Tax breakup by HSN below the lines" checked={draft.hsnSummary} onChange={(v) => set("hsnSummary", v)} />
                <ToggleRow title="Bank details" desc="Account and IFSC for payment" checked={draft.bankDetails} onChange={(v) => set("bankDetails", v)} />
                <ToggleRow title="Authorised signatory" desc="Signature block with company seal" checked={draft.signature} onChange={(v) => set("signature", v)} />
                <ToggleRow title={key === "invoice" ? "e-Invoice QR" : "Document QR"} desc={key === "jobcard" ? "Scanned by operators to open the job (R2)" : "Printed in the header"} checked={draft.qr} onChange={(v) => set("qr", v)} />
              </div>
              <div className="py-3">
                <div className="mb-2 text-xs font-semibold text-ink-2">Paper size</div>
                <div className="inline-flex rounded-md border border-line-strong p-0.5" role="group" aria-label="Paper size">
                  {(["A4", "A5"] as const).map((p) => (
                    <button key={p} aria-pressed={draft.paper === p} onClick={() => set("paper", p)} className={cn("h-7 rounded px-4 text-sm font-medium", draft.paper === p ? "bg-primary-600 text-white" : "text-ink-2 hover:bg-surface-3")}>
                      {p}
                    </button>
                  ))}
                </div>
                <div className="mt-3 mb-2 text-xs font-semibold text-ink-2">Copies printed</div>
                <div className="flex flex-wrap gap-2">
                  {COPIES.map((c) => {
                    const on = draft.copies.includes(c);
                    return (
                      <button
                        key={c}
                        aria-pressed={on}
                        onClick={() => set("copies", on ? (draft.copies.length > 1 ? draft.copies.filter((x) => x !== c) : draft.copies) : COPIES.filter((x) => x === c || draft.copies.includes(x)))}
                        className={cn("h-7 rounded-full border px-3 text-xs font-medium", on ? "border-primary-500 bg-primary-50 text-primary-700" : "border-line-strong text-ink-2 hover:bg-surface-3")}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-xs text-ink-3">Original for recipient, Duplicate for transporter, Triplicate for supplier.</p>
              </div>
              <div className="py-3">
                <label htmlFor="tpl-terms" className="mb-2 block text-xs font-semibold text-ink-2">Terms & conditions</label>
                <Textarea id="tpl-terms" value={draft.terms} onChange={(e) => set("terms", e.target.value)} maxLength={400} />
                <div className="mt-1 text-right text-2xs text-ink-3">{draft.terms.length}/400</div>
              </div>
            </div>
          </fieldset>

          {/* Preview */}
          <div className="min-w-0 lg:col-span-2 xl:col-span-1">
            <div className="sticky top-[68px] rounded-xl border border-line bg-surface-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-2.5 rounded-t-xl">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  Live preview
                  {dirty && <Badge tone="warning">Unsaved</Badge>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => toast.success("Sample PDF generated", { description: `${draft.name} · ${draft.paper} · ${draft.copies.length} cop${draft.copies.length > 1 ? "ies" : "y"}` })}>
                  <Download /> Sample PDF
                </Button>
              </div>
              <ScaledPaper paper={draft.paper}>
                <DocPreview t={draft} />
              </ScaledPaper>
            </div>
          </div>
        </div>
      </div>
    </SettingsShell>
  );
}

/* ---------------- Preview ---------------- */

function ScaledPaper({ paper, children }: { paper: "A4" | "A5"; children: React.ReactNode }) {
  const W = paper === "A4" ? 794 : 559;
  const H = paper === "A4" ? 1123 : 794;
  const ref = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0.6);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1, (e.contentRect.width - 32) / W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [W]);
  return (
    <div ref={ref} className="flex justify-center overflow-hidden p-4">
      <div style={{ width: W * scale, height: H * scale }}>
        <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left" }} className="overflow-hidden bg-white shadow-pop">
          {children}
        </div>
      </div>
    </div>
  );
}

function Logo({ colour, size }: { colour: string; size: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <rect width="32" height="32" rx="8" fill={colour} />
      <path d="M8 23V12l5 3.2V12l5 3.2V9h6v14z" fill="#fff" />
      <rect x="19.5" y="11" width="3" height="3" rx=".6" fill="#e8891c" />
    </svg>
  );
}

const SAMPLE: Record<TemplateKey, { title: string; number: string; party: string; partyLabel: string; gstin: string; extra: [string, string][]; lines: { item: string; hsn: string; qty: number; uom: string; rate: number; gst: number }[] }> = {
  invoice: {
    title: "TAX INVOICE", number: "INV/26-27/0414", party: "Deccan Motors Ltd", partyLabel: "Bill to", gstin: "27AABCD1234E1Z2",
    extra: [["Place of supply", "27 - Maharashtra"], ["Customer PO", "DML/PO/26/4471"], ["e-Way bill", "3412 9087 5521"]],
    lines: [
      { item: "Drive Shaft DS-450", hsn: "848310", qty: 300, uom: "nos", rate: 640, gst: 18 },
      { item: "Flange Coupling FC-75", hsn: "848360", qty: 120, uom: "nos", rate: 310, gst: 18 },
    ],
  },
  delivery: {
    title: "DELIVERY CHALLAN", number: "DC/26-27/0288", party: "Sahyadri Tractors Pvt Ltd", partyLabel: "Ship to", gstin: "27AAECS7781K1Z9",
    extra: [["Sales order", "SO-2026-00233"], ["Vehicle", "MH-14-GU-4521"], ["e-Way bill", "3412 9087 6604"]],
    lines: [{ item: "Mounting Bracket MB-220", hsn: "870899", qty: 1000, uom: "nos", rate: 185, gst: 28 }],
  },
  jobwork: {
    title: "JOB-WORK CHALLAN (Rule 55)", number: "JWC/26-27/0034", party: "Shree Ganesh Plating Works", partyLabel: "Job-worker", gstin: "27AAPFS1187C1Z5",
    extra: [["Process", "Zinc plating"], ["Return by", "01-Oct-2027"], ["Nature", "Inputs"]],
    lines: [{ item: "Plated Bracket (unpacked)", hsn: "870899", qty: 1200, uom: "nos", rate: 96, gst: 28 }],
  },
  po: {
    title: "PURCHASE ORDER", number: "PO-2026-00187", party: "Mahalaxmi Steel Traders", partyLabel: "Vendor", gstin: "27AAJFM4410D1Z6",
    extra: [["Delivery by", "10-Oct-2026"], ["Payment terms", "30 days"], ["Deliver to", "Raw Material Stores"]],
    lines: [
      { item: "MS Round Bar EN8 Ø32 mm", hsn: "721420", qty: 3000, uom: "kg", rate: 68.5, gst: 18 },
      { item: "CRCA Sheet 2 mm", hsn: "720917", qty: 2000, uom: "kg", rate: 72, gst: 18 },
    ],
  },
  jobcard: {
    title: "JOB CARD", number: "JC-2026-00415", party: "WO-2026-00141 · Drive Shaft DS-450", partyLabel: "Work order", gstin: "",
    extra: [["Operation", "20 · CNC Turning"], ["Work centre", "CNC Lathe 02"], ["Planned qty", "300 nos"]],
    lines: [],
  },
};

function DocPreview({ t }: { t: DocTemplate }) {
  const profile = useSettings((s) => s.profile);
  const s = SAMPLE[t.key];
  const c = t.brandColour;
  const taxable = s.lines.reduce((a, l) => a + l.qty * l.rate, 0);
  const tax = s.lines.reduce((a, l) => a + (l.qty * l.rate * l.gst) / 100, 0);
  const showMoney = t.key !== "jobcard";
  const small = t.paper === "A5";

  return (
    <div className="flex h-full flex-col">
    <div className="h-1.5 shrink-0" style={{ background: c }} />
    <div className={cn("flex flex-1 flex-col text-ink", small ? "p-6 text-[10.5px]" : "p-10 text-[12px]")}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {t.showLogo && <Logo colour={c} size={small ? 34 : 44} />}
          <div>
            <div className={cn("font-semibold", small ? "text-[13px]" : "text-[16px]")}>{company.name}</div>
            <div className="mt-0.5 max-w-[300px] text-ink-2">{profile.address}</div>
            <div className="mt-0.5 font-mono text-ink-2">GSTIN {company.gstin}</div>
          </div>
        </div>
        <div className="text-right">
          <div className={cn("font-bold tracking-wide", small ? "text-[13px]" : "text-[17px]")} style={{ color: c }}>{s.title}</div>
          <div className="mt-1 font-mono">{s.number}</div>
          <div className="text-ink-2">Date: 02-Oct-2026</div>
          <div className="mt-1 inline-block rounded border px-1.5 text-[10px] font-semibold uppercase" style={{ borderColor: c, color: c }}>{t.copies[0]} for recipient</div>
        </div>
      </div>

      <div className={cn("mt-5 grid gap-4 rounded-md border border-line p-3", t.qr ? "grid-cols-[1fr_1fr_auto]" : "grid-cols-2")}>
        <div>
          <div className="text-[10px] font-semibold tracking-wide text-ink-3 uppercase">{s.partyLabel}</div>
          <div className="mt-0.5 font-semibold">{s.party}</div>
          {s.gstin && <div className="font-mono text-ink-2">GSTIN {s.gstin}</div>}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
          {s.extra.map(([k, v]) => (
            <React.Fragment key={k}>
              <dt className="text-ink-3">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </React.Fragment>
          ))}
        </dl>
        {t.qr && (
          <div className="flex flex-col items-center">
            <QrPlaceholder seed={s.number} size={small ? 64 : 84} />
            <span className="mt-0.5 text-[9px] text-ink-3">{t.key === "invoice" ? "IRN signed QR" : "Scan to open"}</span>
          </div>
        )}
      </div>

      {t.key === "jobcard" ? (
        <table className="mt-5 w-full border-collapse">
          <thead>
            <tr style={{ background: `${c}14` }}>
              {["Date", "Shift", "Operator", "Good", "Reject", "Reason", "Sign"].map((h) => <th key={h} className="border border-line px-2 py-1.5 text-left font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 9 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 7 }).map((__, j) => <td key={j} className="h-7 border border-line" />)}</tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="mt-5 w-full border-collapse">
          <thead>
            <tr className="text-left" style={{ background: `${c}14` }}>
              <th className="px-2 py-1.5 font-semibold">#</th>
              <th className="px-2 py-1.5 font-semibold">Item</th>
              <th className="px-2 py-1.5 font-semibold">HSN</th>
              <th className="px-2 py-1.5 text-right font-semibold">Qty</th>
              {showMoney && <th className="px-2 py-1.5 text-right font-semibold">Rate</th>}
              {showMoney && <th className="px-2 py-1.5 text-right font-semibold">Amount</th>}
            </tr>
          </thead>
          <tbody>
            {s.lines.map((l, i) => (
              <tr key={i} className="border-b border-line">
                <td className="px-2 py-1.5">{i + 1}</td>
                <td className="px-2 py-1.5 font-medium">{l.item}</td>
                <td className="px-2 py-1.5 font-mono">{l.hsn}</td>
                <td className="px-2 py-1.5 text-right">{l.qty.toLocaleString("en-IN")} {l.uom}</td>
                {showMoney && <td className="px-2 py-1.5 text-right">{formatINR(l.rate)}</td>}
                {showMoney && <td className="px-2 py-1.5 text-right">{formatINR(l.qty * l.rate)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showMoney && (
        <div className="mt-3 flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            {t.hsnSummary && (
              <table className="w-full border-collapse text-[10.5px]">
                <thead>
                  <tr className="text-ink-3">
                    <th className="border-b border-line py-1 text-left font-medium">HSN</th>
                    <th className="border-b border-line py-1 text-right font-medium">Taxable</th>
                    <th className="border-b border-line py-1 text-right font-medium">CGST</th>
                    <th className="border-b border-line py-1 text-right font-medium">SGST</th>
                  </tr>
                </thead>
                <tbody>
                  {s.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="py-0.5 font-mono">{l.hsn}</td>
                      <td className="py-0.5 text-right">{formatINR(l.qty * l.rate)}</td>
                      <td className="py-0.5 text-right">{formatINR((l.qty * l.rate * l.gst) / 200)}</td>
                      <td className="py-0.5 text-right">{formatINR((l.qty * l.rate * l.gst) / 200)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <dl className="w-[220px] shrink-0">
            <div className="flex justify-between py-0.5"><dt className="text-ink-2">Taxable value</dt><dd>{formatINR(taxable)}</dd></div>
            <div className="flex justify-between py-0.5"><dt className="text-ink-2">GST</dt><dd>{formatINR(tax)}</dd></div>
            <div className="mt-1 flex justify-between border-t-2 pt-1 font-semibold" style={{ borderColor: c }}><dt>Total</dt><dd>{formatINR(taxable + tax)}</dd></div>
          </dl>
        </div>
      )}

      <div className="mt-auto">
        <div className="grid grid-cols-2 items-end gap-6 border-t border-line pt-3">
          <div className="space-y-2">
            {t.bankDetails && (
              <div>
                <div className="text-[10px] font-semibold tracking-wide text-ink-3 uppercase">Bank details</div>
                <div>{profile.bankName}</div>
                <div className="font-mono">A/c {profile.bankAccount} · IFSC {profile.ifsc}</div>
              </div>
            )}
            {t.terms && (
              <div>
                <div className="text-[10px] font-semibold tracking-wide text-ink-3 uppercase">Terms</div>
                <div className="text-ink-2">{t.terms}</div>
              </div>
            )}
          </div>
          {t.signature && (
            <div className="text-right">
              <div className="text-ink-2">For {company.name}</div>
              <div className="ml-auto mt-8 w-40 border-t border-ink-3 pt-1 text-ink-3">Authorised signatory</div>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between text-[9.5px] text-ink-3">
          <span className="flex items-center gap-1"><Package className="size-3" /> Generated by Factory ERP</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    </div>
    </div>
  );
}
