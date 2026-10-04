"use client";

import { create } from "zustand";
import type { Activity } from "@/components/erp/form-view";
import { items as masterItems, type Item } from "@/lib/data/masters";
import { TODAY } from "@/lib/utils";

/* ---------------- Types (arch §11: stock_movements, stock_balances) ---------------- */

export type MovementType =
  | "opening"
  | "grn"
  | "issue"
  | "backflush"
  | "fg_receipt"
  | "scrap"
  | "transfer_out"
  | "transfer_in"
  | "jw_out"
  | "jw_in"
  | "adjustment"
  | "count_variance"
  | "dispatch";

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  opening: "Opening",
  grn: "Goods receipt",
  issue: "Material issue",
  backflush: "Backflush",
  fg_receipt: "FG receipt",
  scrap: "Scrap",
  transfer_out: "Transfer out",
  transfer_in: "Transfer in",
  jw_out: "Job-work out",
  jw_in: "Job-work in",
  adjustment: "Adjustment",
  count_variance: "Count variance",
  dispatch: "Dispatch",
};

export interface Movement {
  id: string;
  at: string;
  itemId: string;
  warehouseId: string;
  batch: string;
  type: MovementType;
  qty: number;
  unitCost: number;
  doc: string;
  by: string;
  reverses?: string;
}

/** Stock balance per item × warehouse × batch (derived table; here seeded). */
export interface Lot {
  id: string;
  itemId: string;
  warehouseId: string;
  batch: string;
  qty: number;
  unitCost: number;
  receivedOn: string;
}

export interface StockItem extends Item {
  uoms: { uom: string; factor: number; use: string }[];
  hasMovements: boolean;
  variantNote?: string;
  activities: Activity[];
}

export interface Adjustment {
  id: string;
  number: string;
  kind: "adjustment" | "transfer";
  date: string;
  itemId: string;
  batch: string;
  fromWh: string;
  toWh?: string;
  qty: number; // signed for adjustments, positive for transfers
  reason: string;
  note: string;
  status: "pending_approval" | "posted" | "rejected";
  by: string;
  decidedBy?: string;
}

export interface CountLine {
  id: string;
  itemId: string;
  batch: string;
  system: number;
  counted: number | null;
}

export interface CountSession {
  id: string;
  number: string;
  warehouseId: string;
  date: string;
  status: "counting" | "submitted" | "approved" | "posted" | "rejected";
  blind: boolean;
  countedBy: string;
  lines: CountLine[];
}

export const ADJ_REASONS = [
  { code: "DMG", label: "Damaged in store" },
  { code: "RUST", label: "Rust / deterioration" },
  { code: "FOUND", label: "Found during audit" },
  { code: "LOSS", label: "Unexplained loss" },
  { code: "WT", label: "Weighment difference" },
  { code: "UOM", label: "UoM conversion correction" },
];

/** Variance (value) above which a count needs Owner / Production head approval. */
export const COUNT_VARIANCE_LIMIT = 5000;

/* ---------------- Seed ---------------- */

const lot = (id: string, itemId: string, warehouseId: string, batch: string, qty: number, unitCost: number, receivedOn: string): Lot => ({
  id, itemId, warehouseId, batch, qty, unitCost, receivedOn,
});

const seedLots: Lot[] = [
  lot("L1", "i1", "w1", "B-2609-014", 380, 68.5, "2026-09-14"),
  lot("L2", "i1", "w1", "B-2609-027", 800, 69.8, "2026-09-26"),
  lot("L3", "i1", "w4", "B-2610-001", 2400, 70.0, "2026-10-02"),
  lot("L4", "i2", "w1", "B-2608-031", 1240, 70.6, "2026-08-28"),
  lot("L5", "i2", "w1", "B-2609-019", 1600, 71.6, "2026-09-19"),
  lot("L6", "i3", "w1", "—", 260, 57.6, "2026-09-11"),
  lot("L7", "i4", "w1", "—", 6400, 6.1, "2026-09-05"),
  lot("L8", "i5", "w1", "—", 210, 41.5, "2026-09-22"),
  lot("L9", "i6", "w1", "—", 145, 162, "2026-09-03"),
  lot("L10", "i7", "w2", "B-2609-033", 340, 214.8, "2026-09-28"),
  lot("L11", "i7", "w7", "B-2510-008", 420, 208.4, "2025-10-20"),
  lot("L12", "i7", "w7", "B-2609-021", 150, 213.2, "2026-09-24"),
  lot("L13", "i9", "w3", "B-2609-030", 180, 489.6, "2026-09-25"),
  lot("L14", "i9", "w3", "B-2610-002", 240, 494.3, "2026-10-01"),
  lot("L15", "i10", "w3", "B-2609-024", 650, 140.2, "2026-09-20"),
  lot("L16", "i10", "w3", "B-2609-035", 600, 143.1, "2026-09-29"),
  lot("L17", "i10", "w6", "B-2609-035", 1000, 143.1, "2026-10-02"),
  lot("L18", "i11", "w3", "B-2609-029", 96, 368.1, "2026-09-27"),
  lot("L19", "i12", "w3", "B-2609-011", 540, 226.9, "2026-09-12"),
  lot("L20", "i13", "w1", "B-2609-017", 88, 147.2, "2026-09-17"),
  lot("L21", "i2", "w5", "SCRAP", 46, 18, "2026-09-30"),
  lot("L22", "i9", "w4", "B-2610-002", 12, 494.3, "2026-10-01"),
];

