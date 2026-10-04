"use client";

import { create } from "zustand";
import type { Activity } from "@/components/erp/form-view";
import { itemById, items, operators, workCentres as wcSeed, type WorkCentre } from "@/lib/data/masters";
import { TODAY } from "@/lib/utils";

/* ============================ Types ============================ */

export interface BomLine {
  id: string;
  itemId: string;
  qty: number;
  scrapPct: number;
  issueMethod: "manual" | "backflush";
  alternate?: string;
}

export interface BomOutput {
  id: string;
  name: string;
  itemId?: string;
  qty: number;
  uom: string;
  isMain: boolean;
  costSharePct: number;
  recoveryRate?: number;
}

export interface RoutingOp {
  seq: number;
  name: string;
  nameHi: string;
  /** Work centre id, or "jw" for an outside job-work operation. */
  wcId: string;
  setupMin: number;
  runMin: number;
  jobWorker?: string;
}

export interface Bom {
  id: string;
  code: string;
  itemId: string;
  version: number;
  status: "active" | "obsolete" | "draft";
  qtyPer: number;
  lines: BomLine[];
  outputs: BomOutput[];
  routing: RoutingOp[];
  routingCode: string;
  effectiveFrom: string;
  notes?: string;
}

export type WOStatus = "draft" | "released" | "in_progress" | "completed" | "closed" | "cancelled";

export interface StockMove {
  id: string;
  at: string;
  type: "issue" | "backflush" | "fg_receipt" | "scrap" | "return";
  itemId: string;
  qty: number;
  warehouse: string;
}

export interface WorkOrder {
  id: string;
  number: string;
  itemId: string;
  qty: number;
  bomId: string;
  soId?: string;
  soNumber?: string;
  planId?: string;
  parentWo?: string;
  status: WOStatus;
  plannedStart: string;
  plannedEnd: string;
  warehouse: string;
  produced: number;
  rejected: number;
  issued: Record<string, number>;
  moves: StockMove[];
  activities: Activity[];
  closedVariance?: number;
}

export type JCStatus = "open" | "running" | "paused" | "completed";

export interface JobCard {
  id: string;
  number: string;
  woId: string;
  seq: number;
  wcId: string;
  operatorId?: string;
  status: JCStatus;
  qtyPlanned: number;
  good: number;
  reject: number;
  plannedMin: number;
  actualMin: number;
  startedAt?: string;
  lastEventAt?: string;
}

export interface PlanLine {
  id: string;
  soId: string;
  soNumber: string;
  customer: string;
  itemId: string;
  qty: number;
  due: string;
}

export interface Plan {
  id: string;
  number: string;
  date: string;
  status: "draft" | "confirmed" | "completed";
  createdBy: string;
  lines: PlanLine[];
  workOrders: string[];
  requisitions: Record<string, string>;
  activities: Activity[];
}

export interface ScrapEntry {
  id: string;
  number: string;
  date: string;
  type: "scrap" | "rework";
  woId: string;
  jcNumber?: string;
  itemId: string;
  qty: number;
  reason: string;
  wcId: string;
  operatorId?: string;
  note?: string;
}

export type ExceptionCode = "QTY_OVER_RELEASED" | "WO_CLOSED" | "SEQ_GAP" | "CLOCK_DRIFT";

export interface SyncException {
  id: string;
  eventId: string;
  terminal: string;
  deviceSeq: number;
  operatorId: string;
  jcNumber: string;
  eventType: "qty_report" | "job_start" | "job_stop" | "job_pause" | "correction";
  payload: string;
  deviceTime: string;
  receivedAt: string;
  code: ExceptionCode;
  detail: string;
  status: "exception" | "applied" | "voided";
  resolution?: string;
}

/* ============================ BOMs ============================ */

const op = (seq: number, name: string, nameHi: string, wcId: string, setupMin: number, runMin: number, jobWorker?: string): RoutingOp => ({
  seq, name, nameHi, wcId, setupMin, runMin, jobWorker,
});

