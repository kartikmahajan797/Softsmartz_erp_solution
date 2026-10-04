"use client";

import { create } from "zustand";
import type { RoleKey } from "@/lib/store/app";

/* ---------------- Document templates (FR-PL-07) ---------------- */

export type TemplateKey = "invoice" | "delivery" | "jobwork" | "po" | "jobcard";

export interface DocTemplate {
  key: TemplateKey;
  name: string;
  description: string;
  showLogo: boolean;
  brandColour: string;
  hsnSummary: boolean;
  bankDetails: boolean;
  signature: boolean;
  qr: boolean;
  terms: string;
  paper: "A4" | "A5";
  copies: ("Original" | "Duplicate" | "Triplicate")[];
  updatedAt: string;
  updatedBy: string;
}

const tpl = (t: Partial<DocTemplate> & Pick<DocTemplate, "key" | "name" | "description">): DocTemplate => ({
  showLogo: true,
  brandColour: "#0d7377",
  hsnSummary: true,
  bankDetails: false,
  signature: true,
  qr: false,
  terms: "",
  paper: "A4",
  copies: ["Original"],
  updatedAt: "2026-09-14T11:20:00",
  updatedBy: "Rajesh Agarwal",
  ...t,
});

const seedTemplates: DocTemplate[] = [
  tpl({
    key: "invoice", name: "Tax invoice", description: "GST invoice with IRN and signed QR",
    bankDetails: true, qr: true, copies: ["Original", "Duplicate", "Triplicate"],
    terms: "Subject to Pune jurisdiction. Interest @18% p.a. on bills overdue beyond the agreed credit period.",
    updatedAt: "2026-09-28T16:05:00", updatedBy: "Meera Iyer",
  }),
  tpl({ key: "delivery", name: "Delivery challan", description: "Dispatch document with e-way bill number", hsnSummary: false, copies: ["Original", "Duplicate"], terms: "Goods once dispatched will not be taken back without a sales return note." }),
  tpl({ key: "jobwork", name: "Job-work challan", description: "Rule 55 challan for material sent to job-workers", copies: ["Original", "Duplicate", "Triplicate"], terms: "Material sent for job-work under Section 143 of the CGST Act. To be returned within one year." }),
  tpl({ key: "po", name: "Purchase order", description: "PO sent to vendors on WhatsApp or email", hsnSummary: false, terms: "Please quote PO number on all invoices and challans. Material subject to inspection at our stores." }),
  tpl({ key: "jobcard", name: "Job card / traveller", description: "Shop-floor traveller with QR for each operation", hsnSummary: false, signature: false, qr: true, paper: "A5", updatedAt: "2026-08-30T10:12:00", updatedBy: "Prakash Deshmukh" }),
];

/* ---------------- Notifications (FR-PL-08, FR-IG-02, FR-FI-06) ---------------- */

export type Channel = "inapp" | "whatsapp" | "sms" | "email";

export interface NotifEvent {
  key: string;
  group: string;
  label: string;
  desc: string;
  channels: Record<Channel, boolean>;
  roles: RoleKey[];
}

const ch = (inapp: boolean, whatsapp: boolean, sms: boolean, email: boolean) => ({ inapp, whatsapp, sms, email });

