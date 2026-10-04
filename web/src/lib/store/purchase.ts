"use client";

import { create } from "zustand";
import type { Activity } from "@/components/erp/form-view";
import { company, itemById, partyById } from "@/lib/data/masters";
import { TODAY } from "@/lib/utils";

/* ---------------- Types ---------------- */

export type POStatus = "draft" | "pending_approval" | "approved" | "partially_received" | "received" | "closed" | "cancelled";

export interface POLine {
  id: string;
  itemId: string;
  qty: number;
  rate: number;
  received: number;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  vendorId: string;
  date: string;
  expectedDate: string;
  status: POStatus;
  lines: POLine[];
  paymentTermsDays: number;
  notes: string;
  prNumbers: string[];
  grns: string[];
  bills: string[];
  activities: Activity[];
}

export interface Requisition {
  id: string;
  number: string;
  date: string;
  itemId: string;
  qty: number;
  requiredBy: string;
  source: "shortage" | "reorder" | "manual";
  sourceRef: string;
  vendorId: string;
  requestedBy: string;
  status: "open" | "converted" | "cancelled";
  poNumber?: string;
}

export interface GRNLine {
  id: string;
  poLineId: string;
  itemId: string;
  ordered: number;
  pending: number;
  received: number;
  accepted: number;
  rejected: number;
  batch: string;
  reason: string;
}

export interface GRN {
  id: string;
  number: string;
  poId: string;
  vendorId: string;
  date: string;
  status: "draft" | "posted";
  warehouseId: string;
  vendorChallan: string;
  vehicle: string;
  lines: GRNLine[];
  postedAt?: string;
  activities: Activity[];
}

export interface BillLine {
  id: string;
  itemId: string;
  poQty: number;
  poRate: number;
  grnQty: number;
  billQty: number;
  billRate: number;
}

export type BillStatus = "draft" | "matched" | "mismatch" | "pending_approval" | "posted";

export interface PurchaseBill {
  id: string;
  number: string;
  vendorBillNo: string;
  vendorId: string;
  poId: string;
  grnNumbers: string[];
  date: string;
  dueDate: string;
  status: BillStatus;
  lines: BillLine[];
  activities: Activity[];
}

/** 3-way-match tolerances per tenant (arch §3 G14). */
export const TOLERANCE = { qtyPct: 2, ratePct: 1 };

export function lineMatch(l: BillLine): "matched" | "qty" | "price" | "both" {
  const qtyOk = Math.abs(l.billQty - l.grnQty) <= (l.grnQty * TOLERANCE.qtyPct) / 100;
  const rateOk = Math.abs(l.billRate - l.poRate) <= (l.poRate * TOLERANCE.ratePct) / 100;
  return qtyOk && rateOk ? "matched" : !qtyOk && !rateOk ? "both" : !qtyOk ? "qty" : "price";
}

export function billMatched(b: PurchaseBill) {
  return b.lines.every((l) => lineMatch(l) === "matched");
}

export function taxSplit(vendorId: string, lines: { itemId: string; amount: number }[]) {
  const interstate = partyById(vendorId).stateCode !== company.stateCode;
  let taxable = 0;
  let tax = 0;
  lines.forEach((l) => {
    taxable += l.amount;
    tax += (l.amount * itemById(l.itemId).gstRate) / 100;
  });
  const raw = taxable + tax;
  const total = Math.round(raw);
  return { interstate, taxable, cgst: interstate ? 0 : tax / 2, sgst: interstate ? 0 : tax / 2, igst: interstate ? tax : 0, tax, roundOff: total - raw, total };
}

export const poTotals = (po: Pick<PurchaseOrder, "vendorId" | "lines">) =>
  taxSplit(po.vendorId, po.lines.map((l) => ({ itemId: l.itemId, amount: l.qty * l.rate })));

export const billTotals = (b: PurchaseBill) => taxSplit(b.vendorId, b.lines.map((l) => ({ itemId: l.itemId, amount: l.billQty * l.billRate })));

/** PO approval rule (FR-PL-04): above this total the Owner must approve. */
export const PO_APPROVAL_LIMIT = 200000;

