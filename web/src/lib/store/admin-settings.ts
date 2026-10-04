"use client";

import { create } from "zustand";
import { reasonCodes, shifts } from "@/lib/data/masters";

/* ---------------- Financial year, periods, lock date (G6) ---------------- */

export type PeriodStatus = "open" | "closed" | "locked";

export interface Period {
  key: string; // 2026-04
  label: string; // Apr 2026
  status: PeriodStatus;
}

export interface FiscalYear {
  id: string;
  label: string;
  start: string;
  end: string;
  status: "open" | "closed";
  periods: Period[];
}

export interface LockEvent {
  id: string;
  at: string;
  user: string;
  from: string;
  to: string;
  reason: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function periodsFor(startYear: number, statusOf: (key: string) => PeriodStatus): Period[] {
  return Array.from({ length: 12 }, (_, i) => {
    const m = (3 + i) % 12;
    const y = startYear + (3 + i >= 12 ? 1 : 0);
    const key = `${y}-${String(m + 1).padStart(2, "0")}`;
    return { key, label: `${MONTHS[m]} ${y}`, status: statusOf(key) };
  });
}

/* ---------------- Opening balances (G7) ---------------- */

export interface OpeningBalance {
  key: string;
  label: string;
  detail: string;
  records: number;
  value?: number;
  status: "not_started" | "imported" | "verified";
  updatedAt?: string;
  by?: string;
}

/* ---------------- Reference masters (G15, G18, G19) ---------------- */

export interface Uom {
  id: string;
  code: string;
  name: string;
  kind: "count" | "weight" | "length" | "volume" | "area" | "time";
  decimals: number;
  active: boolean;
}

export interface UomConversion {
  id: string;
  from: string;
  to: string;
  factor: number;
  item?: string;
}

export type ReasonKind = "scrap" | "rework" | "adjustment" | "downtime";

export interface ReasonCode {
  id: string;
  code: string;
  name: string;
  nameHi: string;
  icon: string;
  kind: ReasonKind;
  active: boolean;
}

export interface HsnRate {
  id: string;
  code: string;
  type: "HSN" | "SAC";
  description: string;
  rate: number;
  cess: number;
  effectiveFrom: string;
  active: boolean;
}

export interface PaymentTerm {
  id: string;
  name: string;
  days: number;
  advancePct: number;
  basis: "invoice" | "month_end" | "delivery";
  msme: boolean;
  active: boolean;
}

export interface Shift {
  id: string;
  code: string;
  name: string;
  nameHi: string;
  start: string;
  end: string;
  breakMins: number;
  active: boolean;
}

export interface StateRow {
  id: string;
  code: string;
  name: string;
  ut: boolean;
  active: boolean;
}

/* ---------------- Plan & billing (G8, G21) ---------------- */

export interface SubscriptionInvoice {
  id: string;
  number: string;
  date: string;
  period: string;
  amount: number;
  status: "paid" | "unpaid";
}

export interface BillingContact {
  name: string;
  email: string;
  phone: string;
  gstin: string;
  address: string;
}

interface AdminSettingsState {
  years: FiscalYear[];
  lockDate: string;
  lockHistory: LockEvent[];
  openings: OpeningBalance[];
  uoms: Uom[];
  conversions: UomConversion[];
  reasons: ReasonCode[];
  hsn: HsnRate[];
  terms: PaymentTerm[];
  shifts: Shift[];
  states: StateRow[];
  plan: "starter" | "growth" | "pro";
  cycle: "monthly" | "annual";
  invoices: SubscriptionInvoice[];
  contact: BillingContact;

