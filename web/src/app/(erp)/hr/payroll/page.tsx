"use client";

import * as React from "react";
import { Download, FileCode2, Lock, LockOpen, Search } from "lucide-react";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/erp/control-panel";
import { type Column, DataTable } from "@/components/erp/data-table";
import { Banner } from "@/components/erp/form-view";
import { EmpCell, TypeBadge } from "@/components/hr/common";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Dialog, Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/overlay";
import { useRole } from "@/lib/store/app";
import { daysInMonth, type Employee, monthSummary, type PayrollInput, useHr } from "@/lib/store/hr";
import { cn, formatINR, formatLakh, formatNum } from "@/lib/utils";

const MONTHS = [
  { key: "2026-09", label: "September 2026" },
  { key: "2026-08", label: "August 2026" },
];

const BASIS = { monthly: "Monthly", daily: "Daily wage", piece_rate: "Piece rate" } as const;

interface Row {
  id: string;
  e: Employee;
  input: PayrollInput;
  paidDays: number;
  ot: number;
  base: number;
  otPay: number;
  piece: number;
  gross: number;
  net: number;
}

/** Ordinary hourly wage used for OT (2× under Factories Act s.59). */
const hourly = (e: Employee) => (e.payBasis === "monthly" ? e.payRate / 26 / 8 : e.payBasis === "daily" ? e.payRate / 8 : e.labourRate);