const seedEvents: NotifEvent[] = [
  { key: "approval", group: "Approvals", label: "Document waiting for approval", desc: "PO, discount, stock adjustment, payment", channels: ch(true, true, false, true), roles: ["owner", "production"] },
  { key: "approval_done", group: "Approvals", label: "My document approved or rejected", desc: "Sent to the document creator", channels: ch(true, false, false, false), roles: ["store", "sales", "accountant"] },
  { key: "machine_down", group: "Production", label: "Machine marked down", desc: "From operator terminal events", channels: ch(true, true, true, false), roles: ["owner", "production"] },
  { key: "sync_exception", group: "Production", label: "Shop-floor sync exception", desc: "Offline entry could not be applied", channels: ch(true, false, false, false), roles: ["production"] },
  { key: "reorder", group: "Inventory", label: "Item below reorder level", desc: "Checked on every stock movement", channels: ch(true, false, false, true), roles: ["store", "production"] },
  { key: "digest", group: "Inventory", label: "Daily low-stock digest", desc: "One summary at the digest time", channels: ch(false, true, false, true), roles: ["owner", "store"] },
  { key: "irn_failed", group: "GST & finance", label: "e-Invoice / e-way bill failed", desc: "After automatic retries are exhausted", channels: ch(true, true, false, true), roles: ["accountant", "owner"] },
  { key: "challan_due", group: "GST & finance", label: "Job-work challan nearing time limit", desc: "1-year inputs / 3-year capital goods", channels: ch(true, true, false, true), roles: ["store", "accountant"] },
  { key: "payment_in", group: "GST & finance", label: "Customer payment received", desc: "Receipt posted against an invoice", channels: ch(true, true, false, false), roles: ["owner"] },
];

export interface WaTemplate {
  id: string;
  name: string;
  category: "Utility" | "Marketing" | "Authentication";
  language: string;
  status: "approved" | "pending" | "rejected";
  body: string;
}

const seedWa: WaTemplate[] = [
  { id: "wt1", name: "payment_reminder_v2", category: "Utility", language: "English", status: "approved", body: "Dear {{1}}, invoice {{2}} for ₹{{3}} is due on {{4}}. Please arrange payment. — Shakti Precision" },
  { id: "wt2", name: "payment_reminder_hi", category: "Utility", language: "Hindi", status: "approved", body: "प्रिय {{1}}, बिल {{2}} की राशि ₹{{3}} दिनांक {{4}} को देय है। कृपया भुगतान करें। — शक्ति प्रिसिज़न" },
  { id: "wt3", name: "document_share", category: "Utility", language: "English", status: "approved", body: "Hello {{1}}, please find {{2}} {{3}} attached. Reply to this message for any queries." },
  { id: "wt4", name: "approval_request", category: "Utility", language: "English", status: "approved", body: "{{1}} needs your approval: {{2}} · ₹{{3}}. Open Factory ERP to review." },
  { id: "wt5", name: "machine_down_alert", category: "Utility", language: "English", status: "pending", body: "⚠ {{1}} is down since {{2}}. Reason: {{3}}. Reported by {{4}}." },
  { id: "wt6", name: "diwali_greetings", category: "Marketing", language: "English", status: "rejected", body: "Happy Diwali from all of us at Shakti Precision! 🪔" },
];

export interface ReminderStep {
  id: string;
  offset: number; // days relative to due date (negative = before)
  channel: "whatsapp" | "email" | "sms";
  template: string;
}

const seedReminders: ReminderStep[] = [
  { id: "rs1", offset: -3, channel: "whatsapp", template: "payment_reminder_v2" },
  { id: "rs2", offset: 0, channel: "email", template: "payment_reminder_v2" },
  { id: "rs3", offset: 7, channel: "whatsapp", template: "payment_reminder_v2" },
  { id: "rs4", offset: 15, channel: "whatsapp", template: "payment_reminder_v2" },
];

/* ---------------- Audit log (FR-PL-03) ---------------- */

export interface AuditEntry {
  id: string;
  seq: number;
  at: string;
  user: string;
  role: string;
  device: string;
  ip: string;
  module: string;
  action: "create" | "update" | "post" | "approve" | "reject" | "delete" | "login" | "export" | "cancel";
  doc?: string;
  href?: string;
  summary: string;
  changes?: { field: string; before: string; after: string }[];
  hash: string;
  prevHash: string;
}

function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  let out = "";
  for (let i = 0; i < 4; i++) {
    h = Math.imul(h ^ (h >>> 13), 2246822519) >>> 0;
    out += h.toString(16).padStart(8, "0");
  }
  return out;
}

type RawAudit = Omit<AuditEntry, "id" | "seq" | "hash" | "prevHash">;