let mid = 0;
const mv = (at: string, itemId: string, warehouseId: string, batch: string, type: MovementType, qty: number, unitCost: number, doc: string, by: string, reverses?: string): Movement => ({
  id: `m${++mid}`, at, itemId, warehouseId, batch, type, qty, unitCost, doc, by, reverses,
});

const seedMovements: Movement[] = [
  mv("2026-09-01T09:00:00", "i1", "w1", "B-2609-014", "opening", 0, 68.5, "Opening FY 26-27 b/f", "System"),
  mv("2026-09-14T11:20:00", "i1", "w1", "B-2609-014", "grn", 3000, 68.5, "GRN-2026-00296", "Santosh Kale"),
  mv("2026-09-16T08:10:00", "i1", "w1", "B-2609-014", "issue", -1200, 68.5, "WO-2026-00179", "Santosh Kale"),
  mv("2026-09-22T08:05:00", "i1", "w1", "B-2609-014", "issue", -1420, 68.5, "WO-2026-00184", "Santosh Kale"),
  mv("2026-09-26T15:40:00", "i1", "w1", "B-2609-027", "grn", 1500, 69.8, "GRN-2026-00309", "Santosh Kale"),
  mv("2026-09-29T08:12:00", "i1", "w1", "B-2609-027", "issue", -700, 69.8, "WO-2026-00185", "Santosh Kale"),
  mv("2026-10-02T13:41:00", "i1", "w4", "B-2610-001", "grn", 2400, 70.0, "GRN-2026-00318", "Santosh Kale"),
  mv("2026-09-19T12:00:00", "i2", "w1", "B-2609-019", "grn", 2000, 71.6, "GRN-2026-00302", "Santosh Kale"),
  mv("2026-09-24T09:30:00", "i2", "w1", "B-2609-019", "issue", -400, 71.6, "WO-2026-00187", "Santosh Kale"),
  mv("2026-09-30T17:10:00", "i2", "w5", "SCRAP", "scrap", 46, 18, "SCR-2026-0061", "Prakash Deshmukh"),
  mv("2026-09-28T16:45:00", "i7", "w2", "B-2609-033", "fg_receipt", 340, 214.8, "WO-2026-00184", "Ramesh Yadav"),
  mv("2026-09-24T10:00:00", "i7", "w7", "B-2609-021", "jw_out", 150, 213.2, "JWC/26-27/0030", "Santosh Kale"),
  mv("2026-09-24T10:00:00", "i7", "w2", "B-2609-021", "jw_out", -150, 213.2, "JWC/26-27/0030", "Santosh Kale"),
  mv("2026-09-30T14:20:00", "i7", "w2", "B-2609-021", "jw_in", 150, 226.4, "JWR/26-27/0019", "Santosh Kale"),
  mv("2026-09-30T14:20:00", "i7", "w7", "B-2609-021", "jw_in", -150, 213.2, "JWR/26-27/0019", "Santosh Kale"),
  mv("2026-09-25T18:30:00", "i9", "w3", "B-2609-030", "fg_receipt", 400, 489.6, "WO-2026-00179", "Imran Shaikh"),
  mv("2026-09-27T11:00:00", "i9", "w3", "B-2609-030", "dispatch", -300, 489.6, "DC/26-27/0384", "Santosh Kale"),
  mv("2026-09-29T16:20:00", "i9", "w3", "B-2609-030", "dispatch", -220, 489.6, "DC/26-27/0388", "Santosh Kale"),
  mv("2026-10-01T17:55:00", "i9", "w3", "B-2610-002", "fg_receipt", 240, 494.3, "WO-2026-00184", "Ramesh Yadav"),
  mv("2026-10-01T17:55:00", "i3", "w1", "—", "backflush", -240, 57.6, "WO-2026-00184", "Ramesh Yadav"),
  mv("2026-10-02T11:05:00", "i3", "w1", "—", "backflush", -60, 57.6, "WO-2026-00185", "Imran Shaikh"),
  mv("2026-09-29T19:10:00", "i10", "w3", "B-2609-035", "fg_receipt", 1600, 143.1, "WO-2026-00187", "Vijay Kumar"),
  mv("2026-10-02T12:55:00", "i10", "w6", "B-2609-035", "jw_out", 1000, 143.1, "JWC/26-27/0034", "Santosh Kale"),
  mv("2026-10-02T12:55:00", "i10", "w3", "B-2609-035", "jw_out", -1000, 143.1, "JWC/26-27/0034", "Santosh Kale"),
  mv("2026-09-27T10:30:00", "i4", "w1", "—", "adjustment", -40, 6.1, "ADJ-2026-0042", "Santosh Kale"),
  mv("2026-09-27T10:35:00", "i4", "w1", "—", "adjustment", 40, 6.1, "ADJ-2026-0042-R", "Santosh Kale", "ADJ-2026-0042"),
  mv("2026-09-27T10:36:00", "i4", "w1", "—", "adjustment", -4, 6.1, "ADJ-2026-0043", "Santosh Kale"),
  mv("2026-09-30T18:00:00", "i5", "w1", "—", "count_variance", -12, 41.5, "CNT-2026-0014", "Santosh Kale"),
  mv("2026-09-17T12:30:00", "i13", "w1", "B-2609-017", "grn", 300, 147.2, "GRN-2026-00300", "Santosh Kale"),
  mv("2026-09-23T08:20:00", "i13", "w1", "B-2609-017", "issue", -212, 147.2, "WO-2026-00185", "Santosh Kale"),
  mv("2026-10-02T09:10:00", "i6", "w1", "—", "issue", -15, 162, "MI-2026-0388", "Santosh Kale"),
  mv("2026-10-02T13:58:00", "i9", "w4", "B-2610-002", "fg_receipt", 12, 494.3, "JC-2026-00412", "Ramesh Yadav"),
];