/* ---------------- Seed ---------------- */

const act = (id: string, at: string, user: string, kind: Activity["kind"], text: string): Activity => ({ id, at, user, kind, text, device: "Chrome · Windows" });

const seedPOs: PurchaseOrder[] = [
  {
    id: "po1", number: "PO-2026-00187", vendorId: "p6", date: "2026-10-02", expectedDate: "2026-10-09", status: "pending_approval", paymentTermsDays: 30,
    notes: "Mill test certificate required with each lot.", prNumbers: ["PR-2026-00412"], grns: [], bills: [],
    lines: [{ id: "l1", itemId: "i1", qty: 5100, rate: 70, received: 0 }],
    activities: [
      act("a1", "2026-10-02T09:38:00", "Prakash Deshmukh", "created", "Created from PR-2026-00412 (shortage list PP-2026-0047)"),
      act("a2", "2026-10-02T09:42:00", "System", "system", "Sent for approval: ₹4,21,260 exceeds the ₹2,00,000 PO limit"),
    ],
  },
  {
    id: "po2", number: "PO-2026-00183", vendorId: "p6", date: "2026-09-24", expectedDate: "2026-10-03", status: "partially_received", paymentTermsDays: 30,
    notes: "", prNumbers: ["PR-2026-00398"], grns: ["GRN-2026-00318"], bills: [],
    lines: [{ id: "l1", itemId: "i1", qty: 5000, rate: 70, received: 2400 }],
    activities: [
      act("a1", "2026-09-24T11:10:00", "Prakash Deshmukh", "created", "Purchase order created"),
      act("a2", "2026-09-24T12:05:00", "Rajesh Agarwal", "approved", "Approved (₹4,13,000)"),
      act("a3", "2026-10-02T13:41:00", "Santosh Kale", "status", "GRN-2026-00318 posted · 2,400 kg received into QC Hold"),
    ],
  },
  {
    id: "po3", number: "PO-2026-00185", vendorId: "p7", date: "2026-09-28", expectedDate: "2026-10-05", status: "approved", paymentTermsDays: 45,
    notes: "SKF / NBC make only.", prNumbers: ["PR-2026-00405"], grns: [], bills: [],
    lines: [{ id: "l1", itemId: "i3", qty: 1000, rate: 57.5, received: 0 }],
    activities: [act("a1", "2026-09-28T10:00:00", "Neha Kulkarni", "created", "Purchase order created · within limit, auto-approved")],
  },
  {
    id: "po4", number: "PO-2026-00186", vendorId: "p8", date: "2026-09-30", expectedDate: "2026-10-04", status: "approved", paymentTermsDays: 15,
    notes: "", prNumbers: [], grns: [], bills: [],
    lines: [{ id: "l1", itemId: "i5", qty: 1000, rate: 41, received: 0 }],
    activities: [act("a1", "2026-09-30T15:30:00", "Neha Kulkarni", "created", "Purchase order created from reorder alert")],
  },
  {
    id: "po5", number: "PO-2026-00181", vendorId: "p7", date: "2026-09-15", expectedDate: "2026-09-22", status: "received", paymentTermsDays: 45,
    notes: "", prNumbers: [], grns: ["GRN-2026-00305"], bills: ["PB-2026-00142"],
    lines: [
      { id: "l1", itemId: "i3", qty: 600, rate: 58, received: 600 },
      { id: "l2", itemId: "i4", qty: 5000, rate: 6.1, received: 5000 },
    ],
    activities: [act("a1", "2026-09-15T10:00:00", "Neha Kulkarni", "created", "Purchase order created")],
  },
  {
    id: "po6", number: "PO-2026-00179", vendorId: "p6", date: "2026-09-10", expectedDate: "2026-09-14", status: "closed", paymentTermsDays: 30,
    notes: "", prNumbers: [], grns: ["GRN-2026-00296"], bills: ["PB-2026-00138"],
    lines: [{ id: "l1", itemId: "i1", qty: 3000, rate: 68.5, received: 3000 }],
    activities: [act("a1", "2026-09-10T10:00:00", "Prakash Deshmukh", "created", "Purchase order created")],
  },
  {
    id: "po7", number: "PO-2026-00182", vendorId: "p6", date: "2026-09-16", expectedDate: "2026-09-19", status: "received", paymentTermsDays: 30,
    notes: "", prNumbers: [], grns: ["GRN-2026-00302"], bills: ["PB-2026-00144"],
    lines: [{ id: "l1", itemId: "i2", qty: 2000, rate: 71, received: 2000 }],
    activities: [act("a1", "2026-09-16T10:00:00", "Prakash Deshmukh", "created", "Purchase order created")],
  },
  {
    id: "po8", number: "PO-2026-00188", vendorId: "p11", date: "2026-10-02", expectedDate: "2026-10-12", status: "draft", paymentTermsDays: 30,
    notes: "Inserts for CNC lathe", prNumbers: [], grns: [], bills: [],
    lines: [{ id: "l1", itemId: "i6", qty: 210, rate: 160, received: 0 }],
    activities: [act("a1", "2026-10-02T11:15:00", "Neha Kulkarni", "created", "Draft created")],
  },
  {
    id: "po9", number: "PO-2026-00184", vendorId: "p6", date: "2026-09-25", expectedDate: "2026-10-01", status: "approved", paymentTermsDays: 30,
    notes: "", prNumbers: ["PR-2026-00401"], grns: [], bills: [],
    lines: [{ id: "l1", itemId: "i13", qty: 500, rate: 146, received: 0 }],
    activities: [act("a1", "2026-09-25T10:00:00", "Prakash Deshmukh", "created", "Purchase order created")],
  },
];

