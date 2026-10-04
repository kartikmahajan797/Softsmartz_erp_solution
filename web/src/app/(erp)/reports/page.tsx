"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Factory,
  FileSpreadsheet,
  FileText,
  IndianRupee,
  Landmark,
  Search,
  ShoppingCart,
  Star,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/erp/control-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRole } from "@/lib/store/app";
import { cn } from "@/lib/utils";

interface Report {
  name: string;
  desc: string;
  href?: string;
  cost?: boolean;
  ref: string;
  popular?: boolean;
}

const GROUPS: { key: string; label: string; icon: React.ReactNode; tone: string; reports: Report[] }[] = [
  {
    key: "sales", label: "Sales", icon: <ShoppingCart />, tone: "bg-info-bg text-info",
    reports: [
      { name: "Sales register", desc: "Invoices by customer, item and period with GST split", ref: "FR-RP-02", popular: true },
      { name: "Pending sales orders", desc: "Open lines, due dates and delivery progress", href: "/sales/orders", ref: "FR-RP-02" },
      { name: "Dispatch register", desc: "Delivery challans, vehicles and quantities", href: "/sales/deliveries", ref: "FR-RP-02" },
      { name: "Customer-wise sales", desc: "Revenue and quantity by customer and month", ref: "FR-RP-02" },
    ],
  },
  {
    key: "purchase", label: "Purchase", icon: <Truck />, tone: "bg-[#fdeee4] text-[#c2410c]",
    reports: [
      { name: "Purchase register", desc: "Bills by vendor with input GST", ref: "FR-RP-02" },
      { name: "Pending purchase orders", desc: "Ordered vs received, overdue deliveries", href: "/purchase/orders", ref: "FR-RP-02" },
      { name: "GRN register", desc: "Receipts with accepted and rejected quantities", href: "/purchase/receipts", ref: "FR-RP-02" },
      { name: "3-way match exceptions", desc: "Bills held for qty or rate mismatch", href: "/purchase/bills", ref: "FR-SP-03" },
    ],
  },
  {
    key: "inventory", label: "Inventory", icon: <Boxes />, tone: "bg-progress-bg text-progress",
    reports: [
      { name: "Stock summary", desc: "On hand, reserved and free by warehouse", href: "/inventory/stock", ref: "FR-RP-02", popular: true },
      { name: "Stock valuation", desc: "FIFO / weighted-average value by item", cost: true, ref: "FR-IN-04" },
      { name: "Stock ledger", desc: "Every movement, append-only", href: "/inventory/movements", ref: "FR-IN-03" },
      { name: "Reorder report", desc: "Items below reorder level with suggested qty", ref: "FR-IN-05" },
      { name: "Batch traceability", desc: "Raw lot → finished lot → customer", ref: "FR-MF-10 (R2)" },
    ],
  },
  {
    key: "mfg", label: "Manufacturing", icon: <Factory />, tone: "bg-warning-bg text-warning",
    reports: [
      { name: "Order profitability", desc: "Material, labour, overhead and scrap vs invoice value", href: "/reports/profitability", cost: true, ref: "FR-RP-03 · US-5", popular: true },
      { name: "Production summary", desc: "Good and rejected quantity by shift and work centre", ref: "FR-RP-01" },
      { name: "Scrap & wastage", desc: "Scrap by reason code, item and operator", href: "/manufacturing/scrap", ref: "FR-RP-03" },
      { name: "Work order status", desc: "Released, in progress, completed and late", href: "/manufacturing/work-orders", ref: "FR-RP-02" },
    ],
  },
  {
    key: "gst", label: "GST", icon: <Landmark />, tone: "bg-success-bg text-success",
    reports: [
      { name: "GSTR-1 data", desc: "B2B, B2C, credit notes and HSN summary for filing", ref: "FR-FI-03", popular: true },
      { name: "HSN summary", desc: "Outward supplies by HSN and rate", ref: "FR-FI-03" },
      { name: "e-Invoice status", desc: "IRN generated, pending and failed", href: "/finance/einvoice", ref: "FR-FI-04" },
      { name: "ITC-04 (job-work)", desc: "Challans sent and received in the period", href: "/jobwork/itc04", ref: "FR-JW-03" },
    ],
  },
  {
    key: "fin", label: "Finance", icon: <IndianRupee />, tone: "bg-primary-50 text-primary-700",
    reports: [
      { name: "Receivables ageing", desc: "Customer dues by age bucket", href: "/finance/ageing", cost: true, ref: "FR-FI-06", popular: true },
      { name: "Payables ageing", desc: "Vendor dues with MSME flag", href: "/finance/ageing", cost: true, ref: "FR-FI-06" },
      { name: "Cash and bank book", desc: "Receipts and payments by account", href: "/finance/payments", cost: true, ref: "FR-FI-02" },
      { name: "Day book", desc: "All vouchers posted on a date", cost: true, ref: "FR-FI-02" },
    ],
  },
];