const seedBoms: Bom[] = [
  {
    id: "b1", code: "BOM-DS450", itemId: "i9", version: 2, status: "active", qtyPer: 1, routingCode: "RT-DS450-v2", effectiveFrom: "2026-06-01",
    lines: [
      { id: "bl1", itemId: "i7", qty: 1, scrapPct: 0, issueMethod: "manual" },
      { id: "bl2", itemId: "i3", qty: 2, scrapPct: 0.5, issueMethod: "backflush", alternate: "BO-BRG-6204ZZ (approved alternate make)" },
      { id: "bl3", itemId: "i6", qty: 0.02, scrapPct: 0, issueMethod: "backflush" },
    ],
    outputs: [
      { id: "bo1", name: "Drive Shaft DS-450", itemId: "i9", qty: 1, uom: "nos", isMain: true, costSharePct: 100 },
      { id: "bo2", name: "MS turning swarf (by-product)", qty: 0.15, uom: "kg", isMain: false, costSharePct: 0, recoveryRate: 18 },
    ],
    routing: [
      op(10, "Finish turning", "फिनिश टर्निंग", "wc1", 30, 4.5),
      op(20, "Cross drilling", "क्रॉस ड्रिलिंग", "wc6", 15, 1.5),
      op(30, "Bearing press-fit, inspect & pack", "बेयरिंग फिट, निरीक्षण और पैकिंग", "wc7", 10, 1.2),
    ],
    notes: "Rev C drawing DS-450/03. Bearing press-fit with 2T arbor.",
  },
  {
    id: "b1v1", code: "BOM-DS450", itemId: "i9", version: 1, status: "obsolete", qtyPer: 1, routingCode: "RT-DS450-v1", effectiveFrom: "2025-11-01",
    lines: [
      { id: "bl1", itemId: "i1", qty: 4.6, scrapPct: 4, issueMethod: "manual" },
      { id: "bl2", itemId: "i3", qty: 2, scrapPct: 0.5, issueMethod: "backflush" },
    ],
    outputs: [{ id: "bo1", name: "Drive Shaft DS-450", itemId: "i9", qty: 1, uom: "nos", isMain: true, costSharePct: 100 }],
    routing: [
      op(10, "Rough + finish turning", "टर्निंग", "wc1", 40, 9.5),
      op(20, "Cross drilling", "क्रॉस ड्रिलिंग", "wc6", 15, 1.5),
      op(30, "Inspect & pack", "निरीक्षण और पैकिंग", "wc7", 10, 1.2),
    ],
    notes: "Single-piece flow from bar. Replaced by v2 (blank as sub-assembly).",
  },
  {
    id: "b2", code: "BOM-SHFBLK", itemId: "i7", version: 1, status: "active", qtyPer: 1, routingCode: "RT-SHFBLK-v1", effectiveFrom: "2026-06-01",
    lines: [{ id: "bl1", itemId: "i1", qty: 4.2, scrapPct: 3, issueMethod: "manual", alternate: "EN9 Ø32 with QA approval" }],
    outputs: [
      { id: "bo1", name: "Turned Shaft Blank", itemId: "i7", qty: 1, uom: "nos", isMain: true, costSharePct: 100 },
      { id: "bo2", name: "MS turning swarf (by-product)", qty: 0.6, uom: "kg", isMain: false, costSharePct: 0, recoveryRate: 18 },
    ],
    routing: [op(10, "Bar cut & rough turning", "बार कटिंग और रफ टर्निंग", "wc2", 20, 3.2)],
  },
  {
    id: "b3", code: "BOM-MB220", itemId: "i10", version: 2, status: "active", qtyPer: 1, routingCode: "RT-MB220-v2", effectiveFrom: "2026-04-15",
    lines: [
      { id: "bl1", itemId: "i2", qty: 1.15, scrapPct: 8, issueMethod: "manual" },
      { id: "bl2", itemId: "i4", qty: 2, scrapPct: 1, issueMethod: "backflush" },
      { id: "bl3", itemId: "i5", qty: 0.02, scrapPct: 0, issueMethod: "backflush" },
    ],
    outputs: [
      { id: "bo1", name: "Mounting Bracket MB-220", itemId: "i10", qty: 1, uom: "nos", isMain: true, costSharePct: 100 },
      { id: "bo2", name: "CRCA blanking skeleton (by-product)", qty: 0.09, uom: "kg", isMain: false, costSharePct: 0, recoveryRate: 32 },
    ],
    routing: [
      op(10, "Blank & form", "ब्लैंकिंग और फॉर्मिंग", "wc4", 45, 0.4),
      op(20, "Weld nut & stiffener", "वेल्डिंग", "wc5", 15, 1.2),
      op(30, "Drill mounting holes", "ड्रिलिंग", "wc6", 10, 0.6),
      op(40, "Zinc plating (job-work)", "ज़िंक प्लेटिंग (जॉब-वर्क)", "jw", 0, 0, "Shree Ganesh Plating Works"),
      op(50, "Inspect & pack", "निरीक्षण और पैकिंग", "wc7", 5, 0.3),
    ],
  },
  {
    id: "b3v1", code: "BOM-MB220", itemId: "i10", version: 1, status: "obsolete", qtyPer: 1, routingCode: "RT-MB220-v1", effectiveFrom: "2025-08-01",
    lines: [
      { id: "bl1", itemId: "i2", qty: 1.3, scrapPct: 10, issueMethod: "manual" },
      { id: "bl2", itemId: "i4", qty: 2, scrapPct: 1, issueMethod: "manual" },
    ],
    outputs: [{ id: "bo1", name: "Mounting Bracket MB-220", itemId: "i10", qty: 1, uom: "nos", isMain: true, costSharePct: 100 }],
    routing: [
      op(10, "Blank & form", "ब्लैंकिंग और फॉर्मिंग", "wc4", 60, 0.5),
      op(20, "Weld", "वेल्डिंग", "wc5", 15, 1.4),
      op(30, "Inspect & pack", "निरीक्षण और पैकिंग", "wc7", 5, 0.3),
    ],
  },
  {
    id: "b4", code: "BOM-PA110", itemId: "i11", version: 2, status: "active", qtyPer: 1, routingCode: "RT-PA110-v2", effectiveFrom: "2026-07-10",
    lines: [
      { id: "bl1", itemId: "i13", qty: 1, scrapPct: 2, issueMethod: "manual" },
      { id: "bl2", itemId: "i3", qty: 2, scrapPct: 0.5, issueMethod: "backflush", alternate: "BO-BRG-6204ZZ (approved alternate make)" },
      { id: "bl3", itemId: "i4", qty: 4, scrapPct: 1, issueMethod: "backflush" },
    ],
    outputs: [{ id: "bo1", name: "Pulley Assembly PA-110", itemId: "i11", qty: 1, uom: "nos", isMain: true, costSharePct: 100 }],
    routing: [
      op(10, "Bore & face casting", "बोरिंग और फेसिंग", "wc1", 25, 6),
      op(20, "Keyway milling", "कीवे मिलिंग", "wc3", 20, 3),
      op(30, "Assemble & inspect", "असेंबली और निरीक्षण", "wc7", 10, 2),
    ],
  },
  {
    id: "b5", code: "BOM-FC75", itemId: "i12", version: 1, status: "active", qtyPer: 1, routingCode: "RT-FC75-v1", effectiveFrom: "2026-01-05",
    lines: [
      { id: "bl1", itemId: "i1", qty: 1.8, scrapPct: 3, issueMethod: "manual" },
      { id: "bl2", itemId: "i4", qty: 4, scrapPct: 1, issueMethod: "backflush" },
    ],
    outputs: [
      { id: "bo1", name: "Flange Coupling FC-75", itemId: "i12", qty: 1, uom: "nos", isMain: true, costSharePct: 100 },
      { id: "bo2", name: "MS turning swarf (by-product)", qty: 0.3, uom: "kg", isMain: false, costSharePct: 0, recoveryRate: 18 },
    ],
    routing: [
      op(10, "Turn flange", "फ्लैंज टर्निंग", "wc2", 20, 3.5),
      op(20, "PCD drilling", "पीसीडी ड्रिलिंग", "wc6", 15, 1.8),
      op(30, "Inspect & pack", "निरीक्षण और पैकिंग", "wc7", 5, 0.5),
    ],
  },
];

/* ============================ Helpers ============================ */

export const activeBomFor = (itemId: string, boms: Bom[]) => boms.find((b) => b.itemId === itemId && b.status === "active");

/** Open purchase-order quantities by item (from purchase module, mocked). */
export const ON_ORDER: Record<string, number> = { i1: 300, i3: 200, i13: 20, i5: 500 };

/** Standard lot size used to spread setup time (arch §12.3). */
export const LOT = 100;

export interface CostBreakup {
  material: number;
  labour: number;
  overhead: number;
  scrap: number;
  jobwork: number;
  byproduct: number;
  total: number;
}