const seedPRs: Requisition[] = [
  { id: "r1", number: "PR-2026-00412", date: "2026-10-02", itemId: "i1", qty: 5100, requiredBy: "2026-10-09", source: "shortage", sourceRef: "PP-2026-0047", vendorId: "p6", requestedBy: "Prakash Deshmukh", status: "converted", poNumber: "PO-2026-00187" },
  { id: "r2", number: "PR-2026-00413", date: "2026-10-02", itemId: "i3", qty: 400, requiredBy: "2026-10-08", source: "shortage", sourceRef: "PP-2026-0047", vendorId: "p7", requestedBy: "Prakash Deshmukh", status: "open" },
  { id: "r3", number: "PR-2026-00414", date: "2026-10-02", itemId: "i13", qty: 200, requiredBy: "2026-10-10", source: "shortage", sourceRef: "PP-2026-0048", vendorId: "p6", requestedBy: "Prakash Deshmukh", status: "open" },
  { id: "r4", number: "PR-2026-00410", date: "2026-10-01", itemId: "i5", qty: 1000, requiredBy: "2026-10-06", source: "reorder", sourceRef: "Reorder level 300", vendorId: "p8", requestedBy: "System", status: "open" },
  { id: "r5", number: "PR-2026-00411", date: "2026-10-01", itemId: "i6", qty: 210, requiredBy: "2026-10-12", source: "manual", sourceRef: "Maintenance request", vendorId: "p11", requestedBy: "Santosh Kale", status: "open" },
  { id: "r6", number: "PR-2026-00409", date: "2026-09-30", itemId: "i4", qty: 5000, requiredBy: "2026-10-15", source: "reorder", sourceRef: "Reorder level 2,000", vendorId: "p7", requestedBy: "System", status: "open" },
  { id: "r7", number: "PR-2026-00405", date: "2026-09-27", itemId: "i3", qty: 1000, requiredBy: "2026-10-05", source: "shortage", sourceRef: "PP-2026-0046", vendorId: "p7", requestedBy: "Prakash Deshmukh", status: "converted", poNumber: "PO-2026-00185" },
  { id: "r8", number: "PR-2026-00402", date: "2026-09-26", itemId: "i2", qty: 500, requiredBy: "2026-10-01", source: "manual", sourceRef: "Trial order", vendorId: "p6", requestedBy: "Neha Kulkarni", status: "cancelled" },
];

