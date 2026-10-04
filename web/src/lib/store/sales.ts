"use client";

import { create } from "zustand";
import type { Activity } from "@/components/erp/form-view";
import { company, itemById, partyById } from "@/lib/data/masters";
import { TODAY } from "@/lib/utils";

export type SOStatus =
  | "draft"
  | "pending_approval"
  | "confirmed"
  | "partially_delivered"
  | "delivered"
  | "closed"
  | "cancelled";

export interface SOLine {
  id: string;
  itemId: string;
  qty: number;
  rate: number;
  discountPct: number;
  delivered: number;
  invoiced: number;
}

export interface SalesOrder {
  id: string;
  number: string;
  customerId: string;
  date: string;
  deliveryDate: string;
  customerPo: string;
  status: SOStatus;
  lines: SOLine[];
  paymentTermsDays: number;
  notes: string;
  workOrders: string[];
  deliveries: string[];
  invoices: string[];
  activities: Activity[];
}

export interface Quotation {
  id: string;
  number: string;
  customerId: string;
  date: string;
  validTill: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  amount: number;
  salesOrder?: string;
}

export interface DeliveryChallan {
  id: string;
  number: string;
  soNumber: string;
  customerId: string;
  date: string;
  vehicle: string;
  status: "draft" | "posted";
  qty: number;
  value: number;
  invoiced: boolean;
}

/* ---------- tax helpers (arch §14: place of supply decides CGST+SGST vs IGST) ---------- */

export function lineTaxable(l: SOLine) {
  return l.qty * l.rate * (1 - l.discountPct / 100);
}

export function soTotals(so: Pick<SalesOrder, "lines" | "customerId">) {
  const party = partyById(so.customerId);
  const interstate = party.stateCode !== company.stateCode;
  let taxable = 0;
  let tax = 0;
  so.lines.forEach((l) => {
    const t = lineTaxable(l);
    taxable += t;
    tax += (t * itemById(l.itemId).gstRate) / 100;
  });
  const cgst = interstate ? 0 : tax / 2;
  const sgst = interstate ? 0 : tax / 2;
  const igst = interstate ? tax : 0;
  const raw = taxable + tax;
  const total = Math.round(raw);
  return { taxable, cgst, sgst, igst, tax, roundOff: total - raw, total, interstate };
}

const act = (id: string, at: string, user: string, kind: Activity["kind"], text: string, device = "Chrome · Windows"): Activity => ({
  id,
  at,
  user,
  kind,
  text,
  device,
});

