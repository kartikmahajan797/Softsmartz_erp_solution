"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageCircle, Phone, ShoppingCart, Star } from "lucide-react";
import { toast } from "sonner";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/overlay";
import { MsmeBadge } from "@/components/inventory/shared";
import { company, type Party, parties } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { poTotals, usePurchase } from "@/lib/store/purchase";
import { formatDate, formatINR, formatLakh } from "@/lib/utils";

const vendors = parties.filter((p) => p.type.includes("vendor") || p.type.includes("job_worker"));

export default function VendorsPage() {
  const role = useRole();
  const router = useRouter();
  const orders = usePurchase((s) => s.orders);
  const receipts = usePurchase((s) => s.receipts);
  const [open, setOpen] = React.useState<Party | null>(null);

  const stats = (v: Party) => {
    const pos = orders.filter((o) => o.vendorId === v.id);
    const grns = receipts.filter((g) => g.vendorId === v.id && g.status === "posted");
    const rec = grns.reduce((a, g) => a + g.lines.reduce((x, l) => x + l.received, 0), 0);
    const rej = grns.reduce((a, g) => a + g.lines.reduce((x, l) => x + l.rejected, 0), 0);
    return {
      pos,
      openPOs: pos.filter((o) => ["approved", "partially_received", "pending_approval"].includes(o.status)),
      grns,
      rejectPct: rec ? (rej / rec) * 100 : 0,
      spend: pos.filter((o) => !["draft", "cancelled"].includes(o.status)).reduce((a, o) => a + poTotals(o).total, 0),
    };
  };

  const columns: Column<Party>[] = [
    { key: "code", header: "Code", value: (v) => v.code, cell: (v) => <span className="font-mono text-xs">{v.code}</span> },
    {
      key: "name",
      header: "Vendor",
      value: (v) => v.name,
      cell: (v) => (
        <div>
          <div className="flex items-center gap-1.5 font-medium">{v.name}{v.msme && <MsmeBadge />}</div>
          <div className="text-xs text-ink-3">{v.contact} · {v.city}</div>
        </div>
      ),
    },
    { key: "kind", header: "Type", value: (v) => v.type.join(","), cell: (v) => (v.type.includes("job_worker") ? <Badge tone="brand" dot={false}>Job-worker</Badge> : <Badge tone="neutral" dot={false}>Supplier</Badge>) },
    { key: "gstin", header: "GSTIN", value: (v) => v.gstin, cell: (v) => <span className="font-mono text-xs">{v.gstin}</span> },
    { key: "state", header: "State", value: (v) => v.state, cell: (v) => <span className={v.stateCode !== company.stateCode ? "text-progress" : "text-ink-2"}>{v.state}{v.stateCode !== company.stateCode && <span className="ml-1 text-2xs">(IGST)</span>}</span> },
    { key: "terms", header: "Terms", align: "right", value: (v) => v.paymentTermsDays, cell: (v) => `${v.paymentTermsDays} days` },
    { key: "open", header: "Open POs", align: "right", value: (v) => stats(v).openPOs.length, cell: (v) => stats(v).openPOs.length || <span className="text-ink-3">—</span> },
    { key: "rating", header: "Rating", sortable: false, cell: () => <span className="text-xs text-ink-3">R2</span> },
    { key: "outstanding", header: "Payable", align: "right", cost: true, value: (v) => v.outstanding, cell: (v) => (v.outstanding ? formatINR(v.outstanding) : <span className="text-ink-3">—</span>), total: (rs) => formatLakh(rs.reduce((a, v) => a + v.outstanding, 0)) },
  ];

  const s = open ? stats(open) : null;

  return (
    <>
      <ListPage
        title="Vendors"
        crumbs={[{ label: "Purchase", href: "/purchase/orders" }, { label: "Vendors" }]}
        rows={vendors}
        columns={columns}
        search={(v) => `${v.code} ${v.name} ${v.gstin} ${v.city} ${v.contact}`}
        placeholder="Search name, GSTIN, city, contact…"
        onRowClick={setOpen}
        onNew={() => toast("Vendor creation: GSTIN lookup via GSP fills name and address (demo)")}
        filters={[
          { key: "msme", label: "MSME suppliers", group: "m", test: (v) => !!v.msme },
          { key: "jw", label: "Job-workers", group: "t", test: (v) => v.type.includes("job_worker") },
          { key: "sup", label: "Suppliers", group: "t", test: (v) => !v.type.includes("job_worker") },
          { key: "inter", label: "Inter-state", group: "s", test: (v) => v.stateCode !== company.stateCode },
        ]}
        groups={[
          { key: "state", label: "State", by: (v) => v.state },
          { key: "kind", label: "Type", by: (v) => (v.type.includes("job_worker") ? "Job-workers" : "Suppliers") },
        ]}
      />
      <Sheet
        open={!!open}
        onOpenChange={(o) => !o && setOpen(null)}
        width={500}
        title={open?.name ?? ""}
        footer={
          open && (
            <>
              <Button onClick={() => toast.success(`WhatsApp opened for ${open.contact}`)}><MessageCircle /> WhatsApp</Button>
              <Button variant="primary" onClick={() => router.push("/purchase/orders/new")}><ShoppingCart /> New PO</Button>
            </>
          )
        }
      >
        {open && s && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-ink-3">{open.code}</span>
              {open.msme && <MsmeBadge />}
              {open.type.includes("job_worker") && <Badge tone="brand" dot={false}>Job-worker</Badge>}
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-xs text-ink-3">GSTIN</dt><dd className="font-mono">{open.gstin}</dd></div>
              <div><dt className="text-xs text-ink-3">State</dt><dd>{open.stateCode} - {open.state}</dd></div>
              <div><dt className="text-xs text-ink-3">Contact</dt><dd>{open.contact}</dd></div>
              <div><dt className="text-xs text-ink-3">Phone</dt><dd className="flex items-center gap-1"><Phone className="size-3 text-ink-3" />{open.phone}</dd></div>
              <div><dt className="text-xs text-ink-3">Payment terms</dt><dd>{open.paymentTermsDays} days</dd></div>
              {role.seesCost && <div><dt className="text-xs text-ink-3">Payable now</dt><dd className="font-medium">{formatINR(open.outstanding)}</dd></div>}
            </dl>
            <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-line text-center">
              <div className="border-r border-line p-3"><div className="text-xs text-ink-3">Open POs</div><div className="tabular text-lg font-semibold">{s.openPOs.length}</div></div>
              <div className="border-r border-line p-3"><div className="text-xs text-ink-3">GRNs</div><div className="tabular text-lg font-semibold">{s.grns.length}</div></div>
              <div className="p-3"><div className="text-xs text-ink-3">Rejection</div><div className="tabular text-lg font-semibold">{s.rejectPct.toFixed(1)}%</div></div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-3">
              <Star className="size-3.5" /> Vendor rating on delivery, quality and price arrives in R2 (FR-SP-06).
            </div>
            {open.msme && (
              <p className="rounded-lg bg-progress-bg px-3 py-2 text-xs text-progress">MSME supplier — track payment within agreed terms (max 45 days) to avoid disallowance [verify with CA].</p>
            )}
            <div>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">Recent purchase orders</h3>
              <ul className="divide-y divide-line rounded-lg border border-line">
                {s.pos.slice(0, 5).map((o) => (
                  <li key={o.id}>
                    <button className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-surface-2" onClick={() => router.push(`/purchase/orders/${o.id}`)}>
                      <span className="font-mono text-xs font-medium">{o.number}</span>
                      <span className="flex-1 text-xs text-ink-3">{formatDate(o.date)}</span>
                      {role.seesCost && <span className="tabular text-xs">{formatLakh(poTotals(o).total)}</span>}
                      <StatusBadge status={o.status} />
                    </button>
                  </li>
                ))}
                {!s.pos.length && <li className="px-3 py-4 text-center text-xs text-ink-3">No purchase orders yet</li>}
              </ul>
            </div>
            <Button variant="link" onClick={() => toast.success(`Statement emailed to ${open.name}`)}><Mail /> Email account statement</Button>
          </div>
        )}
      </Sheet>
    </>
  );
}