/** Standard cost per unit, rolled up recursively through sub-assembly BOMs. */
export function stdCost(bom: Bom, boms: Bom[], depth = 0): CostBreakup {
  let material = 0;
  let scrap = 0;
  bom.lines.forEach((l) => {
    const sub = depth < 4 ? activeBomFor(l.itemId, boms) : undefined;
    const unit = sub ? stdCost(sub, boms, depth + 1).total : itemById(l.itemId).standardCost;
    material += l.qty * unit;
    scrap += l.qty * (l.scrapPct / 100) * unit;
  });
  let labour = 0;
  let overhead = 0;
  let jobwork = 0;
  bom.routing.forEach((r) => {
    if (r.wcId === "jw") {
      jobwork += 6.5; // plating charge per piece
      return;
    }
    const wc = wcSeed.find((w) => w.id === r.wcId)!;
    const hrs = (r.setupMin / LOT + r.runMin) / 60;
    labour += hrs * wc.labourRate;
    overhead += hrs * wc.overheadRate;
  });
  const byproduct = bom.outputs.filter((o) => !o.isMain).reduce((a, o) => a + o.qty * (o.recoveryRate ?? 0), 0);
  const total = material + scrap + labour + overhead + jobwork - byproduct;
  return { material, labour, overhead, scrap, jobwork, byproduct, total };
}

export interface ExplosionNode {
  key: string;
  itemId: string;
  level: number;
  required: number;
  available: number;
  onOrder: number;
  shortage: number;
  make: boolean;
  toMake: number;
  bomCode?: string;
  bomVersion?: number;
  children: ExplosionNode[];
}

/**
 * Multi-level BOM explosion with netting (arch §6.1): required → net against free stock,
 * then open purchase orders; manufactured components explode for their net make quantity.
 * Free stock is allocated across the whole plan in order, so the same component is not double-counted.
 */
export function explodePlan(plan: Plan, boms: Bom[]): ExplosionNode[] {
  const free: Record<string, number> = {};
  const ord: Record<string, number> = { ...ON_ORDER };
  items.forEach((i) => (free[i.id] = Math.max(0, i.onHand - i.reserved)));

  const node = (itemId: string, rawRequired: number, level: number, key: string, isTop: boolean): ExplosionNode => {
    const unit = itemById(itemId).uom;
    const required = unit === "nos" ? Math.ceil(rawRequired - 1e-9) : Math.round(rawRequired * 100) / 100;
    const bom = activeBomFor(itemId, boms);
    const avail = isTop ? 0 : Math.min(free[itemId] ?? 0, required);
    if (!isTop) free[itemId] = (free[itemId] ?? 0) - avail;
    const net = required - avail;
    if (bom) {
      const children = bom.lines.map((l, i) => node(l.itemId, net * l.qty * (1 + l.scrapPct / 100), level + 1, `${key}.${i}`, false));
      return { key, itemId, level, required, available: avail, onOrder: 0, shortage: 0, make: true, toMake: net, bomCode: bom.code, bomVersion: bom.version, children };
    }
    const oo = Math.min(ord[itemId] ?? 0, net);
    ord[itemId] = (ord[itemId] ?? 0) - oo;
    return { key, itemId, level, required, available: avail, onOrder: oo, shortage: Math.max(0, net - oo), make: false, toMake: 0, children: [] };
  };

  return plan.lines.map((l, i) => node(l.itemId, l.qty, 0, `n${i}`, true));
}

export function flatten(nodes: ExplosionNode[]): ExplosionNode[] {
  return nodes.flatMap((n) => [n, ...flatten(n.children)]);
}

export function woRequired(wo: WorkOrder, bom: Bom) {
  return bom.lines.map((l) => ({ line: l, required: +(wo.qty * l.qty * (1 + l.scrapPct / 100)).toFixed(2) }));
}

/** Standard vs actual cost of a work order (arch §12.3). */
export function woCosting(wo: WorkOrder, boms: Bom[], jcs: JobCard[]) {
  const bom = boms.find((b) => b.id === wo.bomId)!;
  const std = stdCost(bom, boms);
  const basis = Math.max(wo.produced, 0);
  const standard: CostBreakup = {
    material: std.material * basis,
    labour: std.labour * basis,
    overhead: std.overhead * basis,
    scrap: std.scrap * basis,
    jobwork: std.jobwork * basis,
    byproduct: std.byproduct * basis,
    total: std.total * basis,
  };
  let material = 0;
  Object.entries(wo.issued).forEach(([itemId, q]) => {
    const sub = activeBomFor(itemId, boms);
    const unit = sub ? stdCost(sub, boms).total * 1.02 : itemById(itemId).avgCost || itemById(itemId).standardCost;
    material += q * unit;
  });
  let labour = 0;
  let overhead = 0;
  jcs.filter((j) => j.woId === wo.id).forEach((j) => {
    const wc = wcSeed.find((w) => w.id === j.wcId);
    if (!wc) return;
    labour += (j.actualMin / 60) * wc.labourRate;
    overhead += (j.actualMin / 60) * wc.overheadRate;
  });
  const scrap = wo.rejected * (std.material + std.labour * 0.5);
  const jobwork = bom.routing.some((r) => r.wcId === "jw") ? wo.produced * 6.8 : 0;
  const byproduct = standard.byproduct;
  const actual: CostBreakup = { material, labour, overhead, scrap, jobwork, byproduct, total: material + labour + overhead + scrap + jobwork - byproduct };
  return { standard, actual, unitStd: std.total };
}

/* ============================ Seed: work orders ============================ */

const act = (id: string, at: string, user: string, kind: Activity["kind"], text: string, device = "Chrome · Windows"): Activity => ({ id, at, user, kind, text, device });

const wo = (w: Omit<WorkOrder, "moves" | "activities" | "issued"> & { issued?: Record<string, number>; activities?: Activity[]; moves?: StockMove[] }): WorkOrder => ({
  issued: {},
  moves: [],
  activities: [],
  ...w,
});