const seedOrders: SalesOrder[] = [
  {
    id: "so1", number: "SO-2026-00231", customerId: "p1", date: "2026-09-18", deliveryDate: "2026-10-08", customerPo: "DML/PO/26/4471",
    status: "partially_delivered", paymentTermsDays: 45, notes: "Deliver to Chakan plant gate 3. Packing as per DML-PK-02.",
    lines: [
      { id: "l1", itemId: "i9", qty: 600, rate: 640, discountPct: 0, delivered: 220, invoiced: 220 },
      { id: "l2", itemId: "i11", qty: 120, rate: 475, discountPct: 2, delivered: 0, invoiced: 0 },
    ],
    workOrders: ["WO-2026-00184", "WO-2026-00185"], deliveries: ["DC/26-27/0388"], invoices: ["INV/26-27/0405"],
    activities: [
      act("a1", "2026-09-18T10:12:00", "Neha Kulkarni", "created", "Created from quotation QT-2026-00112"),
      act("a2", "2026-09-18T11:40:00", "Neha Kulkarni", "status", "Confirmed · credit check passed (₹18.6 L of ₹25 L used)"),
      act("a3", "2026-09-19T09:05:00", "Prakash Deshmukh", "system", "Production plan PP-2026-0047 generated · 2 work orders"),
      act("a4", "2026-09-29T16:20:00", "Santosh Kale", "status", "Delivery DC/26-27/0388 posted · 220 nos DS-450"),
      act("a5", "2026-09-29T17:02:00", "Meera Iyer", "posted", "Invoice INV/26-27/0405 posted · IRN generated"),
    ],
  },
  {
    id: "so2", number: "SO-2026-00232", customerId: "p5", date: "2026-09-21", deliveryDate: "2026-10-15", customerPo: "VACL/2026/PO/9912",
    status: "confirmed", paymentTermsDays: 60, notes: "Schedule against Oct-26 monthly plan.",
    lines: [{ id: "l1", itemId: "i10", qty: 2000, rate: 185, discountPct: 0, delivered: 0, invoiced: 0 }],
    workOrders: ["WO-2026-00187"], deliveries: [], invoices: [],
    activities: [
      act("a1", "2026-09-21T12:00:00", "Neha Kulkarni", "created", "Sales order created"),
      act("a2", "2026-09-21T12:30:00", "Neha Kulkarni", "status", "Confirmed · credit check passed (₹26.8 L of ₹30 L used)"),
    ],
  },
  {
    id: "so3", number: "SO-2026-00233", customerId: "p2", date: "2026-09-25", deliveryDate: "2026-10-12", customerPo: "STPL-PO-1187",
    status: "pending_approval", paymentTermsDays: 30, notes: "",
    lines: [
      { id: "l1", itemId: "i12", qty: 300, rate: 310, discountPct: 5, delivered: 0, invoiced: 0 },
      { id: "l2", itemId: "i9", qty: 150, rate: 640, discountPct: 5, delivered: 0, invoiced: 0 },
    ],
    workOrders: [], deliveries: [], invoices: [],
    activities: [
      act("a1", "2026-09-25T15:10:00", "Neha Kulkarni", "created", "Sales order created"),
      act("a2", "2026-09-25T15:12:00", "System", "system", "Sent for approval: credit limit ₹15 L exceeded (₹14.1 L outstanding + ₹2.0 L this order)"),
    ],
  },
  {
    id: "so4", number: "SO-2026-00234", customerId: "p3", date: "2026-09-28", deliveryDate: "2026-10-20", customerPo: "KEW/PO/0921",
    status: "confirmed", paymentTermsDays: 30, notes: "Inter-state supply to Karnataka — IGST.",
    lines: [{ id: "l1", itemId: "i11", qty: 200, rate: 475, discountPct: 0, delivered: 0, invoiced: 0 }],
    workOrders: ["WO-2026-00189"], deliveries: [], invoices: [],
    activities: [act("a1", "2026-09-28T11:00:00", "Neha Kulkarni", "created", "Sales order created and confirmed")],
  },
  {
    id: "so5", number: "SO-2026-00235", customerId: "p4", date: "2026-10-01", deliveryDate: "2026-10-25", customerPo: "NPV-7712",
    status: "draft", paymentTermsDays: 30, notes: "",
    lines: [{ id: "l1", itemId: "i12", qty: 240, rate: 310, discountPct: 0, delivered: 0, invoiced: 0 }],
    workOrders: [], deliveries: [], invoices: [],
    activities: [act("a1", "2026-10-01T10:30:00", "Neha Kulkarni", "created", "Draft created")],
  },
  {
    id: "so6", number: "SO-2026-00226", customerId: "p1", date: "2026-09-02", deliveryDate: "2026-09-20", customerPo: "DML/PO/26/4302",
    status: "delivered", paymentTermsDays: 45, notes: "",
    lines: [{ id: "l1", itemId: "i10", qty: 1500, rate: 182, discountPct: 0, delivered: 1500, invoiced: 1500 }],
    workOrders: ["WO-2026-00176"], deliveries: ["DC/26-27/0361", "DC/26-27/0372"], invoices: ["INV/26-27/0381", "INV/26-27/0394"],
    activities: [act("a1", "2026-09-02T10:00:00", "Neha Kulkarni", "created", "Sales order created")],
  },
  {
    id: "so7", number: "SO-2026-00228", customerId: "p5", date: "2026-09-08", deliveryDate: "2026-09-30", customerPo: "VACL/2026/PO/9804",
    status: "partially_delivered", paymentTermsDays: 60, notes: "",
    lines: [{ id: "l1", itemId: "i9", qty: 800, rate: 635, discountPct: 0, delivered: 560, invoiced: 560 }],
    workOrders: ["WO-2026-00179"], deliveries: ["DC/26-27/0369", "DC/26-27/0384"], invoices: ["INV/26-27/0389", "INV/26-27/0401"],
    activities: [act("a1", "2026-09-08T10:00:00", "Neha Kulkarni", "created", "Sales order created")],
  },
  {
    id: "so8", number: "SO-2026-00229", customerId: "p2", date: "2026-09-10", deliveryDate: "2026-09-28", customerPo: "STPL-PO-1160",
    status: "closed", paymentTermsDays: 30, notes: "",
    lines: [{ id: "l1", itemId: "i12", qty: 400, rate: 305, discountPct: 0, delivered: 400, invoiced: 400 }],
    workOrders: ["WO-2026-00180"], deliveries: ["DC/26-27/0375"], invoices: ["INV/26-27/0396"],
    activities: [act("a1", "2026-09-10T10:00:00", "Neha Kulkarni", "created", "Sales order created")],
  },
  {
    id: "so9", number: "SO-2026-00230", customerId: "p4", date: "2026-09-14", deliveryDate: "2026-09-26", customerPo: "NPV-7650",
    status: "cancelled", paymentTermsDays: 30, notes: "Customer cancelled — design change.",
    lines: [{ id: "l1", itemId: "i11", qty: 60, rate: 470, discountPct: 0, delivered: 0, invoiced: 0 }],
    workOrders: [], deliveries: [], invoices: [],
    activities: [act("a1", "2026-09-14T10:00:00", "Neha Kulkarni", "created", "Sales order created")],
  },
];

