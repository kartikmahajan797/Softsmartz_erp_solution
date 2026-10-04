"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tabs as RT } from "radix-ui";
import { Activity, CheckCircle2, Loader2, PlugZap, RefreshCw, Truck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/erp/control-panel";
import { DataTable, type Column } from "@/components/erp/data-table";
import { Card } from "@/components/erp/form-view";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Dialog } from "@/components/ui/overlay";
import { partyById } from "@/lib/data/masters";
import { type EwayBill, type Invoice, invTotals, useFinance } from "@/lib/store/finance";
import { cn, daysBetween, formatDate, formatDateTime, formatINR, TODAY } from "@/lib/utils";

export default function EinvoicePage() {
  const router = useRouter();
  const invoices = useFinance((s) => s.invoices);
  const eway = useFinance((s) => s.eway);
  const { retryIrn, updateEwayVehicle, cancelEway } = useFinance.getState();
  const [tab, setTab] = React.useState("irn");
  const [irnFilter, setIrnFilter] = React.useState<"all" | "irn_failed" | "irn_pending" | "irn_generated">("all");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [vehicleFor, setVehicleFor] = React.useState<EwayBill | null>(null);
  const [vehicle, setVehicle] = React.useState("");
  const [testing, setTesting] = React.useState(false);

  const irnRows = invoices.filter((i) => i.status !== "draft" && i.irnStatus !== "not_applicable");
  const count = (s: string) => irnRows.filter((i) => i.irnStatus === s).length;
  const shown = irnRows.filter((i) => irnFilter === "all" || i.irnStatus === irnFilter);

  const irnCols: Column<Invoice>[] = [
    { key: "number", header: "Invoice", value: (r) => r.number, cell: (r) => <span className="font-mono text-[12.5px] font-medium">{r.number}</span> },
    { key: "date", header: "Date", value: (r) => r.date, cell: (r) => formatDate(r.date) },
    { key: "party", header: "Customer", value: (r) => partyById(r.customerId).name, cell: (r) => partyById(r.customerId).name },
    { key: "value", header: "Value", align: "right", value: (r) => invTotals(r).total, cell: (r) => formatINR(invTotals(r).total) },
    { key: "attempts", header: "Attempts", align: "right", value: (r) => r.attempts, cell: (r) => r.attempts },
    {
      key: "result",
      header: "IRN / last error",
      sortable: false,
      cell: (r) =>
        r.irnStatus === "irn_generated" ? (
          <span className="font-mono text-xs text-ink-2" title={r.irn}>{r.irn?.slice(0, 18)}… · Ack {r.ackNo}</span>
        ) : r.irnStatus === "irn_failed" ? (
          <span className="text-xs text-danger">{r.lastError}</span>
        ) : r.irnStatus === "irn_pending" ? (
          <span className="flex items-center gap-1.5 text-xs text-warning"><Loader2 className="size-3 animate-spin" /> Waiting for IRP</span>
        ) : (
          <span className="text-xs text-ink-3">Cancelled</span>
        ),
    },
    { key: "status", header: "Status", value: (r) => r.irnStatus, cell: (r) => <StatusBadge status={r.irnStatus} /> },
    {
      key: "act",
      header: "",
      sortable: false,
      cell: (r) =>
        r.irnStatus === "irn_failed" ? (
          <Button size="xs" variant="subtle" onClick={(e) => { e.stopPropagation(); retryIrn(r.id); toast(`Retrying ${r.number}`); }}>
            <RefreshCw className="!size-3" /> Retry
          </Button>
        ) : null,
    },
  ];

  const ewayCols: Column<EwayBill>[] = [
    { key: "number", header: "e-Way bill", value: (r) => r.number, cell: (r) => <span className="font-mono text-[12.5px] font-medium">{r.number}</span> },
    { key: "doc", header: "Document", value: (r) => r.docNumber, cell: (r) => <div><div className="font-mono text-xs">{r.docNumber}</div><div className="text-2xs text-ink-3">{r.docType}</div></div> },
    { key: "party", header: "Party", value: (r) => partyById(r.partyId).name, cell: (r) => partyById(r.partyId).name },
    { key: "date", header: "Generated", value: (r) => r.date, cell: (r) => formatDate(r.date) },
    {
      key: "valid",
      header: "Valid till",
      value: (r) => r.validTill,
      cell: (r) => {
        const d = daysBetween(TODAY, r.validTill);
        return (
          <span className="flex items-center gap-2">
            {formatDate(r.validTill)}
            {r.status === "generated" && d <= 1 && d >= 0 && <Badge tone="warning">{d === 0 ? "Ends today" : "1 day left"}</Badge>}
          </span>
        );
      },
    },
    { key: "vehicle", header: "Vehicle", value: (r) => r.vehicle, cell: (r) => <span className="font-mono text-xs">{r.vehicle}</span> },
    { key: "km", header: "Distance", align: "right", value: (r) => r.distanceKm, cell: (r) => `${r.distanceKm} km` },
    { key: "value", header: "Value", align: "right", value: (r) => r.value, cell: (r) => formatINR(r.value) },
    { key: "status", header: "Status", value: (r) => r.status, cell: (r) => <StatusBadge status={r.status === "generated" ? "active" : r.status} /> },
    {
      key: "act",
      header: "",
      sortable: false,
      cell: (r) =>
        r.status === "generated" ? (
          <div className="flex gap-1">
            <Button size="xs" variant="subtle" onClick={(e) => { e.stopPropagation(); setVehicle(r.vehicle); setVehicleFor(r); }}>
              <Truck className="!size-3" /> Vehicle
            </Button>
            <Button size="xs" variant="danger" onClick={(e) => { e.stopPropagation(); cancelEway(r.id); toast(`e-Way bill ${r.number} cancelled`); }}>
              Cancel
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-line bg-surface px-4 py-2.5 sm:px-6">
        <Breadcrumbs items={[{ label: "Finance & GST", href: "/finance/invoices" }, { label: "e-Invoice & e-way bill" }]} />
      </div>

      <div className="space-y-4 p-3 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-surface shadow-xs sm:grid-cols-4">
            {[
              { k: "irn_generated", l: "IRN generated", n: count("irn_generated"), c: "text-success" },
              { k: "irn_pending", l: "In progress", n: count("irn_pending"), c: "text-warning" },
              { k: "irn_failed", l: "Failed", n: count("irn_failed"), c: "text-danger" },
              { k: "eway", l: "Active e-way bills", n: eway.filter((e) => e.status === "generated").length, c: "text-info" },
            ].map((x) => (
              <button
                key={x.k}
                onClick={() => (x.k === "eway" ? setTab("eway") : (setTab("irn"), setIrnFilter(x.k as typeof irnFilter)))}
                className="border-r border-b border-line p-4 text-left last:border-r-0 hover:bg-surface-2 sm:border-b-0"
              >
                <div className="text-xs text-ink-3">{x.l}</div>
                <div className={cn("tabular mt-1 text-2xl font-semibold", x.c)}>{x.n}</div>
              </button>
            ))}
          </div>
          <Card
            title={<span className="flex items-center gap-2"><PlugZap className="size-4 text-primary-600" /> GSP connection</span>}
            action={
              <Button size="xs" onClick={() => { setTesting(true); setTimeout(() => { setTesting(false); toast.success("GSP reachable", { description: "IRP sandbox + production · 412 ms" }); }, 1200); }}>
                {testing ? <Loader2 className="!size-3 animate-spin" /> : <Activity className="!size-3" />} Test
              </Button>
            }
            bodyClassName="space-y-1.5 py-3 text-sm"
          >
            <div className="flex justify-between"><span className="text-ink-3">Provider</span><span>GSP (buy, not build)</span></div>
            <div className="flex justify-between"><span className="text-ink-3">GSTIN</span><span className="font-mono text-xs">27AAKCS4821M1Z5</span></div>
            <div className="flex justify-between"><span className="text-ink-3">IRP status</span><span className="flex items-center gap-1 text-warning"><span className="size-2 rounded-full bg-warning" /> Degraded (slow)</span></div>
            <div className="flex justify-between"><span className="text-ink-3">Auth token</span><span className="flex items-center gap-1 text-success"><CheckCircle2 className="size-3.5" /> Valid · 5 h 12 m</span></div>
            <div className="flex justify-between"><span className="text-ink-3">Retry policy</span><span>Backoff 1 · 5 · 10 min</span></div>
          </Card>
        </div>

        <RT.Root value={tab} onValueChange={setTab} className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3">
            <RT.List className="flex gap-1" aria-label="Queue">
              <RT.Trigger value="irn" className="relative -mb-px flex h-10 items-center gap-2 border-b-2 border-transparent px-3 text-sm font-medium text-ink-3 hover:text-ink data-[state=active]:border-primary-600 data-[state=active]:text-ink">e-Invoice requests</RT.Trigger>
              <RT.Trigger value="eway" className="relative -mb-px flex h-10 items-center gap-2 border-b-2 border-transparent px-3 text-sm font-medium text-ink-3 hover:text-ink data-[state=active]:border-primary-600 data-[state=active]:text-ink">e-Way bills</RT.Trigger>
            </RT.List>
            {tab === "irn" && (
              <div className="flex items-center gap-2 py-2">
                <div className="flex rounded-md border border-line-strong p-0.5 text-xs" role="group" aria-label="Status filter">
                  {(["all", "irn_failed", "irn_pending", "irn_generated"] as const).map((f) => (
                    <button key={f} onClick={() => setIrnFilter(f)} aria-pressed={irnFilter === f} className={cn("h-6 rounded px-2 font-medium", irnFilter === f ? "bg-primary-600 text-white" : "text-ink-2 hover:bg-surface-3")}>
                      {f === "all" ? "All" : f === "irn_failed" ? "Failed" : f === "irn_pending" ? "Pending" : "Generated"}
                    </button>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!irnRows.some((r) => r.irnStatus === "irn_failed")}
                  onClick={() => {
                    const ids = (selected.length ? irnRows.filter((r) => selected.includes(r.id)) : irnRows).filter((r) => r.irnStatus === "irn_failed");
                    ids.forEach((r) => retryIrn(r.id));
                    setSelected([]);
                    toast.success(`Retrying ${ids.length} request(s)`);
                  }}
                >
                  <RefreshCw /> Retry failed
                </Button>
              </div>
            )}
          </div>
          <RT.Content value="irn">
            <DataTable rows={shown} columns={irnCols} selected={selected} onSelectedChange={setSelected} href={(r) => `/finance/invoices/${r.id}`} />
          </RT.Content>
          <RT.Content value="eway">
            <DataTable
              rows={eway}
              columns={ewayCols}
              selectable={false}
              onRowClick={(r) => {
                const inv = invoices.find((i) => i.number === r.docNumber);
                if (inv) router.push(`/finance/invoices/${inv.id}`);
                else router.push("/jobwork/challans");
              }}
            />
            <p className="border-t border-line px-4 py-2.5 text-xs text-ink-3">
              Inter-state job-work movement always needs an e-way bill, whatever the value. Challan e-way bills are raised from <Link href="/jobwork/challans" className="text-primary-700 hover:underline">Job-work challans</Link>.
            </p>
          </RT.Content>
        </RT.Root>
        <p className="text-xs text-ink-3">Last queue run {formatDateTime("2026-10-02T13:55:00")} · GST rules are config-driven and reviewed quarterly with the CA.</p>
      </div>

      <Dialog
        open={!!vehicleFor}
        onOpenChange={(o) => !o && setVehicleFor(null)}
        title={`Update vehicle · ${vehicleFor?.number ?? ""}`}
        description="Part B update — needed when goods are transshipped or the vehicle breaks down."
        size="sm"
        footer={
          <>
            <Button onClick={() => setVehicleFor(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!/^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{0,3}\s?\d{3,4}$/i.test(vehicle.trim())) return toast.error("Enter a valid vehicle number");
                updateEwayVehicle(vehicleFor!.id, vehicle.toUpperCase());
                toast.success("Vehicle updated on e-way bill");
                setVehicleFor(null);
              }}
            >
              Update
            </Button>
          </>
        }
      >
        <Field label="New vehicle number" layout="vertical" htmlFor="nv">
          <Input id="nv" value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
        </Field>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-3"><XCircle className="size-3.5" /> Cancellation is allowed only before the goods move.</p>
      </Dialog>
    </div>
  );
}