const rawAudit: RawAudit[] = [
  { at: "2026-10-02T14:02:11", user: "Rajesh Agarwal", role: "Owner / Admin", device: "Chrome · MacBook", ip: "49.36.112.8", module: "Purchase", action: "approve", doc: "PO-2026-00186", href: "/purchase/orders", summary: "Approved purchase order (₹1,86,400)", changes: [{ field: "status", before: "pending_approval", after: "approved" }] },
  { at: "2026-10-02T13:48:40", user: "Meera Iyer", role: "Accountant", device: "Edge · Windows", ip: "49.36.112.14", module: "Finance", action: "post", doc: "INV/26-27/0414", href: "/finance/invoices", summary: "Posted sales invoice to ledger", changes: [{ field: "status", before: "draft", after: "posted" }, { field: "number", before: "—", after: "INV/26-27/0414" }] },
  { at: "2026-10-02T13:21:05", user: "Santosh Kale", role: "Store keeper", device: "Chrome · Android", ip: "10.0.4.22", module: "Inventory", action: "create", doc: "ADJ-2026-00058", href: "/inventory/adjustments", summary: "Stock adjustment for CRCA Sheet 2 mm (−18 kg, damaged)", changes: [{ field: "qty", before: "—", after: "−18 kg" }, { field: "reason", before: "—", after: "Damaged in handling" }] },
  { at: "2026-10-02T12:57:33", user: "Imran Shaikh", role: "Operator", device: "Terminal T-03 · CNC bay", ip: "10.0.4.31", module: "Shop floor", action: "update", doc: "JC-2026-00415", href: "/manufacturing/job-cards", summary: "Reported 48 good, 2 reject on Op 20 Turning", changes: [{ field: "good_qty", before: "178", after: "226" }, { field: "reject_qty", before: "7", after: "9" }] },
  { at: "2026-10-02T12:10:02", user: "Neha Kulkarni", role: "Sales & purchase", device: "Chrome · Windows", ip: "49.36.112.19", module: "Sales", action: "update", doc: "SO-2026-00235", href: "/sales/orders", summary: "Changed delivery date and discount", changes: [{ field: "delivery_date", before: "22-Oct-2026", after: "25-Oct-2026" }, { field: "discount", before: "2%", after: "4%" }] },
  { at: "2026-10-02T11:42:19", user: "Rajesh Agarwal", role: "Owner / Admin", device: "Safari · iPhone", ip: "106.210.44.9", module: "Settings", action: "update", summary: "Changed approval rule: Purchase order amount > ₹2,00,000", changes: [{ field: "threshold", before: "₹1,50,000", after: "₹2,00,000" }] },
  { at: "2026-10-02T10:15:47", user: "Meera Iyer", role: "Accountant", device: "Edge · Windows", ip: "49.36.112.14", module: "Finance", action: "export", summary: "Exported Tally vouchers for September 2026 (214 vouchers)" },
  { at: "2026-10-02T09:58:12", user: "Prakash Deshmukh", role: "Production head", device: "Chrome · Windows", ip: "49.36.112.11", module: "Manufacturing", action: "create", doc: "WO-2026-00141", href: "/manufacturing/work-orders", summary: "Released work order for Drive Shaft DS-450 × 300", changes: [{ field: "status", before: "draft", after: "released" }, { field: "bom_version", before: "—", after: "BOM-DS450 v3" }] },
  { at: "2026-10-02T09:42:03", user: "Neha Kulkarni", role: "Sales & purchase", device: "Chrome · Windows", ip: "49.36.112.19", module: "Purchase", action: "create", doc: "PO-2026-00187", href: "/purchase/orders", summary: "Created purchase order, routed for approval (₹4,21,260)" },
  { at: "2026-10-02T09:15:30", user: "System", role: "GSP worker", device: "worker-2", ip: "—", module: "Finance", action: "update", doc: "INV/26-27/0412", href: "/finance/einvoice", summary: "e-Invoice request failed: GSP timeout (attempt 3)", changes: [{ field: "irn_status", before: "irn_pending", after: "irn_failed" }] },
  { at: "2026-10-02T09:02:44", user: "Meera Iyer", role: "Accountant", device: "Edge · Windows", ip: "49.36.112.14", module: "Security", action: "login", summary: "Signed in with password + TOTP" },
  { at: "2026-10-02T08:51:09", user: "Imran Shaikh", role: "Operator", device: "Terminal T-02 · VMC bay", ip: "10.0.4.30", module: "Shop floor", action: "update", doc: "VMC 01", href: "/manufacturing/work-centres", summary: "Marked VMC 01 down — spindle alarm", changes: [{ field: "status", before: "running", after: "down" }] },
  { at: "2026-10-01T18:20:55", user: "Meera Iyer", role: "Accountant", device: "Edge · Windows", ip: "49.36.112.14", module: "Finance", action: "cancel", doc: "INV/26-27/0398", href: "/finance/invoices", summary: "Cancelled IRN within 24-hour window (wrong GSTIN)", changes: [{ field: "status", before: "irn_generated", after: "cancelled" }] },
  { at: "2026-10-01T17:05:12", user: "Santosh Kale", role: "Store keeper", device: "Chrome · Android", ip: "10.0.4.22", module: "Job-work", action: "create", doc: "JWC/26-27/0034", href: "/jobwork/challans", summary: "Issued job-work challan to Shree Ganesh Plating Works" },
  { at: "2026-10-01T16:44:38", user: "Rajesh Agarwal", role: "Owner / Admin", device: "Chrome · MacBook", ip: "49.36.112.8", module: "Settings", action: "update", summary: "Invited user Neha Kulkarni as Sales & purchase", changes: [{ field: "role", before: "—", after: "sales" }] },
  { at: "2026-10-01T15:30:00", user: "Rajesh Agarwal", role: "Owner / Admin", device: "Chrome · MacBook", ip: "49.36.112.8", module: "Inventory", action: "reject", doc: "CNT-2026-0011", href: "/inventory/counts", summary: "Rejected stock count variance (−4.2%)", changes: [{ field: "status", before: "submitted", after: "rejected" }] },
  { at: "2026-10-01T14:12:21", user: "Santosh Kale", role: "Store keeper", device: "Chrome · Android", ip: "10.0.4.22", module: "Purchase", action: "post", doc: "GRN-2026-00212", href: "/purchase/receipts", summary: "Posted GRN: 2,000 kg MS Round Bar, 40 kg rejected" },
  { at: "2026-10-01T11:08:49", user: "Prakash Deshmukh", role: "Production head", device: "Chrome · Windows", ip: "49.36.112.11", module: "Manufacturing", action: "update", doc: "BOM-DS450", href: "/manufacturing/boms", summary: "Created BOM version v3 (alternate bar size)", changes: [{ field: "version", before: "v2", after: "v3" }] },
  { at: "2026-09-30T19:02:10", user: "Neha Kulkarni", role: "Sales & purchase", device: "Chrome · Windows", ip: "49.36.112.19", module: "Sales", action: "delete", doc: "QT-2026-00102", href: "/sales/quotations", summary: "Deleted draft quotation" },
  { at: "2026-09-30T18:00:00", user: "Meera Iyer", role: "Accountant", device: "Edge · Windows", ip: "49.36.112.14", module: "Finance", action: "update", summary: "Set posting lock date to 31-Aug-2026", changes: [{ field: "lock_date", before: "31-Jul-2026", after: "31-Aug-2026" }] },
];

