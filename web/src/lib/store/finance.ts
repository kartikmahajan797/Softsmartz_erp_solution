"use client";

import { create } from "zustand";
import { company, itemById, partyById } from "@/lib/data/masters";
import { daysBetween, TODAY } from "@/lib/utils";

/* ---------------- Types ---------------- */

export type IrnStatus = "not_applicable" | "irn_pending" | "irn_generated" | "irn_failed" | "cancelled";
export type PayStatus = "unpaid" | "partially_paid" | "paid";

export interface InvLine {
  id: string;
  itemId: string;
  qty: number;
  rate: number;
  discountPct: number;
}

export interface TimelineEvent {
  at: string;
  label: string;
  detail?: string;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  customerId: string;
  soNumber: string;
  dcNumber: string;
  vehicle: string;
  status: "draft" | "posted" | "cancelled";
  irnStatus: IrnStatus;
  irn?: string;
  ackNo?: string;
  ackDate?: string;
  attempts: number;
  lastError?: string;
  ewayBill?: string;
  paid: number;
  lines: InvLine[];
  timeline: TimelineEvent[];
}

export interface Note {
  id: string;
  number: string;
  type: "credit" | "debit";
  date: string;
  partyId: string;
  invoiceNumber: string;
  reason: "Sales return" | "Rate difference" | "Short supply" | "Price escalation";
  taxable: number;
  gst: number;
  status: "draft" | "posted";
  irnStatus: IrnStatus;
}

export type PayMode = "NEFT" | "RTGS" | "UPI" | "Cheque" | "Cash";

export interface Payment {
  id: string;
  number: string;
  kind: "receipt" | "payment";
  date: string;
  partyId: string;
  amount: number;
  mode: PayMode;
  bank: string;
  reference: string;
  allocations: { doc: string; amount: number }[];
  status: "posted" | "pending_approval";
}

export interface EwayBill {
  id: string;
  number: string;
  docNumber: string;
  docType: "Invoice" | "Job-work challan" | "Delivery challan";
  partyId: string;
  date: string;
  validTill: string;
  vehicle: string;
  distanceKm: number;
  value: number;
  status: "generated" | "cancelled" | "expired";
}

export interface TallyRun {
  id: string;
  at: string;
  period: string;
  mode: "commercial" | "full";
  vouchers: number;
  masters: number;
  user: string;
  status: "completed" | "failed";
  file: string;
}

/* ---------------- Totals ---------------- */

export function invTotals(inv: { lines: InvLine[]; customerId: string }) {
  const party = partyById(inv.customerId);
  const interstate = party.stateCode !== company.stateCode;
  let taxable = 0;
  let tax = 0;
  const hsn = new Map<string, { hsn: string; rate: number; taxable: number; tax: number }>();
  inv.lines.forEach((l) => {
    const it = itemById(l.itemId);
    const t = l.qty * l.rate * (1 - l.discountPct / 100);
    const g = (t * it.gstRate) / 100;
    taxable += t;
    tax += g;
    const k = `${it.hsn}-${it.gstRate}`;
    const cur = hsn.get(k) ?? { hsn: it.hsn, rate: it.gstRate, taxable: 0, tax: 0 };
    cur.taxable += t;
    cur.tax += g;
    hsn.set(k, cur);
  });
  const raw = taxable + tax;
  const total = Math.round(raw);
  return {
    taxable,
    tax,
    cgst: interstate ? 0 : tax / 2,
    sgst: interstate ? 0 : tax / 2,
    igst: interstate ? tax : 0,
    roundOff: total - raw,
    total,
    interstate,
    hsnSummary: [...hsn.values()],
  };
}

export function payStatus(inv: Invoice): PayStatus {
  const t = invTotals(inv).total;
  if (inv.paid >= t - 0.5) return "paid";
  if (inv.paid > 0) return "partially_paid";
  return "unpaid";
}

export const balanceDue = (inv: Invoice) => Math.max(0, invTotals(inv).total - inv.paid);
export const isOverdue = (inv: Invoice) => inv.status === "posted" && payStatus(inv) !== "paid" && daysBetween(inv.dueDate, TODAY) > 0;

/* ---------------- Seeds ---------------- */