const seedWOs: WorkOrder[] = [
  wo({
    id: "wo176", number: "WO-2026-00176", itemId: "i10", qty: 1500, bomId: "b3", soId: "so6", soNumber: "SO-2026-00226", status: "closed",
    plannedStart: "2026-09-03", plannedEnd: "2026-09-16", warehouse: "FGS", produced: 1500, rejected: 21, issued: { i2: 1860, i4: 3030, i5: 30 }, closedVariance: 3.4,
    activities: [act("a1", "2026-09-17T18:10:00", "Prakash Deshmukh", "status", "Closed · cost frozen · variance +3.4% vs standard")],
  }),
  wo({
    id: "wo179", number: "WO-2026-00179", itemId: "i9", qty: 800, bomId: "b1", soId: "so7", soNumber: "SO-2026-00228", status: "completed",
    plannedStart: "2026-09-09", plannedEnd: "2026-09-24", warehouse: "FGS", produced: 800, rejected: 12, issued: { i7: 812, i3: 1608, i6: 16 },
    activities: [act("a1", "2026-09-25T15:30:00", "Prakash Deshmukh", "status", "Completed · 800 good, 12 rejected")],
  }),
  wo({
    id: "wo180", number: "WO-2026-00180", itemId: "i12", qty: 400, bomId: "b5", soId: "so8", soNumber: "SO-2026-00229", status: "closed",
    plannedStart: "2026-09-11", plannedEnd: "2026-09-22", warehouse: "FGS", produced: 400, rejected: 6, issued: { i1: 745, i4: 1616 }, closedVariance: -1.2,
    activities: [act("a1", "2026-09-23T11:00:00", "Prakash Deshmukh", "status", "Closed · variance −1.2% vs standard")],
  }),
  wo({
    id: "wo183", number: "WO-2026-00183", itemId: "i7", qty: 650, bomId: "b2", parentWo: "WO-2026-00184", planId: "pp47", status: "completed",
    plannedStart: "2026-09-19", plannedEnd: "2026-09-25", warehouse: "WIP", produced: 642, rejected: 8, issued: { i1: 2812 },
    activities: [act("a1", "2026-09-25T17:40:00", "Prakash Deshmukh", "status", "Completed · 642 blanks to WIP store")],
  }),
  wo({
    id: "wo184", number: "WO-2026-00184", itemId: "i9", qty: 600, bomId: "b1", soId: "so1", soNumber: "SO-2026-00231", planId: "pp47", status: "in_progress",
    plannedStart: "2026-09-22", plannedEnd: "2026-10-06", warehouse: "FGS", produced: 412, rejected: 7, issued: { i7: 440, i3: 838, i6: 8.4 },
    moves: [
      { id: "m1", at: "2026-09-22T08:10:00", type: "issue", itemId: "i7", qty: 300, warehouse: "WIP" },
      { id: "m2", at: "2026-09-29T08:05:00", type: "issue", itemId: "i7", qty: 140, warehouse: "WIP" },
      { id: "m3", at: "2026-10-01T15:30:00", type: "backflush", itemId: "i3", qty: 838, warehouse: "RMS" },
      { id: "m4", at: "2026-10-01T15:30:00", type: "fg_receipt", itemId: "i9", qty: 412, warehouse: "FGS" },
      { id: "m5", at: "2026-10-01T15:31:00", type: "scrap", itemId: "i9", qty: 7, warehouse: "SCR" },
    ],
    activities: [
      act("a3", "2026-10-02T13:58:00", "Ramesh Yadav", "system", "Reported 48 good, 1 reject on JC-2026-00412", "Terminal TAB-CNC-01 · Android"),
      act("a2", "2026-09-22T08:10:00", "Santosh Kale", "status", "Materials issued · 300 shaft blanks from WIP store"),
      act("a1", "2026-09-19T09:05:00", "Prakash Deshmukh", "created", "Created from production plan PP-2026-0047 · BOM v2 pinned"),
    ],
  }),
  wo({
    id: "wo185", number: "WO-2026-00185", itemId: "i11", qty: 120, bomId: "b4", soId: "so1", soNumber: "SO-2026-00231", planId: "pp47", status: "released",
    plannedStart: "2026-10-05", plannedEnd: "2026-10-07", warehouse: "FGS", produced: 0, rejected: 0,
    activities: [act("a1", "2026-09-19T09:05:00", "Prakash Deshmukh", "created", "Created from production plan PP-2026-0047 · released")],
  }),
  wo({
    id: "wo186", number: "WO-2026-00186", itemId: "i7", qty: 300, bomId: "b2", parentWo: "WO-2026-00184", planId: "pp47", status: "in_progress",
    plannedStart: "2026-09-30", plannedEnd: "2026-10-03", warehouse: "WIP", produced: 168, rejected: 3, issued: { i1: 1300 },
    activities: [act("a1", "2026-09-30T08:00:00", "Prakash Deshmukh", "status", "Started · top-up blanks for WO-2026-00184")],
  }),
  wo({
    id: "wo187", number: "WO-2026-00187", itemId: "i10", qty: 2000, bomId: "b3", soId: "so2", soNumber: "SO-2026-00232", planId: "pp48", status: "in_progress",
    plannedStart: "2026-09-24", plannedEnd: "2026-10-01", warehouse: "FGS", produced: 1250, rejected: 19, issued: { i2: 2484, i4: 2525, i5: 25 },
    activities: [
      act("a2", "2026-10-02T08:30:00", "System", "system", "Sync exception on JC-2026-00409 · quantity over released"),
      act("a1", "2026-09-22T10:00:00", "Prakash Deshmukh", "created", "Created from production plan PP-2026-0048"),
    ],
  }),
  wo({
    id: "wo189", number: "WO-2026-00189", itemId: "i11", qty: 200, bomId: "b4", soId: "so4", soNumber: "SO-2026-00234", planId: "pp49", status: "released",
    plannedStart: "2026-10-08", plannedEnd: "2026-10-14", warehouse: "FGS", produced: 0, rejected: 0,
    activities: [act("a1", "2026-10-02T12:10:00", "Prakash Deshmukh", "status", "Released · shortage: pulley casting 32 nos (PR raised)")],
  }),
  wo({
    id: "wo191", number: "WO-2026-00191", itemId: "i12", qty: 300, bomId: "b5", status: "draft",
    plannedStart: "2026-10-12", plannedEnd: "2026-10-16", warehouse: "FGS", produced: 0, rejected: 0,
    activities: [act("a1", "2026-10-02T10:20:00", "Prakash Deshmukh", "created", "Draft · make-to-stock for Narmada forecast")],
  }),
];

/* ============================ Seed: job cards ============================ */

const jc = (j: Omit<JobCard, "id">): JobCard => ({ id: j.number.toLowerCase(), ...j });

