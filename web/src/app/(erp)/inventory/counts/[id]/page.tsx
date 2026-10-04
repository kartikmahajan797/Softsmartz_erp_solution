"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, Check, EyeOff, ScanLine, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Banner, FormPage, Sheet, SheetTitle, StatusBar } from "@/components/erp/form-view";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { SignedQty, WarehouseChip, useItemName } from "@/components/inventory/shared";
import { whById } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { COUNT_VARIANCE_LIMIT, useInventory } from "@/lib/store/inventory";
import { cn, formatDate, formatINR, formatLakh, formatNum } from "@/lib/utils";

const STEPS = [
  { key: "counting", label: "Counting" },
  { key: "submitted", label: "Submitted" },
  { key: "approved", label: "Approved" },
  { key: "posted", label: "Posted" },
];

export default function CountPage() {
  const { id } = useParams<{ id: string }>();
  const role = useRole();
  const name = useItemName();
  const c = useInventory((s) => s.counts.find((x) => x.id === id));
  const items = useInventory((s) => s.items);
  const { setCountLine, setCountBlind, addCountLine, setCountStatus, postCount } = useInventory.getState();
  const [scan, setScan] = React.useState("");
  const refs = React.useRef<Record<string, HTMLInputElement | null>>({});

  if (!c) return <div className="p-10 text-center text-sm text-ink-3">Count not found. <Link href="/inventory/counts" className="text-primary-700 underline">Back</Link></div>;

  const it = (iid: string) => items.find((i) => i.id === iid)!;
  const editing = c.status === "counting";
  const hideSystem = editing && c.blind;
  const counted = c.lines.filter((l) => l.counted !== null).length;
  const varianceValue = c.lines.reduce((a, l) => a + ((l.counted ?? l.system) - l.system) * it(l.itemId).avgCost, 0);
  const absVariance = c.lines.reduce((a, l) => a + Math.abs(((l.counted ?? l.system) - l.system) * it(l.itemId).avgCost), 0);
  const needsApproval = absVariance > COUNT_VARIANCE_LIMIT;

  const onScan = (e: React.FormEvent) => {
    e.preventDefault();
    const q = scan.trim().toLowerCase();
    if (!q) return;
    const item = items.find((i) => i.code.toLowerCase() === q || i.code.toLowerCase().includes(q));
    if (!item) return toast.error(`No item matches "${scan}"`);
    const line = c.lines.find((l) => l.itemId === item.id);
    if (line) refs.current[line.id]?.focus();
    else {
      addCountLine(c.id, item.id);
      toast.success(`${item.code} added to the count`);
    }
    setScan("");
  };

  const submit = () => {
    if (counted < c.lines.length) return toast.error(`${c.lines.length - counted} line(s) not counted yet`);
    setCountStatus(c.id, "submitted");
    toast.success("Count submitted", { description: needsApproval ? `Variance ${formatLakh(absVariance)} exceeds ${formatINR(COUNT_VARIANCE_LIMIT)} — needs approval` : "Within limit — ready to post" });
  };

  const actions = (
    <>
      {editing && (
        <>
          <Button variant="primary" onClick={submit}><Send /> Submit count</Button>
          <Button onClick={() => { setCountBlind(c.id, !c.blind); }}><EyeOff /> {c.blind ? "Show system qty" : "Blind count"}</Button>
        </>
      )}
      {c.status === "submitted" && needsApproval && role.approves && (
        <>
          <Button variant="primary" onClick={() => { setCountStatus(c.id, "approved"); toast.success("Variance approved"); }}><Check /> Approve variance</Button>
          <Button variant="danger" onClick={() => { setCountStatus(c.id, "counting"); toast("Sent back for recount"); }}><X /> Recount</Button>
        </>
      )}
      {((c.status === "submitted" && !needsApproval) || c.status === "approved") && (
        <Button variant="primary" onClick={() => { postCount(c.id, role.user); toast.success(`${c.number} posted`, { description: "Count-variance movements written to the stock ledger" }); }}>
          Post variances
        </Button>
      )}
      {c.status === "submitted" && needsApproval && !role.approves && <span className="text-sm text-ink-3">Waiting for approval (variance over limit)</span>}
    </>
  );

  return (
    <FormPage
      crumbs={[{ label: "Inventory", href: "/inventory/stock" }, { label: "Stock counts", href: "/inventory/counts" }, { label: c.number }]}
      actions={actions}
      status={c.status === "rejected" ? <StatusBadge status="rejected" /> : <StatusBar steps={STEPS} current={c.status} />}
      banner={
        c.status === "submitted" && needsApproval ? (
          <Banner tone="warning" icon={<AlertTriangle />}>
            Total variance {formatINR(absVariance)} exceeds the {formatINR(COUNT_VARIANCE_LIMIT)} limit — Owner or Production head must approve before posting (FR-IN-06).
          </Banner>
        ) : undefined
      }
    >
      <Sheet className="max-w-[920px]">
        <SheetTitle
          label="Physical stock count"
          title={c.number}
          badge={<StatusBadge status={c.status} />}
          subtitle={
            <span className="flex flex-wrap items-center gap-2">
              <WarehouseChip id={c.warehouseId} /> {whById(c.warehouseId).name} · {formatDate(c.date)} · counted by {c.countedBy}
            </span>
          }
        />

        <div className="mb-4 grid grid-cols-3 overflow-hidden rounded-lg border border-line text-center">
          <div className="border-r border-line p-3">
            <div className="text-xs text-ink-3">Lines counted</div>
            <div className="tabular text-lg font-semibold">{counted} / {c.lines.length}</div>
          </div>
          <div className="border-r border-line p-3">
            <div className="text-xs text-ink-3">Lines with variance</div>
            <div className="tabular text-lg font-semibold">{hideSystem ? "—" : c.lines.filter((l) => l.counted !== null && l.counted !== l.system).length}</div>
          </div>
          <div className="p-3">
            <div className="text-xs text-ink-3">Variance value</div>
            <div className={cn("tabular text-lg font-semibold", !hideSystem && varianceValue < 0 && "text-danger")}>{hideSystem || !role.seesCost ? "—" : formatINR(varianceValue)}</div>
          </div>
        </div>

        {editing && (
          <form onSubmit={onScan} className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <ScanLine className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-3" />
              <Input value={scan} onChange={(e) => setScan(e.target.value)} placeholder="Scan or type item code" aria-label="Scan item" className="h-11 pl-10 text-base" />
            </div>
            <Button type="submit" size="lg">Find</Button>
          </form>
        )}

        <ul className="divide-y divide-line rounded-lg border border-line">
          {c.lines.map((l) => {
            const item = it(l.itemId);
            const variance = l.counted === null ? null : l.counted - l.system;
            return (
              <li key={l.id} className={cn("flex flex-wrap items-center gap-3 px-4 py-3", l.counted === null && editing && "bg-surface-2/60")}>
                <div className="min-w-[200px] flex-1">
                  <div className="font-medium">{name(l.itemId)}</div>
                  <div className="font-mono text-xs text-ink-3">{item.code} · batch {l.batch}</div>
                </div>
                <div className="w-24 text-right">
                  <div className="text-2xs text-ink-3">System</div>
                  <div className="tabular font-medium">{hideSystem ? "•••" : formatNum(l.system)}</div>
                </div>
                <div className="w-36">
                  <label className="text-2xs text-ink-3" htmlFor={`cnt-${l.id}`}>Counted ({item.uom})</label>
                  {editing ? (
                    <Input
                      id={`cnt-${l.id}`}
                      ref={(el) => {
                        refs.current[l.id] = el;
                      }}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      className="h-11 text-right text-lg font-semibold"
                      value={l.counted ?? ""}
                      onChange={(e) => setCountLine(c.id, l.id, e.target.value === "" ? null : Number(e.target.value))}
                    />
                  ) : (
                    <div className="tabular text-lg font-semibold">{l.counted === null ? "—" : formatNum(l.counted)}</div>
                  )}
                </div>
                <div className="w-28 text-right">
                  <div className="text-2xs text-ink-3">Variance</div>
                  {hideSystem || variance === null ? <div className="text-ink-3">—</div> : <SignedQty v={variance} uom={item.uom} />}
                  {!hideSystem && variance !== null && variance !== 0 && role.seesCost && (
                    <div className="tabular text-2xs text-ink-3">{formatINR(variance * item.avgCost)}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {hideSystem && <p className="mt-3 text-xs text-ink-3">Blind count: system quantities stay hidden until you submit, so counts are not anchored to the book figure.</p>}
      </Sheet>
    </FormPage>
  );
}