const irnHash = (n: string) => {
  let h = 0;
  for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hex = (x: number) => x.toString(16).padStart(8, "0");
  return (hex(h) + hex(h ^ 0x9e3779b9) + hex(h * 7) + hex(h ^ 0xabcdef12) + hex(h * 13) + hex(h ^ 0x1234567) + hex(h * 3) + hex(h ^ 0x55aa55aa)).slice(0, 64);
};

function generated(number: string, date: string, ack: string): Pick<Invoice, "irnStatus" | "irn" | "ackNo" | "ackDate" | "attempts" | "timeline"> {
  return {
    irnStatus: "irn_generated",
    irn: irnHash(number),
    ackNo: ack,
    ackDate: `${date}T17:04:00`,
    attempts: 1,
    timeline: [
      { at: `${date}T17:02:00`, label: "Posted", detail: "Ledger entries created · AR open", tone: "info" },
      { at: `${date}T17:02:05`, label: "IRN requested", detail: "Sent to GSP (attempt 1)", tone: "warning" },
      { at: `${date}T17:04:00`, label: "IRN generated", detail: `Ack ${ack}`, tone: "success" },
    ],
  };
}

const L = (id: string, itemId: string, qty: number, rate: number, discountPct = 0): InvLine => ({ id, itemId, qty, rate, discountPct });

const seedInvoices: Invoice[] = [
  {
    id: "inv412", number: "INV/26-27/0412", date: "2026-10-02", dueDate: "2026-12-01", customerId: "p5", soNumber: "SO-2026-00228", dcNumber: "DC/26-27/0384", vehicle: "HR55 AK 2201",
    status: "posted", irnStatus: "irn_failed", attempts: 3, lastError: "GSP timeout after 3 attempts (IRP response > 30 s)", paid: 0,
    lines: [L("l1", "i9", 240, 635)],
    timeline: [
      { at: "2026-10-02T13:20:00", label: "Posted", detail: "Ledger entries created · AR open", tone: "info" },
      { at: "2026-10-02T13:20:04", label: "IRN requested", detail: "Attempt 1 · timeout", tone: "warning" },
      { at: "2026-10-02T13:25:10", label: "Retry", detail: "Attempt 2 · timeout", tone: "warning" },
      { at: "2026-10-02T13:35:30", label: "IRN failed", detail: "GSP timeout after 3 attempts · auto-retry in 10 min", tone: "danger" },
    ],
  },
  {
    id: "inv405", number: "INV/26-27/0405", date: "2026-09-29", dueDate: "2026-11-13", customerId: "p1", soNumber: "SO-2026-00231", dcNumber: "DC/26-27/0388", vehicle: "MH14 GU 4471",
    status: "posted", paid: 0, lines: [L("l1", "i9", 220, 640)], ...generated("INV/26-27/0405", "2026-09-29", "182619873455012"),
  },
  {
    id: "inv401", number: "INV/26-27/0401", date: "2026-09-27", dueDate: "2026-11-26", customerId: "p5", soNumber: "SO-2026-00228", dcNumber: "DC/26-27/0384", vehicle: "HR55 AK 2201",
    status: "posted", paid: 0, lines: [L("l1", "i9", 60, 635)], ewayBill: "3410 2287 6521", ...generated("INV/26-27/0401", "2026-09-27", "182619862201447"),
  },
  {
    id: "inv396", number: "INV/26-27/0396", date: "2026-09-24", dueDate: "2026-10-24", customerId: "p2", soNumber: "SO-2026-00229", dcNumber: "DC/26-27/0375", vehicle: "MH09 CU 7710",
    status: "posted", paid: 80000, lines: [L("l1", "i12", 400, 305)], ...generated("INV/26-27/0396", "2026-09-24", "182619851187320"),
  },
  {
    id: "inv394", number: "INV/26-27/0394", date: "2026-09-19", dueDate: "2026-11-03", customerId: "p1", soNumber: "SO-2026-00226", dcNumber: "DC/26-27/0372", vehicle: "MH14 GU 4471",
    status: "posted", paid: 0, lines: [L("l1", "i10", 700, 182)], ...generated("INV/26-27/0394", "2026-09-19", "182619839001276"),
  },
  {
    id: "inv389", number: "INV/26-27/0389", date: "2026-09-17", dueDate: "2026-11-16", customerId: "p5", soNumber: "SO-2026-00228", dcNumber: "DC/26-27/0369", vehicle: "HR55 AK 2201",
    status: "posted", paid: 0, lines: [L("l1", "i9", 260, 635)], ewayBill: "3410 2271 0944", ...generated("INV/26-27/0389", "2026-09-17", "182619828874401"),
  },
  {
    id: "inv381", number: "INV/26-27/0381", date: "2026-09-08", dueDate: "2026-10-23", customerId: "p1", soNumber: "SO-2026-00226", dcNumber: "DC/26-27/0361", vehicle: "MH14 GU 4471",
    status: "posted", paid: 172284, lines: [L("l1", "i10", 800, 182)], ...generated("INV/26-27/0381", "2026-09-08", "182619800765318"),
  },
  {
    id: "inv372", number: "INV/26-27/0372", date: "2026-08-21", dueDate: "2026-09-20", customerId: "p3", soNumber: "SO-2026-00219", dcNumber: "DC/26-27/0341", vehicle: "KA22 MB 3390",
    status: "posted", paid: 0, lines: [L("l1", "i11", 360, 470)], ewayBill: "2910 4471 1183", ...generated("INV/26-27/0372", "2026-08-21", "182619761100982"),
  },
  {
    id: "inv355", number: "INV/26-27/0355", date: "2026-07-28", dueDate: "2026-08-27", customerId: "p2", soNumber: "SO-2026-00208", dcNumber: "DC/26-27/0318", vehicle: "MH09 CU 7710",
    status: "posted", paid: 0, lines: [L("l1", "i12", 900, 300)], ...generated("INV/26-27/0355", "2026-07-28", "182619700312455"),
  },
  {
    id: "inv338", number: "INV/26-27/0338", date: "2026-06-30", dueDate: "2026-07-30", customerId: "p2", soNumber: "SO-2026-00197", dcNumber: "DC/26-27/0296", vehicle: "MH09 CU 7710",
    status: "posted", paid: 0, lines: [L("l1", "i9", 140, 630)], ...generated("INV/26-27/0338", "2026-06-30", "182619645509871"),
  },
  {
    id: "inv413", number: "INV/26-27/0413", date: "2026-10-02", dueDate: "2026-11-01", customerId: "p4", soNumber: "SO-2026-00230", dcNumber: "—", vehicle: "",
    status: "draft", irnStatus: "not_applicable", attempts: 0, paid: 0, lines: [L("l1", "i12", 120, 310)],
    timeline: [{ at: "2026-10-02T11:00:00", label: "Draft created", tone: "neutral" }],
  },
];

