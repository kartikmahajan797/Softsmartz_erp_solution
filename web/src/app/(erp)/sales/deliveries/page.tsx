"use client";

import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { partyById } from "@/lib/data/masters";
import { type DeliveryChallan, useSales } from "@/lib/store/sales";
import { useFinance } from "@/lib/store/finance";
import { formatDate, formatINR, formatLakh, formatNum } from "@/lib/utils";

export default function DeliveriesPage() {
  const router = useRouter();
  const deliveries = useSales((s) => s.deliveries);
  const orders = useSales((s) => s.orders);
  const create = useFinance((s) => s.createInvoiceFromDelivery);

  const invoice = (d: DeliveryChallan) => {
    const so = orders.find((o) => o.number === d.soNumber);
    const line = so?.lines.find((l) => Math.abs(d.value / d.qty - l.rate * (1 - l.discountPct / 100)) < 1) ?? so?.lines[0];
    const inv = create({ number: d.number, soNumber: d.soNumber, customerId: d.customerId, qty: d.qty, value: d.value, vehicle: d.vehicle, itemId: line?.itemId ?? "i9", discountPct: line?.discountPct ?? 0 });
    useSales.setState((s) => ({ deliveries: s.deliveries.map((x) => (x.id === d.id ? { ...x, invoiced: true } : x)) }));
    toast.success(`Draft invoice ${inv.number} created`, { description: `From ${d.number} · review and post`, action: { label: "Open", onClick: () => router.push(`/finance/invoices/${inv.id}`) } });
    return inv;
  };

  const columns: Column<DeliveryChallan>[] = [
    { key: "number", header: "Challan", value: (r) => r.number, cell: (r) => <span className="font-mono text-[12.5px] font-medium">{r.number}</span> },
    { key: "date", header: "Date", value: (r) => r.date, cell: (r) => formatDate(r.date) },
    { key: "customer", header: "Customer", value: (r) => partyById(r.customerId).name, cell: (r) => <span className="font-medium">{partyById(r.customerId).name}</span> },
    { key: "so", header: "Sales order", value: (r) => r.soNumber, cell: (r) => <span className="font-mono text-xs">{r.soNumber}</span> },
    { key: "vehicle", header: "Vehicle", value: (r) => r.vehicle, cell: (r) => (r.vehicle ? <span className="font-mono text-xs">{r.vehicle}</span> : <span className="text-ink-3">—</span>) },
    { key: "qty", header: "Qty", align: "right", value: (r) => r.qty, cell: (r) => formatNum(r.qty), total: (rows) => formatNum(rows.reduce((a, r) => a + r.qty, 0)) },
    { key: "value", header: "Value", align: "right", value: (r) => r.value, cell: (r) => formatINR(r.value), total: (rows) => formatLakh(rows.reduce((a, r) => a + r.value, 0)) },
    { key: "status", header: "Status", value: (r) => r.status, cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: "invoiced",
      header: "Invoice",
      value: (r) => (r.invoiced ? 1 : 0),
      cell: (r) =>
        r.invoiced ? (
          <Badge tone="success">Invoiced</Badge>
        ) : r.status === "posted" ? (
          <Button size="xs" variant="subtle" onClick={(e) => { e.stopPropagation(); invoice(r); }}>
            <FileText className="!size-3" /> Create invoice
          </Button>
        ) : (
          <span className="text-xs text-ink-3">Post challan first</span>
        ),
    },
  ];

  return (
    <ListPage
      title="Delivery challans"
      crumbs={[{ label: "Sales", href: "/sales/orders" }, { label: "Delivery challans" }]}
      rows={deliveries}
      columns={columns}
      search={(r) => `${r.number} ${r.soNumber} ${partyById(r.customerId).name} ${r.vehicle}`}
      placeholder="Search challan, order, customer, vehicle…"
      onRowClick={(r) => {
        const so = orders.find((o) => o.number === r.soNumber);
        if (so) router.push(`/sales/orders/${so.id}`);
      }}
      filters={[
        { key: "uninv", label: "Not invoiced", group: "i", test: (r) => !r.invoiced && r.status === "posted" },
        { key: "draft", label: "Draft challans", group: "s", test: (r) => r.status === "draft" },
      ]}
      groups={[
        { key: "customer", label: "Customer", by: (r) => partyById(r.customerId).name },
        { key: "so", label: "Sales order", by: (r) => r.soNumber },
      ]}
      bulkActions={[
        {
          label: "Create invoices",
          variant: "primary",
          run: (rows) => {
            const ok = rows.filter((r) => !r.invoiced && r.status === "posted");
            ok.forEach(invoice);
            if (!ok.length) toast.error("Select posted challans that are not invoiced");
          },
        },
      ]}
    />
  );
}
