"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarClock, FileSpreadsheet, FileText, Lock, Printer, Search } from "lucide-react";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/erp/control-panel";
import { type Column, DataTable } from "@/components/erp/data-table";
import { EmptyState } from "@/components/erp/form-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Tip } from "@/components/ui/overlay";
import { company, itemById, parties, partyById, warehouses, workCentres } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { invTotals, useFinance } from "@/lib/store/finance";
import { stockByItem, useInventory } from "@/lib/store/inventory";
import { useMfg } from "@/lib/store/manufacturing";
import { billTotals, usePurchase } from "@/lib/store/purchase";
import { cn, formatDate, formatINR, formatLakh, formatNum, TODAY } from "@/lib/utils";

/* ---------------- Report definitions ---------------- */

type Row = { id: string } & Record<string, string | number>;

interface ColDef {
  key: string;
  header: string;
  kind?: "text" | "mono" | "date" | "inr" | "num" | "pct";
  total?: boolean;
}

interface ReportDef {
  title: string;
  group: string;
  desc: string;
  ref: string;
  cost?: boolean;
  /** Which filter controls apply. */
  filters: ("period" | "party" | "warehouse" | "workCentre")[];
  partyType?: "customer" | "vendor";
  cols: ColDef[];
  /** Column used for the bar chart (category, value). */
  chart?: { by: string; value: string; label: string };
  r2?: boolean;
}

