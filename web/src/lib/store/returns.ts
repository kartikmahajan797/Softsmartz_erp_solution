"use client";

import { create } from "zustand";
import type { Activity } from "@/components/erp/form-view";
import { company, itemById, partyById } from "@/lib/data/masters";
import { TODAY } from "@/lib/utils";

/**
 * Goods return flows (architecture gap G12, G14).
 * Sales return: goods come back against an invoice → QC → restock or scrap → credit note.
 * Purchase return: GRN rejection or later return → return challan out → debit note.
 */

export type Disposition = "pending_qc" | "restock" | "rework" | "scrap";

export interface SalesReturnLine {
  id: string;
  itemId: string;
  invoicedQty: number;
  returnQty: number;
  rate: number;
  reason: string;
  disposition: Disposition;
  batch: string;
}

export type SalesReturnStatus = "draft" | "received" | "inspected" | "credited" | "cancelled";
export type NoteState = "none" | "draft" | "posted" | "irn_generated";

export interface SalesReturn {
  id: string;
  number: string;
  date: string;
  customerId: string;
  invoiceNumber: string;
  dcNumber: string;
  vehicle: string;
  status: SalesReturnStatus;
  lines: SalesReturnLine[];
  creditNote?: string;
  creditNoteStatus: NoteState;
  activities: Activity[];
}

export interface PurchaseReturnLine {
  id: string;
  itemId: string;
  receivedQty: number;
  returnQty: number;
  rate: number;
  reason: string;
  batch: string;
}

export type PurchaseReturnStatus = "draft" | "dispatched" | "acknowledged" | "debited" | "cancelled";

export interface PurchaseReturn {
  id: string;
  number: string;
  date: string;
  vendorId: string;
  grnNumber: string;
  poNumber: string;
  source: "grn_rejection" | "post_grn_return";
  status: PurchaseReturnStatus;
  lines: PurchaseReturnLine[];
  returnChallan?: string;
  vehicle: string;
  ewayBill?: string;
  debitNote?: string;
  debitNoteStatus: NoteState;
  activities: Activity[];
}

export const RETURN_REASONS = [
  "Dimension out of tolerance",
  "Surface defect / burr",
  "Material defect",
  "Wrong item supplied",
  "Excess quantity supplied",
  "Transit damage",
  "Customer rejection",
] as const;

export const DISPOSITIONS: Record<Disposition, { label: string; hint: string; warehouse: string }> = {
  pending_qc: { label: "Pending QC", hint: "Held in QC Hold until inspected", warehouse: "QCH" },
  restock: { label: "Restock", hint: "Back to Finished Goods Stores at original cost", warehouse: "FGS" },
  rework: { label: "Rework", hint: "Rework job card raised, stock to WIP", warehouse: "WIP" },
  scrap: { label: "Scrap", hint: "Moved to Scrap Yard at valuation", warehouse: "SCR" },
};

/** e-way bill is required above ₹50,000 consignment value, or for any inter-state movement of goods sent for job-work. */
export const EWB_THRESHOLD = 50000;

export function gstRateOf(itemId: string) {
  return itemById(itemId).gstRate;
}

export function returnValue(lines: { itemId: string; returnQty: number; rate: number }[], partyId: string) {
  const interstate = partyById(partyId).stateCode !== company.stateCode;
  let taxable = 0;
  let tax = 0;
  lines.forEach((l) => {
    const t = l.returnQty * l.rate;
    taxable += t;
    tax += (t * gstRateOf(l.itemId)) / 100;
  });
  return { taxable, tax, total: taxable + tax, interstate };
}

const act = (id: string, at: string, user: string, kind: Activity["kind"], text: string, device?: string): Activity => ({ id, at, user, kind, text, device });
const now = () => `${TODAY}T${new Date().toTimeString().slice(0, 8)}`;

