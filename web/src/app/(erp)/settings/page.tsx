"use client";

import * as React from "react";
import { Lock, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { Section, SettingsShell } from "@/components/settings/settings-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { useRole } from "@/lib/store/app";
import { type CompanyProfile, useSettings } from "@/lib/store/settings";

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SWATCHES = ["#0d7377", "#2459c2", "#b45309", "#15803d", "#7c3aed", "#be123c", "#17202a"];

export default function CompanySettingsPage() {
  const role = useRole();
  const saved = useSettings((s) => s.profile);
  const series = useSettings((s) => s.series);
  const save = useSettings((s) => s.saveProfile);
  const updateSeries = useSettings((s) => s.updateSeries);
  const [p, setP] = React.useState<CompanyProfile>(saved);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const dirty = JSON.stringify(p) !== JSON.stringify(saved);
  const canEdit = role.key === "owner";

  const set = <K extends keyof CompanyProfile>(k: K, v: CompanyProfile[K]) => setP((x) => ({ ...x, [k]: v }));

  const submit = () => {
    const e: Record<string, string> = {};
    if (!p.legalName.trim()) e.legalName = "Required";
    if (!GSTIN_RE.test(p.gstin)) e.gstin = "Invalid GSTIN format (15 characters, e.g. 27AAKCS4821M1Z5)";
    else if (p.gstin.slice(0, 2) !== p.stateCode) e.gstin = `First two digits must match state code ${p.stateCode}`;
    else if (p.gstin.slice(2, 12) !== p.pan) e.gstin = "Characters 3-12 must equal the PAN";
    if (!PAN_RE.test(p.pan)) e.pan = "Invalid PAN format";
    if (!IFSC_RE.test(p.ifsc)) e.ifsc = "Invalid IFSC";
    if (!/^\S+@\S+\.\S+$/.test(p.email)) e.email = "Invalid email";
    setErrors(e);
    if (Object.keys(e).length) return toast.error("Please fix the highlighted fields");
    save(p);
    toast.success("Company settings saved", { description: "Recorded in the audit log" });
  };

  return (
    <SettingsShell
      title="Company"
      actions={
        canEdit && (
          <>
            {dirty && <Button onClick={() => { setP(saved); setErrors({}); }}>Discard</Button>}
            <Button variant="primary" onClick={submit} disabled={!dirty}><Save /> Save</Button>
          </>
        )
      }
    >
      <div className="mx-auto max-w-5xl">
        {!canEdit && <p className="mb-4 rounded-lg bg-surface-3 px-4 py-2.5 text-sm text-ink-2">Only the Owner / Admin can change company settings. You are viewing them read-only.</p>}
        <fieldset disabled={!canEdit}>
          <Section title="Legal entity" desc="Used on invoices, challans and e-invoice requests.">
            <div className="grid gap-x-10 gap-y-3 lg:grid-cols-2">
              <Field label="Legal name" required error={errors.legalName} htmlFor="ln"><Input id="ln" aria-invalid={!!errors.legalName} value={p.legalName} onChange={(e) => set("legalName", e.target.value)} /></Field>
              <Field label="Trade name" htmlFor="tn"><Input id="tn" value={p.tradeName} onChange={(e) => set("tradeName", e.target.value)} /></Field>
              <Field label="GSTIN" required error={errors.gstin} htmlFor="gst" hint="Validated with the GSP on save"><Input id="gst" className="font-mono uppercase" aria-invalid={!!errors.gstin} value={p.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase())} maxLength={15} /></Field>
              <Field label="PAN" required error={errors.pan} htmlFor="pan"><Input id="pan" className="font-mono uppercase" aria-invalid={!!errors.pan} value={p.pan} onChange={(e) => set("pan", e.target.value.toUpperCase())} maxLength={10} /></Field>
              <Field label="State" htmlFor="st">
                <Select id="st" value={`${p.stateCode}|${p.state}`} onChange={(e) => { const [code, name] = e.target.value.split("|"); setP((x) => ({ ...x, stateCode: code, state: name })); }}>
                  {[["27", "Maharashtra"], ["29", "Karnataka"], ["24", "Gujarat"], ["06", "Haryana"], ["33", "Tamil Nadu"], ["09", "Uttar Pradesh"]].map(([c, n]) => (
                    <option key={c} value={`${c}|${n}`}>{c} - {n}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Address" htmlFor="ad"><Textarea id="ad" className="min-h-16" value={p.address} onChange={(e) => set("address", e.target.value)} /></Field>
              <Field label="Email" error={errors.email} htmlFor="em"><Input id="em" type="email" value={p.email} onChange={(e) => set("email", e.target.value)} /></Field>
              <Field label="Phone" htmlFor="ph"><Input id="ph" value={p.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            </div>
          </Section>

          <Section title="GST and financial year" desc="Drives number series, HSN digit rules and e-invoicing.">
            <div className="grid gap-x-10 gap-y-3 lg:grid-cols-2">
              <Field label="FY starts in" htmlFor="fy" hint="Indian FY: April to March">
                <Select id="fy" value={p.fyStartMonth} onChange={(e) => set("fyStartMonth", Number(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </Select>
              </Field>
              <Field label="Turnover band" htmlFor="tb" hint="Above ₹5 Cr: 6-digit HSN, half-yearly ITC-04">
                <Select id="tb" value={p.turnoverBand} onChange={(e) => set("turnoverBand", e.target.value)}>
                  <option>Up to ₹5 Cr</option>
                  <option>₹5-50 Cr</option>
                  <option>Above ₹50 Cr</option>
                </Select>
              </Field>
              <Field label="e-Invoicing">
                <div className="flex items-center gap-2 pt-1">
                  <Badge tone="success">Applicable</Badge>
                  <span className="flex items-center gap-1 text-xs text-ink-3"><Lock className="size-3" /> Sticky — once aggregate turnover crossed ₹5 Cr it stays on</span>
                </div>
              </Field>
              <Field label="GSP" hint="Credentials stored encrypted; managed by support">
                <div className="pt-1.5 text-sm">Connected · production</div>
              </Field>
            </div>
          </Section>

          <Section title="Number series" desc={`Per document type for FY 2026-27. GST invoice numbers must be unique within the financial year (max 16 characters).`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="text-xs text-ink-3">
                  <tr className="border-b border-line">
                    <th className="py-2 text-left font-medium">Document</th>
                    <th className="py-2 text-left font-medium">Prefix</th>
                    <th className="py-2 text-right font-medium">Next number</th>
                    <th className="py-2 text-right font-medium">Digits</th>
                    <th className="py-2 pl-4 text-left font-medium">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((s) => {
                    const preview = `${s.prefix}${String(s.next).padStart(s.padding, "0")}`;
                    const tooLong = preview.length > 16;
                    return (
                      <tr key={s.id} className="border-b border-line last:border-0">
                        <td className="py-1.5 font-medium">{s.docType}</td>
                        <td className="py-1.5"><Input className="h-7 w-36 font-mono text-xs" aria-label={`${s.docType} prefix`} value={s.prefix} onChange={(e) => updateSeries(s.id, { prefix: e.target.value })} /></td>
                        <td className="py-1.5 text-right"><Input className="ml-auto h-7 w-24 text-right" type="number" aria-label={`${s.docType} next number`} value={s.next} onChange={(e) => updateSeries(s.id, { next: Number(e.target.value) })} /></td>
                        <td className="tabular py-1.5 text-right">{s.padding}</td>
                        <td className="py-1.5 pl-4">
                          <span className="font-mono text-xs">{preview}</span>
                          {tooLong && <Badge tone="danger" className="ml-2">&gt; 16 chars</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Document branding" desc="Applied to invoice, challan, PO and job card templates (FR-PL-07).">
            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
              <div className="space-y-3">
                <Field label="Logo">
                  <div className="flex items-center gap-3">
                    <div className="flex size-14 items-center justify-center rounded-lg text-lg font-bold text-white" style={{ background: p.brandColour }}>SP</div>
                    <Button size="sm" onClick={() => toast("Logo upload", { description: "PNG or SVG, max 1 MB · stored in S3" })}><Upload /> Upload logo</Button>
                  </div>
                </Field>
                <Field label="Accent colour">
                  <div className="flex flex-wrap gap-2 pt-1" role="radiogroup" aria-label="Accent colour">
                    {SWATCHES.map((c) => (
                      <button key={c} role="radio" aria-checked={p.brandColour === c} aria-label={c} onClick={() => set("brandColour", c)} className="size-7 rounded-full ring-offset-2 aria-checked:ring-2 aria-checked:ring-primary-500" style={{ background: c }} />
                    ))}
                  </div>
                </Field>
                <Field label="Bank" htmlFor="bk"><Input id="bk" value={p.bankName} onChange={(e) => set("bankName", e.target.value)} /></Field>
                <Field label="Account no." htmlFor="ac"><Input id="ac" className="font-mono" value={p.bankAccount} onChange={(e) => set("bankAccount", e.target.value)} /></Field>
                <Field label="IFSC" error={errors.ifsc} htmlFor="ifsc"><Input id="ifsc" className="font-mono uppercase" aria-invalid={!!errors.ifsc} value={p.ifsc} onChange={(e) => set("ifsc", e.target.value.toUpperCase())} /></Field>
                <Field label="Invoice footer" htmlFor="ft"><Textarea id="ft" className="min-h-14" value={p.invoiceFooter} onChange={(e) => set("invoiceFooter", e.target.value)} /></Field>
              </div>
              <div className="overflow-hidden rounded-lg border border-line shadow-xs" aria-label="Template preview">
                <div className="h-1.5" style={{ background: p.brandColour }} />
                <div className="space-y-2 p-4 text-[11px]">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded text-[10px] font-bold text-white" style={{ background: p.brandColour }}>SP</div>
                    <div className="font-semibold">{p.tradeName}</div>
                    <div className="ml-auto font-semibold">TAX INVOICE</div>
                  </div>
                  <div className="h-px bg-line" />
                  {[0, 1, 2].map((i) => <div key={i} className="h-2 rounded bg-surface-3" style={{ width: `${90 - i * 18}%` }} />)}
                  <div className="h-px bg-line" />
                  <div className="flex justify-end"><div className="h-3 w-20 rounded" style={{ background: `${p.brandColour}22` }} /></div>
                  <p className="pt-2 text-[10px] text-ink-3">{p.invoiceFooter}</p>
                </div>
              </div>
            </div>
          </Section>
        </fieldset>
      </div>
    </SettingsShell>
  );
}