const DEFS: Record<string, ReportDef> = {
  "sales-register": {
    title: "Sales register", group: "Sales", ref: "FR-RP-02", desc: "Posted tax invoices with taxable value and GST split",
    filters: ["period", "party"], partyType: "customer",
    cols: [
      { key: "number", header: "Invoice", kind: "mono" }, { key: "date", header: "Date", kind: "date" }, { key: "party", header: "Customer" },
      { key: "gstin", header: "GSTIN", kind: "mono" }, { key: "taxable", header: "Taxable", kind: "inr", total: true },
      { key: "cgst", header: "CGST", kind: "inr", total: true }, { key: "sgst", header: "SGST", kind: "inr", total: true },
      { key: "igst", header: "IGST", kind: "inr", total: true }, { key: "total", header: "Invoice value", kind: "inr", total: true },
    ],
    chart: { by: "party", value: "total", label: "Invoice value by customer" },
  },
  "customer-wise-sales": {
    title: "Customer-wise sales", group: "Sales", ref: "FR-RP-02", desc: "Revenue, quantity and invoice count per customer",
    filters: ["period"],
    cols: [
      { key: "party", header: "Customer" }, { key: "city", header: "City" }, { key: "invoices", header: "Invoices", kind: "num", total: true },
      { key: "qty", header: "Quantity", kind: "num", total: true }, { key: "taxable", header: "Taxable", kind: "inr", total: true },
      { key: "share", header: "Share", kind: "pct" },
    ],
    chart: { by: "party", value: "taxable", label: "Taxable revenue by customer" },
  },
  "purchase-register": {
    title: "Purchase register", group: "Purchase", ref: "FR-RP-02", desc: "Vendor bills with input GST and 3-way-match status",
    filters: ["period", "party"], partyType: "vendor",
    cols: [
      { key: "number", header: "Bill", kind: "mono" }, { key: "vendorBill", header: "Vendor bill no.", kind: "mono" }, { key: "date", header: "Date", kind: "date" },
      { key: "party", header: "Vendor" }, { key: "taxable", header: "Taxable", kind: "inr", total: true }, { key: "tax", header: "Input GST", kind: "inr", total: true },
      { key: "total", header: "Bill value", kind: "inr", total: true }, { key: "status", header: "Match" },
    ],
    chart: { by: "party", value: "total", label: "Bill value by vendor" },
  },
  "stock-valuation": {
    title: "Stock valuation", group: "Inventory", ref: "FR-IN-04", cost: true, desc: "Quantity and value by item using its valuation method (FIFO or weighted average)",
    filters: ["warehouse"],
    cols: [
      { key: "code", header: "Code", kind: "mono" }, { key: "name", header: "Item" }, { key: "method", header: "Method" },
      { key: "qty", header: "Qty", kind: "num" }, { key: "uom", header: "UoM" }, { key: "rate", header: "Unit cost", kind: "inr" },
      { key: "value", header: "Value", kind: "inr", total: true },
    ],
    chart: { by: "name", value: "value", label: "Stock value by item" },
  },
  "reorder-report": {
    title: "Reorder report", group: "Inventory", ref: "FR-IN-05", desc: "Items at or below reorder level with suggested order quantity",
    filters: [],
    cols: [
      { key: "code", header: "Code", kind: "mono" }, { key: "name", header: "Item" }, { key: "free", header: "Free qty", kind: "num" },
      { key: "reorder", header: "Reorder level", kind: "num" }, { key: "shortBy", header: "Short by", kind: "num" },
      { key: "suggest", header: "Suggested qty", kind: "num" }, { key: "uom", header: "UoM" },
    ],
  },
  "batch-traceability": {
    title: "Batch traceability", group: "Inventory", ref: "FR-MF-10 (R2)", desc: "Lots on hand by warehouse with receipt date — full raw → finished → customer genealogy ships in R2",
    filters: ["warehouse"], r2: true,
    cols: [
      { key: "batch", header: "Batch / lot", kind: "mono" }, { key: "code", header: "Item code", kind: "mono" }, { key: "name", header: "Item" },
      { key: "warehouse", header: "Warehouse" }, { key: "received", header: "Received", kind: "date" }, { key: "qty", header: "Qty", kind: "num" },
    ],
  },
  "production-summary": {
    title: "Production summary", group: "Manufacturing", ref: "FR-RP-01", desc: "Good and rejected quantity by work centre and operator from job-card events",
    filters: ["workCentre"],
    cols: [
      { key: "wc", header: "Work centre" }, { key: "jobs", header: "Job cards", kind: "num", total: true }, { key: "planned", header: "Planned", kind: "num", total: true },
      { key: "good", header: "Good", kind: "num", total: true }, { key: "reject", header: "Rejected", kind: "num", total: true },
      { key: "rejectPct", header: "Reject %", kind: "pct" }, { key: "eff", header: "Time efficiency", kind: "pct" },
    ],
    chart: { by: "wc", value: "good", label: "Good quantity by work centre" },
  },
  "gstr1-data": {
    title: "GSTR-1 data", group: "GST", ref: "FR-FI-03", desc: "Outward supplies for the return period — B2B invoices by recipient GSTIN, with credit notes",
    filters: ["period"],
    cols: [
      { key: "section", header: "Section" }, { key: "gstin", header: "Recipient GSTIN", kind: "mono" }, { key: "number", header: "Document", kind: "mono" },
      { key: "date", header: "Date", kind: "date" }, { key: "pos", header: "Place of supply" }, { key: "taxable", header: "Taxable", kind: "inr", total: true },
      { key: "igst", header: "IGST", kind: "inr", total: true }, { key: "cgst", header: "CGST", kind: "inr", total: true }, { key: "sgst", header: "SGST", kind: "inr", total: true },
    ],
  },
  "hsn-summary": {
    title: "HSN summary", group: "GST", ref: "FR-FI-03", desc: "Outward supplies by HSN and GST rate (Table 12 of GSTR-1)",
    filters: ["period"],
    cols: [
      { key: "hsn", header: "HSN", kind: "mono" }, { key: "rate", header: "Rate" }, { key: "qty", header: "Quantity", kind: "num", total: true },
      { key: "taxable", header: "Taxable", kind: "inr", total: true }, { key: "tax", header: "Total tax", kind: "inr", total: true },
    ],
    chart: { by: "hsn", value: "taxable", label: "Taxable value by HSN" },
  },
  "day-book": {
    title: "Day book", group: "Finance", ref: "FR-FI-02", cost: true, desc: "Every voucher posted in the period — sales, purchase, receipts, payments and notes",
    filters: ["period"],
    cols: [
      { key: "date", header: "Date", kind: "date" }, { key: "type", header: "Voucher type" }, { key: "number", header: "Voucher", kind: "mono" },
      { key: "party", header: "Party" }, { key: "debit", header: "Debit", kind: "inr", total: true }, { key: "credit", header: "Credit", kind: "inr", total: true },
    ],
  },
};

