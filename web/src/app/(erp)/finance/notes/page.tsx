"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { CreditNoteDialog } from "@/components/finance/credit-note-dialog";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { partyById } from "@/lib/data/masters";
import { type Note, useFinance } from "@/lib/store/finance";
import { formatDate, formatINR, formatLakh } from "@/lib/utils";

export default function NotesPage() {
  const router = useRouter();
  const notes = useFinance((s) => s.notes);
  const invoices = useFinance((s) => s.invoices);
  const [open, setOpen] = React.useState(false);

  const columns: Column<Note>[] = [
    { key: "number", header: "Number", value: (r) => r.number, cell: (r) => <span className="font-mono text-[12.5px] font-medium">{r.number}</span> },
    { key: "type", header: "Type", value: (r) => r.type, cell: (r) => <Badge tone={r.type === "credit" ? "info" : "warning"} dot={false}>{r.type === "credit" ? "Credit note" : "Debit note"}</Badge> },
    { key: "date", header: "Date", value: (r) => r.date, cell: (r) => formatDate(r.date) },
    { key: "party", header: "Customer", value: (r) => partyById(r.partyId).name, cell: (r) => <span className="font-medium">{partyById(r.partyId).name}</span> },
    { key: "inv", header: "Against invoice", value: (r) => r.invoiceNumber, cell: (r) => <span className="font-mono text-xs">{r.invoiceNumber}</span> },
    { key: "reason", header: "Reason", value: (r) => r.reason, cell: (r) => r.reason },
    { key: "taxable", header: "Taxable", align: "right", value: (r) => r.taxable, cell: (r) => formatINR(r.taxable) },
    { key: "total", header: "Total", align: "right", value: (r) => r.taxable + r.gst, cell: (r) => <span className="font-medium">{formatINR(r.taxable + r.gst)}</span>, total: (rows) => formatLakh(rows.reduce((a, r) => a + (r.type === "credit" ? -1 : 1) * (r.taxable + r.gst), 0)) },
    { key: "irn", header: "e-Invoice", value: (r) => r.irnStatus, cell: (r) => <StatusBadge status={r.irnStatus} /> },
    { key: "status", header: "Status", value: (r) => r.status, cell: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <ListPage
        title="Credit & debit notes"
        crumbs={[{ label: "Finance & GST", href: "/finance/invoices" }, { label: "Credit & debit notes" }]}
        rows={notes}
        columns={columns}
        search={(r) => `${r.number} ${r.invoiceNumber} ${partyById(r.partyId).name} ${r.reason}`}
        placeholder="Search note, invoice, customer…"
        onNew={() => setOpen(true)}
        newLabel="New note"
        onRowClick={(r) => {
          const inv = invoices.find((i) => i.number === r.invoiceNumber);
          if (inv) router.push(`/finance/invoices/${inv.id}`);
        }}
        filters={[
          { key: "cn", label: "Credit notes", group: "t", test: (r) => r.type === "credit" },
          { key: "dn", label: "Debit notes", group: "t", test: (r) => r.type === "debit" },
          { key: "ret", label: "Sales returns", group: "r", test: (r) => r.reason === "Sales return" },
        ]}
        groups={[
          { key: "party", label: "Customer", by: (r) => partyById(r.partyId).name },
          { key: "reason", label: "Reason", by: (r) => r.reason },
        ]}
      />
      <CreditNoteDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
