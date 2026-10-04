"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Roles from architecture §5.1. Switchable in the user menu to demo RBAC. */
export type RoleKey = "owner" | "production" | "store" | "accountant" | "sales";

export interface RoleDef {
  key: RoleKey;
  label: string;
  user: string;
  initials: string;
  email: string;
  /** Modules (nav keys) visible to the role. */
  modules: string[];
  /** Field rule: can see cost, rate and margin fields (arch §5.2). */
  seesCost: boolean;
  /** Can approve documents. */
  approves: boolean;
}

export const ROLES: Record<RoleKey, RoleDef> = {
  owner: {
    key: "owner", label: "Owner / Admin", user: "Rajesh Agarwal", initials: "RA", email: "rajesh@shaktiprecision.in",
    modules: ["dashboard", "sales", "purchase", "inventory", "manufacturing", "jobwork", "hr", "finance", "reports", "approvals", "admin", "settings", "platform"],
    seesCost: true, approves: true,
  },
  production: {
    key: "production", label: "Production head", user: "Prakash Deshmukh", initials: "PD", email: "prakash@shaktiprecision.in",
    modules: ["dashboard", "manufacturing", "inventory", "purchase", "jobwork", "hr", "reports", "approvals"],
    seesCost: true, approves: true,
  },
  store: {
    key: "store", label: "Store keeper", user: "Santosh Kale", initials: "SK", email: "santosh@shaktiprecision.in",
    modules: ["dashboard", "inventory", "purchase", "jobwork", "manufacturing"],
    seesCost: false, approves: false,
  },
  accountant: {
    key: "accountant", label: "Accountant", user: "Meera Iyer", initials: "MI", email: "meera@shaktiprecision.in",
    modules: ["dashboard", "finance", "sales", "purchase", "jobwork", "hr", "reports", "approvals"],
    seesCost: true, approves: true,
  },
  sales: {
    key: "sales", label: "Sales & purchase", user: "Neha Kulkarni", initials: "NK", email: "neha@shaktiprecision.in",
    modules: ["dashboard", "sales", "purchase", "inventory", "reports"],
    seesCost: false, approves: false,
  },
};

export interface Notification {
  id: string;
  title: string;
  body: string;
  at: string;
  kind: "approval" | "alert" | "info" | "success";
  href?: string;
  read: boolean;
}

interface AppState {
  role: RoleKey;
  sidebarCollapsed: boolean;
  lang: "en" | "hi";
  notifications: Notification[];
  setRole: (r: RoleKey) => void;
  toggleSidebar: () => void;
  setLang: (l: "en" | "hi") => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  pushNotification: (n: Omit<Notification, "id" | "read" | "at">) => void;
}

const seedNotifications: Notification[] = [
  { id: "n1", kind: "approval", title: "PO-2026-00187 needs approval", body: "Mahalaxmi Steel Traders · ₹4,21,260 exceeds your ₹2,00,000 limit", at: "2026-10-02T09:42:00", href: "/approvals", read: false },
  { id: "n2", kind: "alert", title: "e-Invoice failed for INV/26-27/0412", body: "GSP timeout after 3 attempts. Retrying in 10 min.", at: "2026-10-02T09:15:00", href: "/finance/einvoice", read: false },
  { id: "n3", kind: "alert", title: "VMC 01 is down", body: "Spindle alarm — maintenance called by Imran Shaikh", at: "2026-10-02T08:51:00", href: "/manufacturing/work-centres", read: false },
  { id: "n4", kind: "alert", title: "Challan JWC/26-27/0031 due in 18 days", body: "Annapurna Heat Treatment · 1-year return limit for inputs", at: "2026-10-02T07:00:00", href: "/jobwork/challans", read: true },
  { id: "n5", kind: "success", title: "Tally export completed", body: "214 vouchers for September 2026 ready to download", at: "2026-10-01T18:20:00", href: "/finance/tally", read: true },
];

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      role: "owner",
      sidebarCollapsed: false,
      lang: "en",
      notifications: seedNotifications,
      setRole: (role) => set({ role }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setLang: (lang) => set({ lang }),
      markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      pushNotification: (n) =>
        set((s) => ({
          notifications: [
            { ...n, id: `n${Date.now()}`, read: false, at: new Date().toISOString().slice(0, 19) },
            ...s.notifications,
          ],
        })),
    }),
    { name: "factory-erp-app", partialize: (s) => ({ role: s.role, sidebarCollapsed: s.sidebarCollapsed, lang: s.lang }) },
  ),
);

export const useRole = () => ROLES[useApp((s) => s.role)];