const seedNotes: Note[] = [
  { id: "cn1", number: "CN/26-27/0014", type: "credit", date: "2026-09-26", partyId: "p1", invoiceNumber: "INV/26-27/0381", reason: "Sales return", taxable: 3640, gst: 1019.2, status: "posted", irnStatus: "irn_generated" },
  { id: "cn2", number: "CN/26-27/0013", type: "credit", date: "2026-09-12", partyId: "p2", invoiceNumber: "INV/26-27/0355", reason: "Rate difference", taxable: 4500, gst: 810, status: "posted", irnStatus: "irn_generated" },
  { id: "dn1", number: "DN/26-27/0006", type: "debit", date: "2026-09-20", partyId: "p3", invoiceNumber: "INV/26-27/0372", reason: "Price escalation", taxable: 5400, gst: 972, status: "posted", irnStatus: "irn_generated" },
  { id: "cn3", number: "CN/26-27/0015", type: "credit", date: "2026-10-01", partyId: "p5", invoiceNumber: "INV/26-27/0389", reason: "Short supply", taxable: 6350, gst: 1143, status: "draft", irnStatus: "not_applicable" },
];

const seedPayments: Payment[] = [
  { id: "r1", number: "RCT/26-27/0211", kind: "receipt", date: "2026-10-02", partyId: "p1", amount: 172284, mode: "NEFT", bank: "HDFC Bank ··4417", reference: "UTR HDFCN26275512093", allocations: [{ doc: "INV/26-27/0381", amount: 172284 }], status: "posted" },
  { id: "r2", number: "RCT/26-27/0210", kind: "receipt", date: "2026-10-02", partyId: "p2", amount: 80000, mode: "RTGS", bank: "HDFC Bank ··4417", reference: "UTR SBINR52026100277", allocations: [{ doc: "INV/26-27/0396", amount: 80000 }], status: "posted" },
  { id: "r3", number: "RCT/26-27/0209", kind: "receipt", date: "2026-10-02", partyId: "p4", amount: 160216, mode: "UPI", bank: "HDFC Bank ··4417", reference: "UPI 627512009834", allocations: [{ doc: "INV/26-27/0364", amount: 160216 }], status: "posted" },
  { id: "p1", number: "PAY/26-27/0164", kind: "payment", date: "2026-10-02", partyId: "p6", amount: 186300, mode: "NEFT", bank: "HDFC Bank ··4417", reference: "UTR HDFCN26275512140", allocations: [{ doc: "PB/26-27/0287", amount: 186300 }], status: "posted" },
  { id: "p2", number: "PAY/26-27/0165", kind: "payment", date: "2026-10-02", partyId: "p7", amount: 186400, mode: "NEFT", bank: "HDFC Bank ··4417", reference: "—", allocations: [{ doc: "PB/26-27/0279", amount: 186400 }], status: "pending_approval" },
  { id: "r4", number: "RCT/26-27/0205", kind: "receipt", date: "2026-09-28", partyId: "p5", amount: 420000, mode: "RTGS", bank: "ICICI Bank ··0921", reference: "UTR ICICR52026092811", allocations: [{ doc: "INV/26-27/0362", amount: 420000 }], status: "posted" },
  { id: "p3", number: "PAY/26-27/0159", kind: "payment", date: "2026-09-26", partyId: "p9", amount: 48600, mode: "Cheque", bank: "HDFC Bank ··4417", reference: "Chq 004812", allocations: [{ doc: "PB/26-27/0270", amount: 48600 }], status: "posted" },
  { id: "p4", number: "PAY/26-27/0157", kind: "payment", date: "2026-09-25", partyId: "p8", amount: 21240, mode: "UPI", bank: "HDFC Bank ··4417", reference: "UPI 626811402277", allocations: [{ doc: "PB/26-27/0266", amount: 21240 }], status: "posted" },
  { id: "r5", number: "RCT/26-27/0199", kind: "receipt", date: "2026-09-22", partyId: "p3", amount: 150000, mode: "NEFT", bank: "HDFC Bank ··4417", reference: "UTR CNRBN52026092204", allocations: [{ doc: "INV/26-27/0349", amount: 150000 }], status: "posted" },
];