const PERIODS = [
  { key: "this_month", label: "This month (Oct 2026)", from: "2026-10-01", to: TODAY },
  { key: "last_month", label: "Last month (Sep 2026)", from: "2026-09-01", to: "2026-09-30" },
  { key: "quarter", label: "Q2 FY 2026-27 (Jul-Sep)", from: "2026-07-01", to: "2026-09-30" },
  { key: "fy", label: "FY 2026-27 to date", from: "2026-04-01", to: TODAY },
];

/* ---------------- Data ---------------- */

function useReportRows(slug: string, f: { from: string; to: string; party: string; warehouse: string; wc: string }): Row[] {
  const invoices = useFinance((s) => s.invoices);
  const notes = useFinance((s) => s.notes);
  const payments = useFinance((s) => s.payments);
  const bills = usePurchase((s) => s.bills);
  const lots = useInventory((s) => s.lots);
  const items = useInventory((s) => s.items);
  const jcs = useMfg((s) => s.jcs);

  return React.useMemo(() => {
    const inPeriod = (d: string) => d >= f.from && d <= f.to;
    const posted = invoices.filter((i) => i.status === "posted" && inPeriod(i.date));
    switch (slug) {
      case "sales-register":
        return posted
          .filter((i) => !f.party || i.customerId === f.party)
          .map((i) => {
            const t = invTotals(i);
            const p = partyById(i.customerId);
            return { id: i.id, number: i.number, date: i.date, party: p.name, gstin: p.gstin, taxable: t.taxable, cgst: t.cgst, sgst: t.sgst, igst: t.igst, total: t.total };
          });
      case "customer-wise-sales": {
        const m = new Map<string, Row>();
        posted.forEach((i) => {
          const p = partyById(i.customerId);
          const t = invTotals(i);
          const cur = m.get(p.id) ?? { id: p.id, party: p.name, city: p.city, invoices: 0, qty: 0, taxable: 0, share: 0 };
          cur.invoices = Number(cur.invoices) + 1;
          cur.qty = Number(cur.qty) + i.lines.reduce((a, l) => a + l.qty, 0);
          cur.taxable = Number(cur.taxable) + t.taxable;
          m.set(p.id, cur);
        });
        const rows = [...m.values()];
        const sum = rows.reduce((a, r) => a + Number(r.taxable), 0) || 1;
        return rows.map((r): Row => ({ ...r, share: (Number(r.taxable) / sum) * 100 })).sort((a, b) => Number(b.taxable) - Number(a.taxable));
      }
      case "purchase-register":
        return bills
          .filter((b) => inPeriod(b.date) && (!f.party || b.vendorId === f.party))
          .map((b) => {
            const t = billTotals(b);
            return { id: b.id, number: b.number, vendorBill: b.vendorBillNo, date: b.date, party: partyById(b.vendorId).name, taxable: t.taxable, tax: t.tax, total: t.total, status: b.status };
          });
      case "stock-valuation":
        return items
          .map((it) => {
            const mine = lots.filter((l) => l.itemId === it.id && (!f.warehouse || l.warehouseId === f.warehouse));
            const qty = mine.reduce((a, l) => a + l.qty, 0);
            const value = mine.reduce((a, l) => a + l.qty * l.unitCost, 0);
            return { id: it.id, code: it.code, name: it.name, method: it.valuation, qty, uom: it.uom, rate: qty ? value / qty : 0, value };
          })
          .filter((r) => r.qty !== 0);
      case "reorder-report":
        return stockByItem(lots, items)
          .filter((s) => s.item.reorderLevel > 0 && s.free <= s.item.reorderLevel)
          .map((s) => ({
            id: s.item.id, code: s.item.code, name: s.item.name, free: s.free, reorder: s.item.reorderLevel,
            shortBy: s.item.reorderLevel - s.free, suggest: Math.max(s.item.reorderQty, s.item.reorderLevel - s.free), uom: s.item.uom,
          }));
      case "batch-traceability":
        return lots
          .filter((l) => l.qty !== 0 && (!f.warehouse || l.warehouseId === f.warehouse))
          .map((l) => {
            const it = itemById(l.itemId);
            return { id: l.id, batch: l.batch || "—", code: it.code, name: it.name, warehouse: warehouses.find((w) => w.id === l.warehouseId)?.name ?? l.warehouseId, received: l.receivedOn, qty: l.qty };
          });
      case "production-summary":
        return workCentres
          .filter((w) => !f.wc || w.id === f.wc)
          .map((w) => {
            const mine = jcs.filter((j) => j.wcId === w.id);
            const good = mine.reduce((a, j) => a + j.good, 0);
            const reject = mine.reduce((a, j) => a + j.reject, 0);
            const plannedMin = mine.reduce((a, j) => a + (j.plannedMin * (j.good + j.reject)) / Math.max(j.qtyPlanned, 1), 0);
            const actualMin = mine.reduce((a, j) => a + j.actualMin, 0);
            return {
              id: w.id, wc: w.name, jobs: mine.length, planned: mine.reduce((a, j) => a + j.qtyPlanned, 0), good, reject,
              rejectPct: good + reject ? (reject / (good + reject)) * 100 : 0, eff: actualMin ? (plannedMin / actualMin) * 100 : 0,
            };
          })
          .filter((r) => r.jobs > 0);
      case "gstr1-data": {
        const rows: Row[] = posted.map((i) => {
          const t = invTotals(i);
          const p = partyById(i.customerId);
          return { id: i.id, section: "B2B", gstin: p.gstin, number: i.number, date: i.date, pos: `${p.stateCode} - ${p.state}`, taxable: t.taxable, igst: t.igst, cgst: t.cgst, sgst: t.sgst };
        });
        notes
          .filter((n) => n.status === "posted" && inPeriod(n.date))
          .forEach((n) => {
            const p = partyById(n.partyId);
            const inter = p.stateCode !== company.stateCode;
            const sign = n.type === "credit" ? -1 : 1;
            rows.push({
              id: n.id, section: n.type === "credit" ? "CDNR · Credit" : "CDNR · Debit", gstin: p.gstin, number: n.number, date: n.date,
              pos: `${p.stateCode} - ${p.state}`, taxable: sign * n.taxable, igst: inter ? sign * n.gst : 0, cgst: inter ? 0 : (sign * n.gst) / 2, sgst: inter ? 0 : (sign * n.gst) / 2,
            });
          });
        return rows;
      }
      case "hsn-summary": {
        const m = new Map<string, Row>();
        posted.forEach((i) =>
          i.lines.forEach((l) => {
            const it = itemById(l.itemId);
            const taxable = l.qty * l.rate * (1 - l.discountPct / 100);
            const k = `${it.hsn}-${it.gstRate}`;
            const cur = m.get(k) ?? { id: k, hsn: it.hsn, rate: `${it.gstRate}%`, qty: 0, taxable: 0, tax: 0 };
            cur.qty = Number(cur.qty) + l.qty;
            cur.taxable = Number(cur.taxable) + taxable;
            cur.tax = Number(cur.tax) + (taxable * it.gstRate) / 100;
            m.set(k, cur);
          }),
        );
        return [...m.values()];
      }
      case "day-book": {
        const rows: Row[] = [];
        posted.forEach((i) => rows.push({ id: i.id, date: i.date, type: "Sales", number: i.number, party: partyById(i.customerId).name, debit: invTotals(i).total, credit: 0 }));
        bills
          .filter((b) => b.status === "posted" && inPeriod(b.date))
          .forEach((b) => rows.push({ id: b.id, date: b.date, type: "Purchase", number: b.number, party: partyById(b.vendorId).name, debit: 0, credit: billTotals(b).total }));
        payments
          .filter((p) => p.status === "posted" && inPeriod(p.date))
          .forEach((p) =>
            rows.push({ id: p.id, date: p.date, type: p.kind === "receipt" ? "Receipt" : "Payment", number: p.number, party: partyById(p.partyId).name, debit: p.kind === "payment" ? p.amount : 0, credit: p.kind === "receipt" ? p.amount : 0 }),
          );
        notes
          .filter((n) => n.status === "posted" && inPeriod(n.date))
          .forEach((n) => rows.push({ id: n.id, date: n.date, type: n.type === "credit" ? "Credit note" : "Debit note", number: n.number, party: partyById(n.partyId).name, debit: n.type === "debit" ? n.taxable + n.gst : 0, credit: n.type === "credit" ? n.taxable + n.gst : 0 }));
        return rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
      }
      default:
        return [];
    }
  }, [slug, f.from, f.to, f.party, f.warehouse, f.wc, invoices, notes, payments, bills, lots, items, jcs]);
}