const seedAdjustments: Adjustment[] = [
  { id: "a1", number: "ADJ-2026-0046", kind: "adjustment", date: "2026-10-02", itemId: "i2", batch: "B-2608-031", fromWh: "w1", qty: -38, reason: "RUST", note: "Edge rust on 4 sheets, kept aside for scrap", status: "pending_approval", by: "Santosh Kale" },
  { id: "a2", number: "TRF-2026-0118", kind: "transfer", date: "2026-10-02", itemId: "i9", batch: "B-2610-002", fromWh: "w3", toWh: "w4", qty: 12, reason: "Customer complaint — re-inspection", note: "", status: "posted", by: "Santosh Kale" },
  { id: "a3", number: "ADJ-2026-0045", kind: "adjustment", date: "2026-10-01", itemId: "i6", batch: "—", fromWh: "w1", qty: -6, reason: "LOSS", note: "Drum leak", status: "pending_approval", by: "Santosh Kale" },
  { id: "a4", number: "ADJ-2026-0044", kind: "adjustment", date: "2026-09-30", itemId: "i4", batch: "—", fromWh: "w1", qty: 100, reason: "FOUND", note: "Box found behind rack R4", status: "posted", by: "Santosh Kale", decidedBy: "Prakash Deshmukh" },
  { id: "a5", number: "ADJ-2026-0043", kind: "adjustment", date: "2026-09-27", itemId: "i4", batch: "—", fromWh: "w1", qty: -4, reason: "DMG", note: "Thread damage", status: "posted", by: "Santosh Kale", decidedBy: "Rajesh Agarwal" },
  { id: "a6", number: "TRF-2026-0117", kind: "transfer", date: "2026-09-29", itemId: "i7", batch: "B-2609-033", fromWh: "w2", toWh: "w3", qty: 0 + 40, reason: "Stores consolidation", note: "", status: "posted", by: "Santosh Kale" },
  { id: "a7", number: "ADJ-2026-0041", kind: "adjustment", date: "2026-09-24", itemId: "i1", batch: "B-2609-014", fromWh: "w1", qty: -85, reason: "WT", note: "Weighbridge vs invoice", status: "rejected", by: "Santosh Kale", decidedBy: "Rajesh Agarwal" },
];