const seedQuotations: Quotation[] = [
  { id: "q1", number: "QT-2026-00118", customerId: "p4", date: "2026-09-30", validTill: "2026-10-15", status: "sent", amount: 87792 },
  { id: "q2", number: "QT-2026-00117", customerId: "p3", date: "2026-09-27", validTill: "2026-10-12", status: "accepted", amount: 112100, salesOrder: "SO-2026-00234" },
  { id: "q3", number: "QT-2026-00116", customerId: "p5", date: "2026-09-20", validTill: "2026-10-05", status: "accepted", amount: 473600, salesOrder: "SO-2026-00232" },
  { id: "q4", number: "QT-2026-00115", customerId: "p2", date: "2026-09-18", validTill: "2026-10-03", status: "sent", amount: 245310 },
  { id: "q5", number: "QT-2026-00114", customerId: "p1", date: "2026-09-12", validTill: "2026-09-27", status: "expired", amount: 158400 },
  { id: "q6", number: "QT-2026-00113", customerId: "p4", date: "2026-09-10", validTill: "2026-09-25", status: "rejected", amount: 66080 },
  { id: "q7", number: "QT-2026-00112", customerId: "p1", date: "2026-09-15", validTill: "2026-09-30", status: "accepted", amount: 516310, salesOrder: "SO-2026-00231" },
  { id: "q8", number: "QT-2026-00119", customerId: "p1", date: "2026-10-01", validTill: "2026-10-16", status: "draft", amount: 302080 },
];

const seedDeliveries: DeliveryChallan[] = [
  { id: "d1", number: "DC/26-27/0388", soNumber: "SO-2026-00231", customerId: "p1", date: "2026-09-29", vehicle: "MH14 GU 4471", status: "posted", qty: 220, value: 140800, invoiced: true },
  { id: "d2", number: "DC/26-27/0384", soNumber: "SO-2026-00228", customerId: "p5", date: "2026-09-27", vehicle: "HR55 AK 2201", status: "posted", qty: 300, value: 190500, invoiced: true },
  { id: "d3", number: "DC/26-27/0375", soNumber: "SO-2026-00229", customerId: "p2", date: "2026-09-24", vehicle: "MH09 CU 7710", status: "posted", qty: 400, value: 122000, invoiced: true },
  { id: "d4", number: "DC/26-27/0372", soNumber: "SO-2026-00226", customerId: "p1", date: "2026-09-19", vehicle: "MH14 GU 4471", status: "posted", qty: 700, value: 127400, invoiced: true },
  { id: "d5", number: "DC/26-27/0369", soNumber: "SO-2026-00228", customerId: "p5", date: "2026-09-17", vehicle: "HR55 AK 2201", status: "posted", qty: 260, value: 165100, invoiced: true },
  { id: "d6", number: "DC/26-27/0389", soNumber: "SO-2026-00231", customerId: "p1", date: "2026-10-02", vehicle: "", status: "draft", qty: 180, value: 115200, invoiced: false },
];

