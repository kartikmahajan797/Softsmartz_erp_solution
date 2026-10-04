"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Copy, MessageCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/erp/control-panel";
import { EmpCell } from "@/components/hr/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { workCentres } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { isActive, ROSTER_SHIFTS, type RosterShift, SHIFT_MIN, useHr } from "@/lib/store/hr";
import { cn, formatDate, formatDateTime, TODAY } from "@/lib/utils";

const DAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

export default function RosterPage() {
  const role = useRole();
  const employees = useHr((s) => s.employees);
  const roster = useHr((s) => s.roster);
  const weekStart = useHr((s) => s.weekStart);
  const publishedAt = useHr((s) => s.rosterPublishedAt);
  const cycle = useHr((s) => s.cycleShift);
  const publish = useHr((s) => s.publishRoster);
  const [wc, setWc] = React.useState("");
  const [q, setQ] = React.useState("");
  const canEdit = role.key === "owner" || role.key === "production";

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const people = employees.filter((e) => isActive(e) && roster[e.id] && (e.department === "Production" || e.department === "Quality" || e.department === "Maintenance"));
  const shown = people.filter((e) => (!wc || e.workCentres.includes(wc)) && (!q || `${e.name} ${e.code} ${e.designation}`.toLowerCase().includes(q.toLowerCase())));

  // Coverage is computed on the whole plant (or the selected work centre) regardless of search.
  const scope = people.filter((e) => !wc || e.workCentres.includes(wc));
  const min = (s: Exclude<RosterShift, "O">) => (wc ? Math.max(1, Math.round(SHIFT_MIN[s] / 4)) : SHIFT_MIN[s]);
  const coverage = days.map((_, d) => ({
    A: scope.filter((e) => roster[e.id][d] === "A").length,
    B: scope.filter((e) => roster[e.id][d] === "B").length,
    C: scope.filter((e) => roster[e.id][d] === "C").length,
  }));
  const gaps = coverage.flatMap((c, d) => (["A", "B", "C"] as const).filter((s) => d < 6 && c[s] < min(s)).map((s) => `${DAY[d]} ${s}`));

  const onCell = (empId: string, d: number) => {
    if (!canEdit) return toast.error("Only the production head or owner can change the roster");
    cycle(empId, d);
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="border-b border-line bg-surface px-4 pt-3 pb-3 sm:px-6">
        <Breadcrumbs items={[{ label: "People", href: "/hr/employees" }, { label: "Shift roster" }]} />
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">Shift roster</h1>
              {publishedAt ? <Badge tone="success">Published {formatDateTime(publishedAt + ":00")}</Badge> : <Badge tone="warning">Draft · not published</Badge>}
            </div>
            <p className="mt-0.5 text-sm text-ink-3">Week of {formatDate(days[0])} – {formatDate(days[6])} · click a cell to cycle A → B → C → Off</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => toast.success("Roster copied to next week", { description: `Week of ${formatDate(addDays(weekStart, 7))} · saved as draft` })}><Copy /> Copy to next week</Button>
            <Button
              variant="primary"
              disabled={!canEdit}
              onClick={() => {
                publish();
                toast.success(`Roster published to ${people.length} employees`, { description: "WhatsApp template shift_roster_weekly · Hindi and English" });
              }}
            >
              <MessageCircle /> Publish on WhatsApp
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-3" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search employee…" className="pl-8" aria-label="Search employees" />
          </div>
          <Select aria-label="Work centre" value={wc} onChange={(e) => setWc(e.target.value)} className="w-56">
            <option value="">All work centres</option>
            {workCentres.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
          <div className="ml-auto flex flex-wrap gap-2">
            {(Object.keys(ROSTER_SHIFTS) as RosterShift[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-xs text-ink-2">
                <span className={cn("flex h-5 min-w-7 items-center justify-center rounded border px-1 text-2xs font-semibold", ROSTER_SHIFTS[s].tone)}>{ROSTER_SHIFTS[s].label}</span>
                {ROSTER_SHIFTS[s].time}
              </span>
            ))}
          </div>
        </div>
      </div>

      {gaps.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-warning/20 bg-warning-bg px-4 py-2 text-sm sm:px-6">
          <AlertTriangle className="size-4 text-warning" />
          <span className="text-ink"><span className="font-semibold">{gaps.length} understaffed shift{gaps.length > 1 ? "s" : ""}:</span> {gaps.slice(0, 6).join(", ")}{gaps.length > 6 ? "…" : ""}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 border-b border-success/20 bg-success-bg px-4 py-2 text-sm sm:px-6">
          <CheckCircle2 className="size-4 text-success" /> <span className="text-ink">All shifts meet minimum staffing this week.</span>
        </div>
      )}

      <div className="flex-1 p-3 sm:p-5">
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[860px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-[2] w-[260px] border-b border-line bg-surface-2 px-3 py-2 text-left text-xs font-semibold text-ink-3">Employee</th>
                  {days.map((d, i) => (
                    <th key={d} className={cn("border-b border-line bg-surface-2 px-2 py-2 text-center text-xs font-semibold", d === TODAY ? "text-primary-700" : "text-ink-3")}>
                      <div>{DAY[i]}</div>
                      <div className={cn("text-2xs font-normal", d === TODAY && "font-semibold")}>{formatDate(d).slice(0, 6)}{d === TODAY && " · today"}</div>
                    </th>
                  ))}
                  <th className="border-b border-line bg-surface-2 px-3 py-2 text-right text-xs font-semibold text-ink-3">Days</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((e) => {
                  const row = roster[e.id];
                  return (
                    <tr key={e.id} className="group">
                      <td className="sticky left-0 z-[1] border-b border-line bg-surface px-3 py-2 group-hover:bg-surface-2">
                        <EmpCell e={e} sub={`${e.designation}${e.type === "contract" ? " · contract" : ""}`} />
                      </td>
                      {row.map((s, d) => (
                        <td key={d} className={cn("border-b border-line p-1.5 text-center group-hover:bg-surface-2", days[d] === TODAY && "bg-primary-50/40")}>
                          <button
                            onClick={() => onCell(e.id, d)}
                            aria-label={`${e.name}, ${DAY[d]}: ${s === "O" ? "Off" : `Shift ${s}`}. Click to change`}
                            className={cn("h-8 w-full min-w-12 rounded-md border text-xs font-semibold transition", ROSTER_SHIFTS[s].tone, canEdit ? "hover:brightness-95 active:scale-95" : "cursor-default")}
                          >
                            {ROSTER_SHIFTS[s].label}
                          </button>
                        </td>
                      ))}
                      <td className="tabular border-b border-line px-3 text-right text-ink-2 group-hover:bg-surface-2">{row.filter((s) => s !== "O").length}</td>
                    </tr>
                  );
                })}
                {shown.length === 0 && (
                  <tr><td colSpan={9} className="py-12 text-center text-sm text-ink-3">No one on the roster for this filter</td></tr>
                )}
              </tbody>
              <tfoot>
                {(["A", "B", "C"] as const).map((s, si) => (
                  <tr key={s}>
                    <td className={cn("sticky left-0 z-[1] bg-surface-2 px-3 py-1.5 text-xs font-semibold", si === 0 && "border-t border-line-strong")}>
                      Coverage · Shift {s} <span className="font-normal text-ink-3">(min {min(s)})</span>
                    </td>
                    {coverage.map((c, d) => {
                      const short = d < 6 && c[s] < min(s);
                      return (
                        <td key={d} className={cn("bg-surface-2 px-2 py-1.5 text-center", si === 0 && "border-t border-line-strong")}>
                          <span className={cn("tabular inline-flex h-6 min-w-9 items-center justify-center rounded-full px-2 text-xs font-semibold", short ? "bg-danger-bg text-danger" : d === 6 ? "text-ink-3" : "bg-success-bg text-success")}>
                            {c[s]}{short && ` / ${min(s)}`}
                          </span>
                        </td>
                      );
                    })}
                    <td className={cn("bg-surface-2", si === 0 && "border-t border-line-strong")} />
                  </tr>
                ))}
              </tfoot>
            </table>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-3">Sunday is the weekly off for the plant; coverage is checked Monday to Saturday. Operators see their published shift on the terminal and get a WhatsApp message in their language.</p>
      </div>
    </div>
  );
}