/* ---------------- Page ---------------- */

const fmt = (c: ColDef, v: string | number | undefined) => {
  if (v === undefined || v === "") return "—";
  switch (c.kind) {
    case "inr": return formatINR(Number(v));
    case "num": return formatNum(Number(v));
    case "pct": return `${Number(v).toFixed(1)}%`;
    case "date": return formatDate(String(v));
    default: return String(v);
  }
};

export default function ReportViewerPage() {
  const { slug } = useParams<{ slug: string }>();
  const def = DEFS[slug];
  const role = useRole();
  const [period, setPeriod] = React.useState("fy");
  const [party, setParty] = React.useState("");
  const [warehouse, setWarehouse] = React.useState("");
  const [wc, setWc] = React.useState("");
  const [q, setQ] = React.useState("");
  const per = PERIODS.find((p) => p.key === period)!;
  const rows = useReportRows(slug, { from: per.from, to: per.to, party, warehouse, wc });

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(s))) : rows;
  }, [rows, q]);

  if (!def) {
    return (
      <div className="p-6">
        <EmptyState icon={<Search />} title="Report not found" body="This report does not exist or was renamed." action={<Link href="/reports" className="text-sm text-primary-700 hover:underline">Back to reports</Link>} />
      </div>
    );
  }

  if (def.cost && !role.seesCost) {
    return (
      <div className="p-6">
        <EmptyState icon={<Lock />} title="Restricted by field rules" body={`Your role (${role.label}) cannot see cost or value reports.`} action={<Link href="/reports" className="text-sm text-primary-700 hover:underline">Back to reports</Link>} />
      </div>
    );
  }

  const columns: Column<Row>[] = def.cols.map((c, i) => {
    const numeric = c.kind === "inr" || c.kind === "num" || c.kind === "pct";
    return {
      key: c.key,
      header: c.header,
      align: numeric ? "right" : "left",
      value: (r) => r[c.key],
      cell: (r) =>
        c.key === "status" ? (
          <Badge tone={r.status === "posted" || r.status === "matched" ? "success" : r.status === "mismatch" ? "danger" : "warning"}>{String(r.status).replace(/_/g, " ")}</Badge>
        ) : c.key === "section" ? (
          <Badge tone={String(r.section).startsWith("B2B") ? "info" : "progress"} dot={false}>{r.section}</Badge>
        ) : (
          <span className={cn(c.kind === "mono" && "font-mono text-[12.5px]", i === 0 && c.kind !== "mono" && "font-medium", typeof r[c.key] === "number" && Number(r[c.key]) < 0 && "text-danger")}>{fmt(c, r[c.key])}</span>
        ),
      total: c.total ? (rs) => fmt(c, rs.reduce((a, r) => a + Number(r[c.key] ?? 0), 0)) : undefined,
    };
  });

  const chartData = def.chart
    ? [...filtered
        .reduce((m, r) => {
          const k = String(r[def.chart!.by]).replace(/ (Ltd|Pvt Ltd|Co|Works)$/, "");
          return m.set(k, (m.get(k) ?? 0) + Number(r[def.chart!.value]));
        }, new Map<string, number>())
        .entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
    : [];
  const currencyChart = def.cols.find((c) => c.key === def.chart?.value)?.kind === "inr";

  const exportCsv = () => {
    const csv = [def.cols.map((c) => c.header).join(","), ...filtered.map((r) => def.cols.map((c) => JSON.stringify(r[c.key] ?? "")).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${slug}-${period}.csv`;
    a.click();
    toast.success(`${def.title} exported`, { description: `${filtered.length} rows · opens in Excel` });
  };

  const partyOptions = parties.filter((p) => (def.partyType ? p.type.includes(def.partyType) : true));
  const headline = def.cols.filter((c) => c.total && c.kind === "inr").slice(-1)[0];

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-line bg-surface px-4 pt-3 pb-3 sm:px-6">
        <Breadcrumbs items={[{ label: "Reports", href: "/reports" }, { label: def.group }, { label: def.title }]} />
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{def.title}</h1>
              <Badge tone="neutral" dot={false}>{def.ref}</Badge>
              {def.r2 && <Badge tone="progress" dot={false}>Full genealogy in R2</Badge>}
            </div>
            <p className="mt-0.5 max-w-2xl text-sm text-ink-3">{def.desc}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tip label="Scheduled email / WhatsApp delivery ships in R2 (FR-RP-04)">
              <span><Button disabled><CalendarClock /> Schedule</Button></span>
            </Tip>
            <Button onClick={() => window.print()}><Printer /> Print</Button>
            <Button onClick={() => toast.success(`${def.title}.pdf generated`, { description: "Rendered by the PDF worker with your letterhead" })}><FileText /> PDF</Button>
            <Button variant="primary" onClick={exportCsv}><FileSpreadsheet /> Excel</Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {def.filters.includes("period") && (
            <Select aria-label="Period" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-56">
              {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </Select>
          )}
          {def.filters.includes("party") && (
            <Select aria-label={def.partyType === "vendor" ? "Vendor" : "Customer"} value={party} onChange={(e) => setParty(e.target.value)} className="w-60">
              <option value="">All {def.partyType === "vendor" ? "vendors" : "customers"}</option>
              {partyOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          )}
          {def.filters.includes("warehouse") && (
            <Select aria-label="Warehouse" value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className="w-60">
              <option value="">All warehouses</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}
            </Select>
          )}
          {def.filters.includes("workCentre") && (
            <Select aria-label="Work centre" value={wc} onChange={(e) => setWc(e.target.value)} className="w-56">
              <option value="">All work centres</option>
              {workCentres.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
          )}
          <div className="relative w-full sm:ml-auto sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-3" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search in report…" className="pl-8" aria-label="Search in report" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-3 sm:p-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Rows" value={formatNum(filtered.length)} hint={def.filters.includes("period") ? per.label : "As of " + formatDate(TODAY)} />
          {headline && <Stat label={headline.header} value={formatLakh(filtered.reduce((a, r) => a + Number(r[headline.key] ?? 0), 0))} hint="Sum of filtered rows" />}
          <Stat label="Company" value={<span className="text-base">{company.shortName}</span>} hint={`GSTIN ${company.gstin}`} />
          <Stat label="Generated" value={<span className="text-base">{formatDate(TODAY)}</span>} hint={`by ${role.user}`} />
        </div>

        {def.chart && chartData.length > 0 && (
          <section className="rounded-xl border border-line bg-surface shadow-xs">
            <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <h2 className="text-sm font-semibold">{def.chart.label}</h2>
              <span className="text-xs text-ink-3">Top {chartData.length}</span>
            </header>
            <div className="h-56 px-2 py-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-3)" }} tickLine={false} axisLine={false} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--text-3)" }} tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => (currencyChart ? formatLakh(v) : formatNum(v))} />
                  <Tooltip cursor={{ fill: "var(--surface-3)" }} formatter={(v) => (currencyChart ? formatINR(Number(v)) : formatNum(Number(v)))} contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
                  <Bar dataKey="value" name={def.cols.find((c) => c.key === def.chart!.value)?.header} fill="var(--primary-600)" radius={[4, 4, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
          <DataTable
            rows={filtered}
            columns={columns}
            selectable={false}
            empty={<><div className="text-sm font-medium">No data for these filters</div><div className="text-xs text-ink-3">Try a wider period or clear the filters.</div></>}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3 shadow-xs">
      <div className="text-xs font-medium text-ink-3">{label}</div>
      <div className="tabular mt-1 truncate text-xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 truncate text-xs text-ink-3">{hint}</div>}
    </div>
  );
}
