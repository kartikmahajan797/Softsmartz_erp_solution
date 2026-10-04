"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Mail, MessageCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet as SidePanel } from "@/components/ui/overlay";
import { partyById } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { type Quotation, useSales } from "@/lib/store/sales";
import { cn, daysBetween, formatDate, formatINR, formatLakh, TODAY } from "@/lib/utils";

const setQuoteStatus = (id: string, status: Quotation["status"]) =>
  useSales.setState((s) => ({ quotations: s.quotations.map((q) => (q.id === id ? { ...q, status } : q)) }));

function Validity({ q }: { q: Quotation }) {
  if (q.status !== "sent" && q.status !== "draft") return <span className="text-ink-3">{formatDate(q.validTill)}</span>;
  const d = daysBetween(TODAY, q.validTill);
  return (
    <span className="flex items-center gap-2">
      {formatDate(q.validTill)}
      {d < 0 ? <Badge tone="danger">Lapsed</Badge> : d <= 3 ? <Badge tone="warning">{d === 0 ? "Today" : `${d}d left`}</Badge> : <span className="text-xs text-ink-3">{d}d left</span>}
    </span>
  );
}

export default function QuotationsPage() {
  const router = useRouter();
  const role = useRole();
  const quotations = useSales((s) => s.quotations);
  const convert = useSales((s) => s.convertQuotation);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const q = quotations.find((x) => x.id === openId);

  const send = (row: Quotation, via: "WhatsApp" | "email") => {
    if (row.status === "draft") setQuoteStatus(row.id, "sent");
    const p = partyById(row.customerId);
    toast.success(`${row.number} sent on ${via}`, { description: via === "WhatsApp" ? `${p.contact} · ${p.phone}` : `${p.contact} · PDF attached` });
  };

  const doConvert = (row: Quotation) => {
    const so = convert(row.id, role.user);
    toast.success(`${so.number} created from ${row.number}`, { description: "Review lines and confirm" });
    router.push(`/sales/orders/${so.id}`);
  };

  const columns: Column<Quotation>[] = [
    { key: "number", header: "Number", value: (r) => r.number, cell: (r) => <span className="font-mono text-[12.5px] font-medium">{r.number}</span> },
    { key: "date", header: "Date", value: (r) => r.date, cell: (r) => formatDate(r.date) },
    { key: "customer", header: "Customer", value: (r) => partyById(r.customerId).name, cell: (r) => <span className="font-medium">{partyById(r.customerId).name}</span> },
    { key: "valid", header: "Valid till", value: (r) => r.validTill, cell: (r) => <Validity q={r} /> },
    { key: "so", header: "Sales order", value: (r) => r.salesOrder ?? "", cell: (r) => (r.salesOrder ? <span className="font-mono text-xs text-primary-700">{r.salesOrder}</span> : <span className="text-ink-3">—</span>) },
    { key: "amount", header: "Amount", align: "right", value: (r) => r.amount, cell: (r) => formatINR(r.amount), total: (rows) => formatLakh(rows.reduce((a, r) => a + r.amount, 0)) },
    { key: "status", header: "Status", value: (r) => r.status, cell: (r) => <StatusBadge status={r.status} /> },
  ];

  const canConvert = (r: Quotation) => r.status === "sent" || r.status === "draft";

  return (
    <>
      <ListPage
        title="Quotations"
        crumbs={[{ label: "Sales", href: "/sales/orders" }, { label: "Quotations" }]}
        rows={quotations}
        columns={columns}
        search={(r) => `${r.number} ${partyById(r.customerId).name}`}
        placeholder="Search number or customer…"
        newHref="/sales/quotations/new"
        onRowClick={(r) => setOpenId(r.id)}
        filters={[
          { key: "open", label: "Open (draft or sent)", group: "s", test: canConvert },
          { key: "won", label: "Accepted", group: "s", test: (r) => r.status === "accepted" },
          { key: "lost", label: "Rejected or expired", group: "s", test: (r) => r.status === "rejected" || r.status === "expired" },
          { key: "soon", label: "Expiring in 3 days", group: "v", test: (r) => canConvert(r) && daysBetween(TODAY, r.validTill) <= 3 },
        ]}
        groups={[
          { key: "customer", label: "Customer", by: (r) => partyById(r.customerId).name },
          { key: "status", label: "Status", by: (r) => r.status },
        ]}
        bulkActions={[
          { label: "Send on WhatsApp", icon: <MessageCircle className="size-3.5" />, run: (rows) => rows.filter(canConvert).forEach((r) => send(r, "WhatsApp")) },
          { label: "Mark rejected", variant: "danger", run: (rows) => { rows.filter(canConvert).forEach((r) => setQuoteStatus(r.id, "rejected")); toast("Marked as rejected"); } },
        ]}
      />

      <SidePanel
        open={!!q}
        onOpenChange={(o) => !o && setOpenId(null)}
        width={460}
        title={q ? <span className="font-mono">{q.number}</span> : ""}
        footer={
          q && canConvert(q) ? (
            <>
              <Button variant="danger" onClick={() => { setQuoteStatus(q.id, "rejected"); toast(`${q.number} marked rejected`); setOpenId(null); }}>
                <XCircle /> Mark rejected
              </Button>
              <Button variant="primary" onClick={() => doConvert(q)}>
                <ArrowRightLeft /> Convert to sales order
              </Button>
            </>
          ) : undefined
        }
      >
        {q && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <StatusBadge status={q.status} />
              <span className="text-sm text-ink-3">Issued {formatDate(q.date)}</span>
            </div>
            <dl className="grid grid-cols-[120px_1fr] gap-y-2.5 text-sm">
              <dt className="text-ink-3">Customer</dt>
              <dd className="font-medium">{partyById(q.customerId).name}</dd>
              <dt className="text-ink-3">GSTIN</dt>
              <dd className="font-mono text-[13px]">{partyById(q.customerId).gstin}</dd>
              <dt className="text-ink-3">Contact</dt>
              <dd>{partyById(q.customerId).contact} · {partyById(q.customerId).phone}</dd>
              <dt className="text-ink-3">Valid till</dt>
              <dd><Validity q={q} /></dd>
              <dt className="text-ink-3">Amount</dt>
              <dd className="tabular text-base font-semibold">{formatINR(q.amount)}</dd>
              {q.salesOrder && (
                <>
                  <dt className="text-ink-3">Sales order</dt>
                  <dd className="font-mono text-primary-700">{q.salesOrder}</dd>
                </>
              )}
            </dl>
            {canConvert(q) && (
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => send(q, "WhatsApp")}><MessageCircle /> WhatsApp</Button>
                <Button className="flex-1" onClick={() => send(q, "email")}><Mail /> Email</Button>
              </div>
            )}
            <p className={cn("rounded-md bg-surface-3 px-3 py-2 text-xs text-ink-2")}>
              Converting copies the customer, items and prices into a draft sales order. Credit limit is checked when the order is confirmed.
            </p>
          </div>
        )}
      </SidePanel>
    </>
  );
}
