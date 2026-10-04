"use client";

import { create } from "zustand";
import { itemById } from "@/lib/data/masters";
import { TODAY } from "@/lib/utils";

/** Customer price lists with volume slabs and validity (FR-SP-01). Applied on quotation / SO lines. */

export interface PriceSlab {
  minQty: number;
  rate: number;
}

export interface PriceLine {
  itemId: string;
  rate: number;
  discountPct: number;
  slabs: PriceSlab[];
}

export type PriceListType = "standard" | "customer" | "volume";

export interface PriceList {
  id: string;
  code: string;
  name: string;
  type: PriceListType;
  validFrom: string;
  validTo: string;
  customers: string[];
  lines: PriceLine[];
  active: boolean;
  priority: number;
  notes: string;
  updatedBy: string;
  updatedAt: string;
}

export const TYPE_LABEL: Record<PriceListType, string> = {
  standard: "Standard",
  customer: "Customer-specific",
  volume: "Volume slabs",
};

export type ValidityState = "active" | "scheduled" | "expired" | "inactive";

export function validity(p: PriceList): ValidityState {
  if (!p.active) return "inactive";
  if (p.validFrom > TODAY) return "scheduled";
  if (p.validTo && p.validTo < TODAY) return "expired";
  return "active";
}

/** Net rate for a line at a given quantity: best slab, then discount. */
export function netRate(l: PriceLine, qty = 0) {
  const slab = [...l.slabs].sort((a, b) => b.minQty - a.minQty).find((s) => qty >= s.minQty);
  const base = slab?.rate ?? l.rate;
  return base * (1 - l.discountPct / 100);
}

const std = (id: string) => itemById(id).salePrice ?? 0;

const seed: PriceList[] = [
  {
    id: "pl1", code: "PL-STD-2627", name: "Standard price list FY 2026-27", type: "standard", validFrom: "2026-04-01", validTo: "2027-03-31", customers: [], active: true, priority: 0,
    notes: "Default when no customer list applies.", updatedBy: "Rajesh Agarwal", updatedAt: "2026-04-01T10:00:00",
    lines: ["i9", "i10", "i11", "i12"].map((i) => ({ itemId: i, rate: std(i), discountPct: 0, slabs: [] })),
  },
  {
    id: "pl2", code: "PL-DML-26", name: "Deccan Motors — annual contract", type: "customer", validFrom: "2026-07-01", validTo: "2027-06-30", customers: ["p1"], active: true, priority: 10,
    notes: "Rates agreed in contract DML/SC/2026/118. Steel escalation clause: review if EN8 moves ±5%.", updatedBy: "Neha Kulkarni", updatedAt: "2026-07-02T15:20:00",
    lines: [
      { itemId: "i9", rate: 640, discountPct: 0, slabs: [] },
      { itemId: "i12", rate: 260, discountPct: 0, slabs: [] },
    ],
  },
  {
    id: "pl3", code: "PL-VACL-26", name: "Varun Auto — schedule pricing", type: "volume", validFrom: "2026-08-01", validTo: "2026-12-31", customers: ["p5"], active: true, priority: 10,
    notes: "Monthly schedule-based slabs.", updatedBy: "Neha Kulkarni", updatedAt: "2026-08-01T09:00:00",
    lines: [
      { itemId: "i9", rate: 645, discountPct: 0, slabs: [{ minQty: 200, rate: 635 }, { minQty: 500, rate: 625 }] },
      { itemId: "i10", rate: 185, discountPct: 0, slabs: [{ minQty: 1000, rate: 180 }, { minQty: 2500, rate: 176 }] },
    ],
  },
  {
    id: "pl4", code: "PL-OEM-T2", name: "Tier-2 OEM dealers", type: "customer", validFrom: "2026-04-01", validTo: "2027-03-31", customers: ["p2", "p3"], active: true, priority: 5,
    notes: "", updatedBy: "Rajesh Agarwal", updatedAt: "2026-05-12T11:30:00",
    lines: [
      { itemId: "i11", rate: 475, discountPct: 3, slabs: [] },
      { itemId: "i12", rate: 310, discountPct: 2, slabs: [] },
      { itemId: "i9", rate: 640, discountPct: 2.5, slabs: [] },
    ],
  },
  {
    id: "pl5", code: "PL-STD-2728-D", name: "Standard price list FY 2027-28 (draft)", type: "standard", validFrom: "2027-04-01", validTo: "2028-03-31", customers: [], active: true, priority: 0,
    notes: "Proposed 4% increase after steel price revision.", updatedBy: "Rajesh Agarwal", updatedAt: "2026-09-28T17:45:00",
    lines: ["i9", "i10", "i11", "i12"].map((i) => ({ itemId: i, rate: Math.round(std(i) * 1.04), discountPct: 0, slabs: [] })),
  },
  {
    id: "pl6", code: "PL-NPV-FEST", name: "Narmada Pumps — Diwali scheme", type: "customer", validFrom: "2025-10-01", validTo: "2025-11-15", customers: ["p4"], active: true, priority: 20,
    notes: "Seasonal scheme, lapsed.", updatedBy: "Neha Kulkarni", updatedAt: "2025-09-25T12:00:00",
    lines: [{ itemId: "i12", rate: 295, discountPct: 0, slabs: [] }],
  },
];

interface PriceListState {
  lists: PriceList[];
  update: (id: string, patch: Partial<PriceList>, user: string) => void;
  add: (p: Omit<PriceList, "id" | "updatedAt" | "updatedBy">, user: string) => PriceList;
}

const stamp = () => `${TODAY}T${new Date().toTimeString().slice(0, 8)}`;

export const usePriceLists = create<PriceListState>()((set) => ({
  lists: seed,
  update: (id, patch, user) => set((s) => ({ lists: s.lists.map((p) => (p.id === id ? { ...p, ...patch, updatedBy: user, updatedAt: stamp() } : p)) })),
  add: (p, user) => {
    const created: PriceList = { ...p, id: `pl${Date.now()}`, updatedBy: user, updatedAt: stamp() };
    set((s) => ({ lists: [created, ...s.lists] }));
    return created;
  },
}));
