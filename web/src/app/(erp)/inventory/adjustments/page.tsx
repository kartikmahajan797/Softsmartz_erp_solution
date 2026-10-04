"use client";

import * as React from "react";
import { ArrowLeftRight, ArrowRight, Check, Plus, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, ReadValue, Select, Textarea } from "@/components/ui/form";
import { Dialog, Sheet } from "@/components/ui/overlay";
import { ItemCell, SignedQty, WarehouseChip, useItemName } from "@/components/inventory/shared";
import { warehouses, whById } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { ADJ_REASONS, type Adjustment, freeQty, useInventory } from "@/lib/store/inventory";
import { cn, formatDate, formatINR, formatNum } from "@/lib/utils";

const reasonLabel = (code: string) => ADJ_REASONS.find((r) => r.code === code)?.label ?? code;

export default function AdjustmentsPage() {
  const role = useRole();
  const adjustments = useInventory((s) => s.adjustments);
  const items = useInventory((s) => s.items);
  const lots = useInventory((s) => s.lots);
  const decide = useInventory((s) => s.decideAdjustment);
  const name = useItemName();
  const [dialog, setDialog] = React.useState<"adjustment" | "transfer" | null>(null);
  const [open, setOpen] = React.useState<Adjustment | null>(null);

  const cost = (a: Adjustment) => lots.find((l) => l.itemId === a.itemId && l.batch === a.batch)?.unitCost ?? items.find((i) => i.id === a.itemId)!.avgCost;
  const uom = (id: string) => items.find((i) => i.id === id)?.uom ?? "";

  const doDecide = (a: Adjustment, approve: boolean) => {
    decide(a.id, approve, role.user);
    toast[approve ? "success" : "message"](approve ? `${a.number} approved and posted` : `${a.number} rejected`, {
      description: approve ? "Stock ledger and adjustment journal written" : "No stock change",
    });
    setOpen(null);
  };

  const columns: Column<Adjustment>[] = [
    { key: "number", header: "Number", value: (a) => a.number, cell: (a) => <span className="font-mono text-[12.5px] font-medium">{a.number}</span> },
    { key: "date", header: "Date", value: (a) => a.date, cell: (a) => formatDate(a.date) },
    {
      key: "kind",
      header: "Kind",
      value: (a) => a.kind,
      cell: (a) => (a.kind === "transfer" ? <Badge tone="progress" dot={false}>Transfer</Badge> : <Badge tone="warning" dot={false}>Adjustment</Badge>),
    },
    { key: "item", header: "Item", value: (a) => name(a.itemId), cell: (a) => <ItemCell id={a.itemId} /> },
    {
      key: "where",
      header: "Location",
      sortable: false,
      cell: (a) => (
        <div className="flex items-center gap-1.5">
          <WarehouseChip id={a.fromWh} />
          {a.toWh && (
            <>
              <ArrowRight className="size-3 text-ink-3" />
              <WarehouseChip id={a.toWh} />
            </>
          )}
          <span className="ml-1 font-mono text-2xs text-ink-3">{a.batch}</span>
        </div>
      ),
    },
    { key: "qty", header: "Quantity", align: "right", value: (a) => a.qty, cell: (a) => (a.kind === "transfer" ? <span className="tabular font-medium">{formatNum(a.qty)} <span className="text-xs font-normal text-ink-3">{uom(a.itemId)}</span></span> : <SignedQty v={a.qty} uom={uom(a.itemId)} />) },
    { key: "value", header: "Value impact", align: "right", cost: true, value: (a) => (a.kind === "transfer" ? 0 : a.qty * cost(a)), cell: (a) => (a.kind === "transfer" ? <span className="text-ink-3">—</span> : <span className={a.qty < 0 ? "text-danger" : "text-success"}>{formatINR(a.qty * cost(a))}</span>) },
    { key: "reason", header: "Reason", value: (a) => reasonLabel(a.reason), cell: (a) => <span className="text-ink-2">{reasonLabel(a.reason)}</span> },
    { key: "by", header: "Requested by", value: (a) => a.by, cell: (a) => <span className="text-ink-2">{a.by}</span> },
    { key: "status", header: "Status", value: (a) => a.status, cell: (a) => <StatusBadge status={a.status} /> },
  ];

  return (
    <>
      <ListPage
        title="Transfers & adjustments"
        crumbs={[{ label: "Inventory", href: "/inventory/stock" }, { label: "Transfers & adjustments" }]}
        rows={adjustments}
        columns={columns}
        search={(a) => `${a.number} ${name(a.itemId)} ${a.batch} ${reasonLabel(a.reason)} ${a.by}`}
        placeholder="Search number, item, batch, reason…"
        onNew={() => setDialog("adjustment")}
        newLabel="New adjustment"
        extraActions={
          <Button onClick={() => setDialog("transfer")}>
            <ArrowLeftRight /> New transfer
          </Button>
        }
        onRowClick={setOpen}
        filters={[
          { key: "pending", label: "Waiting approval", group: "s", test: (a) => a.status === "pending_approval" },
          { key: "posted", label: "Posted", group: "s", test: (a) => a.status === "posted" },
          { key: "rejected", label: "Rejected", group: "s", test: (a) => a.status === "rejected" },
          { key: "adj", label: "Adjustments", group: "k", test: (a) => a.kind === "adjustment" },
          { key: "trf", label: "Transfers", group: "k", test: (a) => a.kind === "transfer" },
        ]}
        groups={[
          { key: "status", label: "Status", by: (a) => a.status.replace(/_/g, " ") },
          { key: "reason", label: "Reason", by: (a) => reasonLabel(a.reason) },
          { key: "item", label: "Item", by: (a) => name(a.itemId) },
        ]}
        bulkActions={
          role.approves
            ? [
                {
                  label: "Approve",
                  variant: "primary",
                  icon: <Check />,
                  run: (rows) => {
                    const pend = rows.filter((r) => r.status === "pending_approval" && r.by !== role.user);
                    pend.forEach((r) => decide(r.id, true, role.user));
                    toast.success(`${pend.length} adjustment(s) approved`, { description: pend.length < rows.length ? "Only pending items you did not create can be approved" : undefined });
                  },
                },
              ]
            : []
        }
      />

      <Sheet
        open={!!open}
        onOpenChange={(o) => !o && setOpen(null)}
        title={open ? <span className="font-mono">{open.number}</span> : ""}
        footer={
          open?.status === "pending_approval" && role.approves ? (
            <>
              <Button variant="danger" onClick={() => doDecide(open, false)}><X /> Reject</Button>
              <Button variant="primary" disabled={open.by === role.user} onClick={() => doDecide(open, true)}><Check /> Approve & post</Button>
            </>
          ) : undefined
        }
      >
        {open && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={open.status} />
              <span className="text-sm text-ink-3">{open.kind === "transfer" ? "Stock transfer" : "Stock adjustment"} · {formatDate(open.date)}</span>
            </div>
            <div className="space-y-3">
              <Field label="Item"><ReadValue><ItemCell id={open.itemId} /></ReadValue></Field>
              <Field label="Batch"><ReadValue mono>{open.batch}</ReadValue></Field>
              <Field label={open.kind === "transfer" ? "From → to" : "Warehouse"}>
                <ReadValue>{whById(open.fromWh).name}{open.toWh && ` → ${whById(open.toWh).name}`}</ReadValue>
              </Field>
              <Field label="Quantity"><ReadValue>{open.kind === "transfer" ? formatNum(open.qty) : <SignedQty v={open.qty} uom={uom(open.itemId)} />}</ReadValue></Field>
              {role.seesCost && open.kind === "adjustment" && <Field label="Value impact"><ReadValue>{formatINR(open.qty * cost(open))}</ReadValue></Field>}
              <Field label="Reason"><ReadValue>{reasonLabel(open.reason)}</ReadValue></Field>
              <Field label="Note"><ReadValue>{open.note || "—"}</ReadValue></Field>
              <Field label="Requested by"><ReadValue>{open.by}</ReadValue></Field>
              {open.decidedBy && <Field label={open.status === "rejected" ? "Rejected by" : "Approved by"}><ReadValue>{open.decidedBy}</ReadValue></Field>}
            </div>
            {open.status === "pending_approval" && (
              <p className="rounded-md bg-warning-bg px-3 py-2 text-xs text-warning">
                Stock adjustments need approval before they post (FR-PL-04).{open.by === role.user ? " You created this one, so another approver must decide." : ""}
              </p>
            )}
          </div>
        )}
      </Sheet>

      <MoveDialog kind={dialog} onClose={() => setDialog(null)} />
    </>
  );
}

