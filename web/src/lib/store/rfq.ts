"use client";

import { create } from "zustand";
import type { Activity } from "@/components/erp/form-view";
import type { Tone } from "@/components/ui/badge";
import { itemById } from "@/lib/data/masters";
import { TODAY } from "@/lib/utils";

/** Request for quotation to several vendors, with side-by-side comparison (FR-SP-03, S12). */

export type RfqStatus = "draft" | "sent" | "quotes_received" | "awarded" | "cancelled";

export const RFQ_STATUS: Record<RfqStatus, { tone: Tone; label: string }> = {
  draft: { tone: "neutral", label: "Draft" },
  sent: { tone: "info", label: "Awaiting quotes" },
  quotes_received: { tone: "warning", label: "Ready to compare" },
  awarded: { tone: "success", label: "Awarded" },
  cancelled: { tone: "danger", label: "Cancelled" },
};

export interface RfqLine {
  id: string;
  itemId: string;
  qty: number;
  requiredBy: string;
  spec?: string;
}

export interface VendorQuote {
  vendorId: string;
  sentVia?: "WhatsApp" | "Email" | "WhatsApp + Email";
  sentAt?: string;
  respondedAt?: string;
  /** Rate (₹ per stock UoM) and lead time per RFQ line. */
  lines: Record<string, { rate: number; leadDays: number }>;
  paymentTermsDays: number;
  freight: "Included" | "Extra at actuals" | "Ex-works";
  validTill: string;
  remarks?: string;
}

export interface Rfq {
  id: string;
  number: string;
  date: string;
  quoteDue: string;
  status: RfqStatus;
  title: string;
  prNumbers: string[];
  lines: RfqLine[];
  vendors: VendorQuote[];
  awardedVendorId?: string;
  poNumber?: string;
  poId?: string;
  activities: Activity[];
}

/** Last purchase rate per item (from posted GRNs / bills) — price history hint S12. */
export const LAST_RATE: Record<string, { rate: number; date: string; vendor: string }> = {
  i1: { rate: 68, date: "2026-09-24", vendor: "Mahalaxmi Steel Traders" },
  i2: { rate: 72, date: "2026-09-16", vendor: "Mahalaxmi Steel Traders" },
  i3: { rate: 58, date: "2026-09-15", vendor: "Bharat Bearings Co" },
  i4: { rate: 6.2, date: "2026-09-02", vendor: "Bharat Bearings Co" },
  i5: { rate: 42, date: "2026-09-30", vendor: "Om Sai Packaging" },
  i6: { rate: 165, date: "2026-08-21", vendor: "Precision Tools & Gauges" },
  i13: { rate: 145, date: "2026-08-28", vendor: "Mahalaxmi Steel Traders" },
};

export const quoteResponded = (q: VendorQuote) => !!q.respondedAt;

export function quoteTotal(rfq: Rfq, q: VendorQuote) {
  let taxable = 0;
  let gst = 0;
  let maxLead = 0;
  let complete = true;
  rfq.lines.forEach((l) => {
    const x = q.lines[l.id];
    if (!x) {
      complete = false;
      return;
    }
    const t = x.rate * l.qty;
    taxable += t;
    gst += (t * itemById(l.itemId).gstRate) / 100;
    maxLead = Math.max(maxLead, x.leadDays);
  });
  return { taxable, gst, total: taxable + gst, maxLead, complete };
}

/** Lowest complete quote by taxable value (L1). */
export function lowestVendor(rfq: Rfq) {
  const ranked = rfq.vendors
    .filter((v) => quoteResponded(v) && quoteTotal(rfq, v).complete)
    .sort((a, b) => quoteTotal(rfq, a).taxable - quoteTotal(rfq, b).taxable);
  return ranked[0]?.vendorId;
}

const act = (id: string, at: string, user: string, kind: Activity["kind"], text: string): Activity => ({ id, at, user, kind, text });
const now = () => `${TODAY}T${new Date().toTimeString().slice(0, 8)}`;