interface SalesState {
  orders: SalesOrder[];
  quotations: Quotation[];
  deliveries: DeliveryChallan[];
  nextSo: number;
  addOrder: (o: Omit<SalesOrder, "id" | "number" | "activities" | "workOrders" | "deliveries" | "invoices">, user: string) => SalesOrder;
  updateOrder: (id: string, patch: Partial<SalesOrder>) => void;
  setStatus: (id: string, status: SOStatus, user: string, text: string, kind?: Activity["kind"]) => void;
  logNote: (id: string, user: string, text: string) => void;
  deliver: (id: string, qtyByLine: Record<string, number>, vehicle: string, user: string) => string;
  linkWorkOrders: (id: string, wos: string[], user: string) => void;
  convertQuotation: (qid: string, user: string) => SalesOrder;
}

const now = () => `${TODAY}T${new Date().toTimeString().slice(0, 8)}`;

export const useSales = create<SalesState>()((set, get) => ({
  orders: seedOrders,
  quotations: seedQuotations,
  deliveries: seedDeliveries,
  nextSo: 236,
  addOrder: (o, user) => {
    const n = get().nextSo;
    const so: SalesOrder = {
      ...o,
      id: `so${Date.now()}`,
      number: `SO-2026-${String(n).padStart(5, "0")}`,
      workOrders: [],
      deliveries: [],
      invoices: [],
      activities: [act(`a${Date.now()}`, now(), user, "created", "Sales order created")],
    };
    set((s) => ({ orders: [so, ...s.orders], nextSo: n + 1 }));
    return so;
  },
  updateOrder: (id, patch) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
  setStatus: (id, status, user, text, kind = "status") =>
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === id ? { ...o, status, activities: [act(`a${Date.now()}`, now(), user, kind, text), ...o.activities] } : o,
      ),
    })),
  logNote: (id, user, text) =>
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? { ...o, activities: [act(`a${Date.now()}`, now(), user, "note", text), ...o.activities] } : o)),
    })),
  deliver: (id, qtyByLine, vehicle, user) => {
    const so = get().orders.find((o) => o.id === id)!;
    const count = get().deliveries.length + 384;
    const number = `DC/26-27/0${count}`;
    const lines = so.lines.map((l) => ({ ...l, delivered: l.delivered + (qtyByLine[l.id] ?? 0) }));
    const full = lines.every((l) => l.delivered >= l.qty);
    const qty = Object.values(qtyByLine).reduce((a, b) => a + b, 0);
    const value = so.lines.reduce((a, l) => a + (qtyByLine[l.id] ?? 0) * l.rate * (1 - l.discountPct / 100), 0);
    set((s) => ({
      deliveries: [
        { id: `d${Date.now()}`, number, soNumber: so.number, customerId: so.customerId, date: TODAY, vehicle, status: "posted", qty, value, invoiced: false },
        ...s.deliveries,
      ],
      orders: s.orders.map((o) =>
        o.id === id
          ? {
              ...o,
              lines,
              status: full ? "delivered" : "partially_delivered",
              deliveries: [...o.deliveries, number],
              activities: [act(`a${Date.now()}`, now(), user, "status", `Delivery ${number} posted · ${qty} nos · stock moved out of FGS`), ...o.activities],
            }
          : o,
      ),
    }));
    return number;
  },
  linkWorkOrders: (id, wos, user) =>
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === id
          ? {
              ...o,
              workOrders: [...o.workOrders, ...wos],
              activities: [act(`a${Date.now()}`, now(), user, "system", `Production plan generated · ${wos.join(", ")}`), ...o.activities],
            }
          : o,
      ),
    })),
  convertQuotation: (qid, user) => {
    const q = get().quotations.find((x) => x.id === qid)!;
    const so = get().addOrder(
      {
        customerId: q.customerId,
        date: TODAY,
        deliveryDate: "2026-10-30",
        customerPo: "",
        status: "draft",
        lines: [{ id: "l1", itemId: "i12", qty: Math.round(q.amount / 1.18 / 310), rate: 310, discountPct: 0, delivered: 0, invoiced: 0 }],
        paymentTermsDays: partyById(q.customerId).paymentTermsDays,
        notes: `From quotation ${q.number}`,
      },
      user,
    );
    set((s) => ({ quotations: s.quotations.map((x) => (x.id === qid ? { ...x, status: "accepted", salesOrder: so.number } : x)) }));
    return so;
  },
}));