const seedJCs: JobCard[] = [
  // WO-184 DS-450
  jc({ number: "JC-2026-00412", woId: "wo184", seq: 10, wcId: "wc1", operatorId: "o1", status: "running", qtyPlanned: 600, good: 412, reject: 7, plannedMin: 2730, actualMin: 2010, startedAt: "2026-10-02T07:05:00", lastEventAt: "2026-10-02T13:58:00" }),
  jc({ number: "JC-2026-00420", woId: "wo184", seq: 20, wcId: "wc6", operatorId: "o3", status: "running", qtyPlanned: 600, good: 388, reject: 2, plannedMin: 915, actualMin: 640, startedAt: "2026-10-02T07:20:00", lastEventAt: "2026-10-02T13:40:00" }),
  jc({ number: "JC-2026-00421", woId: "wo184", seq: 30, wcId: "wc7", status: "open", qtyPlanned: 600, good: 360, reject: 0, plannedMin: 730, actualMin: 455 }),
  // WO-186 blanks
  jc({ number: "JC-2026-00415", woId: "wo186", seq: 10, wcId: "wc2", operatorId: "o4", status: "running", qtyPlanned: 300, good: 168, reject: 3, plannedMin: 980, actualMin: 560, startedAt: "2026-10-02T07:10:00", lastEventAt: "2026-10-02T13:30:00" }),
  // WO-187 MB-220
  jc({ number: "JC-2026-00418", woId: "wo187", seq: 10, wcId: "wc4", operatorId: "o5", status: "running", qtyPlanned: 2000, good: 1820, reject: 11, plannedMin: 845, actualMin: 790, startedAt: "2026-10-02T07:00:00", lastEventAt: "2026-10-02T13:50:00" }),
  jc({ number: "JC-2026-00409", woId: "wo187", seq: 20, wcId: "wc5", operatorId: "o5", status: "paused", qtyPlanned: 2000, good: 1480, reject: 6, plannedMin: 2415, actualMin: 1890, startedAt: "2026-09-29T07:00:00", lastEventAt: "2026-10-02T08:30:00" }),
  jc({ number: "JC-2026-00410", woId: "wo187", seq: 30, wcId: "wc6", operatorId: "o2", status: "paused", qtyPlanned: 2000, good: 1300, reject: 2, plannedMin: 1210, actualMin: 820, startedAt: "2026-09-30T07:00:00", lastEventAt: "2026-10-01T15:20:00" }),
  jc({ number: "JC-2026-00411", woId: "wo187", seq: 40, wcId: "jw", status: "running", qtyPlanned: 2000, good: 1250, reject: 0, plannedMin: 0, actualMin: 0 }),
  jc({ number: "JC-2026-00413", woId: "wo187", seq: 50, wcId: "wc7", operatorId: "o6", status: "open", qtyPlanned: 2000, good: 1250, reject: 0, plannedMin: 605, actualMin: 390 }),
  // WO-185 PA-110 released
  jc({ number: "JC-2026-00423", woId: "wo185", seq: 10, wcId: "wc1", status: "open", qtyPlanned: 120, good: 0, reject: 0, plannedMin: 745, actualMin: 0 }),
  jc({ number: "JC-2026-00424", woId: "wo185", seq: 20, wcId: "wc3", status: "open", qtyPlanned: 120, good: 0, reject: 0, plannedMin: 380, actualMin: 0 }),
  jc({ number: "JC-2026-00425", woId: "wo185", seq: 30, wcId: "wc7", status: "open", qtyPlanned: 120, good: 0, reject: 0, plannedMin: 250, actualMin: 0 }),
  // WO-189 PA-110 released today
  jc({ number: "JC-2026-00426", woId: "wo189", seq: 10, wcId: "wc1", status: "open", qtyPlanned: 200, good: 0, reject: 0, plannedMin: 1225, actualMin: 0 }),
  jc({ number: "JC-2026-00427", woId: "wo189", seq: 20, wcId: "wc3", status: "open", qtyPlanned: 200, good: 0, reject: 0, plannedMin: 620, actualMin: 0 }),
  jc({ number: "JC-2026-00428", woId: "wo189", seq: 30, wcId: "wc7", status: "open", qtyPlanned: 200, good: 0, reject: 0, plannedMin: 410, actualMin: 0 }),
  // completed WOs
  jc({ number: "JC-2026-00396", woId: "wo179", seq: 10, wcId: "wc1", operatorId: "o1", status: "completed", qtyPlanned: 800, good: 805, reject: 9, plannedMin: 3630, actualMin: 3810 }),
  jc({ number: "JC-2026-00397", woId: "wo179", seq: 20, wcId: "wc6", operatorId: "o3", status: "completed", qtyPlanned: 800, good: 802, reject: 3, plannedMin: 1215, actualMin: 1180 }),
  jc({ number: "JC-2026-00398", woId: "wo179", seq: 30, wcId: "wc7", operatorId: "o6", status: "completed", qtyPlanned: 800, good: 800, reject: 0, plannedMin: 970, actualMin: 1010 }),
  jc({ number: "JC-2026-00401", woId: "wo183", seq: 10, wcId: "wc2", operatorId: "o4", status: "completed", qtyPlanned: 650, good: 642, reject: 8, plannedMin: 2100, actualMin: 2240 }),
  jc({ number: "JC-2026-00380", woId: "wo176", seq: 10, wcId: "wc4", operatorId: "o5", status: "completed", qtyPlanned: 1500, good: 1512, reject: 14, plannedMin: 645, actualMin: 690 }),
  jc({ number: "JC-2026-00381", woId: "wo176", seq: 20, wcId: "wc5", operatorId: "o5", status: "completed", qtyPlanned: 1500, good: 1505, reject: 7, plannedMin: 1815, actualMin: 1900 }),
  jc({ number: "JC-2026-00382", woId: "wo176", seq: 50, wcId: "wc7", operatorId: "o6", status: "completed", qtyPlanned: 1500, good: 1500, reject: 0, plannedMin: 455, actualMin: 470 }),
  jc({ number: "JC-2026-00388", woId: "wo180", seq: 10, wcId: "wc2", operatorId: "o4", status: "completed", qtyPlanned: 400, good: 403, reject: 5, plannedMin: 1420, actualMin: 1380 }),
  jc({ number: "JC-2026-00389", woId: "wo180", seq: 20, wcId: "wc6", operatorId: "o2", status: "completed", qtyPlanned: 400, good: 401, reject: 1, plannedMin: 735, actualMin: 720 }),
];

/* ============================ Seed: plans, scrap, exceptions ============================ */

