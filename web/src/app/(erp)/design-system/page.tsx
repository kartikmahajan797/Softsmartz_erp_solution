"use client";

import * as React from "react";
import { Bell, Check, Factory, Plus, Printer, Search, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/erp/control-panel";
import { Card, StatusBar } from "@/components/erp/form-view";
import { DataTable } from "@/components/erp/data-table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button, Kbd } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Dialog, Sheet, Tip } from "@/components/ui/overlay";
import { formatINR } from "@/lib/utils";

const colours: { group: string; tokens: [string, string][] }[] = [
  { group: "Brand", tokens: [["brand-900", "Sidebar"], ["primary-600", "Primary action"], ["primary-700", "Hover / links"], ["primary-50", "Selection tint"], ["accent-500", "Saffron accent (sparingly)"]] },
  { group: "Neutrals", tokens: [["bg", "App background"], ["surface", "Cards, sheets"], ["surface-3", "Hover, tracks"], ["border", "Hairlines"], ["border-strong", "Controls"], ["text", "Primary text"], ["text-2", "Secondary"], ["text-3", "Muted"]] },
  { group: "Status (meaning only)", tokens: [["success", "Done, running, posted"], ["warning", "Waiting, due soon"], ["danger", "Failed, late, down"], ["info", "Confirmed, open"], ["progress", "In progress, partial"], ["neutral", "Draft, idle, closed"]] },
];

export default function DesignSystemPage() {
  const [dialog, setDialog] = React.useState(false);
  const [sheet, setSheet] = React.useState(false);
  return (
    <div>
      <div className="border-b border-line bg-surface px-4 py-2.5 sm:px-6">
        <Breadcrumbs items={[{ label: "Design system" }]} />
      </div>
      <div className="mx-auto max-w-[1180px] space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Forge — Factory ERP design system</h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-2">
            Petrol-teal brand on cool graphite neutrals. Dense, calm, keyboard-friendly. Colour carries meaning only through status tokens; the saffron accent is reserved for the logo and rare emphasis. IBM Plex Sans with Devanagari for Hindi, Plex Mono for codes and document numbers.
          </p>
        </div>

        <Card title="Colour tokens">
          <div className="grid gap-6 md:grid-cols-3">
            {colours.map((g) => (
              <div key={g.group}>
                <div className="mb-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">{g.group}</div>
                <ul className="space-y-1.5">
                  {g.tokens.map(([t, use]) => (
                    <li key={t} className="flex items-center gap-3">
                      <span className="size-8 rounded-md border border-line" style={{ background: `var(--${t})` }} />
                      <span>
                        <span className="block font-mono text-xs">--{t}</span>
                        <span className="block text-xs text-ink-3">{use}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Typography">
            <div className="space-y-2">
              <div className="text-2xl font-semibold tracking-tight">22 / 600 — Document title</div>
              <div className="text-xl font-semibold">18 / 600 — Page heading</div>
              <div className="text-base font-semibold">14 / 600 — Section, card title</div>
              <div className="text-sm">13 / 400 — Body, tables, forms (default density)</div>
              <div className="text-xs text-ink-3">12 / 400 — Meta, hints, captions</div>
              <div className="font-mono text-[13px]">SO-2026-00231 · 27AAKCS4821M1Z5 — Plex Mono for codes</div>
              <div className="text-sm">ड्राइव शाफ्ट DS-450 — Devanagari (Plex Sans Devanagari)</div>
              <div className="tabular text-sm">₹12,34,567.00 — tabular numerals, Indian grouping</div>
            </div>
          </Card>
          <Card title="Spacing, radius, elevation">
            <div className="space-y-4 text-sm">
              <div className="flex items-end gap-2">
                {[4, 8, 12, 16, 24, 32].map((n) => (
                  <div key={n} className="text-center">
                    <div className="bg-primary-100" style={{ width: n, height: n }} />
                    <div className="mt-1 text-2xs text-ink-3">{n}</div>
                  </div>
                ))}
                <span className="ml-2 text-xs text-ink-3">4-px grid</span>
              </div>
              <div className="flex gap-3">
                <div className="flex h-12 w-20 items-center justify-center rounded border border-line text-xs">4 · chips</div>
                <div className="flex h-12 w-20 items-center justify-center rounded-md border border-line text-xs">6 · controls</div>
                <div className="flex h-12 w-20 items-center justify-center rounded-xl border border-line text-xs">12 · cards</div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-12 w-24 items-center justify-center rounded-lg bg-surface text-xs shadow-xs">shadow-xs</div>
                <div className="flex h-12 w-24 items-center justify-center rounded-lg bg-surface text-xs shadow-sm">shadow-sm</div>
                <div className="flex h-12 w-24 items-center justify-center rounded-lg bg-surface text-xs shadow-pop">shadow-pop</div>
              </div>
              <p className="text-xs text-ink-3">Control heights: 24 (xs) · 28 (sm) · 32 (md, default) · 40 (lg). Shop-floor targets ≥ 56.</p>
            </div>
          </Card>
        </div>

        <Card title="Buttons">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary"><Check /> Confirm</Button>
            <Button>Save</Button>
            <Button variant="subtle"><Plus /> Create PR</Button>
            <Button variant="ghost"><Printer /> Print</Button>
            <Button variant="danger"><Trash2 /> Cancel order</Button>
            <Button variant="link">View details</Button>
            <Button variant="primary" disabled>Disabled</Button>
            <Tip label="Icon button with tooltip"><Button size="icon" aria-label="Notifications"><Bell /></Button></Tip>
            <Button size="sm" variant="primary">Small</Button>
            <Button size="lg" variant="primary"><Truck /> Large</Button>
            <span className="ml-2 text-xs text-ink-3">Shortcuts <Kbd>⌘K</Kbd> search · <Kbd>/</Kbd> filter list · <Kbd>Alt</Kbd>+<Kbd>A</Kbd> apps</span>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Form controls">
            <div className="space-y-3">
              <Field label="Customer" required><Select defaultValue=""><option value="">Select customer…</option><option>Deccan Motors Ltd</option></Select></Field>
              <Field label="Customer PO" hint="As printed on the customer's purchase order"><Input placeholder="DML/PO/26/4471" /></Field>
              <Field label="Delivery date" required error="Cannot be before the order date"><Input type="date" aria-invalid defaultValue="2026-09-01" /></Field>
              <Field label="Notes"><Textarea placeholder="Packing, delivery instructions…" /></Field>
              <Field label="Batch tracked"><label className="flex items-center gap-2 pt-1.5 text-sm"><Checkbox defaultChecked /> Track by batch / lot</label></Field>
            </div>
          </Card>
          <Card title="Status and workflow">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {["draft", "pending_approval", "confirmed", "in_progress", "partially_delivered", "completed", "posted", "irn_failed", "overdue", "running", "idle", "down", "cancelled"].map((s) => (
                  <StatusBadge key={s} status={s} />
                ))}
              </div>
              <StatusBar steps={[{ key: "d", label: "Draft" }, { key: "c", label: "Confirmed" }, { key: "p", label: "Partly delivered" }, { key: "x", label: "Delivered" }]} current="p" />
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="brand" dot={false}>MSME</Badge>
                <Badge tone="info" dot={false}>IGST</Badge>
                <Badge tone="warning">Due in 6d</Badge>
                <Badge tone="danger">2d late</Badge>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setDialog(true)}>Open dialog</Button>
                <Button onClick={() => setSheet(true)}>Open side panel</Button>
                <Button onClick={() => toast.success("Delivery DC/26-27/0389 posted", { description: "Stock moved out of Finished Goods Stores" })}>Toast</Button>
              </div>
            </div>
          </Card>
        </div>

        <Card title="Data table" bodyClassName="p-0">
          <DataTable
            rows={[
              { id: "1", item: "Drive Shaft DS-450", code: "FG-DS-450", qty: 600, value: 384000, status: "partially_delivered" },
              { id: "2", item: "Mounting Bracket MB-220", code: "FG-MB-220", qty: 2000, value: 370000, status: "confirmed" },
              { id: "3", item: "Pulley Assembly PA-110", code: "FG-PA-110", qty: 120, value: 57000, status: "draft" },
            ]}
            columns={[
              { key: "item", header: "Item", value: (r) => r.item, cell: (r) => <div><div className="font-medium">{r.item}</div><div className="font-mono text-2xs text-ink-3">{r.code}</div></div> },
              { key: "qty", header: "Qty", align: "right", value: (r) => r.qty, cell: (r) => r.qty.toLocaleString("en-IN"), total: (rows) => rows.reduce((a, r) => a + r.qty, 0).toLocaleString("en-IN") },
              { key: "value", header: "Value", align: "right", value: (r) => r.value, cell: (r) => formatINR(r.value), total: (rows) => formatINR(rows.reduce((a, r) => a + r.value, 0)) },
              { key: "status", header: "Status", value: (r) => r.status, cell: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        </Card>

        <Card title="Patterns used across modules">
          <ul className="grid gap-x-8 gap-y-2 text-sm text-ink-2 md:grid-cols-2">
            <li><b className="text-ink">Control panel</b> — breadcrumbs, New, search with facet chips, Filters / Group by / Favourites, pager, list ↔ kanban (Odoo).</li>
            <li><b className="text-ink">Form sheet</b> — action bar left, status bar right, smart buttons, two-column fields, notebook tabs, chatter with audit trail (Odoo).</li>
            <li><b className="text-ink">Document preview</b> — invoices rendered as the printed GST document beside actions (Zoho).</li>
            <li><b className="text-ink">Side panel</b> — quick view of a record without leaving the list (Zoho).</li>
            <li><b className="text-ink">App launcher</b> — module grid with Alt+A (Odoo); sidebar with grouped sub-menus (Zoho).</li>
            <li><b className="text-ink">Field rules</b> — cost, rate and margin columns disappear for roles without cost access.</li>
          </ul>
        </Card>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog} title="Post goods receipt?" description="Posting is final. Corrections need a return document." size="sm" footer={<><Button onClick={() => setDialog(false)}>Cancel</Button><Button variant="primary" onClick={() => { setDialog(false); toast.success("GRN posted"); }}>Post GRN</Button></>}>
        <p className="text-sm text-ink-2">2,400 kg MS Round Bar EN8 Ø32 into Raw Material Stores, batch B-2610-002.</p>
      </Dialog>
      <Sheet open={sheet} onOpenChange={setSheet} title={<span className="flex items-center gap-2"><Factory className="size-4 text-primary-600" /> CNC Lathe 01</span>}>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-ink-3">Status</span><StatusBadge status="running" /></div>
          <div className="flex justify-between"><span className="text-ink-3">Current job</span><span className="font-mono">JC-2026-00412</span></div>
          <div className="flex justify-between"><span className="text-ink-3">Operator</span><span>Ramesh Yadav</span></div>
          <div className="flex items-center gap-2 rounded-md border border-line px-2 py-1.5 text-ink-3"><Search className="size-4" /> Side panels keep list context.</div>
        </div>
      </Sheet>
    </div>
  );
}