  setPeriodStatus: (fyId: string, key: string, status: PeriodStatus) => void;
  setLockDate: (to: string, reason: string, user: string) => void;
  setOpening: (key: string, patch: Partial<OpeningBalance>) => void;
  upsert: <K extends MasterKey>(key: K, row: AdminSettingsState[K][number]) => void;
  setPlan: (plan: AdminSettingsState["plan"]) => void;
  setCycle: (cycle: AdminSettingsState["cycle"]) => void;
  setContact: (c: BillingContact) => void;
}

export type MasterKey = "uoms" | "conversions" | "reasons" | "hsn" | "terms" | "shifts" | "states";

const reasonKind = (k: string): ReasonKind => (k === "pause" ? "downtime" : "scrap");

export const useAdminSettings = create<AdminSettingsState>()((set) => ({
  years: [
    { id: "fy25", label: "FY 2025-26", start: "2025-04-01", end: "2026-03-31", status: "closed", periods: periodsFor(2025, () => "locked") },
    {
      id: "fy26",
      label: "FY 2026-27",
      start: "2026-04-01",
      end: "2027-03-31",
      status: "open",
      periods: periodsFor(2026, (k) => (k <= "2026-07" ? "locked" : k <= "2026-08" ? "closed" : "open")),
    },
  ],
  lockDate: "2026-07-31",
  lockHistory: [
    { id: "l3", at: "2026-09-05T18:12:00", user: "Rajesh Agarwal", from: "2026-06-30", to: "2026-07-31", reason: "July GSTR-3B filed; Tally sync for July reconciled by CA" },
    { id: "l2", at: "2026-08-06T17:40:00", user: "Rajesh Agarwal", from: "2026-05-31", to: "2026-06-30", reason: "Q1 closed, advance tax computed" },
    { id: "l1", at: "2026-05-20T11:05:00", user: "Meera Iyer", from: "2026-03-31", to: "2026-05-31", reason: "FY 2025-26 audit adjustments posted" },
  ],
  openings: [
    { key: "stock", label: "Stock quantity & value", detail: "By item, warehouse and batch — sets FIFO layers and weighted-average cost", records: 412, value: 8642300, status: "verified", updatedAt: "2026-04-03T16:20:00", by: "Santosh Kale" },
    { key: "ar", label: "Open receivables (AR)", detail: "Unpaid customer invoices with original dates for ageing", records: 38, value: 2264800, status: "verified", updatedAt: "2026-04-02T12:40:00", by: "Meera Iyer" },
    { key: "ap", label: "Open payables (AP)", detail: "Unpaid vendor bills incl. MSME due dates", records: 51, value: 1793450, status: "imported", updatedAt: "2026-04-02T15:05:00", by: "Meera Iyer" },
    { key: "po", label: "Open purchase orders", detail: "Pending quantities so planning nets incoming stock", records: 17, value: 1220000, status: "imported", updatedAt: "2026-04-04T10:10:00", by: "Neha Kulkarni" },
    { key: "so", label: "Open sales orders", detail: "Pending delivery quantities and agreed rates", records: 12, value: 3410500, status: "verified", updatedAt: "2026-04-04T10:30:00", by: "Neha Kulkarni" },
    { key: "jw", label: "Material with job-workers", detail: "Open outward challans with original dates for ITC-04 time limits", records: 0, status: "not_started" },
  ],
  uoms: [
    { id: "u1", code: "NOS", name: "Numbers", kind: "count", decimals: 0, active: true },
    { id: "u2", code: "KGS", name: "Kilograms", kind: "weight", decimals: 3, active: true },
    { id: "u3", code: "MTR", name: "Metres", kind: "length", decimals: 2, active: true },
    { id: "u4", code: "MM", name: "Millimetres", kind: "length", decimals: 0, active: true },
    { id: "u5", code: "LTR", name: "Litres", kind: "volume", decimals: 2, active: true },
    { id: "u6", code: "SET", name: "Sets", kind: "count", decimals: 0, active: true },
    { id: "u7", code: "BOX", name: "Boxes", kind: "count", decimals: 0, active: true },
    { id: "u8", code: "SQM", name: "Square metres", kind: "area", decimals: 2, active: true },
    { id: "u9", code: "HRS", name: "Hours", kind: "time", decimals: 2, active: true },
    { id: "u10", code: "TON", name: "Tonnes", kind: "weight", decimals: 3, active: false },
  ],
  conversions: [
    { id: "c1", from: "TON", to: "KGS", factor: 1000 },
    { id: "c2", from: "MTR", to: "MM", factor: 1000 },
    { id: "c3", from: "BOX", to: "NOS", factor: 50, item: "Bearing 6204-2RS" },
    { id: "c4", from: "MTR", to: "KGS", factor: 15.42, item: "MS Round Bar EN8 Ø32 mm" },
  ],
  reasons: [
    ...reasonCodes.map((r, i) => ({ id: `rc${i}`, code: r.code, name: r.name, nameHi: r.nameHi, icon: r.icon, kind: reasonKind(r.kind), active: true })),
    { id: "rc20", code: "RW-DIM", name: "Rework — re-machining", nameHi: "दोबारा मशीनिंग", icon: "refresh-cw", kind: "rework", active: true },
    { id: "rc21", code: "RW-DEB", name: "Rework — deburring", nameHi: "दोबारा डिबरिंग", icon: "refresh-cw", kind: "rework", active: true },
    { id: "rc22", code: "ADJ-DMG", name: "Damaged in store", nameHi: "स्टोर में खराब", icon: "package-x", kind: "adjustment", active: true },
    { id: "rc23", code: "ADJ-CNT", name: "Count variance", nameHi: "गिनती अंतर", icon: "clipboard-list", kind: "adjustment", active: true },
    { id: "rc24", code: "ADJ-OBS", name: "Obsolete / write-off", nameHi: "पुराना माल", icon: "archive", kind: "adjustment", active: false },
  ],
  hsn: [
    { id: "h1", code: "8483", type: "HSN", description: "Transmission shafts, cranks, bearing housings", rate: 18, cess: 0, effectiveFrom: "2017-07-01", active: true },
    { id: "h2", code: "848210", type: "HSN", description: "Ball bearings", rate: 18, cess: 0, effectiveFrom: "2017-07-01", active: true },
    { id: "h3", code: "7214", type: "HSN", description: "Bars and rods of iron or non-alloy steel", rate: 18, cess: 0, effectiveFrom: "2017-07-01", active: true },
    { id: "h4", code: "7318", type: "HSN", description: "Screws, bolts, nuts, washers of iron or steel", rate: 18, cess: 0, effectiveFrom: "2017-07-01", active: true },
    { id: "h5", code: "8413", type: "HSN", description: "Pumps for liquids", rate: 18, cess: 0, effectiveFrom: "2025-09-22", active: true },
    { id: "h6", code: "4819", type: "HSN", description: "Cartons, boxes of corrugated paper", rate: 18, cess: 0, effectiveFrom: "2017-07-01", active: true },
    { id: "h7", code: "998898", type: "SAC", description: "Job-work: other manufacturing services", rate: 12, cess: 0, effectiveFrom: "2018-10-01", active: true },
    { id: "h8", code: "998873", type: "SAC", description: "Maintenance & repair of machinery", rate: 18, cess: 0, effectiveFrom: "2017-07-01", active: true },
    { id: "h9", code: "996511", type: "SAC", description: "Road transport of goods (GTA)", rate: 5, cess: 0, effectiveFrom: "2017-07-01", active: true },
  ],
  terms: [
    { id: "t1", name: "Advance", days: 0, advancePct: 100, basis: "invoice", msme: false, active: true },
    { id: "t2", name: "Net 15", days: 15, advancePct: 0, basis: "invoice", msme: true, active: true },
    { id: "t3", name: "Net 30", days: 30, advancePct: 0, basis: "invoice", msme: true, active: true },
    { id: "t4", name: "Net 45 (MSME max)", days: 45, advancePct: 0, basis: "invoice", msme: true, active: true },
    { id: "t5", name: "Net 60", days: 60, advancePct: 0, basis: "invoice", msme: false, active: true },
    { id: "t6", name: "30 days from month end", days: 30, advancePct: 0, basis: "month_end", msme: false, active: true },
    { id: "t7", name: "30% advance, balance 30 days", days: 30, advancePct: 30, basis: "delivery", msme: false, active: false },
  ],
  shifts: [
    ...shifts.map((s, i) => ({ id: `s${i}`, code: s.code, name: s.name, nameHi: s.code === "A" ? "पाली A" : "पाली B", start: s.start, end: s.end, breakMins: 30, active: true })),
    { id: "s9", code: "G", name: "General", nameHi: "जनरल", start: "09:00", end: "17:30", breakMins: 45, active: true },
    { id: "s10", code: "C", name: "Shift C (night)", nameHi: "पाली C (रात)", start: "00:00", end: "07:00", breakMins: 30, active: false },
  ],
  states: [
    ["01", "Jammu and Kashmir", true], ["03", "Punjab", false], ["06", "Haryana", false], ["07", "Delhi", true], ["08", "Rajasthan", false],
    ["09", "Uttar Pradesh", false], ["10", "Bihar", false], ["19", "West Bengal", false], ["22", "Chhattisgarh", false], ["23", "Madhya Pradesh", false],
    ["24", "Gujarat", false], ["26", "Dadra and Nagar Haveli and Daman and Diu", true], ["27", "Maharashtra", false], ["29", "Karnataka", false],
    ["30", "Goa", false], ["32", "Kerala", false], ["33", "Tamil Nadu", false], ["36", "Telangana", false], ["37", "Andhra Pradesh", false], ["97", "Other Territory", true],
  ].map(([code, name, ut]) => ({ id: `st${code}`, code: code as string, name: name as string, ut: ut as boolean, active: true })),
  plan: "growth",
  cycle: "annual",
  invoices: [
    { id: "si6", number: "FE/SUB/26-27/0418", date: "2026-10-01", period: "Oct 2026", amount: 17582, status: "unpaid" },
    { id: "si5", number: "FE/SUB/26-27/0352", date: "2026-09-01", period: "Sep 2026", amount: 17582, status: "paid" },
    { id: "si4", number: "FE/SUB/26-27/0291", date: "2026-08-01", period: "Aug 2026", amount: 17582, status: "paid" },
    { id: "si3", number: "FE/SUB/26-27/0233", date: "2026-07-01", period: "Jul 2026", amount: 17582, status: "paid" },
    { id: "si2", number: "FE/SUB/26-27/0178", date: "2026-06-01", period: "Jun 2026", amount: 17582, status: "paid" },
    { id: "si1", number: "FE/ONB/26-27/0042", date: "2026-03-20", period: "Onboarding (one-time)", amount: 59000, status: "paid" },
  ],
  contact: {
    name: "Meera Iyer",
    email: "accounts@shaktiprecision.in",
    phone: "+91 98220 41736",
    gstin: "27AAKCS4821M1Z5",
    address: "Plot J-142, Bhosari MIDC, Pune, Maharashtra 411026",
  },

  setPeriodStatus: (fyId, key, status) =>
    set((s) => ({ years: s.years.map((y) => (y.id === fyId ? { ...y, periods: y.periods.map((p) => (p.key === key ? { ...p, status } : p)) } : y)) })),
  setLockDate: (to, reason, user) =>
    set((s) => ({
      lockDate: to,
      lockHistory: [{ id: `l${Date.now()}`, at: new Date().toISOString().slice(0, 19), user, from: s.lockDate, to, reason }, ...s.lockHistory],
    })),
  setOpening: (key, patch) => set((s) => ({ openings: s.openings.map((o) => (o.key === key ? { ...o, ...patch } : o)) })),
  upsert: (key, row) =>
    set((s) => {
      const list = s[key] as { id: string }[];
      const exists = list.some((r) => r.id === row.id);
      return { [key]: exists ? list.map((r) => (r.id === row.id ? row : r)) : [...list, row] } as Partial<AdminSettingsState>;
    }),
  setPlan: (plan) => set({ plan }),
  setCycle: (cycle) => set({ cycle }),
  setContact: (contact) => set({ contact }),
}));