const seedEway: EwayBill[] = [
  { id: "e1", number: "3410 2287 6521", docNumber: "INV/26-27/0401", docType: "Invoice", partyId: "p5", date: "2026-09-27", validTill: "2026-10-04", vehicle: "HR55 AK 2201", distanceKm: 1420, value: 44958, status: "generated" },
  { id: "e2", number: "3410 2271 0944", docNumber: "INV/26-27/0389", docType: "Invoice", partyId: "p5", date: "2026-09-17", validTill: "2026-09-24", vehicle: "HR55 AK 2201", distanceKm: 1420, value: 194818, status: "expired" },
  { id: "e3", number: "2910 4471 1183", docNumber: "INV/26-27/0372", docType: "Invoice", partyId: "p3", date: "2026-08-21", validTill: "2026-08-25", vehicle: "KA22 MB 3390", distanceKm: 840, value: 199656, status: "expired" },
  { id: "e4", number: "3410 2301 4470", docNumber: "JWC/26-27/0031", docType: "Job-work challan", partyId: "p10", date: "2025-10-20", validTill: "2025-10-23", vehicle: "MH12 RT 8812", distanceKm: 470, value: 86400, status: "expired" },
  { id: "e5", number: "3410 2290 1178", docNumber: "JWC/26-27/0033", docType: "Job-work challan", partyId: "p10", date: "2026-09-30", validTill: "2026-10-02", vehicle: "MH12 RT 8812", distanceKm: 470, value: 64200, status: "generated" },
];

const seedTally: TallyRun[] = [
  { id: "t1", at: "2026-10-01T18:20:00", period: "Sep 2026", mode: "commercial", vouchers: 214, masters: 12, user: "Meera Iyer", status: "completed", file: "factoryerp_tally_2026-09.xml" },
  { id: "t2", at: "2026-09-01T17:48:00", period: "Aug 2026", mode: "commercial", vouchers: 198, masters: 6, user: "Meera Iyer", status: "completed", file: "factoryerp_tally_2026-08.xml" },
  { id: "t3", at: "2026-08-02T10:12:00", period: "Jul 2026", mode: "commercial", vouchers: 187, masters: 41, user: "Meera Iyer", status: "completed", file: "factoryerp_tally_2026-07.xml" },
  { id: "t4", at: "2026-08-01T19:05:00", period: "Jul 2026", mode: "full", vouchers: 0, masters: 0, user: "Meera Iyer", status: "failed", file: "—" },
];