function MoveDialog({ kind, onClose }: { kind: "adjustment" | "transfer" | null; onClose: () => void }) {
  const role = useRole();
  const items = useInventory((s) => s.items);
  const lots = useInventory((s) => s.lots);
  const { requestAdjustment, postTransfer } = useInventory.getState();
  const [f, setF] = React.useState({ itemId: "", fromWh: "w1", toWh: "", batch: "", qty: 0, dir: "-" as "+" | "-", reason: "", note: "" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (kind) {
      setF({ itemId: "", fromWh: "w1", toWh: "", batch: "", qty: 0, dir: "-", reason: kind === "transfer" ? "Stores consolidation" : "", note: "" });
      setErrors({});
    }
  }, [kind]);

  const batches = lots.filter((l) => l.itemId === f.itemId && l.warehouseId === f.fromWh && l.qty > 0);
  const avail = f.batch ? freeQty(lots, f.itemId, f.fromWh, f.batch) : 0;
  const it = items.find((i) => i.id === f.itemId);
  const outgoing = kind === "transfer" || f.dir === "-";

  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.itemId) e.item = "Select an item";
    if (!f.batch) e.batch = it && !it.batchTracked ? "Select the stock line" : "Select a batch";
    if (!(f.qty > 0)) e.qty = "Enter a quantity greater than 0";
    else if (outgoing && f.qty > avail) e.qty = `Only ${formatNum(avail)} ${it?.uom} available — negative stock is blocked by policy`;
    if (kind === "adjustment" && !f.reason) e.reason = "Select a reason code";
    if (kind === "transfer" && !f.toWh) e.toWh = "Select the destination";
    if (kind === "transfer" && f.toWh === f.fromWh) e.toWh = "Must differ from source";
    setErrors(e);
    if (Object.keys(e).length) return;
    const base = { itemId: f.itemId, batch: f.batch, fromWh: f.fromWh, reason: f.reason, note: f.note, by: role.user };
    if (kind === "transfer") {
      const t = postTransfer({ ...base, toWh: f.toWh, qty: f.qty });
      toast.success(`${t.number} posted`, { description: `${formatNum(f.qty)} ${it?.uom} moved ${whById(f.fromWh).code} → ${whById(f.toWh).code}` });
    } else {
      const a = requestAdjustment({ ...base, qty: f.dir === "-" ? -f.qty : f.qty });
      toast.success(`${a.number} sent for approval`, { description: "Stock adjustments post after approval (FR-PL-04)" });
    }
    onClose();
  };

  return (
    <Dialog
      open={!!kind}
      onOpenChange={(o) => !o && onClose()}
      title={kind === "transfer" ? "New stock transfer" : "New stock adjustment"}
      description={kind === "transfer" ? "Moves stock between warehouses; posts immediately." : "Corrects stock with a reason code; needs approval before posting."}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>
            {kind === "transfer" ? <><ArrowLeftRight /> Post transfer</> : <><SlidersHorizontal /> Request approval</>}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Item" required error={errors.item} htmlFor="adj-item">
          <Select id="adj-item" aria-invalid={!!errors.item} value={f.itemId} onChange={(e) => setF({ ...f, itemId: e.target.value, batch: "" })}>
            <option value="">Select item…</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.code} — {i.name}</option>
            ))}
          </Select>
        </Field>
        <Field label={kind === "transfer" ? "From" : "Warehouse"} required htmlFor="adj-wh">
          <Select id="adj-wh" value={f.fromWh} onChange={(e) => setF({ ...f, fromWh: e.target.value, batch: "" })}>
            {warehouses.filter((w) => w.type !== "jobwork").map((w) => (
              <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
            ))}
          </Select>
        </Field>
        {kind === "transfer" && (
          <Field label="To" required error={errors.toWh} htmlFor="adj-to">
            <Select id="adj-to" aria-invalid={!!errors.toWh} value={f.toWh} onChange={(e) => setF({ ...f, toWh: e.target.value })}>
              <option value="">Select destination…</option>
              {warehouses.filter((w) => w.type !== "jobwork").map((w) => (
                <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Batch" required error={errors.batch} htmlFor="adj-batch" hint={f.itemId && !batches.length ? "No stock of this item in the selected warehouse" : undefined}>
          <Select id="adj-batch" aria-invalid={!!errors.batch} value={f.batch} onChange={(e) => setF({ ...f, batch: e.target.value })} disabled={!batches.length}>
            <option value="">Select…</option>
            {batches.map((b) => (
              <option key={b.id} value={b.batch}>{b.batch} · {formatNum(b.qty)} {it?.uom}</option>
            ))}
          </Select>
        </Field>
        <Field label="Quantity" required error={errors.qty} htmlFor="adj-qty" hint={f.batch ? `Available ${formatNum(avail)} ${it?.uom}` : undefined}>
          <div className="flex gap-2">
            {kind === "adjustment" && (
              <div className="flex rounded-md border border-line-strong p-0.5" role="group" aria-label="Direction">
                {(["-", "+"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setF({ ...f, dir: d })}
                    aria-pressed={f.dir === d}
                    className={cn("h-6 w-16 rounded text-xs font-medium", f.dir === d ? (d === "-" ? "bg-danger text-white" : "bg-success text-white") : "text-ink-2 hover:bg-surface-3")}
                  >
                    {d === "-" ? "Decrease" : "Increase"}
                  </button>
                ))}
              </div>
            )}
            <Input id="adj-qty" type="number" min={0} aria-invalid={!!errors.qty} className="text-right" value={f.qty || ""} onChange={(e) => setF({ ...f, qty: Number(e.target.value) })} />
          </div>
        </Field>
        {kind === "adjustment" ? (
          <Field label="Reason code" required error={errors.reason} htmlFor="adj-reason">
            <Select id="adj-reason" aria-invalid={!!errors.reason} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })}>
              <option value="">Select reason…</option>
              {ADJ_REASONS.map((r) => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label="Reason" htmlFor="trf-reason">
            <Input id="trf-reason" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
          </Field>
        )}
        <Field label="Note" htmlFor="adj-note">
          <Textarea id="adj-note" className="min-h-16" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="What happened?" />
        </Field>
        {kind === "adjustment" && (
          <p className="flex items-center gap-1.5 text-xs text-ink-3">
            <Plus className="size-3" /> Routed to {role.approves ? "another approver" : "the Production head / Owner"} — you cannot approve your own adjustment.
          </p>
        )}
      </div>
    </Dialog>
  );
}
