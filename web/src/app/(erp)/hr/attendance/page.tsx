"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Download, Fingerprint, Grid3x3, List, PenLine, Search, Tablet } from "lucide-react";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/erp/control-panel";
import { type Column, DataTable } from "@/components/erp/data-table";
import { AttBadge, EmpCell } from "@/components/hr/common";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Dialog, Tip } from "@/components/ui/overlay";
import { useRole } from "@/lib/store/app";
import { ATT_TONE, type AttRecord, type AttStatus, attendanceFor, daysInMonth, type Employee, holidayName, isActive, isoDay, monthSummary, useHr, weekday } from "@/lib/store/hr";
import { cn, formatDate, formatNum, TODAY } from "@/lib/utils";

type Row = { id: string; e: Employee; r: AttRecord | null };

const SOURCE = {
  terminal: { label: "Terminal", icon: <Tablet className="size-3.5" /> },
  biometric: { label: "Biometric", icon: <Fingerprint className="size-3.5" /> },
  manual: { label: "Manual", icon: <PenLine className="size-3.5" /> },
};

const shiftDate = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 864e5).toISOString().slice(0, 10);
const DOW = ["S", "M", "T", "W", "T", "F", "S"];

export default function AttendancePage() {
  const role = useRole();
  const employees = useHr((s) => s.employees);
  const overrides = useHr((s) => s.overrides);
  const [date, setDate] = React.useState(TODAY);
  const [view, setView] = React.useState<"day" | "month">("day");
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<"" | AttStatus>("");
  const [edit, setEdit] = React.useState<Row | null>(null);

  const month = date.slice(0, 7);
  const staff = employees.filter((e) => e.joinedOn <= date && (isActive(e) || (e.exitOn && e.exitOn >= `${month}-01`)));
  const match = (e: Employee) => !q || `${e.name} ${e.nameHi} ${e.code} ${e.department}`.toLowerCase().includes(q.toLowerCase());

  const rows: Row[] = staff.map((e) => ({ id: e.id, e, r: attendanceFor(e, date, overrides) })).filter((x) => match(x.e) && (!status || x.r?.status === status));
  const all = staff.map((e) => attendanceFor(e, date, overrides));
  const count = (s: AttStatus[]) => all.filter((r) => r && s.includes(r.status)).length;
  const otTotal = all.reduce((a, r) => a + (r?.otHours ?? 0), 0);
  const expected = all.filter((r) => r && !["weekly_off", "holiday"].includes(r.status)).length;

  const columns: Column<Row>[] = [
    { key: "emp", header: "Employee", value: (x) => x.e.name, cell: (x) => <EmpCell e={x.e} sub={`${x.e.code} · ${x.e.department}`} /> },
    { key: "shift", header: "Shift", align: "center", value: (x) => x.e.defaultShift, cell: (x) => <span className="font-mono text-xs font-semibold">{x.e.defaultShift}</span> },
    { key: "status", header: "Status", value: (x) => x.r?.status ?? "", cell: (x) => (x.r ? <AttBadge status={x.r.status} /> : <span className="text-ink-3">—</span>) },
    { key: "in", header: "In", value: (x) => x.r?.in ?? "", cell: (x) => <span className="tabular">{x.r?.in ?? "—"}</span> },
    {
      key: "out",
      header: "Out",
      value: (x) => x.r?.out ?? "",
      cell: (x) => (x.r?.out ? <span className="tabular">{x.r.out}</span> : x.r?.in ? <span className="text-xs font-medium text-success">On shift</span> : <span className="text-ink-3">—</span>),
    },
    { key: "ot", header: "OT h", align: "right", value: (x) => x.r?.otHours ?? 0, cell: (x) => (x.r?.otHours ? <span className="font-semibold text-progress">{x.r.otHours}</span> : <span className="text-ink-3">—</span>), total: (rs) => formatNum(rs.reduce((a, x) => a + (x.r?.otHours ?? 0), 0)) },
    {
      key: "src",
      header: "Source",
      value: (x) => x.r?.source ?? "",
      cell: (x) => (x.r && x.r.in ? <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">{SOURCE[x.r.source].icon}{SOURCE[x.r.source].label}</span> : <span className="text-ink-3">—</span>),
    },
    { key: "note", header: "Note", value: (x) => x.r?.note ?? "", cell: (x) => <span className="text-xs text-ink-3">{x.r?.note ?? ""}</span> },
    {
      key: "act",
      header: "",
      align: "right",
      sortable: false,
      cell: (x) =>
        x.r && x.r.status !== "awaited" ? (
          <Button size="xs" variant="ghost" onClick={(ev) => { ev.stopPropagation(); setEdit(x); }}>Regularise</Button>
        ) : null,
    },
  ];

  const exportCsv = () => {
    const csv = ["Code,Name,Department,Date,Status,In,Out,OT hours,Source", ...rows.map((x) => [x.e.code, x.e.name, x.e.department, date, x.r?.status ?? "", x.r?.in ?? "", x.r?.out ?? "", x.r?.otHours ?? 0, x.r?.source ?? ""].join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `attendance-${date}.csv`;
    a.click();
    toast.success(`Attendance for ${formatDate(date)} exported`);
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="border-b border-line bg-surface px-4 pt-3 pb-3 sm:px-6">
        <Breadcrumbs items={[{ label: "People", href: "/hr/employees" }, { label: "Attendance" }]} />
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Attendance</h1>
            <p className="mt-0.5 text-sm text-ink-3">Punches from shop-floor terminals and biometric devices; corrections are logged as regularisations</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-md border border-line-strong shadow-xs">
              <Button variant="ghost" size="icon" aria-label="Previous day" onClick={() => setDate((d) => shiftDate(d, view === "day" ? -1 : -daysInMonth(d.slice(0, 7))))}><ChevronLeft /></Button>
              <Input type="date" aria-label="Date" value={date} max={TODAY} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-8 w-[150px] rounded-none border-y-0 shadow-none" />
              <Button variant="ghost" size="icon" aria-label="Next day" disabled={date >= TODAY} onClick={() => setDate((d) => { const n = shiftDate(d, view === "day" ? 1 : daysInMonth(d.slice(0, 7))); return n > TODAY ? TODAY : n; })}><ChevronRight /></Button>
            </div>
            <Button onClick={() => setDate(TODAY)} disabled={date === TODAY}>Today</Button>
            <div className="flex rounded-md border border-line-strong p-0.5 shadow-xs" role="group" aria-label="View">
              <Tip label="Day register"><button aria-pressed={view === "day"} onClick={() => setView("day")} className={cn("flex h-6 items-center gap-1 rounded px-2 text-xs", view === "day" ? "bg-primary-600 text-white" : "text-ink-3 hover:bg-surface-3")}><List className="size-3.5" /> Day</button></Tip>
              <Tip label="Month heatmap"><button aria-pressed={view === "month"} onClick={() => setView("month")} className={cn("flex h-6 items-center gap-1 rounded px-2 text-xs", view === "month" ? "bg-primary-600 text-white" : "text-ink-3 hover:bg-surface-3")}><Grid3x3 className="size-3.5" /> Month</button></Tip>
            </div>
            <Button variant="primary" onClick={exportCsv}><Download /> Export</Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-3" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search employee, code, department…" className="pl-8" aria-label="Search employees" />
          </div>
          {view === "day" && (
            <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as AttStatus | "")} className="w-48">
              <option value="">All statuses</option>
              {(Object.keys(ATT_TONE) as AttStatus[]).map((s) => <option key={s} value={s}>{ATT_TONE[s].label}</option>)}
            </Select>
          )}
          <span className="ml-auto flex items-center gap-1.5 text-sm text-ink-2">
            <CalendarDays className="size-4 text-ink-3" />
            {view === "day" ? `${formatDate(date)} · ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][weekday(date)]}` : new Date(`${month}-01T00:00:00Z`).toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })}
            {holidayName(date) && view === "day" && <span className="text-accent-500">· {holidayName(date)}</span>}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-3 sm:p-5">
        {view === "day" ? (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Stat label="Present" value={count(["present", "late"])} hint={`of ${expected} expected`} tone="text-success" onClick={() => setStatus(status === "present" ? "" : "present")} active={status === "present"} />
              <Stat label="Late" value={count(["late"])} hint="> 10 min after shift start" tone="text-warning" onClick={() => setStatus(status === "late" ? "" : "late")} active={status === "late"} />
              <Stat label="Absent" value={count(["absent"])} hint="No punch, no leave" tone="text-danger" onClick={() => setStatus(status === "absent" ? "" : "absent")} active={status === "absent"} />
              <Stat label="On leave" value={count(["leave"])} hint="Approved requests" tone="text-info" onClick={() => setStatus(status === "leave" ? "" : "leave")} active={status === "leave"} />
              <Stat label="Overtime" value={`${formatNum(otTotal)} h`} hint="Paid at 2× (s.59)" tone="text-progress" />
            </div>
            <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
              <DataTable rows={rows} columns={columns} selectable={false} href={(x) => `/hr/employees/${x.e.id}`} />
            </div>
          </>
        ) : (
          <MonthHeatmap employees={staff.filter(match)} month={month} overrides={overrides} onPick={(d) => { setDate(d); setView("day"); }} />
        )}
      </div>

      <RegulariseDialog row={edit} onClose={() => setEdit(null)} user={role.user} />
    </div>
  );
}

