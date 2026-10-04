"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarCheck, CalendarDays, Clock, Download, FileText, KeyRound, Lock, MessageCircle, QrCode, Upload, UserX, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Chatter, EmptyState, FieldGrid, FormPage, Notebook, Sheet, SmartButton, SmartButtons } from "@/components/erp/form-view";
import { AttBadge, Avatar, TypeBadge } from "@/components/hr/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, ReadValue } from "@/components/ui/form";
import { Tip } from "@/components/ui/overlay";
import { workCentres } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { attendanceFor, isActive, LEAVE_TYPES, type LeaveType, maskAccount, maskPan, monthSummary, SKILL_LEVEL, useHr } from "@/lib/store/hr";
import { cn, daysBetween, formatDate, formatINR, formatNum, TODAY } from "@/lib/utils";

const PAY_BASIS = { monthly: "Monthly salary", daily: "Daily wage", piece_rate: "Piece rate" } as const;

export default function EmployeePage() {
  const { id } = useParams<{ id: string }>();
  const role = useRole();
  const e = useHr((s) => s.employees.find((x) => x.id === id));
  const overrides = useHr((s) => s.overrides);
  const leaveUsed = useHr((s) => s.leaveUsed);
  const leave = useHr((s) => s.leave);
  const logNote = useHr((s) => s.logNote);
  const update = useHr((s) => s.updateEmployee);
  const [rate, setRate] = React.useState<string | null>(null);

  if (!e) {
    return (
      <div className="p-6">
        <EmptyState icon={<UserX />} title="Employee not found" body="The record may have been removed." action={<Link href="/hr/employees" className="text-sm text-primary-700 hover:underline">Back to employees</Link>} />
      </div>
    );
  }

  const canEditSkills = role.key === "owner" || role.key === "production";
  const sum = monthSummary(e, "2026-09", overrides);
  const pendingLeave = leave.filter((l) => l.empId === e.id && l.status === "pending").length;
  const elBal = LEAVE_TYPES.EL.quota - (leaveUsed[e.id]?.EL ?? 0);
  const tenureYears = daysBetween(e.joinedOn, e.exitOn ?? TODAY) / 365;
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.parse(`${TODAY}T00:00:00Z`) - (13 - i) * 864e5).toISOString().slice(0, 10);
    return { d, r: attendanceFor(e, d, overrides) };
  });

  const cycleSkill = (wc: string) => {
    if (!canEditSkills) return;
    const cur = e.skills[wc] ?? 0;
    const next = ((cur + 1) % 4) as 0 | 1 | 2 | 3;
    update(e.id, { skills: { ...e.skills, [wc]: next }, workCentres: next >= 2 ? [...new Set([...e.workCentres, wc])] : e.workCentres.filter((w) => w !== wc) });
    toast.success(`${workCentres.find((w) => w.id === wc)?.name}: ${SKILL_LEVEL[next]}`, { description: next >= 2 ? "Can be assigned jobs on this work centre" : "Removed from terminal job list for this work centre" });
  };

  const saveRate = () => {
    const v = Number(rate);
    if (!Number.isFinite(v) || v < 0 || v > 2000) return toast.error("Enter a labour rate between ₹0 and ₹2,000 per hour");
    update(e.id, { labourRate: v });
    logNote(e.id, role.user, `Labour rate changed to ₹${v}/h — applies to job cards from today (order costing, FR-MF-06)`);
    setRate(null);
    toast.success("Labour rate updated", { description: "Recorded in the audit log" });
  };

  return (
    <FormPage
      crumbs={[{ label: "People", href: "/hr/employees" }, { label: "Employees", href: "/hr/employees" }, { label: e.name }]}
      actions={
        <>
          <Button variant="primary" onClick={() => toast.success(`WhatsApp sent to ${e.name}`, { description: e.phone })}><MessageCircle /> Message</Button>
          <Button onClick={() => toast.success(`${e.code} profile.pdf generated`)}><Download /> Profile PDF</Button>
          {e.operatorId && (
            <Link href="/settings/terminals" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 text-sm font-medium shadow-xs hover:bg-surface-3">
              <QrCode className="size-4" /> Badge & PIN
            </Link>
          )}
        </>
      }
      status={isActive(e) ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Exited {formatDate(e.exitOn)}</Badge>}
      chatter={<Chatter activities={e.activities} onLog={(t) => logNote(e.id, role.user, t)} />}
    >
      <Sheet>
        <SmartButtons>
          <SmartButton icon={<CalendarCheck />} label="Present · Sep" value={`${sum.present}/${sum.counted - sum.off}`} href="/hr/attendance" />
          <SmartButton icon={<Clock />} label="OT hours · Sep" value={formatNum(sum.ot)} href="/hr/payroll" />
          <SmartButton icon={<CalendarDays />} label={pendingLeave ? `${pendingLeave} pending` : "EL balance"} value={`${elBal} d`} href="/hr/leave" />
          {e.operatorId && <SmartButton icon={<Wrench />} label="Job cards" value="Shop floor" href="/manufacturing/job-cards" />}
        </SmartButtons>

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Avatar e={e} size="lg" />
          <div className="min-w-0">
            <div className="text-xs font-medium tracking-wide text-ink-3 uppercase">{e.code}</div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{e.name}</h1>
              {e.nameHi && <span className="text-lg text-ink-3">{e.nameHi}</span>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-2">
              {e.designation} · {e.department}
              <TypeBadge type={e.type} />
              {e.operatorId && <Badge tone="brand" dot={false}><KeyRound className="size-3" /> Terminal PIN</Badge>}
            </div>
          </div>
        </div>

        <FieldGrid>
          <Field label="Department"><ReadValue>{e.department}</ReadValue></Field>
          <Field label="Date of joining"><ReadValue>{formatDate(e.joinedOn)} <span className="text-ink-3">· {tenureYears.toFixed(1)} yrs</span></ReadValue></Field>
          <Field label="Employment type"><ReadValue>{e.type === "contract" ? `Contract · ${e.agency}` : e.type === "trainee" ? "Trainee / apprentice" : "Permanent"}</ReadValue></Field>
          <Field label="Default shift"><ReadValue>Shift {e.defaultShift} · {{ A: "07:00-15:30", B: "15:30-00:00", C: "23:30-07:00" }[e.defaultShift]}</ReadValue></Field>
          <Field label="Mobile"><ReadValue>{e.phone}</ReadValue></Field>
          <Field label="Work centres">
            <ReadValue>
              {e.workCentres.length ? (
                <span className="flex flex-wrap gap-1">{e.workCentres.map((w) => <Badge key={w} tone="neutral" dot={false}>{workCentres.find((x) => x.id === w)?.name}</Badge>)}</span>
              ) : (
                <span className="text-ink-3">Indirect staff</span>
              )}
            </ReadValue>
          </Field>
        </FieldGrid>

        <Notebook
          tabs={[
            {
              key: "skills",
              label: "Skills matrix",
              count: Object.values(e.skills).filter((v) => v >= 2).length,
              content: (
                <div>
                  <p className="mb-3 text-xs text-ink-3">
                    Certified operators see the work centre&apos;s jobs on the terminal. {canEditSkills ? "Click a level to change it." : "Only the production head can change levels."}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {workCentres.map((w) => {
                      const lvl = e.skills[w.id] ?? 0;
                      return (
                        <button
                          key={w.id}
                          disabled={!canEditSkills}
                          onClick={() => cycleSkill(w.id)}
                          className={cn("flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors", lvl >= 2 ? "border-primary-200 bg-primary-50/60" : "border-line bg-surface", canEditSkills && "hover:border-line-strong")}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{w.name}</span>
                            <span className="block font-mono text-2xs text-ink-3">{w.code} · {w.type}</span>
                          </span>
                          <span className="flex flex-col items-end gap-1">
                            <span className="flex gap-0.5" aria-hidden>
                              {[1, 2, 3].map((n) => <span key={n} className={cn("h-1.5 w-4 rounded-full", n <= lvl ? "bg-primary-600" : "bg-line")} />)}
                            </span>
                            <span className={cn("text-2xs font-medium", lvl ? "text-primary-700" : "text-ink-3")}>{SKILL_LEVEL[lvl]}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ),
            },
            {
              key: "att",
              label: "Attendance",
              content: (
                <div>
                  <div className="mb-3 flex flex-wrap gap-4 text-sm">
                    <span><span className="font-semibold">{sum.present}</span> <span className="text-ink-3">present</span></span>
                    <span><span className="font-semibold">{sum.late}</span> <span className="text-ink-3">late</span></span>
                    <span><span className="font-semibold">{sum.absent}</span> <span className="text-ink-3">absent</span></span>
                    <span><span className="font-semibold">{sum.leave}</span> <span className="text-ink-3">leave</span></span>
                    <span className="text-ink-3">· September 2026</span>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-line">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-2 text-xs text-ink-3">
                        <tr><th className="px-3 py-2 text-left font-semibold">Date</th><th className="px-3 py-2 text-left font-semibold">Status</th><th className="px-3 py-2 text-left font-semibold">In</th><th className="px-3 py-2 text-left font-semibold">Out</th><th className="px-3 py-2 text-right font-semibold">OT h</th><th className="hidden px-3 py-2 text-left font-semibold sm:table-cell">Source</th></tr>
                      </thead>
                      <tbody>
                        {[...last14].reverse().map(({ d, r }) => (
                          <tr key={d} className="border-t border-line">
                            <td className="px-3 py-2">{formatDate(d)}</td>
                            <td className="px-3 py-2">{r ? <AttBadge status={r.status} /> : <span className="text-ink-3">—</span>}</td>
                            <td className="tabular px-3 py-2">{r?.in ?? "—"}</td>
                            <td className="tabular px-3 py-2">{r?.out ?? (r?.in ? <span className="text-success">on shift</span> : "—")}</td>
                            <td className="tabular px-3 py-2 text-right">{r?.otHours || "—"}</td>
                            <td className="hidden px-3 py-2 text-ink-3 capitalize sm:table-cell">{r ? (r.source === "terminal" ? "Shop-floor terminal" : r.source) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ),
            },
            {
              key: "leave",
              label: "Leave",
              content: (
                <div className="grid gap-3 sm:grid-cols-3">
                  {(["CL", "SL", "EL"] as LeaveType[]).map((t) => {
                    const used = leaveUsed[e.id]?.[t] ?? 0;
                    const q = LEAVE_TYPES[t].quota;
                    return (
                      <div key={t} className="rounded-lg border border-line p-3">
                        <div className="flex items-center justify-between text-xs text-ink-3"><span>{LEAVE_TYPES[t].label}</span><span className="font-mono">{t}</span></div>
                        <div className="tabular mt-1 text-xl font-semibold">{q - used} <span className="text-sm font-normal text-ink-3">of {q} days left</span></div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-primary-600" style={{ width: `${Math.min(100, (used / q) * 100)}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              ),
            },
            {
              key: "statutory",
              label: "Statutory & bank",
              content: (
                <FieldGrid>
                  <Field label="UAN (EPF)"><ReadValue mono>{e.uan ?? <span className="font-sans text-ink-3">{e.type === "contract" ? "Covered by agency PF code" : "Not enrolled"}</span>}</ReadValue></Field>
                  <Field label="ESIC IP no."><ReadValue mono>{e.esic ?? <span className="font-sans text-ink-3">Not applicable</span>}</ReadValue></Field>
                  <Field label="PAN"><ReadValue mono>{maskPan(e.pan)}</ReadValue></Field>
                  <Field label="Aadhaar"><ReadValue mono>XXXX XXXX {e.aadhaarLast4}</ReadValue></Field>
                  <Field label="Bank"><ReadValue>{e.bank.name}</ReadValue></Field>
                  <Field label="Account"><ReadValue mono>{maskAccount(e.bank.account)} <span className="font-sans text-ink-3">· {e.bank.ifsc}</span></ReadValue></Field>
                  <Field label="Date of birth"><ReadValue>{formatDate(e.dob)}</ReadValue></Field>
                  <Field label="Address"><ReadValue>{e.address}</ReadValue></Field>
                  <p className="text-xs text-ink-3 lg:col-span-2"><Lock className="mr-1 inline size-3" />Identity numbers are stored encrypted and shown masked; full values are visible only in the payroll export.</p>
                </FieldGrid>
              ),
            },
            ...(role.seesCost
              ? [
                  {
                    key: "pay",
                    label: "Pay & costing",
                    content: (
                      <FieldGrid>
                        <Field label="Pay basis"><ReadValue>{PAY_BASIS[e.payBasis]}</ReadValue></Field>
                        <Field label={e.payBasis === "monthly" ? "Monthly gross" : e.payBasis === "daily" ? "Day wage" : "Rate per piece"}>
                          <ReadValue>{e.payBasis === "piece_rate" ? `₹${e.payRate.toFixed(2)} / good piece` : formatINR(e.payRate)}</ReadValue>
                        </Field>
                        <Field label="Labour rate" hint="Used for job-card labour cost in order costing (FR-MF-06)">
                          {rate === null ? (
                            <div className="flex items-center gap-2">
                              <ReadValue>{e.labourRate ? `${formatINR(e.labourRate)} / hour` : "Indirect — absorbed in overhead"}</ReadValue>
                              {(role.key === "owner" || role.key === "accountant") && <Button size="xs" variant="ghost" onClick={() => setRate(String(e.labourRate))}>Edit</Button>}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Input type="number" min={0} value={rate} onChange={(ev) => setRate(ev.target.value)} className="w-28" aria-label="Labour rate per hour" autoFocus />
                              <Button size="sm" variant="primary" onClick={saveRate}>Save</Button>
                              <Button size="sm" variant="ghost" onClick={() => setRate(null)}>Cancel</Button>
                            </div>
                          )}
                        </Field>
                        <Field label="OT rate"><ReadValue>2× ordinary rate <span className="text-ink-3">· Factories Act s.59</span></ReadValue></Field>
                      </FieldGrid>
                    ),
                  },
                ]
              : []),
            {
              key: "docs",
              label: "Documents",
              count: e.documents.length,
              content: (
                <div>
                  <ul className="divide-y divide-line rounded-lg border border-line">
                    {e.documents.map((d) => (
                      <li key={d.name} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                        <FileText className="size-4 text-ink-3" />
                        <span className="flex-1">{d.name}</span>
                        <span className="text-xs text-ink-3">Uploaded {formatDate(d.uploadedOn)}</span>
                        <Tip label="Download"><Button size="icon-sm" variant="ghost" aria-label={`Download ${d.name}`} onClick={() => toast.success(`${d.name} downloaded`)}><Download /></Button></Tip>
                      </li>
                    ))}
                    {e.documents.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-3">No documents yet</li>}
                  </ul>
                  <Button className="mt-3" onClick={() => toast("Choose a file to upload", { description: "PDF or image up to 10 MB" })}><Upload /> Upload document</Button>
                </div>
              ),
            },
          ]}
        />
      </Sheet>
    </FormPage>
  );
}
