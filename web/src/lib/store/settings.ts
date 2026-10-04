"use client";

import { create } from "zustand";
import { company, operators as seedOperators } from "@/lib/data/masters";
import type { RoleKey } from "@/lib/store/app";

export interface CompanyProfile {
  legalName: string;
  tradeName: string;
  gstin: string;
  pan: string;
  address: string;
  state: string;
  stateCode: string;
  fyStartMonth: number;
  turnoverBand: string;
  einvoiceApplicable: boolean;
  email: string;
  phone: string;
  bankName: string;
  bankAccount: string;
  ifsc: string;
  brandColour: string;
  invoiceFooter: string;
}

export interface NumberSeries {
  id: string;
  docType: string;
  prefix: string;
  next: number;
  padding: number;
  fy: string;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: RoleKey;
  twoFactor: boolean;
  lastActive: string;
  status: "active" | "invited" | "disabled";
}

export type Perm = "read" | "create" | "approve" | "post";

export interface Terminal {
  id: string;
  name: string;
  device: string;
  workCentres: string[];
  lastSync: string;
  pending: number;
  status: "online" | "offline" | "revoked";
}

export interface OperatorRow {
  id: string;
  code: string;
  name: string;
  nameHi: string;
  workCentres: string[];
  shift: "A" | "B";
  pinSetAt: string;
  active: boolean;
}

export interface ApprovalRule {
  id: string;
  docType: string;
  condition: "amount_gt" | "discount_gt" | "credit_exceeded" | "any";
  threshold: number;
  approver: RoleKey;
  creatorCannotApprove: boolean;
  active: boolean;
}

export const MODULES = ["Sales", "Purchase", "Inventory", "Manufacturing", "Job-work", "Finance & GST", "Reports", "Settings"] as const;
export const PERMS: Perm[] = ["read", "create", "approve", "post"];

type Matrix = Record<RoleKey, Record<string, Perm[]>>;

const all: Perm[] = ["read", "create", "approve", "post"];
const seedMatrix: Matrix = {
  owner: Object.fromEntries(MODULES.map((m) => [m, all])) as Record<string, Perm[]>,
  production: { Sales: ["read"], Purchase: ["read", "create"], Inventory: ["read", "create", "approve"], Manufacturing: all, "Job-work": ["read", "create"], "Finance & GST": [], Reports: ["read"], Settings: [] },
  store: { Sales: ["read"], Purchase: ["read", "create"], Inventory: ["read", "create"], Manufacturing: ["read"], "Job-work": ["read", "create", "post"], "Finance & GST": [], Reports: [], Settings: [] },
  accountant: { Sales: ["read"], Purchase: ["read", "post"], Inventory: ["read"], Manufacturing: [], "Job-work": ["read"], "Finance & GST": all, Reports: ["read"], Settings: [] },
  sales: { Sales: ["read", "create"], Purchase: ["read", "create"], Inventory: ["read"], Manufacturing: [], "Job-work": [], "Finance & GST": [], Reports: ["read"], Settings: [] },
};

const seedFieldRules: Record<RoleKey, { cost: boolean; rate: boolean; margin: boolean }> = {
  owner: { cost: true, rate: true, margin: true },
  production: { cost: true, rate: true, margin: false },
  store: { cost: false, rate: false, margin: false },
  accountant: { cost: true, rate: true, margin: true },
  sales: { cost: false, rate: true, margin: false },
};

interface SettingsState {
  profile: CompanyProfile;
  series: NumberSeries[];
  users: UserRow[];
  matrix: Matrix;
  fieldRules: typeof seedFieldRules;
  terminals: Terminal[];
  operators: OperatorRow[];
  rules: ApprovalRule[];
  officeUserLimit: number;
  saveProfile: (p: CompanyProfile) => void;
  updateSeries: (id: string, patch: Partial<NumberSeries>) => void;
  inviteUser: (u: Omit<UserRow, "id" | "lastActive" | "status" | "twoFactor">) => void;
  setUserStatus: (id: string, status: UserRow["status"]) => void;
  togglePerm: (role: RoleKey, module: string, perm: Perm) => void;
  toggleFieldRule: (role: RoleKey, field: "cost" | "rate" | "margin") => void;
  revokeTerminal: (id: string) => void;
  registerTerminal: (t: Pick<Terminal, "name" | "device" | "workCentres">) => void;
  resetPin: (id: string) => void;
  toggleOperator: (id: string) => void;
  upsertRule: (r: ApprovalRule) => void;
  deleteRule: (id: string) => void;
}

