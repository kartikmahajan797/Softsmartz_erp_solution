"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Dialog } from "@/components/ui/overlay";
import { Mono } from "@/components/manufacturing/common";
import { itemById, operators, reasonCodes } from "@/lib/data/masters";
import { useApp, useRole } from "@/lib/store/app";
import { itemName, operatorName, type ScrapEntry, useMfg, wcName } from "@/lib/store/manufacturing";
import { cn, formatDate, formatINR, TODAY } from "@/lib/utils";

const reasonName = (c: string) => reasonCodes.find((r) => r.code === c)?.name ?? c;

export default function ScrapPage() {
  const scrap = useMfg((s) => s.scrap);
  const wos = useMfg((s) => s.wos);
  const wcs = useMfg((s) => s.wcs);
  const lang = useApp((s) => s.lang);
  const [open, setOpen] = React.useState(false);

  const value = (s: ScrapEntry) => s.qty * itemById(s.itemId).standardCost;

  const columns: Column<ScrapEntry>[] = [
    { key: "number", header: "Entry", value: (s) => s.number, cell: (s) => <Mono>{s.number}</Mono> },
    { key: "date", header: "Date", value: (s) => s.date, cell: (s) => formatDate(s.date) },
    { key: "type", header: "Type", value: (s) => s.type, cell: (s) => <Badge tone={s.type === "scrap" ? "danger" : "warning"}>{s.type === "scrap" ? "Scrap" : "Rework"}</Badge> },
    {
      key: "item",
      header: "Item",
      className: "py-1.5",
      value: (s) => itemById(s.itemId).name,
      cell: (s) => (
        <div>
          <div className="font-medium">{itemName(s.itemId, lang)}</div>
          <div className="font-mono text-2xs text-ink-3">{wos.find((w) => w.id === s.woId)?.number} · {s.jcNumber ?? "—"}</div>
        </div>
      ),
    },
    { key: "qty", header: "Qty", align: "right", value: (s) => s.qty, cell: (s) => `${s.qty} ${itemById(s.itemId).uom}`, total: (r) => r.reduce((a, s) => a + s.qty, 0) },
    { key: "reason", header: "Reason", value: (s) => s.reason, cell: (s) => <span><span className="font-mono text-xs text-ink-3">{s.reason}</span> {reasonName(s.reason)}</span> },
    { key: "wc", header: "Work centre", value: (s) => wcName(s.wcId, wcs), cell: (s) => wcName(s.wcId, wcs, lang) },
    { key: "op", header: "Operator", value: (s) => operatorName(s.operatorId), cell: (s) => <span className="text-ink-2">{operatorName(s.operatorId)}</span> },
    { key: "val", header: "Value", align: "right", cost: true, value, cell: (s) => formatINR(value(s)), total: (r) => formatINR(r.reduce((a, s) => a + value(s), 0)) },
    { key: "note", header: "Note", value: (s) => s.note ?? "", cell: (s) => <span className="line-clamp-1 max-w-56 text-xs text-ink-2">{s.note ?? ""}</span> },
  ];

  return (
    <>
      <ListPage
        title="Scrap & rework"
        crumbs={[{ label: "Manufacturing", href: "/manufacturing/work-orders" }, { label: "Scrap & rework" }]}
        rows={scrap}
        columns={columns}
        search={(s) => `${s.number} ${itemById(s.itemId).name} ${s.jcNumber ?? ""} ${reasonName(s.reason)} ${s.note ?? ""}`}
        placeholder="Search entry, item, job card, reason…"
        onNew={() => setOpen(true)}
        newLabel="New entry"
        filters={[
          { key: "scrap", label: "Scrap", group: "t", test: (s) => s.type === "scrap" },
          { key: "rework", label: "Rework", group: "t", test: (s) => s.type === "rework" },
          { key: "today", label: "Today", group: "d", test: (s) => s.date === TODAY },
        ]}
        groups={[
          { key: "reason", label: "Reason", by: (s) => reasonName(s.reason) },
          { key: "wc", label: "Work centre", by: (s) => wcName(s.wcId, wcs) },
          { key: "item", label: "Item", by: (s) => itemById(s.itemId).name },
        ]}
      />
      {open && <NewScrapDialog open onClose={() => setOpen(false)} />}
    </>
  );
}

function NewScrapDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const wos = useMfg((s) => s.wos);
  const jcs = useMfg((s) => s.jcs);
  const role = useRole();
  const activeWos = wos.filter((w) => ["released", "in_progress"].includes(w.status));
  const [f, setF] = React.useState({ type: "scrap" as "scrap" | "rework", woId: "", jc: "", qty: 0, reason: "", operatorId: "", note: "" });
  const [err, setErr] = React.useState<Record<string, string>>({});

  const wo = wos.find((w) => w.id === f.woId);
  const woJcs = jcs.filter((j) => j.woId === f.woId && j.wcId !== "jw");

  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.woId) e.wo = "Select a work order";
    if (!f.jc) e.jc = "Select the operation";
    if (!(f.qty > 0)) e.qty = "Quantity must be more than 0";
    else if (wo && f.qty > wo.qty) e.qty = `Cannot exceed order qty ${wo.qty}`;
    if (!f.reason) e.reason = "Select a reason code";
    setErr(e);
    if (Object.keys(e).length) return;
    const jc = jcs.find((j) => j.number === f.jc)!;
    const n = useMfg.getState().addScrap({ date: TODAY, type: f.type, woId: f.woId, jcNumber: f.jc, itemId: wo!.itemId, qty: f.qty, reason: f.reason, wcId: jc.wcId, operatorId: f.operatorId || undefined, note: f.note || undefined });
    useMfg.getState().woLog(f.woId, role.user, "status", `${f.type === "scrap" ? "Scrap" : "Rework"} ${n}: ${f.qty} nos · ${reasonName(f.reason)}`);
    toast.success(`${n} recorded`, { description: f.type === "scrap" ? "Posted to Scrap Yard at valuation · cost entry on WO" : "Rework queued on the job card" });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="New scrap / rework entry"
      description="Entries are append-only. A wrong entry is corrected with a reversing entry."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}><Plus /> Record</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex rounded-md border border-line-strong p-0.5 text-sm" role="group" aria-label="Entry type">
          {(["scrap", "rework"] as const).map((t) => (
            <button key={t} aria-pressed={f.type === t} onClick={() => setF({ ...f, type: t })} className={cn("h-7 flex-1 rounded font-medium", f.type === t ? "bg-primary-600 text-white" : "text-ink-2 hover:bg-surface-3")}>
              {t === "scrap" ? "Scrap" : "Rework"}
            </button>
          ))}
        </div>
        <Field label="Work order" layout="vertical" required error={err.wo} htmlFor="wo">
          <Select id="wo" aria-invalid={!!err.wo} value={f.woId} onChange={(e) => setF({ ...f, woId: e.target.value, jc: "" })}>
            <option value="">Select…</option>
            {activeWos.map((w) => <option key={w.id} value={w.id}>{w.number} — {itemById(w.itemId).name}</option>)}
          </Select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Operation" layout="vertical" required error={err.jc} htmlFor="jc">
            <Select id="jc" aria-invalid={!!err.jc} value={f.jc} disabled={!f.woId} onChange={(e) => setF({ ...f, jc: e.target.value })}>
              <option value="">Select…</option>
              {woJcs.map((j) => <option key={j.id} value={j.number}>{j.seq} · {j.number}</option>)}
            </Select>
          </Field>
          <Field label="Quantity" layout="vertical" required error={err.qty} htmlFor="qty">
            <Input id="qty" type="number" min={0} aria-invalid={!!err.qty} value={f.qty || ""} onChange={(e) => setF({ ...f, qty: Number(e.target.value) })} />
          </Field>
        </div>
        <Field label="Reason" layout="vertical" required error={err.reason} htmlFor="rsn">
          <Select id="rsn" aria-invalid={!!err.reason} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })}>
            <option value="">Select…</option>
            {reasonCodes.filter((r) => r.kind === "reject").map((r) => <option key={r.code} value={r.code}>{r.code} — {r.name}</option>)}
          </Select>
        </Field>
        <Field label="Operator" layout="vertical" htmlFor="opr">
          <Select id="opr" value={f.operatorId} onChange={(e) => setF({ ...f, operatorId: e.target.value })}>
            <option value="">Not specified</option>
            {operators.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        </Field>
        <Field label="Note" layout="vertical" htmlFor="note">
          <Textarea id="note" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="What happened?" />
        </Field>
      </div>
    </Dialog>
  );
}