const seedGRNs: GRN[] = [
  {
    id: "g1", number: "GRN-2026-00318", poId: "po2", vendorId: "p6", date: "2026-10-02", status: "posted", warehouseId: "w4", vendorChallan: "MST/DC/26/1182", vehicle: "MH12 QW 6620",
    postedAt: "2026-10-02T13:41:00",
    lines: [{ id: "gl1", poLineId: "l1", itemId: "i1", ordered: 5000, pending: 5000, received: 2400, accepted: 2400, rejected: 0, batch: "B-2610-001", reason: "" }],
    activities: [act("a1", "2026-10-02T13:41:00", "Santosh Kale", "posted", "Posted · 2,400 kg into QC Hold · stock ledger + GRNI journal written")],
  },
  {
    id: "g2", number: "GRN-2026-00305", poId: "po5", vendorId: "p7", date: "2026-09-22", status: "posted", warehouseId: "w1", vendorChallan: "BBC/2026/887", vehicle: "MH04 HY 1120",
    postedAt: "2026-09-22T12:10:00",
    lines: [
      { id: "gl1", poLineId: "l1", itemId: "i3", ordered: 600, pending: 600, received: 600, accepted: 592, rejected: 8, batch: "—", reason: "Seal damaged" },
      { id: "gl2", poLineId: "l2", itemId: "i4", ordered: 5000, pending: 5000, received: 5000, accepted: 5000, rejected: 0, batch: "—", reason: "" },
    ],
    activities: [act("a1", "2026-09-22T12:10:00", "Santosh Kale", "posted", "Posted · 8 bearings rejected (seal damaged)")],
  },
  {
    id: "g3", number: "GRN-2026-00302", poId: "po7", vendorId: "p6", date: "2026-09-19", status: "posted", warehouseId: "w1", vendorChallan: "MST/DC/26/1121", vehicle: "MH12 QW 6620",
    postedAt: "2026-09-19T12:00:00",
    lines: [{ id: "gl1", poLineId: "l1", itemId: "i2", ordered: 2000, pending: 2000, received: 2000, accepted: 2000, rejected: 0, batch: "B-2609-019", reason: "" }],
    activities: [act("a1", "2026-09-19T12:00:00", "Santosh Kale", "posted", "Posted")],
  },
  {
    id: "g4", number: "GRN-2026-00296", poId: "po6", vendorId: "p6", date: "2026-09-14", status: "posted", warehouseId: "w1", vendorChallan: "MST/DC/26/1090", vehicle: "MH12 QW 6620",
    postedAt: "2026-09-14T11:20:00",
    lines: [{ id: "gl1", poLineId: "l1", itemId: "i1", ordered: 3000, pending: 3000, received: 3000, accepted: 3000, rejected: 0, batch: "B-2609-014", reason: "" }],
    activities: [act("a1", "2026-09-14T11:20:00", "Santosh Kale", "posted", "Posted")],
  },
];