const seedCounts: CountSession[] = [
  {
    id: "c1", number: "CNT-2026-0015", warehouseId: "w1", date: "2026-10-02", status: "counting", blind: true, countedBy: "Santosh Kale",
    lines: [
      { id: "cl1", itemId: "i3", batch: "—", system: 260, counted: 254 },
      { id: "cl2", itemId: "i4", batch: "—", system: 6400, counted: null },
      { id: "cl3", itemId: "i5", batch: "—", system: 210, counted: 210 },
      { id: "cl4", itemId: "i6", batch: "—", system: 145, counted: null },
      { id: "cl5", itemId: "i13", batch: "B-2609-017", system: 88, counted: null },
    ],
  },
  {
    id: "c2", number: "CNT-2026-0014", warehouseId: "w1", date: "2026-09-30", status: "posted", blind: true, countedBy: "Santosh Kale",
    lines: [
      { id: "cl1", itemId: "i5", batch: "—", system: 222, counted: 210 },
      { id: "cl2", itemId: "i6", batch: "—", system: 160, counted: 160 },
    ],
  },
  {
    id: "c3", number: "CNT-2026-0013", warehouseId: "w3", date: "2026-09-28", status: "submitted", blind: false, countedBy: "Santosh Kale",
    lines: [
      { id: "cl1", itemId: "i10", batch: "B-2609-024", system: 650, counted: 610 },
      { id: "cl2", itemId: "i12", batch: "B-2609-011", system: 540, counted: 540 },
      { id: "cl3", itemId: "i11", batch: "B-2609-029", system: 96, counted: 96 },
    ],
  },
];

const uomsFor = (i: Item): StockItem["uoms"] => {
  const base = [{ uom: i.uom, factor: 1, use: "Stock, BOM" }];
  if (i.purchaseUom && i.purchaseFactor) base.push({ uom: i.purchaseUom, factor: i.purchaseFactor, use: "Purchase" });
  if (i.code.startsWith("RM-BAR")) base.push({ uom: "m", factor: 6.31, use: "Cutting (kg per metre)" });
  if (i.type === "fg") base.push({ uom: "box", factor: i.code === "FG-MB-220" ? 50 : 20, use: "Sales packing" });
  return base;
};

const seedItems: StockItem[] = masterItems.map((i) => ({
  ...i,
  uoms: uomsFor(i),
  hasMovements: i.id !== "i8",
  variantNote: i.code === "FG-MB-220" ? "Variants: MB-220-ZN (zinc plated), MB-220-PC (powder coated)" : undefined,
  activities: [
    { id: "a1", at: "2026-04-02T10:00:00", user: "Rajesh Agarwal", kind: "created", text: "Imported from Tally masters (IMP-2026-0003)" },
    ...(i.type === "raw"
      ? [{ id: "a2", at: "2026-08-14T15:20:00", user: "Prakash Deshmukh", kind: "updated" as const, text: "Reorder level changed" }]
      : []),
  ],
}));

/* ---------------- Store ---------------- */

interface InventoryState {
  items: StockItem[];
  lots: Lot[];
  movements: Movement[];
  adjustments: Adjustment[];
  counts: CountSession[];
  saveItem: (it: StockItem, user: string) => StockItem;
  logItemNote: (id: string, user: string, text: string) => void;
  requestAdjustment: (a: Omit<Adjustment, "id" | "number" | "status" | "kind" | "date">) => Adjustment;
  postTransfer: (a: Omit<Adjustment, "id" | "number" | "status" | "kind" | "date">) => Adjustment;
  decideAdjustment: (id: string, approve: boolean, user: string) => void;
  setCountLine: (sid: string, lid: string, counted: number | null) => void;
  setCountBlind: (sid: string, blind: boolean) => void;
  addCountLine: (sid: string, itemId: string) => boolean;
  setCountStatus: (sid: string, status: CountSession["status"]) => void;
  postCount: (sid: string, user: string) => void;
  newCount: (warehouseId: string, user: string) => CountSession;
  /** Posts inward/outward stock from another module's document (GRN, job-work challan). */
  postMovement: (m: Omit<Movement, "id" | "at">) => void;
}