function Stat({ label, value, hint, tone, onClick, active }: { label: string; value: React.ReactNode; hint: string; tone: string; onClick?: () => void; active?: boolean }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      aria-pressed={onClick ? !!active : undefined}
      className={cn("rounded-xl border bg-surface px-4 py-3 text-left shadow-xs transition-colors", active ? "border-primary-500 ring-3 ring-primary-500/15" : "border-line", onClick && !active && "hover:border-line-strong")}
    >
      <div className="text-xs font-medium text-ink-3">{label}</div>
      <div className={cn("tabular mt-1 text-xl font-semibold tracking-tight", tone)}>{value}</div>
      <div className="mt-0.5 truncate text-xs text-ink-3">{hint}</div>
    </Tag>
  );
}

function MonthHeatmap({ employees, month, overrides, onPick }: { employees: Employee[]; month: string; overrides: Record<string, AttRecord>; onPick: (d: string) => void }) {
  const [y, m] = month.split("-").map(Number);
  const days = Array.from({ length: daysInMonth(month) }, (_, i) => isoDay(y, m, i + 1));
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-2.5">
        <h2 className="text-sm font-semibold">Month summary</h2>
        <div className="ml-auto flex flex-wrap gap-3">
          {(["present", "late", "half_day", "absent", "leave", "weekly_off", "holiday"] as AttStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-xs text-ink-2"><span className={cn("size-2.5 rounded-sm", ATT_TONE[s].cell)} />{ATT_TONE[s].label}</span>
          ))}
        </div>
      </header>
      <div className="scroll-thin overflow-x-auto">
        <table className="border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-[2] min-w-[220px] border-b border-line bg-surface-2 px-3 py-2 text-left font-semibold text-ink-3">Employee</th>
              {days.map((d) => (
                <th key={d} className={cn("w-[26px] min-w-[26px] border-b border-line bg-surface-2 py-1 text-center font-medium", weekday(d) === 0 ? "text-danger/70" : "text-ink-3")}>
                  <div className="text-[9.5px]">{DOW[weekday(d)]}</div>
                  <div>{Number(d.slice(8))}</div>
                </th>
              ))}
              {["P", "A", "L", "OT h", "Paid"].map((h) => <th key={h} className="border-b border-l border-line bg-surface-2 px-2 py-2 text-right font-semibold whitespace-nowrap text-ink-3">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => {
              const s = monthSummary(e, month, overrides);
              return (
                <tr key={e.id} className="group">
                  <td className="sticky left-0 z-[1] border-b border-line bg-surface px-3 py-1.5 group-hover:bg-surface-2"><EmpCell e={e} sub={e.department} /></td>
                  {days.map((d) => {
                    const r = attendanceFor(e, d, overrides);
                    return (
                      <td key={d} className="border-b border-line p-[3px] text-center group-hover:bg-surface-2">
                        {r ? (
                          <Tip label={<span>{formatDate(d)} · {ATT_TONE[r.status].label}{r.in ? ` · ${r.in}-${r.out ?? "…"}` : ""}{r.otHours ? ` · OT ${r.otHours}h` : ""}</span>}>
                            <button onClick={() => onPick(d)} aria-label={`${e.name} ${formatDate(d)} ${ATT_TONE[r.status].label}`} className={cn("block size-[20px] rounded-[4px] transition-transform hover:scale-110", ATT_TONE[r.status].cell, r.otHours > 0 && "ring-2 ring-progress/40")} />
                          </Tip>
                        ) : (
                          <span className="mx-auto block size-[20px] rounded-[4px] border border-dashed border-line" />
                        )}
                      </td>
                    );
                  })}
                  <td className="tabular border-b border-l border-line px-2 text-right font-semibold text-success">{s.present}</td>
                  <td className="tabular border-b border-line px-2 text-right text-danger">{s.absent || "—"}</td>
                  <td className="tabular border-b border-line px-2 text-right text-info">{s.leave || "—"}</td>
                  <td className="tabular border-b border-line px-2 text-right text-progress">{s.ot || "—"}</td>
                  <td className="tabular border-b border-line px-2 text-right font-semibold">{formatNum(s.paidDays)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line px-4 py-2 text-xs text-ink-3">Click a day to open the day register. Ringed cells include overtime. Contract labour is paid for days worked only.</p>
    </section>
  );
}

function RegulariseDialog({ row, onClose, user }: { row: Row | null; onClose: () => void; user: string }) {
  const regularise = useHr((s) => s.regularise);
  const [f, setF] = React.useState<{ status: AttStatus; in: string; out: string; ot: string; reason: string }>({ status: "present", in: "", out: "", ot: "0", reason: "" });
  const [err, setErr] = React.useState("");
  const [loadedFor, setLoadedFor] = React.useState<string | null>(null);

  const key = row ? `${row.e.id}|${row.r?.date}` : null;
  if (row?.r && key !== loadedFor) {
    setLoadedFor(key);
    setF({ status: row.r.status, in: row.r.in ?? "", out: row.r.out ?? "", ot: String(row.r.otHours), reason: "" });
    setErr("");
  }

  const save = () => {
    if (!row?.r) return;
    if (f.reason.trim().length < 5) return setErr("Give a reason (at least 5 characters) — it is stored in the audit log");
    const working = ["present", "late", "half_day"].includes(f.status);
    if (working && !/^\d{2}:\d{2}$/.test(f.in)) return setErr("In time is required for a working status");
    const ot = Number(f.ot);
    if (!Number.isFinite(ot) || ot < 0 || ot > 12) return setErr("OT must be between 0 and 12 hours");
    regularise({ ...row.r, status: f.status, in: working ? f.in : undefined, out: working ? f.out || undefined : undefined, otHours: working ? ot : 0, note: f.reason.trim() }, user);
    toast.success(`Attendance regularised for ${row.e.name}`, { description: `${formatDate(row.r.date)} · ${ATT_TONE[f.status].label}` });
    onClose();
  };

  return (
    <Dialog
      open={!!row}
      onOpenChange={(o) => !o && onClose()}
      title="Regularise attendance"
      description={row?.r ? `${row.e.name} · ${formatDate(row.r.date)} · Shift ${row.e.defaultShift}` : undefined}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save correction</Button></>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field layout="vertical" label="Status" htmlFor="rg-st" className="sm:col-span-2">
          <Select id="rg-st" value={f.status} onChange={(e) => setF((x) => ({ ...x, status: e.target.value as AttStatus }))}>
            {(["present", "late", "half_day", "absent", "leave", "weekly_off"] as AttStatus[]).map((s) => <option key={s} value={s}>{ATT_TONE[s].label}</option>)}
          </Select>
        </Field>
        <Field layout="vertical" label="In time" htmlFor="rg-in"><Input id="rg-in" type="time" value={f.in} onChange={(e) => setF((x) => ({ ...x, in: e.target.value }))} /></Field>
        <Field layout="vertical" label="Out time" htmlFor="rg-out"><Input id="rg-out" type="time" value={f.out} onChange={(e) => setF((x) => ({ ...x, out: e.target.value }))} /></Field>
        <Field layout="vertical" label="Overtime hours" htmlFor="rg-ot" hint="Approved OT only"><Input id="rg-ot" type="number" min={0} max={12} step={0.5} value={f.ot} onChange={(e) => setF((x) => ({ ...x, ot: e.target.value }))} /></Field>
        <Field layout="vertical" label="Reason" required error={err} htmlFor="rg-r" className="sm:col-span-2">
          <Textarea id="rg-r" aria-invalid={!!err} value={f.reason} onChange={(e) => setF((x) => ({ ...x, reason: e.target.value }))} placeholder="e.g. Terminal offline — punched on paper register, verified by supervisor" />
        </Field>
      </div>
    </Dialog>
  );
}