const seedBills: PurchaseBill[] = [
  {
    id: "b1", number: "PB-2026-00144", vendorBillNo: "MST/26-27/2214", vendorId: "p6", poId: "po7", grnNumbers: ["GRN-2026-00302"], date: "2026-09-20", dueDate: "2026-10-20", status: "mismatch",
    lines: [{ id: "bl1", itemId: "i2", poQty: 2000, poRate: 71, grnQty: 2000, billQty: 2000, billRate: 72.4 }],
    activities: [act("a1", "2026-09-21T10:00:00", "Meera Iyer", "created", "Bill entered · rate ₹72.40 vs PO ₹71.00 (2.0% over tolerance)")],
  },
  {
    id: "b2", number: "PB-2026-00142", vendorBillNo: "BBC/INV/26/5531", vendorId: "p7", poId: "po5", grnNumbers: ["GRN-2026-00305"], date: "2026-09-23", dueDate: "2026-11-07", status: "posted",
    lines: [
      { id: "bl1", itemId: "i3", poQty: 600, poRate: 58, grnQty: 592, billQty: 592, billRate: 58 },
      { id: "bl2", itemId: "i4", poQty: 5000, poRate: 6.1, grnQty: 5000, billQty: 5000, billRate: 6.1 },
    ],
    activities: [act("a1", "2026-09-23T15:00:00", "Meera Iyer", "posted", "Matched and posted · AP open")],
  },
  {
    id: "b3", number: "PB-2026-00138", vendorBillNo: "MST/26-27/2150", vendorId: "p6", poId: "po6", grnNumbers: ["GRN-2026-00296"], date: "2026-09-15", dueDate: "2026-10-15", status: "posted",
    lines: [{ id: "bl1", itemId: "i1", poQty: 3000, poRate: 68.5, grnQty: 3000, billQty: 3000, billRate: 68.5 }],
    activities: [act("a1", "2026-09-15T16:00:00", "Meera Iyer", "posted", "Matched and posted")],
  },
  {
    id: "b4", number: "PB-2026-00146", vendorBillNo: "MST/26-27/2290", vendorId: "p6", poId: "po2", grnNumbers: ["GRN-2026-00318"], date: "2026-10-02", dueDate: "2026-11-01", status: "draft",
    lines: [{ id: "bl1", itemId: "i1", poQty: 5000, poRate: 70, grnQty: 2400, billQty: 2460, billRate: 70 }],
    activities: [act("a1", "2026-10-02T14:00:00", "Meera Iyer", "created", "Bill entered from vendor invoice")],
  },
];

/* ---------------- Store ---------------- */

interface PurchaseState {
  orders: PurchaseOrder[];
  requisitions: Requisition[];
  receipts: GRN[];
  bills: PurchaseBill[];
  addPO: (po: Omit<PurchaseOrder, "id" | "number" | "activities" | "grns" | "bills">, user: string) => PurchaseOrder;
  updatePO: (id: string, patch: Partial<PurchaseOrder>) => void;
  setPOStatus: (id: string, status: POStatus, user: string, text: string, kind?: Activity["kind"]) => void;
  logPO: (id: string, user: string, text: string) => void;
  convertPRs: (ids: string[], user: string) => string[];
  cancelPR: (id: string) => void;
  createGRN: (poId: string, user: string) => GRN;
  updateGRN: (id: string, patch: Partial<GRN>) => void;
  postGRN: (id: string, user: string) => void;
  updateBill: (id: string, patch: Partial<PurchaseBill>) => void;
  billAction: (id: string, status: BillStatus, user: string, text: string, kind?: Activity["kind"]) => void;
  addBill: (b: Omit<PurchaseBill, "id" | "number" | "activities">, user: string) => PurchaseBill;
}

const stamp = () => `${TODAY}T${new Date().toTimeString().slice(0, 8)}`;
const pad = (n: number, w = 5) => String(n).padStart(w, "0");