const seedPlans: Plan[] = [
  {
    id: "pp49", number: "PP-2026-0049", date: "2026-10-02", status: "confirmed", createdBy: "Prakash Deshmukh",
    lines: [{ id: "pl1", soId: "so4", soNumber: "SO-2026-00234", customer: "Kaveri Engineering Works", itemId: "i11", qty: 200, due: "2026-10-20" }],
    workOrders: ["WO-2026-00189"], requisitions: { i13: "PR-2026-00094" },
    activities: [act("a1", "2026-10-02T12:05:00", "Prakash Deshmukh", "created", "Plan generated from SO-2026-00234 · 1 shortage")],
  },
  {
    id: "pp50", number: "PP-2026-0050", date: "2026-10-02", status: "draft", createdBy: "Prakash Deshmukh",
    lines: [
      { id: "pl1", soId: "so3", soNumber: "SO-2026-00233", customer: "Sahyadri Tractors Pvt Ltd", itemId: "i12", qty: 300, due: "2026-10-12" },
      { id: "pl2", soId: "so3", soNumber: "SO-2026-00233", customer: "Sahyadri Tractors Pvt Ltd", itemId: "i9", qty: 150, due: "2026-10-12" },
      { id: "pl3", soId: "so5", soNumber: "SO-2026-00235", customer: "Narmada Pumps & Valves", itemId: "i11", qty: 60, due: "2026-10-25" },
    ],
    workOrders: [], requisitions: {},
    activities: [act("a1", "2026-10-02T13:15:00", "Prakash Deshmukh", "created", "Draft plan · 3 demand lines from 2 sales orders")],
  },
  {
    id: "pp48", number: "PP-2026-0048", date: "2026-09-22", status: "confirmed", createdBy: "Prakash Deshmukh",
    lines: [{ id: "pl1", soId: "so2", soNumber: "SO-2026-00232", customer: "Varun Auto Components Ltd", itemId: "i10", qty: 2000, due: "2026-10-15" }],
    workOrders: ["WO-2026-00187"], requisitions: {},
    activities: [act("a1", "2026-09-22T10:00:00", "Prakash Deshmukh", "created", "Plan generated · no shortages")],
  },
  {
    id: "pp47", number: "PP-2026-0047", date: "2026-09-19", status: "confirmed", createdBy: "Prakash Deshmukh",
    lines: [
      { id: "pl1", soId: "so1", soNumber: "SO-2026-00231", customer: "Deccan Motors Ltd", itemId: "i9", qty: 600, due: "2026-10-08" },
      { id: "pl2", soId: "so1", soNumber: "SO-2026-00231", customer: "Deccan Motors Ltd", itemId: "i11", qty: 120, due: "2026-10-08" },
    ],
    workOrders: ["WO-2026-00183", "WO-2026-00184", "WO-2026-00185", "WO-2026-00186"], requisitions: { i1: "PR-2026-00088", i3: "PR-2026-00089" },
    activities: [act("a1", "2026-09-19T09:05:00", "Prakash Deshmukh", "created", "Plan generated from SO-2026-00231 · 2 shortages · 4 work orders")],
  },
  {
    id: "pp45", number: "PP-2026-0045", date: "2026-09-08", status: "completed", createdBy: "Prakash Deshmukh",
    lines: [{ id: "pl1", soId: "so7", soNumber: "SO-2026-00228", customer: "Varun Auto Components Ltd", itemId: "i9", qty: 800, due: "2026-09-30" }],
    workOrders: ["WO-2026-00179"], requisitions: {},
    activities: [act("a1", "2026-09-08T11:00:00", "Prakash Deshmukh", "created", "Plan generated")],
  },
];

const seedScrap: ScrapEntry[] = [
  { id: "s1", number: "SCR-2026-0142", date: "2026-10-02", type: "scrap", woId: "wo184", jcNumber: "JC-2026-00412", itemId: "i9", qty: 1, reason: "DIM", wcId: "wc1", operatorId: "o1", note: "OD 31.94 below tolerance" },
  { id: "s2", number: "SCR-2026-0141", date: "2026-10-02", type: "rework", woId: "wo187", jcNumber: "JC-2026-00418", itemId: "i10", qty: 6, reason: "SUR", wcId: "wc4", operatorId: "o5", note: "Burr on edge — deburr and re-inspect" },
  { id: "s3", number: "SCR-2026-0140", date: "2026-10-01", type: "scrap", woId: "wo187", jcNumber: "JC-2026-00418", itemId: "i10", qty: 5, reason: "SET", wcId: "wc4", operatorId: "o5" },
  { id: "s4", number: "SCR-2026-0139", date: "2026-10-01", type: "scrap", woId: "wo186", jcNumber: "JC-2026-00415", itemId: "i7", qty: 3, reason: "TOOL", wcId: "wc2", operatorId: "o4", note: "Insert broke mid-cut" },
  { id: "s5", number: "SCR-2026-0138", date: "2026-09-30", type: "scrap", woId: "wo184", jcNumber: "JC-2026-00420", itemId: "i9", qty: 2, reason: "MAT", wcId: "wc6", operatorId: "o3", note: "Blow hole after drilling" },
  { id: "s6", number: "SCR-2026-0137", date: "2026-09-29", type: "rework", woId: "wo187", jcNumber: "JC-2026-00409", itemId: "i10", qty: 12, reason: "SUR", wcId: "wc5", operatorId: "o5", note: "Weld spatter — grind" },
  { id: "s7", number: "SCR-2026-0136", date: "2026-09-28", type: "scrap", woId: "wo184", jcNumber: "JC-2026-00412", itemId: "i9", qty: 4, reason: "DIM", wcId: "wc1", operatorId: "o1" },
];

