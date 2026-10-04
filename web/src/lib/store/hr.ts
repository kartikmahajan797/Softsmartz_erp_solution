"use client";

import { create } from "zustand";
import type { Activity } from "@/components/erp/form-view";
import { operators } from "@/lib/data/masters";
import { TODAY } from "@/lib/utils";

/**
 * People (lean HR) — employee master with labour rate (arch §3 G2, FR-HR-01 P1),
 * attendance, shift roster, leave and monthly payroll inputs. Payroll calculation itself
 * stays with the payroll provider / Tally (full HRMS is a PRD non-goal).
 */

export type EmpType = "permanent" | "contract" | "trainee";
export type PayBasis = "monthly" | "daily" | "piece_rate";

export interface Employee {
  id: string;
  code: string;
  name: string;
  nameHi: string;
  /** Operator id when the employee signs in on shop-floor terminals. */
  operatorId?: string;
  department: "Production" | "Quality" | "Stores" | "Maintenance" | "Accounts" | "Sales" | "Admin";
  designation: string;
  type: EmpType;
  agency?: string;
  joinedOn: string;
  exitOn?: string;
  phone: string;
  gender: "M" | "F";
  dob: string;
  address: string;
  uan?: string;
  esic?: string;
  pan: string;
  aadhaarLast4: string;
  bank: { name: string; account: string; ifsc: string };
  payBasis: PayBasis;
  /** Monthly gross (monthly), day wage (daily) or rate per piece (piece_rate). */
  payRate: number;
  labourRate: number;
  defaultShift: "A" | "B" | "C";
  workCentres: string[];
  /** Certification level per work centre: 0 none, 1 trainee, 2 certified, 3 trainer. */
  skills: Record<string, 0 | 1 | 2 | 3>;
  documents: { name: string; uploadedOn: string; expires?: string }[];
  activities: Activity[];
}

export type AttStatus = "present" | "absent" | "half_day" | "late" | "leave" | "weekly_off" | "holiday" | "awaited";
export type AttSource = "terminal" | "biometric" | "manual";

export interface AttRecord {
  empId: string;
  date: string;
  status: AttStatus;
  in?: string;
  out?: string;
  source: AttSource;
  otHours: number;
  note?: string;
}

export type RosterShift = "A" | "B" | "C" | "O";

export const ROSTER_SHIFTS: Record<RosterShift, { label: string; time: string; tone: string }> = {
  A: { label: "A", time: "07:00-15:30", tone: "bg-info-bg text-info border-info/25" },
  B: { label: "B", time: "15:30-00:00", tone: "bg-progress-bg text-progress border-progress/25" },
  C: { label: "C", time: "23:30-07:00", tone: "bg-brand-900 text-white border-brand-900" },
  O: { label: "Off", time: "Weekly off", tone: "bg-surface-3 text-ink-3 border-line" },
};

/** Minimum heads per shift for the plant (coverage row). */
export const SHIFT_MIN: Record<Exclude<RosterShift, "O">, number> = { A: 7, B: 4, C: 1 };

export type LeaveType = "CL" | "SL" | "EL" | "LWP";

export const LEAVE_TYPES: Record<LeaveType, { label: string; quota: number }> = {
  CL: { label: "Casual leave", quota: 8 },
  SL: { label: "Sick leave", quota: 7 },
  EL: { label: "Earned leave", quota: 15 },
  LWP: { label: "Leave without pay", quota: 0 },
};

export interface LeaveRequest {
  id: string;
  number: string;
  empId: string;
  type: LeaveType;
  from: string;
  to: string;
  days: number;
  reason: string;
  appliedOn: string;
  status: "pending" | "approved" | "rejected";
  decidedBy?: string;
  comment?: string;
}

export interface PayrollInput {
  empId: string;
  advance: number;
  /** Good pieces reported on job cards in the month (piece-rate earnings). */
  goodQty: number;
  incentive: number;
}

/* ---------------- Seed ---------------- */

const act = (id: string, at: string, user: string, kind: Activity["kind"], text: string): Activity => ({ id, at, user, kind, text, device: "Chrome · Windows" });