const seedSales: SalesReturn[] = [
  {
    id: "sr1", number: "SRN/26-27/0021", date: "2026-10-01", customerId: "p5", invoiceNumber: "INV/26-27/0389", dcNumber: "DC/26-27/0369", vehicle: "HR55 AK 2201",
    status: "received", creditNoteStatus: "none",
    lines: [
      { id: "l1", itemId: "i10", invoicedQty: 1000, returnQty: 40, rate: 185, reason: "Surface defect / burr", disposition: "pending_qc", batch: "MB-2609-02" },
      { id: "l2", itemId: "i9", invoicedQty: 260, returnQty: 6, rate: 640, reason: "Dimension out of tolerance", disposition: "pending_qc", batch: "DS-2609-04" },
    ],
    activities: [
      act("a2", "2026-10-01T16:40:00", "Santosh Kale", "status", "Goods received at gate · moved to QC Hold", "Stores PC"),
      act("a1", "2026-10-01T11:05:00", "Neha Kulkarni", "created", "Return created against INV/26-27/0389 · customer rejection report VACL/QA/2209"),
    ],
  },
  {
    id: "sr2", number: "SRN/26-27/0020", date: "2026-09-25", customerId: "p1", invoiceNumber: "INV/26-27/0381", dcNumber: "DC/26-27/0361", vehicle: "MH14 GU 4471",
    status: "credited", creditNote: "CN/26-27/0014", creditNoteStatus: "irn_generated",
    lines: [{ id: "l1", itemId: "i12", invoicedQty: 600, returnQty: 14, rate: 260, reason: "Dimension out of tolerance", disposition: "rework", batch: "FC-2608-11" }],
    activities: [
      act("a4", "2026-09-26T12:10:00", "System", "system", "IRN generated for CN/26-27/0014"),
      act("a3", "2026-09-26T11:58:00", "Meera Iyer", "posted", "Credit note CN/26-27/0014 posted · ₹4,659.20"),
      act("a2", "2026-09-25T17:20:00", "Prakash Deshmukh", "status", "QC done · 14 nos to rework (RJC-2026-0033)"),
      act("a1", "2026-09-25T10:15:00", "Neha Kulkarni", "created", "Return created"),
    ],
  },
  {
    id: "sr3", number: "SRN/26-27/0019", date: "2026-09-18", customerId: "p2", invoiceNumber: "INV/26-27/0355", dcNumber: "DC/26-27/0318", vehicle: "MH09 CU 7710",
    status: "inspected", creditNoteStatus: "draft", creditNote: "CN/26-27/0016",
    lines: [
      { id: "l1", itemId: "i11", invoicedQty: 120, returnQty: 5, rate: 475, reason: "Transit damage", disposition: "scrap", batch: "PA-2607-03" },
      { id: "l2", itemId: "i11", invoicedQty: 120, returnQty: 3, rate: 475, reason: "Customer rejection", disposition: "restock", batch: "PA-2607-03" },
    ],
    activities: [
      act("a2", "2026-09-19T15:00:00", "Prakash Deshmukh", "status", "QC done · 5 scrap, 3 restock"),
      act("a1", "2026-09-18T09:40:00", "Neha Kulkarni", "created", "Return created"),
    ],
  },
  {
    id: "sr4", number: "SRN/26-27/0022", date: "2026-10-02", customerId: "p3", invoiceNumber: "INV/26-27/0372", dcNumber: "DC/26-27/0341", vehicle: "",
    status: "draft", creditNoteStatus: "none",
    lines: [{ id: "l1", itemId: "i9", invoicedQty: 300, returnQty: 12, rate: 640, reason: "Wrong item supplied", disposition: "pending_qc", batch: "DS-2608-07" }],
    activities: [act("a1", "2026-10-02T10:22:00", "Neha Kulkarni", "created", "Draft return · awaiting vehicle from Kaveri Engineering")],
  },
];

