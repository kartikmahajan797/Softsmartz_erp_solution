"use client";

import { create } from "zustand";
import { TODAY } from "@/lib/utils";

export type ApprovalType = "purchase_order" | "credit_override" | "stock_adjustment" | "payment" | "discount";

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  document: string;
  href: string;
  party: string;
  amount: number;
  rule: string;
  requestedBy: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  decidedBy?: string;
  decidedAt?: string;
  comment?: string;
  /** Detail lines shown in the side panel. */
  details: { label: string; value: string }[];
  /** Store hook to run on approval (wired by the page). */
  target?: { kind: "sales_order"; id: string } | { kind: "payment"; id: string };
}

export const APPROVAL_TYPE_LABEL: Record<ApprovalType, string> = {
  purchase_order: "Purchase order",
  credit_override: "Credit override",
  stock_adjustment: "Stock adjustment",
  payment: "Vendor payment",
  discount: "Discount",
};

const seed: ApprovalRequest[] = [
  {
    id: "ap1", type: "purchase_order", document: "PO-2026-00187", href: "/purchase/orders", party: "Mahalaxmi Steel Traders", amount: 421260,
    rule: "PO amount > ₹2,00,000 → Owner", requestedBy: "Prakash Deshmukh", requestedAt: "2026-10-02T09:42:00", status: "pending",
    details: [
      { label: "Lines", value: "MS Round Bar EN8 Ø32 · 3,000 kg @ ₹68.50; CRCA Sheet 2 mm · 2,000 kg @ ₹72.00" },
      { label: "Source", value: "Purchase requisition PR-2026-00094 (shortage from PP-2026-0047)" },
      { label: "Delivery", value: "08-Oct-2026 · Raw Material Stores" },
      { label: "Last rate", value: "EN8 bar ₹67.80/kg on PO-2026-00171 (+1.0%)" },
    ],
  },
  {
    id: "ap2", type: "credit_override", document: "SO-2026-00233", href: "/sales/orders/so3", party: "Sahyadri Tractors Pvt Ltd", amount: 211869,
    rule: "Customer credit limit exceeded → Owner", requestedBy: "Neha Kulkarni", requestedAt: "2026-09-25T15:12:00", status: "pending",
    details: [
      { label: "Credit limit", value: "₹15.00 L" },
      { label: "Outstanding", value: "₹14.13 L (₹4.83 L over 60 days)" },
      { label: "This order", value: "₹2.12 L · Flange Coupling FC-75 × 300, Drive Shaft DS-450 × 150" },
      { label: "Exposure after", value: "₹16.24 L (108% of limit)" },
    ],
    target: { kind: "sales_order", id: "so3" },
  },
  {
    id: "ap3", type: "stock_adjustment", document: "ADJ-2026-00042", href: "/inventory/adjustments", party: "Raw Material Stores", amount: 2221,
    rule: "Any stock adjustment → Production head or Owner", requestedBy: "Santosh Kale", requestedAt: "2026-10-02T08:15:00", status: "pending",
    details: [
      { label: "Item", value: "MS Round Bar EN8 Ø32 mm (RM-BAR-EN8-32)" },
      { label: "Quantity", value: "−32 kg · batch B-EN8-0926" },
      { label: "Reason", value: "Count variance (stock count SC-2026-0011)" },
      { label: "Value", value: "₹2,221 at FIFO layer cost ₹69.40/kg" },
    ],
  },
  {
    id: "ap4", type: "payment", document: "PAY/26-27/0165", href: "/finance/payments", party: "Bharat Bearings Co", amount: 186400,
    rule: "Vendor payment > ₹1,00,000 → Owner", requestedBy: "Meera Iyer", requestedAt: "2026-10-02T10:05:00", status: "pending",
    details: [
      { label: "Against", value: "PB/26-27/0279 · Bearing 6204-2RS × 3,000" },
      { label: "Due date", value: "05-Oct-2026 (45-day terms)" },
      { label: "Mode", value: "NEFT from HDFC Bank ··4417" },
    ],
    target: { kind: "payment", id: "p2" },
  },
  {
    id: "ap5", type: "discount", document: "QT-2026-00118", href: "/sales/quotations", party: "Narmada Pumps & Valves", amount: 87792,
    rule: "Discount > 5% → Owner", requestedBy: "Neha Kulkarni", requestedAt: "2026-10-01T16:40:00", status: "approved", decidedBy: "Rajesh Agarwal", decidedAt: "2026-10-01T18:02:00", comment: "OK for first order",
    details: [{ label: "Discount", value: "6% on Flange Coupling FC-75" }],
  },
  {
    id: "ap6", type: "stock_adjustment", document: "ADJ-2026-00039", href: "/inventory/adjustments", party: "Finished Goods Stores", amount: 4416,
    rule: "Any stock adjustment → Production head or Owner", requestedBy: "Santosh Kale", requestedAt: "2026-09-28T12:20:00", status: "rejected", decidedBy: "Prakash Deshmukh", decidedAt: "2026-09-28T15:10:00", comment: "Recount bin FG-B4 first",
    details: [{ label: "Item", value: "Drive Shaft DS-450 · −9 nos" }],
  },
];

interface ApprovalsState {
  requests: ApprovalRequest[];
  decide: (id: string, status: "approved" | "rejected", user: string, comment: string) => void;
}

export const useApprovals = create<ApprovalsState>()((set) => ({
  requests: seed,
  decide: (id, status, user, comment) =>
    set((s) => ({
      requests: s.requests.map((r) =>
        r.id === id ? { ...r, status, decidedBy: user, decidedAt: `${TODAY}T${new Date().toTimeString().slice(0, 8)}`, comment } : r,
      ),
    })),
}));