const opEmp = (o: (typeof operators)[number], i: number, extra: Partial<Employee>): Employee => ({
  id: `e${i + 1}`,
  code: `EMP-${String(1001 + i)}`,
  name: o.name,
  nameHi: o.nameHi,
  operatorId: o.id,
  department: "Production",
  designation: "Machine operator",
  type: "permanent",
  joinedOn: "2021-06-14",
  phone: `+91 98${(220 + i * 7).toString().padStart(3, "0")} ${(41000 + i * 1311).toString().slice(0, 5)}`,
  gender: "M",
  dob: "1990-03-12",
  address: "Bhosari, Pune 411026",
  uan: `1009${(55123400 + i * 977).toString()}`,
  esic: `33000${(712340 + i * 131).toString()}`,
  pan: `ABCP${String.fromCharCode(75 + i)}${4100 + i * 37}K`,
  aadhaarLast4: String(4821 + i * 113).slice(-4),
  bank: { name: "Bank of Maharashtra", account: `6012${(38920011 + i * 7331).toString()}`, ifsc: "MAHB0001022" },
  payBasis: "monthly",
  payRate: Math.round(o.labourRate * 8 * 26 / 100) * 100,
  labourRate: o.labourRate,
  defaultShift: o.shift,
  workCentres: o.workCentres,
  skills: Object.fromEntries(o.workCentres.map((w, k) => [w, k === 0 ? 3 : 2])) as Employee["skills"],
  documents: [
    { name: "Appointment letter.pdf", uploadedOn: "2021-06-14" },
    { name: "Aadhaar (masked).pdf", uploadedOn: "2021-06-14" },
  ],
  activities: [act(`a${i}1`, "2026-04-01T10:00:00", "Rajesh Agarwal", "updated", "Annual increment applied · labour rate revised"), act(`a${i}0`, "2021-06-14T09:30:00", "System", "created", "Employee created from onboarding import")],
  ...extra,
});

const seedEmployees: Employee[] = [
  opEmp(operators[0], 0, { designation: "Senior CNC setter", joinedOn: "2018-02-05", skills: { wc1: 3, wc2: 3, wc3: 2, wc6: 1 } }),
  opEmp(operators[1], 1, { designation: "CNC operator", joinedOn: "2020-08-17", skills: { wc1: 2, wc6: 2, wc2: 1 } }),
  opEmp(operators[2], 2, { designation: "Drill & inspection operator", gender: "F", joinedOn: "2022-01-10", skills: { wc6: 2, wc7: 3 } }),
  opEmp(operators[3], 3, { designation: "CNC / VMC operator", joinedOn: "2019-11-04", skills: { wc2: 3, wc3: 2, wc1: 2 } }),
  opEmp(operators[4], 4, { designation: "Press operator", payBasis: "piece_rate", payRate: 1.6, joinedOn: "2023-03-01", skills: { wc4: 2, wc5: 2 } }),
  opEmp(operators[5], 5, { designation: "Packing operator", gender: "F", type: "contract", agency: "Sai Manpower Services", payBasis: "daily", payRate: 620, joinedOn: "2025-07-21", uan: undefined, skills: { wc7: 2 } }),
  {
    ...opEmp(operators[0], 6, {}),
    operatorId: undefined, name: "Prakash Deshmukh", nameHi: "प्रकाश देशमुख", department: "Production", designation: "Production head",
    joinedOn: "2016-09-01", payRate: 92000, labourRate: 0, defaultShift: "A", workCentres: [], skills: { wc1: 3, wc2: 3, wc3: 3, wc4: 2 },
  },
  {
    ...opEmp(operators[0], 7, {}),
    operatorId: undefined, name: "Santosh Kale", nameHi: "संतोष काले", department: "Stores", designation: "Store keeper",
    joinedOn: "2019-04-15", payRate: 38000, labourRate: 0, workCentres: [], skills: {},
  },
  {
    ...opEmp(operators[0], 8, {}),
    operatorId: undefined, name: "Meera Iyer", nameHi: "मीरा अय्यर", gender: "F", department: "Accounts", designation: "Accountant",
    joinedOn: "2020-01-06", payRate: 56000, labourRate: 0, workCentres: [], skills: {},
  },
  {
    ...opEmp(operators[0], 9, {}),
    operatorId: undefined, name: "Neha Kulkarni", nameHi: "नेहा कुलकर्णी", gender: "F", department: "Sales", designation: "Sales & purchase executive",
    joinedOn: "2022-06-20", payRate: 42000, labourRate: 0, workCentres: [], skills: {},
  },
  {
    ...opEmp(operators[0], 10, {}),
    operatorId: undefined, name: "Dinesh Pawar", nameHi: "दिनेश पवार", department: "Maintenance", designation: "Maintenance fitter",
    joinedOn: "2017-10-02", payRate: 34000, labourRate: 160, defaultShift: "B", workCentres: ["wc3", "wc4"], skills: { wc3: 2, wc4: 2, wc1: 1 },
  },
  {
    ...opEmp(operators[0], 11, {}),
    operatorId: undefined, name: "Kavita Shinde", nameHi: "कविता शिंदे", gender: "F", department: "Quality", designation: "QC inspector",
    joinedOn: "2021-12-01", payRate: 31000, labourRate: 140, workCentres: ["wc7"], skills: { wc7: 3, wc6: 1 },
  },
  {
    ...opEmp(operators[0], 12, {}),
    operatorId: undefined, name: "Rahul Gaikwad", nameHi: "राहुल गायकवाड़", department: "Production", designation: "Welder", type: "contract", agency: "Sai Manpower Services",
    joinedOn: "2026-02-09", payBasis: "daily", payRate: 700, labourRate: 165, defaultShift: "B", workCentres: ["wc5"], skills: { wc5: 2 }, uan: undefined,
  },
  {
    ...opEmp(operators[0], 13, {}),
    operatorId: undefined, name: "Akash Bhosale", nameHi: "आकाश भोसले", department: "Production", designation: "ITI trainee — turning", type: "trainee",
    joinedOn: "2026-07-01", payRate: 15000, labourRate: 90, workCentres: ["wc1", "wc2"], skills: { wc1: 1, wc2: 1 }, uan: undefined, esic: undefined,
  },
  {
    ...opEmp(operators[0], 14, {}),
    operatorId: undefined, name: "Ganesh Lokhande", nameHi: "गणेश लोखंडे", department: "Production", designation: "Night-shift operator", type: "contract", agency: "Balaji Labour Contractors",
    joinedOn: "2025-11-17", payBasis: "daily", payRate: 650, labourRate: 150, defaultShift: "C", workCentres: ["wc4", "wc6"], skills: { wc4: 2, wc6: 1 }, uan: undefined,
  },
  {
    ...opEmp(operators[0], 15, {}),
    operatorId: undefined, name: "Sachin Wagh", nameHi: "सचिन वाघ", department: "Production", designation: "Helper", type: "contract", agency: "Balaji Labour Contractors",
    joinedOn: "2025-03-03", exitOn: "2026-09-20", payBasis: "daily", payRate: 560, labourRate: 110, defaultShift: "C", workCentres: ["wc4"], skills: { wc4: 1 }, uan: undefined,
  },
];