const seedPurchase: PurchaseReturn[] = [
  {
    id: "pr1", number: "PRN/26-27/0011", date: "2026-10-02", vendorId: "p6", grnNumber: "GRN-2026-00318", poNumber: "PO-2026-00183", source: "grn_rejection",
    status: "draft", vehicle: "", debitNoteStatus: "none",
    lines: [{ id: "l1", itemId: "i1", receivedQty: 2000, returnQty: 120, rate: 68, reason: "Material defect", batch: "MST-H2214" }],
    activities: [act("a1", "2026-10-02T11:30:00", "Santosh Kale", "created", "Created from GRN-2026-00318 rejection · 120 kg in QC Hold", "Stores PC")],
  },
  {
    id: "pr2", number: "PRN/26-27/0010", date: "2026-09-23", vendorId: "p7", grnNumber: "GRN-2026-00305", poNumber: "PO-2026-00181", source: "grn_rejection",
    status: "debited", returnChallan: "RDC/26-27/0010", vehicle: "MH04 HY 1120", debitNote: "DN/26-27/0005", debitNoteStatus: "posted",
    lines: [{ id: "l1", itemId: "i3", receivedQty: 1000, returnQty: 30, rate: 58, reason: "Material defect", batch: "—" }],
    activities: [
      act("a3", "2026-09-24T12:00:00", "Meera Iyer", "posted", "Debit note DN/26-27/0005 posted · ₹2,053.20"),
      act("a2", "2026-09-23T16:10:00", "Santosh Kale", "status", "Return challan RDC/26-27/0010 dispatched"),
      act("a1", "2026-09-23T09:00:00", "Santosh Kale", "created", "Created from GRN-2026-00305"),
    ],
  },
  {
    id: "pr3", number: "PRN/26-27/0009", date: "2026-09-21", vendorId: "p6", grnNumber: "GRN-2026-00302", poNumber: "PO-2026-00182", source: "post_grn_return",
    status: "dispatched", returnChallan: "RDC/26-27/0009", vehicle: "MH12 QW 6620", ewayBill: "2710 4482 1960", debitNoteStatus: "draft", debitNote: "DN/26-27/0007",
    lines: [{ id: "l1", itemId: "i2", receivedQty: 3000, returnQty: 850, rate: 72, reason: "Excess quantity supplied", batch: "MST-C1180" }],
    activities: [
      act("a2", "2026-09-21T15:30:00", "Santosh Kale", "status", "Dispatched with e-way bill 2710 4482 1960"),
      act("a1", "2026-09-21T10:00:00", "Santosh Kale", "created", "Excess supply returned"),
    ],
  },
  {
    id: "pr4", number: "PRN/26-27/0008", date: "2026-09-15", vendorId: "p8", grnNumber: "GRN-2026-00299", poNumber: "PO-2026-00180", source: "grn_rejection",
    status: "acknowledged", returnChallan: "RDC/26-27/0008", vehicle: "MH14 BT 0921", debitNoteStatus: "none",
    lines: [{ id: "l1", itemId: "i5", receivedQty: 1000, returnQty: 60, rate: 42, reason: "Transit damage", batch: "—" }],
    activities: [
      act("a2", "2026-09-17T11:00:00", "Santosh Kale", "status", "Vendor acknowledged receipt of returned goods"),
      act("a1", "2026-09-15T14:00:00", "Santosh Kale", "created", "Created from GRN rejection"),
    ],
  },
];

interface ReturnsState {
  sales: SalesReturn[];
  purchase: PurchaseReturn[];
  addSalesReturn: (r: Omit<SalesReturn, "id" | "number" | "activities" | "creditNoteStatus">, user: string) => SalesReturn;
  updateSalesReturn: (id: string, patch: Partial<SalesReturn>, user?: string, text?: string, kind?: Activity["kind"]) => void;
  addPurchaseReturn: (r: Omit<PurchaseReturn, "id" | "number" | "activities" | "debitNoteStatus">, user: string) => PurchaseReturn;
  updatePurchaseReturn: (id: string, patch: Partial<PurchaseReturn>, user?: string, text?: string, kind?: Activity["kind"]) => void;
}

export const useReturns = create<ReturnsState>()((set, get) => ({
  sales: seedSales,
  purchase: seedPurchase,
  addSalesReturn: (r, user) => {
    const n = 23 + get().sales.length - seedSales.length;
    const sr: SalesReturn = {
      ...r,
      id: `sr${Date.now()}`,
      number: `SRN/26-27/${String(n).padStart(4, "0")}`,
      creditNoteStatus: "none",
      activities: [act(`a${Date.now()}`, now(), user, "created", `Return created against ${r.invoiceNumber}`)],
    };
    set((s) => ({ sales: [sr, ...s.sales] }));
    return sr;
  },
  updateSalesReturn: (id, patch, user, text, kind = "status") =>
    set((s) => ({
      sales: s.sales.map((r) =>
        r.id === id
          ? { ...r, ...patch, activities: user && text ? [act(`a${Date.now()}`, now(), user, kind, text), ...r.activities] : r.activities }
          : r,
      ),
    })),
  addPurchaseReturn: (r, user) => {
    const n = 12 + get().purchase.length - seedPurchase.length;
    const pr: PurchaseReturn = {
      ...r,
      id: `pr${Date.now()}`,
      number: `PRN/26-27/${String(n).padStart(4, "0")}`,
      debitNoteStatus: "none",
      activities: [act(`a${Date.now()}`, now(), user, "created", `Return created against ${r.grnNumber}`)],
    };
    set((s) => ({ purchase: [pr, ...s.purchase] }));
    return pr;
  },
  updatePurchaseReturn: (id, patch, user, text, kind = "status") =>
    set((s) => ({
      purchase: s.purchase.map((r) =>
        r.id === id
          ? { ...r, ...patch, activities: user && text ? [act(`a${Date.now()}`, now(), user, kind, text), ...r.activities] : r.activities }
          : r,
      ),
    })),
}));