export const useSettings = create<SettingsState>()((set) => ({
  profile: {
    legalName: company.name,
    tradeName: company.shortName,
    gstin: company.gstin,
    pan: company.pan,
    address: company.address,
    state: company.state,
    stateCode: company.stateCode,
    fyStartMonth: 4,
    turnoverBand: company.turnoverBand,
    einvoiceApplicable: true,
    email: "accounts@shaktiprecision.in",
    phone: "+91 20 2712 4410",
    bankName: "HDFC Bank, Bhosari MIDC",
    bankAccount: "50200041874417",
    ifsc: "HDFC0001287",
    brandColour: "#0d7377",
    invoiceFooter: "Subject to Pune jurisdiction. Interest @18% p.a. on overdue bills.",
  },
  series: [
    { id: "s1", docType: "Tax invoice", prefix: "INV/26-27/", next: 414, padding: 4, fy: "FY 2026-27" },
    { id: "s2", docType: "Credit note", prefix: "CN/26-27/", next: 16, padding: 4, fy: "FY 2026-27" },
    { id: "s3", docType: "Debit note", prefix: "DN/26-27/", next: 7, padding: 4, fy: "FY 2026-27" },
    { id: "s4", docType: "Delivery challan", prefix: "DC/26-27/", next: 390, padding: 4, fy: "FY 2026-27" },
    { id: "s5", docType: "Job-work challan", prefix: "JWC/26-27/", next: 35, padding: 4, fy: "FY 2026-27" },
    { id: "s6", docType: "Sales order", prefix: "SO-2026-", next: 236, padding: 5, fy: "FY 2026-27" },
    { id: "s7", docType: "Purchase order", prefix: "PO-2026-", next: 188, padding: 5, fy: "FY 2026-27" },
    { id: "s8", docType: "GRN", prefix: "GRN-2026-", next: 319, padding: 5, fy: "FY 2026-27" },
    { id: "s9", docType: "Receipt", prefix: "RCT/26-27/", next: 212, padding: 4, fy: "FY 2026-27" },
  ],
  users: [
    { id: "u1", name: "Rajesh Agarwal", email: "rajesh@shaktiprecision.in", phone: "+91 98220 40011", role: "owner", twoFactor: true, lastActive: "2026-10-02T14:01:00", status: "active" },
    { id: "u2", name: "Prakash Deshmukh", email: "prakash@shaktiprecision.in", phone: "+91 98220 40012", role: "production", twoFactor: false, lastActive: "2026-10-02T13:55:00", status: "active" },
    { id: "u3", name: "Santosh Kale", email: "santosh@shaktiprecision.in", phone: "+91 98220 40013", role: "store", twoFactor: false, lastActive: "2026-10-02T13:41:00", status: "active" },
    { id: "u4", name: "Meera Iyer", email: "meera@shaktiprecision.in", phone: "+91 98220 40014", role: "accountant", twoFactor: true, lastActive: "2026-10-02T13:20:00", status: "active" },
    { id: "u5", name: "Neha Kulkarni", email: "neha@shaktiprecision.in", phone: "+91 98220 40015", role: "sales", twoFactor: false, lastActive: "2026-10-02T11:32:00", status: "active" },
    { id: "u6", name: "CA Sunil Bhandari", email: "sunil@bhandarica.in", phone: "+91 98230 77120", role: "accountant", twoFactor: true, lastActive: "2026-09-30T18:10:00", status: "active" },
  ],
  matrix: seedMatrix,
  fieldRules: seedFieldRules,
  terminals: [
    { id: "tm1", name: "Tab · CNC bay", device: "Redmi Pad SE · Android 14", workCentres: ["wc1", "wc2"], lastSync: "2026-10-02T14:01:00", pending: 0, status: "online" },
    { id: "tm2", name: "Tab · VMC", device: "Samsung A8 · Android 11", workCentres: ["wc3"], lastSync: "2026-10-02T13:58:00", pending: 0, status: "online" },
    { id: "tm3", name: "Phone · Press shop", device: "Redmi 10A · Android 12 · 2 GB", workCentres: ["wc4"], lastSync: "2026-10-02T11:12:00", pending: 7, status: "offline" },
    { id: "tm4", name: "Tab · Welding & drill", device: "Lenovo M8 · Android 10", workCentres: ["wc5", "wc6"], lastSync: "2026-10-02T13:50:00", pending: 0, status: "online" },
    { id: "tm5", name: "Tab · Inspection", device: "Samsung A7 Lite · Android 13", workCentres: ["wc7"], lastSync: "2026-10-02T13:47:00", pending: 0, status: "online" },
    { id: "tm6", name: "Phone · Supervisor", device: "Moto G32 · Android 13", workCentres: ["wc1", "wc2", "wc3", "wc4", "wc5", "wc6", "wc7"], lastSync: "2026-10-02T13:59:00", pending: 0, status: "online" },
    { id: "tm7", name: "Old tab · stores", device: "Lenovo Tab M7 · Android 9", workCentres: [], lastSync: "2026-08-14T17:30:00", pending: 0, status: "revoked" },
  ],
  operators: seedOperators.map((o) => ({ id: o.id, code: o.code, name: o.name, nameHi: o.nameHi, workCentres: o.workCentres, shift: o.shift, pinSetAt: "2026-07-01", active: true })),
  rules: [
    { id: "r1", docType: "Purchase order", condition: "amount_gt", threshold: 200000, approver: "owner", creatorCannotApprove: true, active: true },
    { id: "r2", docType: "Sales order", condition: "credit_exceeded", threshold: 0, approver: "owner", creatorCannotApprove: true, active: true },
    { id: "r3", docType: "Sales order / quotation", condition: "discount_gt", threshold: 5, approver: "owner", creatorCannotApprove: true, active: true },
    { id: "r4", docType: "Stock adjustment", condition: "any", threshold: 0, approver: "production", creatorCannotApprove: true, active: true },
    { id: "r5", docType: "Vendor payment", condition: "amount_gt", threshold: 100000, approver: "owner", creatorCannotApprove: true, active: true },
    { id: "r6", docType: "Stock count variance", condition: "amount_gt", threshold: 5000, approver: "production", creatorCannotApprove: false, active: true },
  ],
  officeUserLimit: 10,

  saveProfile: (profile) => set({ profile }),
  updateSeries: (id, patch) => set((s) => ({ series: s.series.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  inviteUser: (u) =>
    set((s) => ({ users: [...s.users, { ...u, id: `u${Date.now()}`, lastActive: "", status: "invited", twoFactor: false }] })),
  setUserStatus: (id, status) => set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, status } : u)) })),
  togglePerm: (role, module, perm) =>
    set((s) => {
      const cur = s.matrix[role][module] ?? [];
      const next = cur.includes(perm) ? cur.filter((p) => p !== perm) : [...cur, perm];
      return { matrix: { ...s.matrix, [role]: { ...s.matrix[role], [module]: next } } };
    }),
  toggleFieldRule: (role, field) =>
    set((s) => ({ fieldRules: { ...s.fieldRules, [role]: { ...s.fieldRules[role], [field]: !s.fieldRules[role][field] } } })),
  revokeTerminal: (id) => set((s) => ({ terminals: s.terminals.map((t) => (t.id === id ? { ...t, status: "revoked" } : t)) })),
  registerTerminal: (t) =>
    set((s) => ({ terminals: [{ ...t, id: `tm${Date.now()}`, lastSync: "", pending: 0, status: "offline" }, ...s.terminals] })),
  resetPin: (id) => set((s) => ({ operators: s.operators.map((o) => (o.id === id ? { ...o, pinSetAt: "2026-10-02" } : o)) })),
  toggleOperator: (id) => set((s) => ({ operators: s.operators.map((o) => (o.id === id ? { ...o, active: !o.active } : o)) })),
  upsertRule: (r) => set((s) => ({ rules: s.rules.some((x) => x.id === r.id) ? s.rules.map((x) => (x.id === r.id ? r : x)) : [...s.rules, r] })),
  deleteRule: (id) => set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),
}));
