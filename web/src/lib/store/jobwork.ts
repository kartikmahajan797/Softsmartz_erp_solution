"use client";

import { create } from "zustand";
import type { Activity } from "@/components/erp/form-view";
import { company, partyById } from "@/lib/data/masters";
import { daysBetween, TODAY } from "@/lib/utils";

/* Job-work (FR-JW-01..05): goods sent to job-workers under delivery challan, tracked against
   the GST return time limits — 1 year for inputs, 3 years for capital goods (PRD §12). */

export interface ChallanLine {
  id: string;
  itemId: string;
  description?: string;
  qty: number;
  uom: string;
  valuePerUnit: number;
  returned: number;
  loss: number;
  scrapReturned: number;
}

export interface JWReceipt {
  id: string;
  number: string;
  date: string;
  lines: { lineId: string; returned: number; loss: number; scrap: number }[];
  charges: number;
  billNumber: string;
  by: string;
}

export interface Challan {
  id: string;
  number: string;
  jobWorkerId: string;
  process: string;
  goodsClass: "input" | "capital";
  date: string;
  status: "draft" | "issued" | "partially_returned" | "closed";
  vehicle: string;
  ewayBill?: { number: string; generatedAt: string; validTill: string };
  lines: ChallanLine[];
  receipts: JWReceipt[];
  activities: Activity[];
}

export const isInterstate = (c: Pick<Challan, "jobWorkerId">) => partyById(c.jobWorkerId).stateCode !== company.stateCode;