function buildChain(raw: RawAudit[]): AuditEntry[] {
  const asc = [...raw].reverse();
  let prev = "0".repeat(32);
  const out = asc.map((r, i) => {
    const h = hash(prev + JSON.stringify(r));
    const e: AuditEntry = { ...r, id: `a${i + 1}`, seq: 48210 + i, hash: h, prevHash: prev };
    prev = h;
    return e;
  });
  return out.reverse();
}

/* ---------------- Data export (G16) ---------------- */

export interface ExportJob {
  id: string;
  at: string;
  by: string;
  format: "CSV" | "Excel" | "Tally XML";
  modules: string[];
  status: "queued" | "running" | "ready" | "expired" | "failed";
  progress: number;
  sizeMb?: number;
  expiresAt?: string;
}

const seedExports: ExportJob[] = [
  { id: "ex4", at: "2026-10-01T18:20:00", by: "Meera Iyer", format: "Tally XML", modules: ["Finance & GST"], status: "ready", progress: 100, sizeMb: 2.4, expiresAt: "2026-10-08" },
  { id: "ex3", at: "2026-09-15T10:02:00", by: "Rajesh Agarwal", format: "Excel", modules: ["Masters", "Sales", "Purchase", "Inventory", "Manufacturing", "Job-work", "Finance & GST", "Audit log"], status: "ready", progress: 100, sizeMb: 38.6, expiresAt: "2026-10-15" },
  { id: "ex2", at: "2026-09-01T09:30:00", by: "Rajesh Agarwal", format: "CSV", modules: ["Inventory"], status: "expired", progress: 100, sizeMb: 4.1 },
  { id: "ex1", at: "2026-08-31T22:10:00", by: "Meera Iyer", format: "Excel", modules: ["Finance & GST"], status: "failed", progress: 62 },
];