const seed: Rfq[] = [
  {
    id: "rfq1", number: "RFQ-2026-00042", date: "2026-09-29", quoteDue: "2026-10-03", status: "quotes_received", title: "EN8 bars & castings for PP-2026-0047",
    prNumbers: ["PR-2026-00412", "PR-2026-00414"],
    lines: [
      { id: "l1", itemId: "i1", qty: 5000, requiredBy: "2026-10-09", spec: "EN8, Ø32 mm, bright bar, mill TC required" },
      { id: "l2", itemId: "i13", qty: 200, requiredBy: "2026-10-10", spec: "CI FG-260, as per drg PUL-110-R2" },
    ],
    vendors: [
      { vendorId: "p6", sentVia: "WhatsApp + Email", sentAt: "2026-09-29T11:00:00", respondedAt: "2026-09-30T16:20:00", lines: { l1: { rate: 67.5, leadDays: 5 }, l2: { rate: 148, leadDays: 9 } }, paymentTermsDays: 30, freight: "Included", validTill: "2026-10-15", remarks: "Mill TC with each heat" },
      { vendorId: "p11", sentVia: "Email", sentAt: "2026-09-29T11:00:00", respondedAt: "2026-10-01T10:05:00", lines: { l1: { rate: 66.2, leadDays: 8 }, l2: { rate: 152, leadDays: 12 } }, paymentTermsDays: 45, freight: "Extra at actuals", validTill: "2026-10-10" },
      { vendorId: "p7", sentVia: "WhatsApp", sentAt: "2026-09-29T11:00:00", respondedAt: "2026-10-01T18:40:00", lines: { l1: { rate: 69.8, leadDays: 4 }, l2: { rate: 141, leadDays: 7 } }, paymentTermsDays: 30, freight: "Included", validTill: "2026-10-20", remarks: "Can split delivery" },
    ],
    activities: [
      act("a3", "2026-10-01T18:40:00", "System", "system", "Quote received from Bharat Bearings Co (WhatsApp reply parsed)"),
      act("a2", "2026-09-29T11:00:00", "Prakash Deshmukh", "status", "RFQ sent to 3 vendors"),
      act("a1", "2026-09-29T10:42:00", "Prakash Deshmukh", "created", "Created from PR-2026-00412, PR-2026-00414"),
    ],
  },
  {
    id: "rfq2", number: "RFQ-2026-00043", date: "2026-10-01", quoteDue: "2026-10-05", status: "sent", title: "Bearings 6204 — annual rate contract",
    prNumbers: ["PR-2026-00413"],
    lines: [{ id: "l1", itemId: "i3", qty: 4000, requiredBy: "2026-10-15" }],
    vendors: [
      { vendorId: "p7", sentVia: "WhatsApp + Email", sentAt: "2026-10-01T12:15:00", respondedAt: "2026-10-02T09:30:00", lines: { l1: { rate: 55.5, leadDays: 6 } }, paymentTermsDays: 45, freight: "Included", validTill: "2026-12-31" },
      { vendorId: "p11", sentVia: "Email", sentAt: "2026-10-01T12:15:00", lines: {}, paymentTermsDays: 30, freight: "Included", validTill: "" },
      { vendorId: "p6", sentVia: "WhatsApp", sentAt: "2026-10-01T12:15:00", lines: {}, paymentTermsDays: 30, freight: "Included", validTill: "" },
    ],
    activities: [
      act("a2", "2026-10-02T09:30:00", "System", "system", "Quote received from Bharat Bearings Co"),
      act("a1", "2026-10-01T12:15:00", "Neha Kulkarni", "status", "RFQ sent to 3 vendors"),
    ],
  },
  {
    id: "rfq3", number: "RFQ-2026-00044", date: "2026-10-02", quoteDue: "2026-10-07", status: "draft", title: "Packaging & cutting oil",
    prNumbers: ["PR-2026-00410", "PR-2026-00411"],
    lines: [
      { id: "l1", itemId: "i5", qty: 1000, requiredBy: "2026-10-06" },
      { id: "l2", itemId: "i6", qty: 210, requiredBy: "2026-10-12" },
    ],
    vendors: [
      { vendorId: "p8", lines: {}, paymentTermsDays: 15, freight: "Included", validTill: "" },
      { vendorId: "p11", lines: {}, paymentTermsDays: 30, freight: "Included", validTill: "" },
    ],
    activities: [act("a1", "2026-10-02T09:12:00", "Neha Kulkarni", "created", "Draft RFQ created")],
  },
  {
    id: "rfq4", number: "RFQ-2026-00039", date: "2026-09-18", quoteDue: "2026-09-21", status: "awarded", title: "CRCA sheet 2 mm — Q3 requirement",
    prNumbers: [],
    lines: [{ id: "l1", itemId: "i2", qty: 3000, requiredBy: "2026-09-26" }],
    vendors: [
      { vendorId: "p6", sentVia: "WhatsApp", sentAt: "2026-09-18T10:00:00", respondedAt: "2026-09-19T12:00:00", lines: { l1: { rate: 72, leadDays: 3 } }, paymentTermsDays: 30, freight: "Included", validTill: "2026-09-30" },
      { vendorId: "p11", sentVia: "Email", sentAt: "2026-09-18T10:00:00", respondedAt: "2026-09-20T15:00:00", lines: { l1: { rate: 73.4, leadDays: 6 } }, paymentTermsDays: 30, freight: "Extra at actuals", validTill: "2026-09-30" },
    ],
    awardedVendorId: "p6", poNumber: "PO-2026-00182",
    activities: [act("a1", "2026-09-21T11:00:00", "Rajesh Agarwal", "approved", "Awarded to Mahalaxmi Steel Traders · PO-2026-00182")],
  },
  {
    id: "rfq5", number: "RFQ-2026-00036", date: "2026-09-08", quoteDue: "2026-09-12", status: "cancelled", title: "Hex bolts M10 — alternate source",
    prNumbers: [],
    lines: [{ id: "l1", itemId: "i4", qty: 10000, requiredBy: "2026-09-30" }],
    vendors: [{ vendorId: "p7", sentVia: "Email", sentAt: "2026-09-08T10:00:00", lines: {}, paymentTermsDays: 45, freight: "Included", validTill: "" }],
    activities: [act("a1", "2026-09-13T10:00:00", "Neha Kulkarni", "status", "Cancelled · requirement covered by rate contract")],
  },
];