export default function PayrollPage() {
  const role = useRole();
  const employees = useHr((s) => s.employees);
  const overrides = useHr((s) => s.overrides);
  const payroll = useHr((s) => s.payroll);
  const locked = useHr((s) => s.lockedMonths);
  const updatePayroll = useHr((s) => s.updatePayroll);
  const lockMonth = useHr((s) => s.lockMonth);
  const [month, setMonth] = React.useState("2026-09");
  const [q, setQ] = React.useState("");
  const [confirm, setConfirm] = React.useState(false);
  const isLocked = locked.includes(month);
  const cost = role.seesCost;
  const canEdit = cost && !isLocked && (role.key === "owner" || role.key === "accountant");

  const rows: Row[] = employees
    .filter((e) => e.joinedOn <= `${month}-${daysInMonth(month)}` && (!e.exitOn || e.exitOn >= `${month}-01`))
    .filter((e) => !q || `${e.name} ${e.code} ${e.department} ${e.agency ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .map((e) => {
      const s = monthSummary(e, month, overrides);
      const input = payroll.find((p) => p.empId === e.id) ?? { empId: e.id, advance: 0, goodQty: 0, incentive: 0 };
      const base = e.payBasis === "monthly" ? (e.payRate * s.paidDays) / daysInMonth(month) : e.payBasis === "daily" ? e.payRate * s.paidDays : 0;
      const piece = e.payBasis === "piece_rate" ? input.goodQty * e.payRate : 0;
      const otPay = 2 * hourly(e) * s.ot;
      const gross = base + piece + otPay + input.incentive;
      return { id: e.id, e, input, paidDays: s.paidDays, ot: s.ot, base, otPay, piece, gross, net: gross - input.advance };
    });

  const sum = (k: keyof Pick<Row, "paidDays" | "ot" | "gross" | "net" | "otPay">) => rows.reduce((a, r) => a + r[k], 0);

  const numInput = (r: Row, k: "advance" | "incentive" | "goodQty", label: string) =>
    canEdit ? (
      <Input
        type="number"
        min={0}
        aria-label={`${label} for ${r.e.name}`}
        value={r.input[k] || ""}
        placeholder="0"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => updatePayroll(r.e.id, { [k]: Math.max(0, Number(e.target.value) || 0) })}
        className="h-7 w-24 text-right"
      />
    ) : k === "goodQty" ? (
      formatNum(r.input[k])
    ) : (
      formatINR(r.input[k])
    );

  const columns: Column<Row>[] = [
    { key: "emp", header: "Employee", value: (r) => r.e.name, cell: (r) => <EmpCell e={r.e} sub={`${r.e.code} · ${r.e.department}`} /> },
    { key: "type", header: "Type · basis", value: (r) => r.e.type, cell: (r) => <span className="flex flex-col items-start gap-0.5"><TypeBadge type={r.e.type} /><span className="text-2xs text-ink-3">{BASIS[r.e.payBasis]}{r.e.agency ? ` · ${r.e.agency}` : ""}</span></span> },
    { key: "days", header: "Paid days", align: "right", value: (r) => r.paidDays, cell: (r) => <span className="font-medium">{formatNum(r.paidDays)}</span>, total: () => formatNum(sum("paidDays")) },
    { key: "ot", header: "OT h", align: "right", value: (r) => r.ot, cell: (r) => (r.ot ? <span className="text-progress">{r.ot}</span> : <span className="text-ink-3">—</span>), total: () => formatNum(sum("ot")) },
    { key: "pcs", header: "Good pcs", align: "right", value: (r) => r.input.goodQty, cell: (r) => (r.e.payBasis === "piece_rate" ? numInput(r, "goodQty", "Good pieces") : <span className="text-ink-3">—</span>) },
    { key: "base", header: "Base earnings", align: "right", cost: true, value: (r) => r.base + r.piece, cell: (r) => <span title={r.e.payBasis === "piece_rate" ? `${formatNum(r.input.goodQty)} × ₹${r.e.payRate}` : undefined}>{formatINR(r.base + r.piece)}</span> },
    { key: "otpay", header: "OT pay (2×)", align: "right", cost: true, value: (r) => r.otPay, cell: (r) => (r.otPay ? formatINR(r.otPay) : <span className="text-ink-3">—</span>), total: () => formatINR(sum("otPay")) },
    { key: "inc", header: "Incentive", align: "right", cost: true, value: (r) => r.input.incentive, cell: (r) => numInput(r, "incentive", "Incentive") },
    { key: "adv", header: "Advance recovery", align: "right", cost: true, value: (r) => r.input.advance, cell: (r) => numInput(r, "advance", "Advance recovery") },
    { key: "net", header: "Net input", align: "right", cost: true, value: (r) => r.net, cell: (r) => <span className="font-semibold">{formatINR(r.net)}</span>, total: () => formatINR(sum("net")) },
  ];

  const exportCsv = () => {
    const head = ["Code", "Name", "Type", "Agency", "Paid days", "OT hours", "Good pcs", ...(cost ? ["Base", "OT pay", "Incentive", "Advance", "Net"] : [])];
    const body = rows.map((r) => [r.e.code, r.e.name, r.e.type, r.e.agency ?? "", r.paidDays, r.ot, r.input.goodQty, ...(cost ? [r.base + r.piece, r.otPay, r.input.incentive, r.input.advance, r.net].map((v) => v.toFixed(2)) : [])].map((v) => JSON.stringify(v)).join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([[head.join(","), ...body].join("\n")], { type: "text/csv" }));
    a.download = `payroll-inputs-${month}.csv`;
    a.click();
    toast.success("Payroll inputs exported", { description: `${rows.length} employees · ready for your payroll provider` });
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="border-b border-line bg-surface px-4 pt-3 pb-3 sm:px-6">
        <Breadcrumbs items={[{ label: "People", href: "/hr/employees" }, { label: "Payroll inputs" }]} />
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Payroll inputs</h1>
            <p className="mt-0.5 max-w-2xl text-sm text-ink-3">Paid days, overtime and piece-rate output for the month — salary, PF/ESIC and TDS are computed by your payroll provider or Tally.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-48">
              {MONTHS.map((m) => <option key={m.key} value={m.key}>{m.label}{locked.includes(m.key) ? " · locked" : ""}</option>)}
            </Select>
            <Menu>
              <MenuTrigger asChild><Button><Download /> Export</Button></MenuTrigger>
              <MenuContent>
                <MenuItem icon={<Download />} onSelect={exportCsv}>Excel / CSV for payroll provider</MenuItem>
                <MenuItem icon={<FileCode2 />} disabled={!cost} onSelect={() => toast.success("Tally payroll vouchers exported", { description: `Attendance and salary journal · ${MONTHS.find((m) => m.key === month)?.label}` })}>Tally XML (attendance vouchers)</MenuItem>
              </MenuContent>
            </Menu>
            <Button variant="primary" disabled={isLocked || !(role.key === "owner" || role.key === "accountant")} onClick={() => setConfirm(true)}>
              {isLocked ? <Lock /> : <LockOpen />} {isLocked ? "Month locked" : "Lock month"}
            </Button>
          </div>
        </div>
      </div>

      {isLocked ? (
        <Banner tone="info" icon={<Lock />}>Inputs for {MONTHS.find((m) => m.key === month)?.label} are locked and sent. Late corrections go into next month as arrears.</Banner>
      ) : (
        <Banner tone="warning" icon={<LockOpen />}>Draft — attendance regularisations still change these numbers. Lock the month after the 3rd so the payroll provider gets final inputs.</Banner>
      )}

      <div className="flex flex-1 flex-col gap-4 p-3 sm:p-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Employees" value={rows.length} hint={`${rows.filter((r) => r.e.type === "contract").length} contract labour`} />
          <Stat label="Paid days" value={formatNum(sum("paidDays"))} hint={`Avg ${formatNum(sum("paidDays") / Math.max(rows.length, 1))} per head`} />
          <Stat label="Overtime" value={`${formatNum(sum("ot"))} h`} hint={cost ? `${formatLakh(sum("otPay"))} at 2×` : "Paid at 2× ordinary rate"} tone="text-progress" />
          {cost ? <Stat label="Net payroll input" value={formatLakh(sum("net"))} hint={`Gross ${formatLakh(sum("gross"))} − advances`} /> : <Stat label="Piece-rate output" value={formatNum(rows.reduce((a, r) => a + r.input.goodQty, 0))} hint="Good pcs from job cards" />}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-3" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search employee, department, agency…" className="pl-8" aria-label="Search employees" />
          </div>
          {!cost && <span className="text-xs text-ink-3">Amounts are hidden for your role by field rules.</span>}
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
          <DataTable rows={rows} columns={columns.filter((c) => cost || !c.cost)} selectable={false} href={(r) => `/hr/employees/${r.e.id}`} />
        </div>
        <p className={cn("text-xs text-ink-3")}>Piece-rate good quantity comes from job-card events reported on shop-floor terminals; edit only to correct a disputed count.</p>
      </div>

      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Lock ${MONTHS.find((m) => m.key === month)?.label}?`}
        description="Locked inputs cannot be edited. Attendance changes after locking are carried to next month as arrears."
        size="sm"
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => { lockMonth(month); setConfirm(false); toast.success("Month locked", { description: "Recorded in the audit log · export sent to the payroll provider" }); }}><Lock /> Lock month</Button>
          </>
        }
      >
        <ul className="space-y-1.5 text-sm">
          <li className="flex justify-between"><span className="text-ink-3">Employees</span><span className="font-medium">{rows.length}</span></li>
          <li className="flex justify-between"><span className="text-ink-3">Paid days</span><span className="font-medium">{formatNum(sum("paidDays"))}</span></li>
          <li className="flex justify-between"><span className="text-ink-3">OT hours</span><span className="font-medium">{formatNum(sum("ot"))}</span></li>
          {cost && <li className="flex justify-between border-t border-line pt-1.5"><span className="text-ink-3">Net input</span><span className="font-semibold">{formatINR(sum("net"))}</span></li>}
        </ul>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3 shadow-xs">
      <div className="text-xs font-medium text-ink-3">{label}</div>
      <div className={cn("tabular mt-1 text-xl font-semibold tracking-tight", tone)}>{value}</div>
      <div className="mt-0.5 truncate text-xs text-ink-3">{hint}</div>
    </div>
  );
}