interface AdminState {
  templates: DocTemplate[];
  events: NotifEvent[];
  waTemplates: WaTemplate[];
  reminders: ReminderStep[];
  reminderEnabled: boolean;
  digestTime: string;
  quietHours: boolean;
  audit: AuditEntry[];
  exports: ExportJob[];
  offboarding: { requestedAt: string; by: string } | null;
  saveTemplate: (t: DocTemplate) => void;
  toggleChannel: (eventKey: string, c: Channel) => void;
  setEventRoles: (eventKey: string, roles: RoleKey[]) => void;
  setReminders: (r: ReminderStep[]) => void;
  setPrefs: (p: Partial<Pick<AdminState, "reminderEnabled" | "digestTime" | "quietHours">>) => void;
  queueExport: (j: ExportJob) => void;
  updateExport: (id: string, patch: Partial<ExportJob>) => void;
  requestOffboarding: (by: string) => void;
  cancelOffboarding: () => void;
}

export const useAdmin = create<AdminState>()((set) => ({
  templates: seedTemplates,
  events: seedEvents,
  waTemplates: seedWa,
  reminders: seedReminders,
  reminderEnabled: true,
  digestTime: "08:00",
  quietHours: true,
  audit: buildChain(rawAudit),
  exports: seedExports,
  offboarding: null,
  saveTemplate: (t) => set((s) => ({ templates: s.templates.map((x) => (x.key === t.key ? t : x)) })),
  toggleChannel: (k, c) =>
    set((s) => ({ events: s.events.map((e) => (e.key === k ? { ...e, channels: { ...e.channels, [c]: !e.channels[c] } } : e)) })),
  setEventRoles: (k, roles) => set((s) => ({ events: s.events.map((e) => (e.key === k ? { ...e, roles } : e)) })),
  setReminders: (reminders) => set({ reminders }),
  setPrefs: (p) => set(p),
  queueExport: (j) => set((s) => ({ exports: [j, ...s.exports] })),
  updateExport: (id, patch) => set((s) => ({ exports: s.exports.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
  requestOffboarding: (by) => set({ offboarding: { requestedAt: new Date().toISOString().slice(0, 19), by } }),
  cancelOffboarding: () => set({ offboarding: null }),
}));

/** Recompute the chain and report the first broken link, if any. */
export function verifyChain(entries: AuditEntry[]) {
  const asc = [...entries].sort((a, b) => a.seq - b.seq);
  for (let i = 1; i < asc.length; i++) {
    if (asc[i].prevHash !== asc[i - 1].hash) return { ok: false as const, brokenAt: asc[i].seq, checked: asc.length };
  }
  return { ok: true as const, checked: asc.length };
}