export function dueDate(c: Pick<Challan, "date" | "goodsClass">) {
  const d = new Date(`${c.date}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + (c.goodsClass === "capital" ? 3 : 1));
  return d.toISOString().slice(0, 10);
}

export const pendingQty = (l: ChallanLine) => l.qty - l.returned - l.loss;

export function challanState(c: Challan) {
  const pending = c.lines.reduce((a, l) => a + pendingQty(l), 0);
  const days = daysBetween(TODAY, dueDate(c));
  const overdue = c.status !== "closed" && c.status !== "draft" && pending > 0 && days < 0;
  return { pending, days, overdue };
}

/** Alert lead time before the time limit (configurable in Settings). */
export const ALERT_DAYS = 30;

const act = (id: string, at: string, user: string, kind: Activity["kind"], text: string): Activity => ({ id, at, user, kind, text, device: "Chrome · Windows" });

const seed: Challan[] = [
  {
    id: "jw1", number: "JWC/26-27/0034", jobWorkerId: "p9", process: "Zinc plating (yellow passivation)", goodsClass: "input", date: "2026-10-02", status: "issued", vehicle: "MH14 KL 3390",
    lines: [{ id: "l1", itemId: "i10", qty: 1000, uom: "nos", valuePerUnit: 143.1, returned: 0, loss: 0, scrapReturned: 0 }],
    receipts: [],
    activities: [act("a1", "2026-10-02T12:55:00", "Santosh Kale", "posted", "Challan issued · 1,000 nos moved to JW: Shree Ganesh Plating · intra-state, e-way bill not required")],
  },
  {
    id: "jw2", number: "JWC/26-27/0031", jobWorkerId: "p10", process: "Induction hardening", goodsClass: "input", date: "2025-10-20", status: "partially_returned", vehicle: "KA22 B 4410",
    ewayBill: { number: "7412 0598 1123", generatedAt: "2025-10-20T09:15:00", validTill: "2025-10-24T23:59:00" },
    lines: [{ id: "l1", itemId: "i7", qty: 1200, uom: "nos", valuePerUnit: 208.4, returned: 772, loss: 8, scrapReturned: 0 }],
    receipts: [
      { id: "r1", number: "JWR/25-26/0041", date: "2025-11-18", lines: [{ lineId: "l1", returned: 500, loss: 5, scrap: 0 }], charges: 21000, billNumber: "PB-2025-00911", by: "Santosh Kale" },
      { id: "r2", number: "JWR/25-26/0058", date: "2025-12-22", lines: [{ lineId: "l1", returned: 272, loss: 3, scrap: 0 }], charges: 11424, billNumber: "PB-2025-00987", by: "Santosh Kale" },
    ],
    activities: [
      act("a1", "2025-10-20T09:20:00", "Santosh Kale", "posted", "Challan issued · inter-state to Karnataka · e-way bill 7412 0598 1123"),
      act("a2", "2026-09-02T07:00:00", "System", "system", "Alert: 48 days to the 1-year return limit for 420 nos pending"),
    ],
  },
  {
    id: "jw3", number: "JWC/26-27/0030", jobWorkerId: "p10", process: "Induction hardening", goodsClass: "input", date: "2026-09-24", status: "closed", vehicle: "KA22 B 4410",
    ewayBill: { number: "7413 2201 0456", generatedAt: "2026-09-24T10:02:00", validTill: "2026-09-28T23:59:00" },
    lines: [{ id: "l1", itemId: "i7", qty: 150, uom: "nos", valuePerUnit: 213.2, returned: 150, loss: 0, scrapReturned: 0 }],
    receipts: [{ id: "r1", number: "JWR/26-27/0019", date: "2026-09-30", lines: [{ lineId: "l1", returned: 150, loss: 0, scrap: 0 }], charges: 6300, billNumber: "PB-2026-00145", by: "Santosh Kale" }],
    activities: [act("a1", "2026-09-24T10:05:00", "Santosh Kale", "posted", "Challan issued · e-way bill generated")],
  },
  {
    id: "jw4", number: "JWC/26-27/0032", jobWorkerId: "p9", process: "Zinc plating (yellow passivation)", goodsClass: "input", date: "2026-09-18", status: "partially_returned", vehicle: "MH14 KL 3390",
    lines: [{ id: "l1", itemId: "i10", qty: 1500, uom: "nos", valuePerUnit: 140.2, returned: 1100, loss: 6, scrapReturned: 4 }],
    receipts: [{ id: "r1", number: "JWR/26-27/0017", date: "2026-09-26", lines: [{ lineId: "l1", returned: 1100, loss: 6, scrap: 4 }], charges: 9900, billNumber: "PB-2026-00143", by: "Santosh Kale" }],
    activities: [act("a1", "2026-09-18T11:00:00", "Santosh Kale", "posted", "Challan issued")],
  },
  {
    id: "jw5", number: "JWC/26-27/0012", jobWorkerId: "p10", process: "Die re-hardening (press tool)", goodsClass: "capital", date: "2026-05-11", status: "issued", vehicle: "KA22 B 4410",
    ewayBill: { number: "7401 8834 2290", generatedAt: "2026-05-11T09:40:00", validTill: "2026-05-14T23:59:00" },
    lines: [{ id: "l1", itemId: "i10", description: "Press tool die set MB-220 (blanking)", qty: 1, uom: "set", valuePerUnit: 185000, returned: 0, loss: 0, scrapReturned: 0 }],
    receipts: [],
    activities: [act("a1", "2026-05-11T09:45:00", "Prakash Deshmukh", "posted", "Capital goods sent · 3-year return limit applies")],
  },
  {
    id: "jw6", number: "JWC/26-27/0028", jobWorkerId: "p9", process: "Zinc plating (yellow passivation)", goodsClass: "input", date: "2026-08-29", status: "closed", vehicle: "MH14 KL 3390",
    lines: [{ id: "l1", itemId: "i10", qty: 1200, uom: "nos", valuePerUnit: 139.4, returned: 1194, loss: 6, scrapReturned: 6 }],
    receipts: [{ id: "r1", number: "JWR/26-27/0011", date: "2026-09-06", lines: [{ lineId: "l1", returned: 1194, loss: 6, scrap: 6 }], charges: 10800, billNumber: "PB-2026-00131", by: "Santosh Kale" }],
    activities: [act("a1", "2026-08-29T11:00:00", "Santosh Kale", "posted", "Challan issued")],
  },
  {
    id: "jw7", number: "JWC/26-27/0035", jobWorkerId: "p10", process: "Induction hardening", goodsClass: "input", date: "2026-10-02", status: "draft", vehicle: "",
    lines: [{ id: "l1", itemId: "i7", qty: 300, uom: "nos", valuePerUnit: 214.8, returned: 0, loss: 0, scrapReturned: 0 }],
    receipts: [],
    activities: [act("a1", "2026-10-02T14:10:00", "Santosh Kale", "created", "Draft created")],
  },
];

interface JobworkState {
  challans: Challan[];
  addChallan: (c: Omit<Challan, "id" | "number" | "activities" | "receipts">, user: string) => Challan;
  updateChallan: (id: string, patch: Partial<Challan>) => void;
  issue: (id: string, user: string) => void;
  receive: (id: string, r: Omit<JWReceipt, "id" | "number" | "billNumber" | "date">, user: string) => JWReceipt;
  log: (id: string, user: string, text: string) => void;
}

const stamp = () => `${TODAY}T${new Date().toTimeString().slice(0, 8)}`;

export const useJobwork = create<JobworkState>()((set, get) => ({
  challans: seed,
  addChallan: (c, user) => {
    const n = Math.max(...get().challans.map((x) => Number(x.number.slice(-4)))) + 1;
    const created: Challan = { ...c, id: `jw${Date.now()}`, number: `JWC/26-27/${String(n).padStart(4, "0")}`, receipts: [], activities: [act(`a${Date.now()}`, stamp(), user, "created", "Draft created")] };
    set((s) => ({ challans: [created, ...s.challans] }));
    return created;
  },
  updateChallan: (id, patch) => set((s) => ({ challans: s.challans.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
  issue: (id, user) => {
    const c = get().challans.find((x) => x.id === id)!;
    const inter = isInterstate(c);
    const eway = inter
      ? { number: `74${Math.floor(10 + Math.random() * 89)} ${Math.floor(1000 + Math.random() * 8999)} ${Math.floor(1000 + Math.random() * 8999)}`, generatedAt: stamp(), validTill: `${TODAY}T23:59:00` }
      : undefined;
    set((s) => ({
      challans: s.challans.map((x) =>
        x.id === id
          ? {
              ...x,
              status: "issued",
              date: TODAY,
              ewayBill: eway ?? x.ewayBill,
              activities: [
                act(`a${Date.now()}`, stamp(), user, "posted", `Challan issued · stock moved to JW warehouse${eway ? ` · e-way bill ${eway.number} via GSP (inter-state, mandatory)` : ""}`),
                ...x.activities,
              ],
            }
          : x,
      ),
    }));
  },
  receive: (id, r, user) => {
    const c = get().challans.find((x) => x.id === id)!;
    const n = get().challans.reduce((a, x) => a + x.receipts.length, 0) + 12;
    const receipt: JWReceipt = { ...r, id: `r${Date.now()}`, number: `JWR/26-27/${String(n).padStart(4, "0")}`, date: TODAY, billNumber: `PB-2026-${String(147 + n - 12).padStart(5, "0")}` };
    const lines = c.lines.map((l) => {
      const rl = r.lines.find((x) => x.lineId === l.id);
      return rl ? { ...l, returned: l.returned + rl.returned, loss: l.loss + rl.loss, scrapReturned: l.scrapReturned + rl.scrap } : l;
    });
    const done = lines.every((l) => pendingQty(l) <= 0);
    set((s) => ({
      challans: s.challans.map((x) =>
        x.id === id
          ? {
              ...x,
              lines,
              status: done ? "closed" : "partially_returned",
              receipts: [...x.receipts, receipt],
              activities: [act(`a${Date.now()}`, stamp(), user, "posted", `Receipt ${receipt.number} · charges bill ${receipt.billNumber} created`), ...x.activities],
            }
          : x,
      ),
    }));
    return receipt;
  },
  log: (id, user, text) =>
    set((s) => ({ challans: s.challans.map((c) => (c.id === id ? { ...c, activities: [act(`a${Date.now()}`, stamp(), user, "note", text), ...c.activities] } : c)) })),
}));