/* ---------------- Store ---------------- */

const stamp = () => `${TODAY}T${new Date().toTimeString().slice(0, 8)}`;

interface FinanceState {
  invoices: Invoice[];
  notes: Note[];
  payments: Payment[];
  eway: EwayBill[];
  tally: TallyRun[];
  nextInv: number;
  createInvoiceFromDelivery: (d: { number: string; soNumber: string; customerId: string; qty: number; value: number; vehicle: string; itemId: string; discountPct: number }) => Invoice;
  postInvoice: (id: string) => void;
  retryIrn: (id: string) => void;
  completeIrn: (id: string) => void;
  cancelIrn: (id: string, reason: string) => void;
  generateEway: (id: string, vehicle: string, distanceKm: number) => string;
  updateEwayVehicle: (id: string, vehicle: string) => void;
  cancelEway: (id: string) => void;
  recordReceipt: (p: Omit<Payment, "id" | "number" | "status" | "kind">) => Payment;
  recordPayment: (p: Omit<Payment, "id" | "number" | "status" | "kind">, needsApproval: boolean) => Payment;
  approvePayment: (id: string) => void;
  addNote: (n: Omit<Note, "id" | "number" | "status" | "irnStatus">) => Note;
  addTallyRun: (r: Omit<TallyRun, "id">) => void;
}

