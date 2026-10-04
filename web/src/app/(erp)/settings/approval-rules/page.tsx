"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { Dialog } from "@/components/ui/overlay";
import { ROLES, type RoleKey, useRole } from "@/lib/store/app";
import { type ApprovalRule, useSettings } from "@/lib/store/settings";
import { cn, formatINR } from "@/lib/utils";

const DOC_TYPES = ["Purchase order", "Sales order", "Sales order / quotation", "Stock adjustment", "Stock count variance", "Vendor payment"];
const COND_LABEL: Record<ApprovalRule["condition"], string> = {
  amount_gt: "Amount greater than",
  discount_gt: "Discount greater than",
  credit_exceeded: "Customer credit limit exceeded",
  any: "Always (every document)",
};

function describe(r: ApprovalRule) {
  if (r.condition === "amount_gt") return `Amount > ${formatINR(r.threshold)}`;
  if (r.condition === "discount_gt") return `Discount > ${r.threshold}%`;
  return COND_LABEL[r.condition];
}

export default function ApprovalRulesPage() {
  const role = useRole();
  const rules = useSettings((s) => s.rules);
  const upsert = useSettings((s) => s.upsertRule);
  const del = useSettings((s) => s.deleteRule);
  const [edit, setEdit] = React.useState<ApprovalRule | null>(null);
  const canEdit = role.key === "owner";

  return (
    <SettingsShell
      title="Approval rules"
      actions={canEdit && (
        <Button variant="primary" onClick={() => setEdit({ id: `r${Date.now()}`, docType: DOC_TYPES[0], condition: "amount_gt", threshold: 100000, approver: "owner", creatorCannotApprove: true, active: true })}>
          <Plus /> New rule
        </Button>
      )}
    >
      <div className="mx-auto max-w-5xl">
        <p className="mb-3 text-sm text-ink-2">Documents matching a rule wait in <span className="font-medium">Pending approval</span> until the approver decides (FR-PL-04). The first matching rule applies.</p>
        <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-xs">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-surface-2 text-xs text-ink-2">
              <tr>{["Document", "Condition", "Approver", "Creator can't approve", "Active", ""].map((h) => <th key={h} className="px-4 py-2 text-left font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className={cn("border-t border-line", !r.active && "text-ink-3")}>
                  <td className="px-4 py-2.5 font-medium">{r.docType}</td>
                  <td className="px-4 py-2.5">{describe(r)}</td>
                  <td className="px-4 py-2.5"><Badge tone="brand" dot={false}>{ROLES[r.approver].label}</Badge></td>
                  <td className="px-4 py-2.5">{r.creatorCannotApprove ? <Badge tone="success">Enforced</Badge> : <Badge tone="warning">Off</Badge>}</td>
                  <td className="px-4 py-2.5">
                    <Checkbox aria-label={`Rule ${r.docType} active`} checked={r.active} disabled={!canEdit} onChange={() => { upsert({ ...r, active: !r.active }); toast(r.active ? "Rule paused" : "Rule activated"); }} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {canEdit && (
                      <div className="flex justify-end gap-1">
                        <Button size="icon-sm" variant="ghost" aria-label="Edit rule" onClick={() => setEdit(r)}><Pencil /></Button>
                        <Button size="icon-sm" variant="ghost" aria-label="Delete rule" onClick={() => { del(r.id); toast("Rule deleted", { action: { label: "Undo", onClick: () => upsert(r) } }); }}><Trash2 /></Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <RuleDialog rule={edit} onClose={() => setEdit(null)} onSave={(r) => { upsert(r); toast.success("Rule saved", { description: `${r.docType} · ${describe(r)}` }); setEdit(null); }} />
    </SettingsShell>
  );
}

function RuleDialog({ rule, onClose, onSave }: { rule: ApprovalRule | null; onClose: () => void; onSave: (r: ApprovalRule) => void }) {
  const [r, setR] = React.useState<ApprovalRule | null>(rule);
  const [err, setErr] = React.useState("");
  const [prevRule, setPrevRule] = React.useState(rule);
  if (rule !== prevRule) {
    setPrevRule(rule);
    setR(rule);
    setErr("");
  }
  if (!r) return null;
  const needsThreshold = r.condition === "amount_gt" || r.condition === "discount_gt";
  return (
    <Dialog
      open={!!rule}
      onOpenChange={(o) => !o && onClose()}
      title={rule && useSettings.getState().rules.some((x) => x.id === rule.id) ? "Edit approval rule" : "New approval rule"}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => {
            if (needsThreshold && r.threshold <= 0) return setErr("Threshold must be greater than zero");
            if (r.condition === "discount_gt" && r.threshold >= 100) return setErr("Discount threshold must be below 100%");
            onSave(r);
          }}>Save rule</Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Document type" layout="vertical" htmlFor="ar-d">
          <Select id="ar-d" value={r.docType} onChange={(e) => setR({ ...r, docType: e.target.value })}>
            {DOC_TYPES.map((d) => <option key={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label="Condition" layout="vertical" htmlFor="ar-c">
          <Select id="ar-c" value={r.condition} onChange={(e) => setR({ ...r, condition: e.target.value as ApprovalRule["condition"] })}>
            {Object.entries(COND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        </Field>
        {needsThreshold && (
          <Field label={r.condition === "amount_gt" ? "Amount (₹)" : "Discount (%)"} required layout="vertical" htmlFor="ar-t">
            <Input id="ar-t" type="number" className="text-right" value={r.threshold || ""} onChange={(e) => setR({ ...r, threshold: Number(e.target.value) })} />
          </Field>
        )}
        <Field label="Approver role" layout="vertical" htmlFor="ar-a">
          <Select id="ar-a" value={r.approver} onChange={(e) => setR({ ...r, approver: e.target.value as RoleKey })}>
            {(Object.keys(ROLES) as RoleKey[]).filter((k) => ROLES[k].approves).map((k) => <option key={k} value={k}>{ROLES[k].label}</option>)}
          </Select>
        </Field>
      </div>
      <label className="mt-4 flex items-start gap-2 text-sm">
        <Checkbox className="mt-0.5" checked={r.creatorCannotApprove} onChange={(e) => setR({ ...r, creatorCannotApprove: e.target.checked })} />
        <span>Creator cannot approve their own document <span className="block text-xs text-ink-3">Segregation of duties — recommended for payments and stock adjustments.</span></span>
      </label>
      {err && <p className="mt-3 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{err}</p>}
    </Dialog>
  );
}