const seedExceptions: SyncException[] = [
  {
    id: "x1", eventId: "0192a6c4-7e1f-7b3a-9d10-4f2c8a1e5b77", terminal: "TAB-WLD-01", deviceSeq: 1184, operatorId: "o5", jcNumber: "JC-2026-00409", eventType: "qty_report",
    payload: "Good 560 · Reject 2", deviceTime: "2026-10-02T08:24:00", receivedAt: "2026-10-02T08:30:12", code: "QTY_OVER_RELEASED",
    detail: "Good 1,480 + 560 = 2,040 exceeds released 2,000 (+1% tolerance = 2,020)", status: "exception",
  },
  {
    id: "x2", eventId: "0192a6c4-81aa-74d0-b2e3-91f0c3d7a412", terminal: "TAB-WLD-01", deviceSeq: 1185, operatorId: "o5", jcNumber: "JC-2026-00409", eventType: "job_stop",
    payload: "Stop after 3 h 10 min", deviceTime: "2026-10-02T08:25:00", receivedAt: "2026-10-02T08:30:12", code: "QTY_OVER_RELEASED",
    detail: "Held behind seq 1184, which is in exception", status: "exception",
  },
  {
    id: "x3", eventId: "0192a3f1-1c02-7a55-8e6b-2d4f7a9c0e31", terminal: "TAB-DRL-01", deviceSeq: 902, operatorId: "o2", jcNumber: "JC-2026-00389", eventType: "qty_report",
    payload: "Good 12 · Reject 0", deviceTime: "2026-09-30T16:40:00", receivedAt: "2026-10-01T07:02:44", code: "WO_CLOSED",
    detail: "WO-2026-00180 was closed on 23-Sep-2026; cost is frozen", status: "applied", resolution: "Reassigned to JC-2026-00410 by Prakash Deshmukh",
  },
  {
    id: "x4", eventId: "0192a2b0-55e9-7f13-a0c4-6b8e2f1d9a05", terminal: "TAB-PCK-01", deviceSeq: 455, operatorId: "o6", jcNumber: "JC-2026-00413", eventType: "job_start",
    payload: "Start", deviceTime: "2026-09-26T11:02:00", receivedAt: "2026-10-01T15:47:09", code: "CLOCK_DRIFT",
    detail: "Device clock 5 days behind server at sync (limit 24 h)", status: "voided", resolution: "Voided by Prakash Deshmukh — duplicate start",
  },
];

/* ============================ Store ============================ */

interface MfgState {
  boms: Bom[];
  wos: WorkOrder[];
  jcs: JobCard[];
  plans: Plan[];
  scrap: ScrapEntry[];
  exceptions: SyncException[];
  wcs: WorkCentre[];
  nextWo: number;
  nextJc: number;
  nextPr: number;
  nextScrap: number;
  nextPlan: number;

  woLog: (id: string, user: string, kind: Activity["kind"], text: string) => void;
  setWoStatus: (id: string, status: WOStatus, user: string, text: string) => void;
  releaseWo: (id: string, user: string) => void;
  issueMaterials: (id: string, qty: Record<string, number>, user: string) => void;
  reportProduction: (id: string, good: number, reject: number, reason: string, user: string) => void;
  closeWo: (id: string, variancePct: number, user: string) => void;

  createPR: (planId: string, itemIds: string[], user: string) => string[];
  createPlanWOs: (planId: string, user: string) => string[];
  planLog: (id: string, user: string, kind: Activity["kind"], text: string) => void;

  newBomVersion: (bomId: string, user: string) => string;
  activateBom: (bomId: string) => void;

  setWcStatus: (wcId: string, status: WorkCentre["status"], reason?: string) => void;
  addScrap: (e: Omit<ScrapEntry, "id" | "number">) => string;
  resolveException: (id: string, status: "applied" | "voided", resolution: string, reassignTo?: string) => void;
}

const nowIso = () => `${TODAY}T${new Date().toTimeString().slice(0, 8)}`;
const pad = (n: number, w = 5) => String(n).padStart(w, "0");