export default function ReportsPage() {
  const router = useRouter();
  const role = useRole();
  const [q, setQ] = React.useState("");
  const [group, setGroup] = React.useState<string | null>(null);

  const match = (r: Report) => !q || `${r.name} ${r.desc}`.toLowerCase().includes(q.toLowerCase());
  const open = (r: Report) => {
    if (r.cost && !role.seesCost) return toast.error("Restricted by field rules", { description: "Your role cannot see cost or value reports" });
    router.push(r.href ?? `/reports/view/${r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "")}`);
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-2.5 sm:px-6">
        <Breadcrumbs items={[{ label: "Reports" }]} />
        <div className="ml-auto flex h-8 w-full items-center gap-2 rounded-md border border-line-strong bg-surface px-2.5 shadow-xs focus-within:border-primary-500 focus-within:ring-3 focus-within:ring-primary-500/15 sm:w-80">
          <Search className="size-4 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reports…" className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-ink-3" aria-label="Search reports" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1400px] p-3 sm:p-5">
        <div className="mb-4 flex flex-wrap gap-1.5">
          <Chip active={!group} onClick={() => setGroup(null)}>All</Chip>
          {GROUPS.map((g) => (
            <Chip key={g.key} active={group === g.key} onClick={() => setGroup(g.key)}>{g.label}</Chip>
          ))}
        </div>

        {!q && !group && (
          <section className="mb-6">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Star className="size-4 text-accent-500" /> Most used</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {GROUPS.flatMap((g) => g.reports.filter((r) => r.popular).map((r) => ({ r, g }))).map(({ r, g }) => (
                <button key={r.name} onClick={() => open(r)} className="group rounded-xl border border-line bg-surface p-3 text-left shadow-xs transition hover:border-line-strong hover:shadow-sm">
                  <span className={cn("mb-2 flex size-8 items-center justify-center rounded-lg [&_svg]:size-4", g.tone)}>{g.icon}</span>
                  <span className="block text-sm font-semibold">{r.name}</span>
                  <span className="mt-0.5 block text-xs text-ink-3">{r.desc}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {GROUPS.filter((g) => !group || g.key === group).map((g) => {
            const list = g.reports.filter(match);
            if (!list.length) return null;
            return (
              <section key={g.key} className="rounded-xl border border-line bg-surface shadow-xs">
                <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
                  <span className={cn("flex size-7 items-center justify-center rounded-md [&_svg]:size-4", g.tone)}>{g.icon}</span>
                  <h2 className="text-sm font-semibold">{g.label}</h2>
                  <span className="ml-auto text-xs text-ink-3">{list.length}</span>
                </header>
                <ul>
                  {list.map((r) => {
                    const locked = r.cost && !role.seesCost;
                    return (
                      <li key={r.name} className="group flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0 hover:bg-surface-2">
                        <button onClick={() => open(r)} className="min-w-0 flex-1 text-left">
                          <span className={cn("flex items-center gap-2 text-sm font-medium", locked && "text-ink-3")}>
                            {r.name}
                            {!r.href && <Badge tone="neutral" dot={false} className="h-[18px] px-1.5 text-2xs">Viewer</Badge>}
                            {locked && <Badge tone="warning" dot={false} className="h-[18px] px-1.5 text-2xs">Restricted</Badge>}
                          </span>
                          <span className="block truncate text-xs text-ink-3">{r.desc} · {r.ref}</span>
                        </button>
                        <div className="flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                          <Button size="icon-sm" variant="ghost" aria-label={`Export ${r.name} to Excel`} disabled={locked} onClick={() => toast.success(`${r.name}.xlsx exported`)}><FileSpreadsheet /></Button>
                          <Button size="icon-sm" variant="ghost" aria-label={`Export ${r.name} to PDF`} disabled={locked} onClick={() => toast.success(`${r.name}.pdf exported`)}><FileText /></Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
        {GROUPS.every((g) => !g.reports.some(match)) && (
          <div className="py-16 text-center text-sm text-ink-3"><BarChart3 className="mx-auto mb-2 size-6" />No reports match “{q}”.</div>
        )}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={active} className={cn("h-7 rounded-full border px-3 text-xs font-medium transition-colors", active ? "border-primary-600 bg-primary-600 text-white" : "border-line-strong bg-surface text-ink-2 hover:bg-surface-3")}>
      {children}
    </button>
  );
}