export const usePurchase = create<PurchaseState>()((set, get) => ({
  orders: seedPOs,
  requisitions: seedPRs,
  receipts: seedGRNs,
  bills: seedBills,

  addPO: (po, user) => {
    const n = Math.max(...get().orders.map((o) => Number(o.number.slice(-5)))) + 1;
    const created: PurchaseOrder = { ...po, id: `po${Date.now()}`, number: `PO-2026-${pad(n)}`, grns: [], bills: [], activities: [act(`a${Date.now()}`, stamp(), user, "created", "Purchase order created")] };
    set((s) => ({ orders: [created, ...s.orders] }));
    return created;
  },
  updatePO: (id, patch) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
  setPOStatus: (id, status, user, text, kind = "status") =>
    set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, status, activities: [act(`a${Date.now()}`, stamp(), user, kind, text), ...o.activities] } : o)) })),
  logPO: (id, user, text) =>
    set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, activities: [act(`a${Date.now()}`, stamp(), user, "note", text), ...o.activities] } : o)) })),

  convertPRs: (ids, user) => {
    const prs = get().requisitions.filter((r) => ids.includes(r.id) && r.status === "open");
    const byVendor = new Map<string, Requisition[]>();
    prs.forEach((r) => byVendor.set(r.vendorId, [...(byVendor.get(r.vendorId) ?? []), r]));
    const created: string[] = [];
    byVendor.forEach((rs, vendorId) => {
      const po = get().addPO(
        {
          vendorId,
          date: TODAY,
          expectedDate: rs.map((r) => r.requiredBy).sort()[0],
          status: "draft",
          paymentTermsDays: partyById(vendorId).paymentTermsDays,
          notes: "",
          prNumbers: rs.map((r) => r.number),
          lines: rs.map((r, i) => ({ id: `l${i + 1}`, itemId: r.itemId, qty: r.qty, rate: itemById(r.itemId).standardCost, received: 0 })),
        },
        user,
      );
      created.push(po.number);
      set((s) => ({ requisitions: s.requisitions.map((r) => (rs.includes(r) ? { ...r, status: "converted", poNumber: po.number } : r)) }));
    });
    return created;
  },
  cancelPR: (id) => set((s) => ({ requisitions: s.requisitions.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r)) })),

  createGRN: (poId, user) => {
    const po = get().orders.find((o) => o.id === poId)!;
    const n = Math.max(...get().receipts.map((g) => Number(g.number.slice(-5)))) + 1;
    const g: GRN = {
      id: `g${Date.now()}`,
      number: `GRN-2026-${pad(n)}`,
      poId,
      vendorId: po.vendorId,
      date: TODAY,
      status: "draft",
      warehouseId: "w1",
      vendorChallan: "",
      vehicle: "",
      lines: po.lines
        .filter((l) => l.qty > l.received)
        .map((l, i) => {
          const pending = l.qty - l.received;
          return { id: `gl${i + 1}`, poLineId: l.id, itemId: l.itemId, ordered: l.qty, pending, received: pending, accepted: pending, rejected: 0, batch: itemById(l.itemId).batchTracked ? `B-2610-${pad(10 + i, 3)}` : "—", reason: "" };
        }),
      activities: [act(`a${Date.now()}`, stamp(), user, "created", `Draft GRN created against ${po.number}`)],
    };
    set((s) => ({ receipts: [g, ...s.receipts] }));
    return g;
  },
  updateGRN: (id, patch) => set((s) => ({ receipts: s.receipts.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
  postGRN: (id, user) => {
    const g = get().receipts.find((x) => x.id === id)!;
    const po = get().orders.find((o) => o.id === g.poId)!;
    const lines = po.lines.map((l) => {
      const gl = g.lines.find((x) => x.poLineId === l.id);
      return gl ? { ...l, received: l.received + gl.received } : l;
    });
    const full = lines.every((l) => l.received >= l.qty);
    const acc = g.lines.reduce((a, l) => a + l.accepted, 0);
    const rej = g.lines.reduce((a, l) => a + l.rejected, 0);
    set((s) => ({
      receipts: s.receipts.map((x) =>
        x.id === id
          ? { ...x, status: "posted", postedAt: stamp(), activities: [act(`a${Date.now()}`, stamp(), user, "posted", `Posted · ${acc} accepted${rej ? `, ${rej} rejected` : ""} · stock ledger and GRNI journal written`), ...x.activities] }
          : x,
      ),
      orders: s.orders.map((o) =>
        o.id === po.id
          ? {
              ...o,
              lines,
              status: full ? "received" : "partially_received",
              grns: [...o.grns, g.number],
              activities: [act(`a${Date.now()}`, stamp(), user, "status", `${g.number} posted`), ...o.activities],
            }
          : o,
      ),
    }));
  },

  updateBill: (id, patch) => set((s) => ({ bills: s.bills.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
  billAction: (id, status, user, text, kind = "status") =>
    set((s) => ({ bills: s.bills.map((b) => (b.id === id ? { ...b, status, activities: [act(`a${Date.now()}`, stamp(), user, kind, text), ...b.activities] } : b)) })),
  addBill: (b, user) => {
    const n = Math.max(...get().bills.map((x) => Number(x.number.slice(-5)))) + 1;
    const created: PurchaseBill = { ...b, id: `b${Date.now()}`, number: `PB-2026-${pad(n)}`, activities: [act(`a${Date.now()}`, stamp(), user, "created", "Bill created")] };
    set((s) => ({ bills: [created, ...s.bills] }));
    return created;
  },
}));