interface RfqState {
  rfqs: Rfq[];
  update: (id: string, patch: Partial<Rfq>, user?: string, text?: string, kind?: Activity["kind"]) => void;
  setQuote: (id: string, vendorId: string, patch: Partial<VendorQuote>) => void;
  add: (r: Omit<Rfq, "id" | "number" | "activities">, user: string) => Rfq;
}

export const useRfq = create<RfqState>()((set, get) => ({
  rfqs: seed,
  update: (id, patch, user, text, kind = "status") =>
    set((s) => ({
      rfqs: s.rfqs.map((r) =>
        r.id === id ? { ...r, ...patch, activities: user && text ? [act(`a${Date.now()}`, now(), user, kind, text), ...r.activities] : r.activities } : r,
      ),
    })),
  setQuote: (id, vendorId, patch) =>
    set((s) => ({
      rfqs: s.rfqs.map((r) => (r.id === id ? { ...r, vendors: r.vendors.map((v) => (v.vendorId === vendorId ? { ...v, ...patch } : v)) } : r)),
    })),
  add: (r, user) => {
    const n = Math.max(...get().rfqs.map((x) => Number(x.number.slice(-5)))) + 1;
    const created: Rfq = { ...r, id: `rfq${Date.now()}`, number: `RFQ-2026-${String(n).padStart(5, "0")}`, activities: [act(`a${Date.now()}`, now(), user, "created", "RFQ created")] };
    set((s) => ({ rfqs: [created, ...s.rfqs] }));
    return created;
  },
}));