export const useFinance = create<FinanceState>()((set, get) => ({
  invoices: seedInvoices,
  notes: seedNotes,
  payments: seedPayments,
  eway: seedEway,
  tally: seedTally,
  nextInv: 414,

  createInvoiceFromDelivery: (d) => {
    const n = get().nextInv;
    const gross = d.qty > 0 ? d.value / d.qty / (1 - d.discountPct / 100) : 0;
    const inv: Invoice = {
      id: `inv${Date.now()}`,
      number: `INV/26-27/0${n}`,
      date: TODAY,
      dueDate: new Date(Date.parse(TODAY) + partyById(d.customerId).paymentTermsDays * 864e5).toISOString().slice(0, 10),
      customerId: d.customerId,
      soNumber: d.soNumber,
      dcNumber: d.number,
      vehicle: d.vehicle,
      status: "draft",
      irnStatus: "not_applicable",
      attempts: 0,
      paid: 0,
      lines: [L("l1", d.itemId, d.qty, Math.round(gross * 100) / 100, d.discountPct)],
      timeline: [{ at: stamp(), label: "Draft created", detail: `From delivery ${d.number}`, tone: "neutral" }],
    };
    set((s) => ({ invoices: [inv, ...s.invoices], nextInv: n + 1 }));
    return inv;
  },

  postInvoice: (id) => {
    if (company.einvoiceApplicable) setTimeout(() => get().completeIrn(id), 1800);
    set((s) => ({
      invoices: s.invoices.map((i) =>
        i.id === id
          ? {
              ...i,
              status: "posted",
              irnStatus: company.einvoiceApplicable ? "irn_pending" : "not_applicable",
              attempts: company.einvoiceApplicable ? 1 : 0,
              timeline: [
                ...i.timeline,
                { at: stamp(), label: "Posted", detail: "Number locked · ledger entries created · AR open", tone: "info" },
                ...(company.einvoiceApplicable ? [{ at: stamp(), label: "IRN requested", detail: "Sent to GSP (attempt 1)", tone: "warning" as const }] : []),
              ],
            }
          : i,
      ),
    }));
  },

  retryIrn: (id) => {
    set((s) => ({
      invoices: s.invoices.map((i) =>
        i.id === id
          ? {
              ...i,
              irnStatus: "irn_pending",
              attempts: i.attempts + 1,
              timeline: [...i.timeline, { at: stamp(), label: "Retry", detail: `Attempt ${i.attempts + 1} sent to GSP`, tone: "warning" }],
            }
          : i,
      ),
    }));
    setTimeout(() => get().completeIrn(id), 1600);
  },

  completeIrn: (id) => {
    const ack = `1826${Math.floor(1e10 + Math.random() * 9e10)}`;
    set((s) => ({
      invoices: s.invoices.map((i) =>
        i.id === id
          ? {
              ...i,
              irnStatus: "irn_generated",
              irn: irnHash(i.number),
              ackNo: ack,
              ackDate: stamp(),
              lastError: undefined,
              timeline: [...i.timeline, { at: stamp(), label: "IRN generated", detail: `Ack ${ack} · signed QR stored`, tone: "success" }],
            }
          : i,
      ),
    }));
  },

  cancelIrn: (id, reason) =>
    set((s) => ({
      invoices: s.invoices.map((i) =>
        i.id === id
          ? {
              ...i,
              status: "cancelled",
              irnStatus: "cancelled",
              timeline: [...i.timeline, { at: stamp(), label: "IRN cancelled", detail: reason, tone: "danger" }],
            }
          : i,
      ),
    })),

  generateEway: (id, vehicle, distanceKm) => {
    const inv = get().invoices.find((i) => i.id === id)!;
    const number = `3410 ${2300 + get().eway.length} ${String(Math.floor(1000 + Math.random() * 8999))}`;
    const days = Math.max(1, Math.ceil(distanceKm / 200));
    const validTill = new Date(Date.parse(TODAY) + days * 864e5).toISOString().slice(0, 10);
    set((s) => ({
      eway: [
        { id: `e${Date.now()}`, number, docNumber: inv.number, docType: "Invoice", partyId: inv.customerId, date: TODAY, validTill, vehicle, distanceKm, value: invTotals(inv).total, status: "generated" },
        ...s.eway,
      ],
      invoices: s.invoices.map((i) =>
        i.id === id
          ? { ...i, ewayBill: number, vehicle, timeline: [...i.timeline, { at: stamp(), label: "e-Way bill generated", detail: `${number} · valid till ${validTill}`, tone: "success" }] }
          : i,
      ),
    }));
    return number;
  },

  updateEwayVehicle: (id, vehicle) => set((s) => ({ eway: s.eway.map((e) => (e.id === id ? { ...e, vehicle } : e)) })),
  cancelEway: (id) => set((s) => ({ eway: s.eway.map((e) => (e.id === id ? { ...e, status: "cancelled" } : e)) })),

  recordReceipt: (p) => {
    const count = get().payments.filter((x) => x.kind === "receipt").length;
    const pay: Payment = { ...p, id: `r${Date.now()}`, kind: "receipt", number: `RCT/26-27/0${207 + count}`, status: "posted" };
    set((s) => ({
      payments: [pay, ...s.payments],
      invoices: s.invoices.map((i) => {
        const a = p.allocations.find((x) => x.doc === i.number);
        return a
          ? { ...i, paid: i.paid + a.amount, timeline: [...i.timeline, { at: stamp(), label: "Payment received", detail: `${pay.number} · ₹${a.amount.toLocaleString("en-IN")}`, tone: "success" }] }
          : i;
      }),
    }));
    return pay;
  },

  recordPayment: (p, needsApproval) => {
    const count = get().payments.filter((x) => x.kind === "payment").length;
    const pay: Payment = { ...p, id: `p${Date.now()}`, kind: "payment", number: `PAY/26-27/0${160 + count}`, status: needsApproval ? "pending_approval" : "posted" };
    set((s) => ({ payments: [pay, ...s.payments] }));
    return pay;
  },

  approvePayment: (id) => set((s) => ({ payments: s.payments.map((p) => (p.id === id ? { ...p, status: "posted", reference: p.reference === "—" ? "UTR pending bank upload" : p.reference } : p)) })),

  addNote: (n) => {
    const count = get().notes.filter((x) => x.type === n.type).length;
    const note: Note = { ...n, id: `n${Date.now()}`, number: `${n.type === "credit" ? "CN" : "DN"}/26-27/00${n.type === "credit" ? 13 + count : 6 + count}`, status: "posted", irnStatus: "irn_pending" };
    set((s) => ({ notes: [note, ...s.notes] }));
    setTimeout(() => set((s) => ({ notes: s.notes.map((x) => (x.id === note.id ? { ...x, irnStatus: "irn_generated" } : x)) })), 1500);
    return note;
  },

  addTallyRun: (r) => set((s) => ({ tally: [{ ...r, id: `t${Date.now()}` }, ...s.tally] })),
}));
