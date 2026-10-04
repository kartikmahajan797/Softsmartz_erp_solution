"use client";

import * as React from "react";
import Link from "next/link";
import { MessageCircle, Phone, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet as SidePanel } from "@/components/ui/overlay";
import { company, type Party, parties } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { soTotals, useSales } from "@/lib/store/sales";
import { cn, formatDate, formatINR, formatLakh } from "@/lib/utils";

const customers = parties.filter((p) => p.type.includes("customer"));

function CreditBar({ p }: { p: Party }) {
  if (!p.creditLimit) return <span className="text-ink-3">—</span>;
  const pct = (p.outstanding / p.creditLimit) * 100;
  return (
    <div className="w-32">
      <div className="flex justify-between text-2xs text-ink-3">
        <span className={cn(pct > 90 && "font-medium text-danger")}>{Math.round(pct)}%</span>
        <span>{formatLakh(p.creditLimit)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className={cn("h-full rounded-full", pct > 90 ? "bg-danger" : pct > 70 ? "bg-accent-500" : "bg-primary-600")} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const role = useRole();
  const orders = useSales((s) => s.orders);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const c = customers.find((x) => x.id === openId);

  const columns: Column<Party>[] = [
    {
      key: "name",
      header: "Customer",
      value: (r) => r.name,
      cell: (r) => (
        <div>
          <div className="font-medium">{r.name}</div>
          <div className="font-mono text-2xs text-ink-3">{r.code}</div>
        </div>
      ),
    },
    { key: "gstin", header: "GSTIN", value: (r) => r.gstin, cell: (r) => <span className="font-mono text-xs">{r.gstin}</span> },
    {
      key: "state",
      header: "State",
      value: (r) => r.state,
      cell: (r) => (
        <span className="flex items-center gap-2">
          {r.city}, {r.state}
          {r.stateCode !== company.stateCode && <Badge tone="info" dot={false}>IGST</Badge>}
        </span>
      ),
    },
    { key: "contact", header: "Contact", value: (r) => r.contact, cell: (r) => <span className="text-ink-2">{r.contact}</span> },
    { key: "terms", header: "Terms", align: "right", value: (r) => r.paymentTermsDays, cell: (r) => `${r.paymentTermsDays} days` },
    { key: "credit", header: "Credit used", sortable: false, cost: true, cell: (r) => <CreditBar p={r} /> },
    { key: "outstanding", header: "Outstanding", align: "right", cost: true, value: (r) => r.outstanding, cell: (r) => formatINR(r.outstanding), total: (rows) => formatLakh(rows.reduce((a, r) => a + r.outstanding, 0)) },
  ];

  const recent = c ? orders.filter((o) => o.customerId === c.id).slice(0, 5) : [];

  return (
    <>
      <ListPage
        title="Customers"
        crumbs={[{ label: "Sales", href: "/sales/orders" }, { label: "Customers" }]}
        rows={customers}
        columns={columns}
        search={(r) => `${r.name} ${r.code} ${r.gstin} ${r.city} ${r.contact}`}
        placeholder="Search name, GSTIN, city…"
        onNew={() => toast("New customer", { description: "GSTIN is validated via the GSP before saving (G20)" })}
        onRowClick={(r) => setOpenId(r.id)}
        filters={[
          { key: "inter", label: "Inter-state", group: "s", test: (r) => r.stateCode !== company.stateCode },
          { key: "intra", label: "Maharashtra", group: "s", test: (r) => r.stateCode === company.stateCode },
          { key: "credit", label: "Over 90% of credit", group: "c", test: (r) => !!r.creditLimit && r.outstanding / r.creditLimit > 0.9 },
        ]}
        groups={[{ key: "state", label: "State", by: (r) => r.state }]}
      />

      <SidePanel open={!!c} onOpenChange={(o) => !o && setOpenId(null)} width={500} title={c?.name ?? ""}>
        {c && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => toast.success(`Calling ${c.contact}`, { description: c.phone })}><Phone /> Call</Button>
              <Button size="sm" onClick={() => toast.success(`WhatsApp opened for ${c.contact}`)}><MessageCircle /> WhatsApp</Button>
              <Link href="/sales/orders/new"><Button size="sm" variant="primary"><ShoppingCart /> New order</Button></Link>
            </div>
            <section>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">Details</h3>
              <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
                <dt className="text-ink-3">Code</dt><dd className="font-mono text-[13px]">{c.code}</dd>
                <dt className="text-ink-3">GSTIN</dt><dd className="font-mono text-[13px]">{c.gstin}</dd>
                <dt className="text-ink-3">Place of supply</dt><dd>{c.stateCode} - {c.state} · {c.stateCode === company.stateCode ? "CGST + SGST" : "IGST"}</dd>
                <dt className="text-ink-3">Contact</dt><dd>{c.contact}</dd>
                <dt className="text-ink-3">Phone</dt><dd>{c.phone}</dd>
                <dt className="text-ink-3">Payment terms</dt><dd>{c.paymentTermsDays} days</dd>
              </dl>
            </section>
            {role.seesCost && c.creditLimit && (
              <section className="rounded-lg border border-line p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium">Credit</span>
                  <span className="text-xs text-ink-3">Limit {formatLakh(c.creditLimit)}</span>
                </div>
                <div className="mt-1 text-xl font-semibold">{formatINR(c.outstanding)}</div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full rounded-full bg-primary-600" style={{ width: `${Math.min(100, (c.outstanding / c.creditLimit) * 100)}%` }} />
                </div>
                <div className="mt-1.5 text-xs text-ink-3">Available {formatINR(Math.max(0, c.creditLimit - c.outstanding))}</div>
              </section>
            )}
            <section>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">Recent orders</h3>
              {recent.length ? (
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {recent.map((o) => (
                    <li key={o.id}>
                      <Link href={`/sales/orders/${o.id}`} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface-2">
                        <span className="font-mono text-xs font-medium">{o.number}</span>
                        <span className="text-xs text-ink-3">{formatDate(o.date)}</span>
                        <span className="tabular ml-auto">{formatLakh(soTotals(o).total)}</span>
                        <StatusBadge status={o.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-3">No orders yet.</p>
              )}
            </section>
          </div>
        )}
      </SidePanel>
    </>
  );
}