/** Deterministic pseudo-random in [0,1) from a string (stable mock data). */
function rand(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

const pad = (n: number) => String(n).padStart(2, "0");
export const isoDay = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
export const weekday = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

const HOLIDAYS: Record<string, string> = { "2026-09-14": "Ganesh Chaturthi" };
export const holidayName = (iso: string) => HOLIDAYS[iso];

const SHIFT_IN: Record<string, string> = { A: "07:00", B: "15:30", C: "23:30" };
const SHIFT_OUT: Record<string, string> = { A: "15:30", B: "00:00", C: "07:00" };

function addMin(t: string, m: number) {
  const [h, mm] = t.split(":").map(Number);
  const tot = (h * 60 + mm + m + 1440) % 1440;
  return `${pad(Math.floor(tot / 60))}:${pad(tot % 60)}`;
}

/** Generated attendance for an employee on a date (before manual regularisations). */
export function baseAttendance(e: Employee, date: string): AttRecord | null {
  if (date < e.joinedOn || (e.exitOn && date > e.exitOn) || date > TODAY) return null;
  if (holidayName(date)) {
    // Production runs on festival holidays only for OT volunteers.
    if (e.department === "Production" && rand(e.id + date) < 0.3) {
      return { empId: e.id, date, status: "present", in: SHIFT_IN[e.defaultShift], out: SHIFT_OUT[e.defaultShift], source: "terminal", otHours: 8.5, note: "Holiday working — double OT" };
    }
    return { empId: e.id, date, status: "holiday", source: "manual", otHours: 0 };
  }
  if (weekday(date) === 0) return { empId: e.id, date, status: "weekly_off", source: "manual", otHours: 0 };
  const r = rand(e.id + date);
  const source: AttSource = e.operatorId ? "terminal" : e.department === "Production" || e.department === "Maintenance" || e.department === "Quality" ? "biometric" : "biometric";
  const sIn = SHIFT_IN[e.defaultShift];
  const sOut = SHIFT_OUT[e.defaultShift];
  // Today (data as of 14:00): shift B has not started; shift A is still clocked in.
  if (date === TODAY && e.defaultShift === "B") return { empId: e.id, date, status: "awaited", source, otHours: 0 };
  const stillIn = date === TODAY && e.defaultShift === "A";
  if (r < 0.04) return { empId: e.id, date, status: "absent", source, otHours: 0 };
  if (r < 0.07) return { empId: e.id, date, status: "leave", source: "manual", otHours: 0, note: "Approved leave" };
  if (r < 0.1 && !stillIn) return { empId: e.id, date, status: "half_day", in: sIn, out: addMin(sIn, 270), source, otHours: 0 };
  if (r < 0.18) return { empId: e.id, date, status: "late", in: addMin(sIn, 12 + Math.round(r * 200) % 30), out: stillIn ? undefined : sOut, source, otHours: 0 };
  const ot = stillIn ? 0 : r > 0.82 ? (r > 0.93 ? 4 : 2) : 0;
  return { empId: e.id, date, status: "present", in: addMin(sIn, -Math.round(r * 50) % 10), out: stillIn ? undefined : ot ? addMin(sOut, ot * 60) : sOut, source, otHours: ot };
}

const seedLeave: LeaveRequest[] = [
  { id: "lv1", number: "LV-2026-0141", empId: "e2", type: "CL", from: "2026-10-05", to: "2026-10-06", days: 2, reason: "Family function in Satara", appliedOn: "2026-09-29", status: "pending" },
  { id: "lv2", number: "LV-2026-0142", empId: "e12", type: "SL", from: "2026-10-01", to: "2026-10-03", days: 3, reason: "Viral fever — medical certificate attached", appliedOn: "2026-10-01", status: "approved", decidedBy: "Prakash Deshmukh" },
  { id: "lv3", number: "LV-2026-0143", empId: "e4", type: "EL", from: "2026-10-19", to: "2026-10-24", days: 6, reason: "Diwali — travelling to native place (Azamgarh)", appliedOn: "2026-09-25", status: "pending" },
  { id: "lv4", number: "LV-2026-0138", empId: "e3", type: "CL", from: "2026-09-22", to: "2026-09-22", days: 1, reason: "Child's school PTM", appliedOn: "2026-09-18", status: "approved", decidedBy: "Prakash Deshmukh" },
  { id: "lv5", number: "LV-2026-0136", empId: "e11", type: "EL", from: "2026-09-08", to: "2026-09-12", days: 5, reason: "Ganpati festival", appliedOn: "2026-08-28", status: "approved", decidedBy: "Prakash Deshmukh" },
  { id: "lv6", number: "LV-2026-0135", empId: "e5", type: "CL", from: "2026-09-15", to: "2026-09-16", days: 2, reason: "Personal work", appliedOn: "2026-09-13", status: "rejected", decidedBy: "Prakash Deshmukh", comment: "Press order PO-DML due — please take after 25-Sep" },
  { id: "lv7", number: "LV-2026-0144", empId: "e9", type: "EL", from: "2026-10-26", to: "2026-10-30", days: 5, reason: "Annual vacation", appliedOn: "2026-10-01", status: "pending" },
  { id: "lv8", number: "LV-2026-0139", empId: "e1", type: "SL", from: "2026-09-24", to: "2026-09-24", days: 1, reason: "Dental appointment", appliedOn: "2026-09-24", status: "approved", decidedBy: "Rajesh Agarwal" },
];

/** Leave used before the requests above (opening for FY 2026-27). */
const seedUsed: Record<string, Partial<Record<LeaveType, number>>> = {
  e1: { CL: 3, SL: 1, EL: 4 }, e2: { CL: 5, SL: 2 }, e3: { CL: 2, EL: 6 }, e4: { CL: 4, SL: 3, EL: 2 }, e5: { CL: 6, SL: 1 },
  e7: { CL: 1, EL: 5 }, e8: { CL: 2, SL: 4 }, e9: { CL: 3, EL: 3 }, e10: { CL: 2 }, e11: { CL: 4, SL: 2, EL: 5 }, e12: { CL: 1, SL: 4 }, e14: { CL: 1 },
};

const WEEK_START = "2026-09-28";

function seedRoster(emps: Employee[]): Record<string, RosterShift[]> {
  const out: Record<string, RosterShift[]> = {};
  emps.forEach((e) => {
    if (e.exitOn) return;
    out[e.id] = Array.from({ length: 7 }, (_, d) => (d === 6 ? "O" : e.defaultShift));
  });
  // A few realistic deviations: rotation and a mid-week swap.
  out.e2 = ["A", "A", "B", "B", "B", "B", "O"];
  out.e13 = ["B", "B", "B", "O", "B", "B", "B"];
  out.e15 = ["C", "C", "C", "C", "C", "O", "C"];
  return out;
}

const seedPayroll: PayrollInput[] = [
  { empId: "e1", advance: 0, goodQty: 0, incentive: 1500 },
  { empId: "e2", advance: 3000, goodQty: 0, incentive: 800 },
  { empId: "e3", advance: 0, goodQty: 0, incentive: 0 },
  { empId: "e4", advance: 5000, goodQty: 0, incentive: 1200 },
  { empId: "e5", advance: 0, goodQty: 14820, incentive: 0 },
  { empId: "e6", advance: 1000, goodQty: 0, incentive: 0 },
  { empId: "e13", advance: 2000, goodQty: 0, incentive: 0 },
  { empId: "e15", advance: 0, goodQty: 0, incentive: 500 },
];

/* ---------------- Store ---------------- */

interface HrState {
  employees: Employee[];
  /** Regularised / manual attendance records keyed `${empId}|${date}`. */
  overrides: Record<string, AttRecord>;
  weekStart: string;
  roster: Record<string, RosterShift[]>;
  rosterPublishedAt?: string;
  leave: LeaveRequest[];
  leaveUsed: Record<string, Partial<Record<LeaveType, number>>>;
  payroll: PayrollInput[];
  lockedMonths: string[];
  regularise: (rec: AttRecord, by: string) => void;
  cycleShift: (empId: string, day: number) => void;
  publishRoster: () => void;
  decideLeave: (id: string, status: "approved" | "rejected", by: string, comment?: string) => void;
  applyLeave: (req: Omit<LeaveRequest, "id" | "number" | "status" | "appliedOn">) => LeaveRequest;
  updatePayroll: (empId: string, patch: Partial<PayrollInput>) => void;
  lockMonth: (month: string) => void;
  logNote: (empId: string, user: string, text: string) => void;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
}

const CYCLE: RosterShift[] = ["A", "B", "C", "O"];

export const useHr = create<HrState>()((set, get) => ({
  employees: seedEmployees,
  overrides: {},
  weekStart: WEEK_START,
  roster: seedRoster(seedEmployees),
  leave: seedLeave,
  leaveUsed: seedUsed,
  payroll: seedPayroll,
  lockedMonths: ["2026-08"],
  regularise: (rec, by) =>
    set((s) => ({
      overrides: { ...s.overrides, [`${rec.empId}|${rec.date}`]: { ...rec, source: "manual" } },
      employees: s.employees.map((e) =>
        e.id === rec.empId
          ? { ...e, activities: [act(`r${Date.now()}`, `${TODAY}T${new Date().toTimeString().slice(0, 8)}`, by, "updated", `Attendance regularised for ${rec.date}: ${rec.status.replace(/_/g, " ")}${rec.note ? ` — ${rec.note}` : ""}`), ...e.activities] }
          : e,
      ),
    })),
  cycleShift: (empId, day) =>
    set((s) => {
      const row = [...(s.roster[empId] ?? Array(7).fill("O"))] as RosterShift[];
      row[day] = CYCLE[(CYCLE.indexOf(row[day]) + 1) % CYCLE.length];
      return { roster: { ...s.roster, [empId]: row }, rosterPublishedAt: undefined };
    }),
  publishRoster: () => set({ rosterPublishedAt: `${TODAY}T${new Date().toTimeString().slice(0, 5)}` }),
  decideLeave: (id, status, by, comment) =>
    set((s) => {
      const req = s.leave.find((l) => l.id === id);
      const used = { ...s.leaveUsed };
      if (req && status === "approved") used[req.empId] = { ...used[req.empId], [req.type]: (used[req.empId]?.[req.type] ?? 0) + req.days };
      return { leave: s.leave.map((l) => (l.id === id ? { ...l, status, decidedBy: by, comment } : l)), leaveUsed: used };
    }),
  applyLeave: (req) => {
    const n = get().leave.length + 141;
    const row: LeaveRequest = { ...req, id: `lv${Date.now()}`, number: `LV-2026-${String(n + 4).padStart(4, "0")}`, status: "pending", appliedOn: TODAY };
    set((s) => ({ leave: [row, ...s.leave] }));
    return row;
  },
  updatePayroll: (empId, patch) =>
    set((s) => {
      const exists = s.payroll.some((p) => p.empId === empId);
      return {
        payroll: exists ? s.payroll.map((p) => (p.empId === empId ? { ...p, ...patch } : p)) : [...s.payroll, { empId, advance: 0, goodQty: 0, incentive: 0, ...patch }],
      };
    }),
  lockMonth: (month) => set((s) => ({ lockedMonths: [...new Set([...s.lockedMonths, month])] })),
  logNote: (empId, user, text) =>
    set((s) => ({
      employees: s.employees.map((e) => (e.id === empId ? { ...e, activities: [act(`n${Date.now()}`, `${TODAY}T${new Date().toTimeString().slice(0, 8)}`, user, "note", text), ...e.activities] } : e)),
    })),
  updateEmployee: (id, patch) => set((s) => ({ employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
}));

/* ---------------- Selectors ---------------- */

export const empById = (emps: Employee[], id: string) => emps.find((e) => e.id === id);

export function attendanceFor(e: Employee, date: string, overrides: Record<string, AttRecord>): AttRecord | null {
  const manual = overrides[`${e.id}|${date}`];
  if (manual) return manual;
  const base = baseAttendance(e, date);
  if (!base || base.status === "weekly_off" || base.status === "holiday") return base;
  // Approved leave wins over generated punches.
  const lv = useHr.getState().leave.find((l) => l.empId === e.id && l.status === "approved" && l.from <= date && l.to >= date);
  return lv ? { empId: e.id, date, status: "leave", source: "manual", otHours: 0, note: `${lv.type} · ${lv.number}` } : base;
}

export const isActive = (e: Employee) => !e.exitOn || e.exitOn > TODAY;

export function daysInMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Month summary used by attendance heatmap and payroll inputs. */
export function monthSummary(e: Employee, month: string, overrides: Record<string, AttRecord>) {
  const [y, m] = month.split("-").map(Number);
  let present = 0, half = 0, absent = 0, leave = 0, off = 0, late = 0, ot = 0, counted = 0;
  for (let d = 1; d <= daysInMonth(month); d++) {
    const r = attendanceFor(e, isoDay(y, m, d), overrides);
    if (!r) continue;
    counted++;
    ot += r.otHours;
    if (r.status === "present") present++;
    else if (r.status === "late") { present++; late++; }
    else if (r.status === "half_day") half++;
    else if (r.status === "absent") absent++;
    else if (r.status === "leave") leave++;
    else if (r.status === "awaited") counted--;
    else off++;
  }
  // Paid days: worked + half days + paid leave + weekly offs / holidays (contract labour: worked days only).
  const paidDays = e.type === "contract" ? present + half * 0.5 : present + half * 0.5 + leave + off;
  return { present, half, absent, leave, off, late, ot, counted, paidDays };
}

export const ATT_TONE: Record<AttStatus, { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" | "progress"; cell: string }> = {
  present: { label: "Present", tone: "success", cell: "bg-success" },
  late: { label: "Late", tone: "warning", cell: "bg-warning" },
  half_day: { label: "Half day", tone: "progress", cell: "bg-progress" },
  absent: { label: "Absent", tone: "danger", cell: "bg-danger" },
  leave: { label: "On leave", tone: "info", cell: "bg-info" },
  weekly_off: { label: "Weekly off", tone: "neutral", cell: "bg-line-strong" },
  holiday: { label: "Holiday", tone: "neutral", cell: "bg-accent-500/60" },
  awaited: { label: "Shift not started", tone: "neutral", cell: "bg-surface-3" },
};

export const EMP_TYPE: Record<EmpType, { label: string; tone: "info" | "warning" | "progress" }> = {
  permanent: { label: "Permanent", tone: "info" },
  contract: { label: "Contract", tone: "warning" },
  trainee: { label: "Trainee", tone: "progress" },
};

export const SKILL_LEVEL = ["—", "Trainee", "Certified", "Trainer"] as const;

export const maskPan = (pan: string) => `${pan.slice(0, 2)}XXXX${pan.slice(-3)}`;
export const maskAccount = (a: string) => `XXXX XXXX ${a.slice(-4)}`;