const stamp = () => `${TODAY}T${new Date().toTimeString().slice(0, 8)}`;

export function freeQty(lots: Lot[], itemId: string, wh: string, batch?: string) {
  return lots.filter((l) => l.itemId === itemId && l.warehouseId === wh && (batch === undefined || l.batch === batch)).reduce((a, l) => a + l.qty, 0);
}

function applyMove(lots: Lot[], itemId: string, wh: string, batch: string, delta: number, unitCost: number): Lot[] {
  const hit = lots.find((l) => l.itemId === itemId && l.warehouseId === wh && l.batch === batch);
  if (hit) return lots.map((l) => (l === hit ? { ...l, qty: l.qty + delta } : l));
  return [...lots, { id: `L${Date.now()}${Math.random().toString(36).slice(2, 5)}`, itemId, warehouseId: wh, batch, qty: delta, unitCost, receivedOn: TODAY }];
}

export const useInventory = create<InventoryState>()((set, get) => ({
  items: seedItems,
  lots: seedLots,
  movements: seedMovements,
  adjustments: seedAdjustments,
  counts: seedCounts,

  saveItem: (it, user) => {
    const exists = get().items.some((x) => x.id === it.id);
    const entry: Activity = { id: `a${Date.now()}`, at: stamp(), user, kind: exists ? "updated" : "created", text: exists ? "Item updated" : "Item created" };
    const saved = { ...it, activities: [entry, ...it.activities] };
    set((s) => ({ items: exists ? s.items.map((x) => (x.id === it.id ? saved : x)) : [saved, ...s.items] }));
    return saved;
  },
  logItemNote: (id, user, text) =>
    set((s) => ({
      items: s.items.map((x) => (x.id === id ? { ...x, activities: [{ id: `a${Date.now()}`, at: stamp(), user, kind: "note", text }, ...x.activities] } : x)),
    })),

  requestAdjustment: (a) => {
    const n = get().adjustments.filter((x) => x.kind === "adjustment").length + 41;
    const adj: Adjustment = { ...a, id: `a${Date.now()}`, number: `ADJ-2026-${String(n).padStart(4, "0")}`, kind: "adjustment", date: TODAY, status: "pending_approval" };
    set((s) => ({ adjustments: [adj, ...s.adjustments] }));
    return adj;
  },
  postTransfer: (a) => {
    const n = get().adjustments.filter((x) => x.kind === "transfer").length + 116;
    const t: Adjustment = { ...a, id: `t${Date.now()}`, number: `TRF-2026-${String(n).padStart(4, "0")}`, kind: "transfer", date: TODAY, status: "posted" };
    const cost = get().lots.find((l) => l.itemId === a.itemId && l.batch === a.batch)?.unitCost ?? 0;
    set((s) => {
      let lots = applyMove(s.lots, a.itemId, a.fromWh, a.batch, -a.qty, cost);
      lots = applyMove(lots, a.itemId, a.toWh!, a.batch, a.qty, cost);
      return {
        adjustments: [t, ...s.adjustments],
        lots,
        movements: [
          { id: `m${Date.now()}a`, at: stamp(), itemId: a.itemId, warehouseId: a.fromWh, batch: a.batch, type: "transfer_out", qty: -a.qty, unitCost: cost, doc: t.number, by: a.by },
          { id: `m${Date.now()}b`, at: stamp(), itemId: a.itemId, warehouseId: a.toWh!, batch: a.batch, type: "transfer_in", qty: a.qty, unitCost: cost, doc: t.number, by: a.by },
          ...s.movements,
        ],
      };
    });
    return t;
  },
  decideAdjustment: (id, approve, user) => {
    const a = get().adjustments.find((x) => x.id === id);
    if (!a) return;
    if (!approve) {
      set((s) => ({ adjustments: s.adjustments.map((x) => (x.id === id ? { ...x, status: "rejected", decidedBy: user } : x)) }));
      return;
    }
    const cost = get().lots.find((l) => l.itemId === a.itemId && l.batch === a.batch)?.unitCost ?? get().items.find((i) => i.id === a.itemId)!.avgCost;
    set((s) => ({
      adjustments: s.adjustments.map((x) => (x.id === id ? { ...x, status: "posted", decidedBy: user } : x)),
      lots: applyMove(s.lots, a.itemId, a.fromWh, a.batch, a.qty, cost),
      movements: [
        { id: `m${Date.now()}`, at: stamp(), itemId: a.itemId, warehouseId: a.fromWh, batch: a.batch, type: "adjustment", qty: a.qty, unitCost: cost, doc: a.number, by: a.by },
        ...s.movements,
      ],
    }));
  },

  setCountLine: (sid, lid, counted) =>
    set((s) => ({ counts: s.counts.map((c) => (c.id === sid ? { ...c, lines: c.lines.map((l) => (l.id === lid ? { ...l, counted } : l)) } : c)) })),
  setCountBlind: (sid, blind) => set((s) => ({ counts: s.counts.map((c) => (c.id === sid ? { ...c, blind } : c)) })),
  addCountLine: (sid, itemId) => {
    const c = get().counts.find((x) => x.id === sid)!;
    if (c.lines.some((l) => l.itemId === itemId)) return false;
    const lotsHere = get().lots.filter((l) => l.itemId === itemId && l.warehouseId === c.warehouseId);
    const system = lotsHere.reduce((a, l) => a + l.qty, 0);
    set((s) => ({
      counts: s.counts.map((x) =>
        x.id === sid ? { ...x, lines: [...x.lines, { id: `cl${Date.now()}`, itemId, batch: lotsHere[0]?.batch ?? "—", system, counted: null }] } : x,
      ),
    }));
    return true;
  },
  setCountStatus: (sid, status) => set((s) => ({ counts: s.counts.map((c) => (c.id === sid ? { ...c, status } : c)) })),
  postCount: (sid, user) => {
    const c = get().counts.find((x) => x.id === sid)!;
    set((s) => {
      let lots = s.lots;
      const moves: Movement[] = [];
      c.lines.forEach((l) => {
        const v = (l.counted ?? l.system) - l.system;
        if (!v) return;
        const cost = s.items.find((i) => i.id === l.itemId)!.avgCost;
        lots = applyMove(lots, l.itemId, c.warehouseId, l.batch, v, cost);
        moves.push({ id: `m${Date.now()}${l.id}`, at: stamp(), itemId: l.itemId, warehouseId: c.warehouseId, batch: l.batch, type: "count_variance", qty: v, unitCost: cost, doc: c.number, by: user });
      });
      return { lots, movements: [...moves, ...s.movements], counts: s.counts.map((x) => (x.id === sid ? { ...x, status: "posted" } : x)) };
    });
  },
  postMovement: (m) =>
    set((s) => ({
      lots: applyMove(s.lots, m.itemId, m.warehouseId, m.batch, m.qty, m.unitCost),
      movements: [{ ...m, id: `m${Date.now()}${Math.random().toString(36).slice(2, 6)}`, at: stamp() }, ...s.movements],
    })),
  newCount: (warehouseId, user) => {
    const n = get().counts.length + 13;
    const lines = get()
      .lots.filter((l) => l.warehouseId === warehouseId)
      .map((l, i) => ({ id: `cl${i}`, itemId: l.itemId, batch: l.batch, system: l.qty, counted: null }));
    const c: CountSession = { id: `c${Date.now()}`, number: `CNT-2026-${String(n).padStart(4, "0")}`, warehouseId, date: TODAY, status: "counting", blind: true, countedBy: user, lines };
    set((s) => ({ counts: [c, ...s.counts] }));
    return c;
  },
}));

/** Aggregate stock per item from lots. */
export function stockByItem(lots: Lot[], items: StockItem[]) {
  return items.map((i) => {
    const mine = lots.filter((l) => l.itemId === i.id && l.qty !== 0);
    // Free stock excludes QC hold, scrap and goods lying with job-workers.
    const own = mine.filter((l) => !["w4", "w5", "w6", "w7"].includes(l.warehouseId));
    const qcHold = mine.filter((l) => l.warehouseId === "w4").reduce((a, l) => a + l.qty, 0);
    const onHand = own.reduce((a, l) => a + l.qty, 0);
    const atJw = mine.filter((l) => ["w6", "w7"].includes(l.warehouseId)).reduce((a, l) => a + l.qty, 0);
    const value = mine.reduce((a, l) => a + l.qty * l.unitCost, 0);
    return { item: i, lots: mine, onHand, atJw, qcHold, reserved: i.reserved, free: onHand - i.reserved, value };
  });
}
