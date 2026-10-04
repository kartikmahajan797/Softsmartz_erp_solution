"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { ToneBadge } from "@/components/returns/shared";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { Dialog } from "@/components/ui/overlay";
import { MsmeBadge } from "@/components/inventory/shared";
import { itemById, items, parties, partyById } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { lowestVendor, quoteResponded, RFQ_STATUS, quoteTotal, type Rfq, type RfqLine, useRfq } from "@/lib/store/rfq";
import { cn, daysBetween, formatDate, formatINR, TODAY } from "@/lib/utils";


const responded = (r: Rfq) => r.vendors.filter(quoteResponded).length;
const bestTotal = (r: Rfq) => {
  const v = lowestVendor(r);
  return v ? quoteTotal(r, r.vendors.find((x) => x.vendorId === v)!).taxable : 0;
};

function Initials({ id }: { id: string }) {
  const p = partyById(id);
  return (
    <span title={p.name} className="flex size-6 items-center justify-center rounded-full border-2 border-surface bg-primary-100 text-[9.5px] font-semibold text-primary-800">
      {p.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
    </span>
  );
}

export default function RfqListPage() {
  const router = useRouter();
  const rfqs = useRfq((s) => s.rfqs);
  const [creating, setCreating] = React.useState(false);

  const open = rfqs.filter((r) => r.status === "sent" || r.status === "quotes_received");
  const ready = rfqs.filter((r) => r.status === "quotes_received");
  const overdue = rfqs.filter((r) => r.status === "sent" && daysBetween(r.quoteDue, TODAY) > 0);
  const awarded = rfqs.filter((r) => r.status === "awarded");

  const columns: Column<Rfq>[] = [
    { key: "number", header: "RFQ", value: (r) => r.number, cell: (r) => <span className="font-mono text-[12.5px] font-medium whitespace-nowrap">{r.number}</span> },
    {
      key: "title",
      header: "Requirement",
      value: (r) => r.title,
      cell: (r) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{r.title}</div>
          <div className="truncate text-xs text-ink-3">
            {r.lines.length} item{r.lines.length > 1 ? "s" : ""} · {r.lines.map((l) => itemById(l.itemId).code).join(", ")}
          </div>
        </div>
      ),
    },
    { key: "date", header: "Date", value: (r) => r.date, cell: (r) => <span className="whitespace-nowrap">{formatDate(r.date)}</span> },
    {
      key: "due",
      header: "Quotes due",
      value: (r) => r.quoteDue,
      cell: (r) => {
        const d = daysBetween(TODAY, r.quoteDue);
        const live = r.status === "sent" || r.status === "draft";
        return (
          <span className={cn("whitespace-nowrap", live && d < 0 && "font-medium text-danger", live && d >= 0 && d <= 1 && "text-warning")}>
            {formatDate(r.quoteDue)}
            {live && d < 0 && " · overdue"}
          </span>
        );
      },
    },
    {
      key: "vendors",
      header: "Vendors",
      value: (r) => responded(r),
      cell: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">{r.vendors.map((v) => <Initials key={v.vendorId} id={v.vendorId} />)}</div>
          <span className="text-xs whitespace-nowrap text-ink-3">{responded(r)}/{r.vendors.length} quoted</span>
        </div>
      ),
    },
    {
      key: "best",
      header: "L1 quote",
      align: "right",
      cost: true,
      value: bestTotal,
      cell: (r) => {
        const v = lowestVendor(r);
        return v ? (
          <div>
            <div className="font-medium">{formatINR(bestTotal(r))}</div>
            <div className="truncate text-2xs text-ink-3">{partyById(r.awardedVendorId ?? v).name}</div>
          </div>
        ) : (
          <span className="text-ink-3">—</span>
        );
      },
    },
    { key: "status", header: "Status", value: (r) => r.status, cell: (r) => <ToneBadge map={RFQ_STATUS} value={r.status} /> },
  ];

  return (
    <>
      <ListPage
        title="Requests for quotation"
        subtitle="Invite several vendors, compare quotes side by side and award the best one as a PO."
        crumbs={[{ label: "Purchase", href: "/purchase/orders" }, { label: "RFQs" }]}
        rows={rfqs}
        columns={columns}
        search={(r) => `${r.number} ${r.title} ${r.prNumbers.join(" ")} ${r.vendors.map((v) => partyById(v.vendorId).name).join(" ")} ${r.lines.map((l) => itemById(l.itemId).name).join(" ")}`}
        placeholder="Search RFQ, item, vendor, PR…"
        onNew={() => setCreating(true)}
        newLabel="New RFQ"
        href={(r) => `/purchase/rfqs/${r.id}`}
        stats={[
          { label: "Open RFQs", value: open.length, hint: `${open.reduce((a, r) => a + r.vendors.length, 0)} vendor invitations`, filter: "open" },
          { label: "Ready to award", value: ready.length, hint: "All or most quotes in", tone: ready.length ? "warning" : "default", filter: "ready" },
          { label: "Quotes overdue", value: overdue.length, hint: overdue.length ? "Send a reminder on WhatsApp" : "No vendor is late", tone: overdue.length ? "danger" : "success", filter: "overdue" },
          { label: "Awarded (30 days)", value: awarded.length, hint: awarded.map((r) => r.poNumber).join(", ") || "—" },
        ]}
        filters={[
          { key: "open", label: "Open", group: "s", test: (r) => r.status === "sent" || r.status === "quotes_received" },
          { key: "ready", label: "Ready to compare", group: "s", test: (r) => r.status === "quotes_received" },
          { key: "draft", label: "Draft", group: "s", test: (r) => r.status === "draft" },
          { key: "overdue", label: "Quotes overdue", group: "d", test: (r) => r.status === "sent" && daysBetween(r.quoteDue, TODAY) > 0 },
        ]}
        groups={[{ key: "status", label: "Status", by: (r) => RFQ_STATUS[r.status].label }]}
        kanban={{
          columns: [
            { key: "draft", label: "Draft", tone: "bg-neutral" },
            { key: "sent", label: "Awaiting quotes", tone: "bg-info" },
            { key: "quotes_received", label: "Ready to compare", tone: "bg-warning" },
            { key: "awarded", label: "Awarded", tone: "bg-success" },
          ],
          columnOf: (r) => r.status,
          card: (r) => (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-medium">{r.number}</span>
                <span className="text-2xs text-ink-3">Due {formatDate(r.quoteDue)}</span>
              </div>
              <div className="text-sm font-medium">{r.title}</div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex -space-x-1.5">{r.vendors.map((v) => <Initials key={v.vendorId} id={v.vendorId} />)}</div>
                <span className="text-xs text-ink-3">{responded(r)}/{r.vendors.length} quoted</span>
              </div>
            </div>
          ),
        }}
      />
      <NewRfqDialog open={creating} onOpenChange={setCreating} onCreated={(id) => router.push(`/purchase/rfqs/${id}`)} />
    </>
  );
}

function NewRfqDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const role = useRole();
  const add = useRfq((s) => s.add);
  const vendors = parties.filter((p) => p.type.includes("vendor"));
  const buyable = items.filter((i) => i.type === "raw" || i.type === "consumable");
  const [title, setTitle] = React.useState("");
  const [due, setDue] = React.useState("2026-10-07");
  const [lines, setLines] = React.useState<RfqLine[]>([{ id: "l1", itemId: "", qty: 0, requiredBy: "2026-10-12" }]);
  const [picked, setPicked] = React.useState<string[]>([]);
  const valid = title.trim() && lines.every((l) => l.itemId && l.qty > 0) && picked.length >= 2;

  const create = () => {
    const r = add(
      {
        title, date: TODAY, quoteDue: due, status: "draft", prNumbers: [], lines,
        vendors: picked.map((v) => ({ vendorId: v, lines: {}, paymentTermsDays: partyById(v).paymentTermsDays, freight: "Included", validTill: "" })),
      },
      role.user,
    );
    toast.success(`${r.number} created`, { description: "Review and send to vendors" });
    onOpenChange(false);
    onCreated(r.id);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New request for quotation"
      description="Invite at least two vendors so quotes can be compared."
      size="lg"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" disabled={!valid} onClick={create}>Create RFQ</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <Field label="Requirement" required layout="vertical" htmlFor="t"><Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. EN8 bars for October plan" /></Field>
          <Field label="Quotes due" required layout="vertical" htmlFor="d"><Input id="d" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        </div>
        <div>
          <div className="mb-1.5 text-sm font-medium text-ink-2">Items</div>
          <div className="space-y-2">
            {lines.map((l) => (
              <div key={l.id} className="grid grid-cols-[1fr_100px_150px_32px] gap-2">
                <Select aria-label="Item" value={l.itemId} onChange={(e) => setLines((ls) => ls.map((x) => (x.id === l.id ? { ...x, itemId: e.target.value } : x)))}>
                  <option value="">Select item…</option>
                  {buyable.map((i) => <option key={i.id} value={i.id}>{i.code} — {i.name}</option>)}
                </Select>
                <Input type="number" min={0} aria-label="Quantity" className="text-right" placeholder="Qty" value={l.qty || ""} onChange={(e) => setLines((ls) => ls.map((x) => (x.id === l.id ? { ...x, qty: Number(e.target.value) } : x)))} />
                <Input type="date" aria-label="Required by" value={l.requiredBy} onChange={(e) => setLines((ls) => ls.map((x) => (x.id === l.id ? { ...x, requiredBy: e.target.value } : x)))} />
                <Button variant="ghost" size="icon" aria-label="Remove item" onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.id !== l.id) : ls))}><Trash2 /></Button>
              </div>
            ))}
          </div>
          <Button variant="link" className="mt-2" onClick={() => setLines((ls) => [...ls, { id: `l${Date.now()}`, itemId: "", qty: 0, requiredBy: "2026-10-12" }])}><Plus /> Add item</Button>
        </div>
        <div>
          <div className="mb-1.5 text-sm font-medium text-ink-2">Vendors to invite <span className="font-normal text-ink-3">({picked.length} selected)</span></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {vendors.map((v) => {
              const on = picked.includes(v.id);
              return (
                <label key={v.id} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2", on ? "border-primary-500 bg-primary-50/60" : "border-line hover:border-line-strong")}>
                  <Checkbox checked={on} onChange={() => setPicked((p) => (on ? p.filter((x) => x !== v.id) : [...p, v.id]))} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-medium">{v.name}{v.msme && <MsmeBadge />}</span>
                    <span className="block text-xs text-ink-3">{v.city} · {v.paymentTermsDays} days credit</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