export const useMfg = create<MfgState>()((set, get) => ({
  boms: seedBoms,
  wos: seedWOs,
  jcs: seedJCs,
  plans: seedPlans,
  scrap: seedScrap,
  exceptions: seedExceptions,
  wcs: wcSeed.map((w) => ({ ...w })),
  nextWo: 192,
  nextJc: 429,
  nextPr: 95,
  nextScrap: 143,
  nextPlan: 51,

  woLog: (id, user, kind, text) =>
    set((s) => ({ wos: s.wos.map((w) => (w.id === id ? { ...w, activities: [act(`a${Date.now()}`, nowIso(), user, kind, text), ...w.activities] } : w)) })),

  setWoStatus: (id, status, user, text) => {
    set((s) => ({ wos: s.wos.map((w) => (w.id === id ? { ...w, status } : w)) }));
    get().woLog(id, user, "status", text);
  },

  releaseWo: (id, user) => {
    const w = get().wos.find((x) => x.id === id)!;
    const bom = get().boms.find((b) => b.id === w.bomId)!;
    let n = get().nextJc;
    const existing = get().jcs.some((j) => j.woId === id);
    const newJcs: JobCard[] = existing
      ? []
      : bom.routing.map((r) => {
          const number = `JC-2026-${pad(n++)}`;
          return {
            id: number.toLowerCase(), number, woId: id, seq: r.seq, wcId: r.wcId, status: "open" as JCStatus,
            qtyPlanned: w.qty, good: 0, reject: 0, plannedMin: Math.round(r.setupMin + r.runMin * w.qty), actualMin: 0,
          };
        });
    set((s) => ({ jcs: [...s.jcs, ...newJcs], nextJc: n, wos: s.wos.map((x) => (x.id === id ? { ...x, status: "released" } : x)) }));
    get().woLog(id, user, "status", `Released · ${newJcs.length || "existing"} job cards for ${bom.routing.length} operations · BOM ${bom.code} v${bom.version} pinned`);
  },

  issueMaterials: (id, qty, user) => {
    const at = nowIso();
    set((s) => ({
      wos: s.wos.map((w) => {
        if (w.id !== id) return w;
        const issued = { ...w.issued };
        const moves = [...w.moves];
        Object.entries(qty).forEach(([itemId, q]) => {
          if (q <= 0) return;
          issued[itemId] = +((issued[itemId] ?? 0) + q).toFixed(2);
          moves.push({ id: `m${Date.now()}${itemId}`, at, type: "issue", itemId, qty: q, warehouse: itemById(itemId).type === "wip" ? "WIP" : "RMS" });
        });
        return { ...w, issued, moves };
      }),
    }));
    const lines = Object.entries(qty).filter(([, q]) => q > 0);
    get().woLog(id, user, "status", `Issued ${lines.length} component(s): ${lines.map(([i, q]) => `${q} ${itemById(i).uom} ${itemById(i).code}`).join(", ")}`);
  },

  reportProduction: (id, good, reject, reason, user) => {
    const w = get().wos.find((x) => x.id === id)!;
    const bom = get().boms.find((b) => b.id === w.bomId)!;
    const at = nowIso();
    const back = bom.lines.filter((l) => l.issueMethod === "backflush");
    set((s) => ({
      wos: s.wos.map((x) => {
        if (x.id !== id) return x;
        const issued = { ...x.issued };
        const moves = [...x.moves];
        back.forEach((l) => {
          const q = +((good + reject) * l.qty * (1 + l.scrapPct / 100)).toFixed(2);
          issued[l.itemId] = +((issued[l.itemId] ?? 0) + q).toFixed(2);
          moves.push({ id: `m${Date.now()}b${l.id}`, at, type: "backflush", itemId: l.itemId, qty: q, warehouse: "RMS" });
        });
        if (good > 0) moves.push({ id: `m${Date.now()}fg`, at, type: "fg_receipt", itemId: x.itemId, qty: good, warehouse: x.warehouse });
        if (reject > 0) moves.push({ id: `m${Date.now()}sc`, at, type: "scrap", itemId: x.itemId, qty: reject, warehouse: "SCR" });
        return { ...x, produced: x.produced + good, rejected: x.rejected + reject, issued, moves, status: x.status === "released" ? "in_progress" : x.status };
      }),
      // last operation's job card reflects finished qty
      jcs: s.jcs.map((j) => {
        const last = s.jcs.filter((k) => k.woId === id).sort((a, b) => b.seq - a.seq)[0];
        return last && j.id === last.id ? { ...j, good: j.good + good, reject: j.reject + reject, lastEventAt: at } : j;
      }),
    }));
    get().woLog(
      id, user, "status",
      `Reported ${good} good${reject ? `, ${reject} rejected (${reason})` : ""} · backflushed ${back.length} component(s) · FG receipt to ${w.warehouse}`,
    );
  },

  closeWo: (id, variancePct, user) => {
    set((s) => ({ wos: s.wos.map((w) => (w.id === id ? { ...w, status: "closed", closedVariance: variancePct } : w)) }));
    get().woLog(id, user, "status", `Closed · cost frozen · variance ${variancePct >= 0 ? "+" : ""}${variancePct.toFixed(1)}% vs standard`);
  },

  planLog: (id, user, kind, text) =>
    set((s) => ({ plans: s.plans.map((p) => (p.id === id ? { ...p, activities: [act(`a${Date.now()}`, nowIso(), user, kind, text), ...p.activities] } : p)) })),

  createPR: (planId, itemIds, user) => {
    let n = get().nextPr;
    const plan = get().plans.find((p) => p.id === planId)!;
    const reqs = { ...plan.requisitions };
    const created: string[] = [];
    itemIds.forEach((iid) => {
      if (reqs[iid]) return;
      const num = `PR-2026-${pad(n++)}`;
      reqs[iid] = num;
      created.push(num);
    });
    set((s) => ({ nextPr: n, plans: s.plans.map((p) => (p.id === planId ? { ...p, requisitions: reqs } : p)) }));
    if (created.length) get().planLog(planId, user, "system", `Purchase requisition(s) ${created.join(", ")} created from shortage list`);
    return created;
  },

  createPlanWOs: (planId, user) => {
    const plan = get().plans.find((p) => p.id === planId)!;
    const tree = flatten(explodePlan(plan, get().boms)).filter((n) => n.make && n.toMake > 0);
    let n = get().nextWo;
    const newWos: WorkOrder[] = tree.map((node) => {
      const bom = activeBomFor(node.itemId, get().boms)!;
      const line = plan.lines.find((l) => l.itemId === node.itemId && node.level === 0);
      const number = `WO-2026-${pad(n++)}`;
      return wo({
        id: `wo${n}x${Date.now() % 10000}`, number, itemId: node.itemId, qty: Math.ceil(node.toMake), bomId: bom.id, planId,
        soId: line?.soId, soNumber: line?.soNumber ?? plan.lines[0]?.soNumber, status: "draft",
        plannedStart: "2026-10-05", plannedEnd: line?.due ?? "2026-10-10", warehouse: itemById(node.itemId).type === "wip" ? "WIP" : "FGS",
        produced: 0, rejected: 0,
        activities: [act(`a${Date.now()}`, nowIso(), user, "created", `Created from ${plan.number} · BOM ${bom.code} v${bom.version} pinned`)],
      });
    });
    set((s) => ({
      wos: [...newWos, ...s.wos],
      nextWo: n,
      plans: s.plans.map((p) => (p.id === planId ? { ...p, status: "confirmed", workOrders: [...p.workOrders, ...newWos.map((w) => w.number)] } : p)),
    }));
    get().planLog(planId, user, "status", `Confirmed · ${newWos.length} work order(s) created: ${newWos.map((w) => w.number).join(", ")}`);
    return newWos.map((w) => w.number);
  },

  newBomVersion: (bomId, user) => {
    const b = get().boms.find((x) => x.id === bomId)!;
    const max = Math.max(...get().boms.filter((x) => x.itemId === b.itemId).map((x) => x.version));
    const id = `b${Date.now()}`;
    const nb: Bom = { ...b, id, version: max + 1, status: "draft", effectiveFrom: TODAY, routingCode: b.routingCode.replace(/v\d+$/, `v${max + 1}`), notes: `Copied from v${b.version} by ${user}` };
    set((s) => ({ boms: [...s.boms, nb] }));
    return id;
  },

  activateBom: (bomId) => {
    const b = get().boms.find((x) => x.id === bomId)!;
    set((s) => ({
      boms: s.boms.map((x) => (x.itemId === b.itemId ? { ...x, status: x.id === bomId ? "active" : x.status === "active" ? "obsolete" : x.status } : x)),
    }));
  },

  setWcStatus: (wcId, status, reason) =>
    set((s) => ({
      wcs: s.wcs.map((w) =>
        w.id === wcId ? { ...w, status, downReason: status === "down" ? reason : undefined, currentJob: status === "down" ? undefined : w.currentJob } : w,
      ),
    })),

  addScrap: (e) => {
    const n = get().nextScrap;
    const number = `SCR-2026-${pad(n, 4)}`;
    set((s) => ({ scrap: [{ ...e, id: `s${Date.now()}`, number }, ...s.scrap], nextScrap: n + 1 }));
    return number;
  },

  resolveException: (id, status, resolution, reassignTo) =>
    set((s) => ({
      exceptions: s.exceptions.map((x) => (x.id === id ? { ...x, status, resolution, jcNumber: reassignTo ?? x.jcNumber } : x)),
    })),
}));

/* ============================ Lookups ============================ */

export const operatorName = (id?: string) => operators.find((o) => o.id === id)?.name ?? "—";
export const wcName = (id: string, wcs: WorkCentre[], lang: "en" | "hi" = "en") => {
  if (id === "jw") return lang === "hi" ? "जॉब-वर्क (बाहर)" : "Job-work (outside)";
  const w = wcs.find((x) => x.id === id);
  return w ? (lang === "hi" ? w.nameHi : w.name) : id;
};
export const itemName = (id: string, lang: "en" | "hi") => {
  const i = itemById(id);
  return lang === "hi" ? i.nameHi : i.name;
};
