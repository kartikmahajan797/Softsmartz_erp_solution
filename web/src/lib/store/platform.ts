"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/*
 * Platform (super-admin) data: the SaaS operator's view across all tenants.
 * Arch §9.4 provisioning (G4), §9.5 entitlements (G8), G17 support console, G21 subscription billing.
 */

export type PlanKey = "starter" | "growth" | "pro";
export type TenantStage = "signed" | "provisioning" | "configuring" | "data_migration" | "training" | "live" | "churned";
export type TenantStatus = "trial" | "active" | "past_due" | "suspended" | "offboarding";
export type IndustryTemplate = "cnc_job_shop" | "fabrication" | "plastics" | "auto_components" | "blank";

export interface PlanDef {
  key: PlanKey;
  name: string;
  monthly: number;
  tagline: string;
  limits: { users: number; terminals: number; whatsapp: number; storageGb: number };
  features: string[];
}

export const FEATURES: { key: string; label: string; group: string }[] = [
  { key: "core.erp", label: "Sales, purchase & inventory", group: "Core" },
  { key: "gst.einvoice", label: "e-Invoice & e-way bill", group: "Core" },
  { key: "mfg.bom", label: "BOM, routing & work orders", group: "Manufacturing" },
  { key: "mfg.costing", label: "Order costing & profitability", group: "Manufacturing" },
  { key: "jobwork", label: "Job-work & ITC-04", group: "Manufacturing" },
  { key: "shopfloor.offline", label: "Offline operator app", group: "Shop floor" },
  { key: "notify.whatsapp", label: "WhatsApp notifications & reminders", group: "Integrations" },
  { key: "tally.export", label: "Tally export", group: "Integrations" },
  { key: "hr.people", label: "People (attendance, roster, payroll inputs)", group: "Add-ons" },
  { key: "ai.import", label: "AI smart import (beta)", group: "Add-ons" },
  { key: "reports.advanced", label: "Advanced reports & scheduling", group: "Add-ons" },
];

export const PLANS: Record<PlanKey, PlanDef> = {
  starter: {
    key: "starter", name: "Starter", monthly: 7900, tagline: "Inventory, sales, purchase and GST billing",
    limits: { users: 3, terminals: 3, whatsapp: 500, storageGb: 10 },
    features: ["core.erp", "gst.einvoice", "tally.export"],
  },
  growth: {
    key: "growth", name: "Growth", monthly: 14900, tagline: "Full manufacturing with job-work and costing",
    limits: { users: 5, terminals: 10, whatsapp: 2000, storageGb: 25 },
    features: ["core.erp", "gst.einvoice", "tally.export", "mfg.bom", "mfg.costing", "jobwork", "shopfloor.offline", "notify.whatsapp"],
  },
  pro: {
    key: "pro", name: "Pro", monthly: 24900, tagline: "Higher limits, priority support, advanced reports",
    limits: { users: 15, terminals: 25, whatsapp: 10000, storageGb: 100 },
    features: ["core.erp", "gst.einvoice", "tally.export", "mfg.bom", "mfg.costing", "jobwork", "shopfloor.offline", "notify.whatsapp", "hr.people", "reports.advanced"],
  },
};

export const TEMPLATES: Record<IndustryTemplate, { label: string; seeds: string }> = {
  cnc_job_shop: { label: "CNC job shop", seeds: "Turning/milling routings, CNC work centres, scrap reasons, 2 shifts" },
  fabrication: { label: "Fabrication", seeds: "Cutting/welding/painting routings, weight-based UoM, job-work to galvanisers" },
  plastics: { label: "Plastics moulding", seeds: "Mould master, shot-based routings, regrind by-product, 3 shifts" },
  auto_components: { label: "Auto components (tier-2/3)", seeds: "Customer schedules, PPAP fields, heat-treatment & plating job-work" },
  blank: { label: "Blank", seeds: "Only Indian defaults: UoM, states, GST rates" },
};

export const STAGES: { key: TenantStage; label: string }[] = [
  { key: "signed", label: "Signed" },
  { key: "provisioning", label: "Provisioning" },
  { key: "configuring", label: "Configuring" },
  { key: "data_migration", label: "Data migration" },
  { key: "training", label: "Training" },
  { key: "live", label: "Live" },
];

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
}

export const CHECKLIST: { key: string; label: string }[] = [
  { key: "invite", label: "Owner invite accepted & 2FA on" },
  { key: "company", label: "Company, GSTIN & FY confirmed" },
  { key: "template", label: "Industry template applied" },
  { key: "masters", label: "Items, parties & BOMs imported" },
  { key: "opening", label: "Opening stock & AR/AP loaded" },
  { key: "gsp", label: "GSP connected (e-invoice / e-way)" },
  { key: "terminals", label: "Shop-floor terminals registered" },
  { key: "training", label: "Operators & office users trained" },
  { key: "golive", label: "First invoice posted (go-live)" },
];

export interface TenantUserSummary {
  name: string;
  email: string;
  role: string;
  lastActive: string;
  twoFactor: boolean;
}

export interface SupportGrant {
  id: string;
  tenantId: string;
  grantedBy: string;
  scope: "read_only" | "configure";
  reason: string;
  from: string;
  until: string;
  status: "requested" | "active" | "expired" | "revoked" | "denied";
  requestedBy: string;
}

export interface ImpersonationSession {
  id: string;
  tenantId: string;
  staff: string;
  grantId: string;
  startedAt: string;
  endedAt?: string;
  actions: number;
  reason: string;
}

export interface Tenant {
  id: string;
  code: string;
  name: string;
  shortName: string;
  gstin: string;
  city: string;
  state: string;
  turnoverBand: string;
  template: IndustryTemplate;
  plan: PlanKey;
  cycle: "monthly" | "annual";
  status: TenantStatus;
  stage: TenantStage;
  owner: { name: string; email: string; phone: string };
  inviteStatus: "pending" | "accepted" | "expired";
  onboardingManager: string;
  onboardingFee: number;
  signedOn: string;
  goLiveTarget: string;
  wentLiveOn?: string;
  region: "ap-south-1";
  /** Feature flag overrides on top of plan entitlements (true = forced on, false = forced off). */
  overrides: Record<string, boolean>;
  usage: { users: number; terminals: number; whatsapp: number; storageGb: number; invoicesMtd: number; productionEventsMtd: number };
  checklist: ChecklistItem[];
  users: TenantUserSummary[];
  health: "healthy" | "at_risk" | "critical";
  lastActive: string;
  notes: string;
}

export interface SubscriptionInvoice {
  id: string;
  number: string;
  tenantId: string;
  date: string;
  dueDate: string;
  period: string;
  description: string;
  amount: number;
  gst: number;
  status: "paid" | "due" | "overdue" | "draft" | "void";
  paidOn?: string;
}

export interface PlatformStaff {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "onboarding" | "support" | "billing";
  twoFactor: "hardware_key" | "totp";
  lastActive: string;
  status: "active" | "disabled";
}

export interface PlatformAudit {
  id: string;
  at: string;
  staff: string;
  action: string;
  tenantId?: string;
  detail: string;
}

export interface ServiceHealth {
  key: string;
  name: string;
  kind: "integration" | "queue" | "infra";
  status: "operational" | "degraded" | "down";
  metric: string;
  detail: string;
}

export const STAFF_ROLE_LABEL: Record<PlatformStaff["role"], string> = {
  super_admin: "Super admin",
  onboarding: "Onboarding",
  support: "Support",
  billing: "Billing",
};

/* ---------------- Seed ---------------- */

const checklist = (doneCount: number): ChecklistItem[] => CHECKLIST.map((c, i) => ({ ...c, done: i < doneCount }));

const seedTenants: Tenant[] = [
  {
    id: "t_01", code: "SHAKTI", name: "Shakti Precision Components Pvt Ltd", shortName: "Shakti Precision", gstin: "27AAKCS4821M1Z5",
    city: "Pune", state: "Maharashtra", turnoverBand: "₹5-50 Cr", template: "cnc_job_shop", plan: "growth", cycle: "annual",
    status: "active", stage: "live", owner: { name: "Rajesh Agarwal", email: "rajesh@shaktiprecision.in", phone: "+91 98220 41870" },
    inviteStatus: "accepted", onboardingManager: "Pooja Nair", onboardingFee: 50000, signedOn: "2026-03-10", goLiveTarget: "2026-04-01", wentLiveOn: "2026-04-01",
    region: "ap-south-1", overrides: { "ai.import": true },
    usage: { users: 4, terminals: 7, whatsapp: 1684, storageGb: 6.4, invoicesMtd: 212, productionEventsMtd: 18420 },
    checklist: checklist(9), health: "healthy", lastActive: "2026-10-02T14:02:00", notes: "Reference customer. Interested in Pro for People module.",
    users: [
      { name: "Rajesh Agarwal", email: "rajesh@shaktiprecision.in", role: "Owner / Admin", lastActive: "2026-10-02T14:02:00", twoFactor: true },
      { name: "Meera Iyer", email: "meera@shaktiprecision.in", role: "Accountant", lastActive: "2026-10-02T13:48:00", twoFactor: true },
      { name: "Prakash Deshmukh", email: "prakash@shaktiprecision.in", role: "Production head", lastActive: "2026-10-02T09:58:00", twoFactor: false },
      { name: "Santosh Kale", email: "santosh@shaktiprecision.in", role: "Store keeper", lastActive: "2026-10-02T13:21:00", twoFactor: false },
    ],
  },
  {
    id: "t_02", code: "VARAD", name: "Varad Fabricators LLP", shortName: "Varad Fabricators", gstin: "27AAQFV2210K1Z8",
    city: "Nashik", state: "Maharashtra", turnoverBand: "₹5-50 Cr", template: "fabrication", plan: "growth", cycle: "monthly",
    status: "active", stage: "live", owner: { name: "Sachin Varade", email: "sachin@varadfab.in", phone: "+91 98500 11223" },
    inviteStatus: "accepted", onboardingManager: "Pooja Nair", onboardingFee: 35000, signedOn: "2026-05-02", goLiveTarget: "2026-05-20", wentLiveOn: "2026-05-22",
    region: "ap-south-1", overrides: {},
    usage: { users: 5, terminals: 4, whatsapp: 920, storageGb: 3.1, invoicesMtd: 96, productionEventsMtd: 6210 },
    checklist: checklist(9), health: "healthy", lastActive: "2026-10-02T12:40:00", notes: "",
    users: [{ name: "Sachin Varade", email: "sachin@varadfab.in", role: "Owner / Admin", lastActive: "2026-10-02T12:40:00", twoFactor: true }],
  },
  {
    id: "t_03", code: "POLYMOLD", name: "Polymold Industries Pvt Ltd", shortName: "Polymold Industries", gstin: "24AABCP7781Q1Z2",
    city: "Ahmedabad", state: "Gujarat", turnoverBand: "₹5-50 Cr", template: "plastics", plan: "pro", cycle: "annual",
    status: "active", stage: "live", owner: { name: "Hiren Shah", email: "hiren@polymold.co.in", phone: "+91 98250 77881" },
    inviteStatus: "accepted", onboardingManager: "Arjun Mehta", onboardingFee: 75000, signedOn: "2026-04-15", goLiveTarget: "2026-05-10", wentLiveOn: "2026-05-14",
    region: "ap-south-1", overrides: {},
    usage: { users: 11, terminals: 18, whatsapp: 6420, storageGb: 21.8, invoicesMtd: 388, productionEventsMtd: 41200 },
    checklist: checklist(9), health: "at_risk", lastActive: "2026-10-02T11:05:00", notes: "3 IRN failures this week — GSP credential rotation pending.",
    users: [{ name: "Hiren Shah", email: "hiren@polymold.co.in", role: "Owner / Admin", lastActive: "2026-10-01T19:10:00", twoFactor: true }],
  },
  {
    id: "t_04", code: "SAIAUTO", name: "Sai Auto Components", shortName: "Sai Auto Components", gstin: "33AAMFS4410C1Z7",
    city: "Hosur", state: "Tamil Nadu", turnoverBand: "₹5-50 Cr", template: "auto_components", plan: "growth", cycle: "annual",
    status: "trial", stage: "data_migration", owner: { name: "K. Senthil Kumar", email: "senthil@saiauto.in", phone: "+91 94430 55102" },
    inviteStatus: "accepted", onboardingManager: "Arjun Mehta", onboardingFee: 50000, signedOn: "2026-09-12", goLiveTarget: "2026-10-10",
    region: "ap-south-1", overrides: {},
    usage: { users: 3, terminals: 2, whatsapp: 40, storageGb: 0.8, invoicesMtd: 0, productionEventsMtd: 310 },
    checklist: checklist(4), health: "healthy", lastActive: "2026-10-02T10:30:00", notes: "Opening stock file has 214 HSN errors; call booked Fri.",
    users: [{ name: "K. Senthil Kumar", email: "senthil@saiauto.in", role: "Owner / Admin", lastActive: "2026-10-02T10:30:00", twoFactor: true }],
  },
  {
    id: "t_05", code: "BHARATFORG", name: "Bharat Precision Forgings", shortName: "Bharat Forgings", gstin: "06AAHFB3302N1Z4",
    city: "Faridabad", state: "Haryana", turnoverBand: "Above ₹50 Cr", template: "auto_components", plan: "pro", cycle: "annual",
    status: "trial", stage: "configuring", owner: { name: "Vikram Malhotra", email: "vikram@bharatforgings.com", phone: "+91 98110 33004" },
    inviteStatus: "accepted", onboardingManager: "Pooja Nair", onboardingFee: 75000, signedOn: "2026-09-25", goLiveTarget: "2026-10-20",
    region: "ap-south-1", overrides: { "ai.import": true },
    usage: { users: 2, terminals: 0, whatsapp: 0, storageGb: 0.2, invoicesMtd: 0, productionEventsMtd: 0 },
    checklist: checklist(2), health: "healthy", lastActive: "2026-10-01T17:20:00", notes: "Needs multi-plant (R3) — agreed single plant for now.",
    users: [{ name: "Vikram Malhotra", email: "vikram@bharatforgings.com", role: "Owner / Admin", lastActive: "2026-10-01T17:20:00", twoFactor: true }],
  },
  {
    id: "t_06", code: "KRISHNA", name: "Krishna Engineering Works", shortName: "Krishna Engineering", gstin: "29AAGFK9921P1Z1",
    city: "Bengaluru", state: "Karnataka", turnoverBand: "Up to ₹5 Cr", template: "cnc_job_shop", plan: "starter", cycle: "monthly",
    status: "active", stage: "provisioning", owner: { name: "Ravi Kumar", email: "ravi@krishnaeng.in", phone: "+91 99000 41230" },
    inviteStatus: "pending", onboardingManager: "Arjun Mehta", onboardingFee: 25000, signedOn: "2026-09-30", goLiveTarget: "2026-10-18",
    region: "ap-south-1", overrides: {},
    usage: { users: 0, terminals: 0, whatsapp: 0, storageGb: 0, invoicesMtd: 0, productionEventsMtd: 0 },
    checklist: checklist(0), health: "healthy", lastActive: "", notes: "Invite sent 30-Sep; reminder due.",
    users: [],
  },
  {
    id: "t_07", code: "OMSAI", name: "Om Sai Press Tools", shortName: "Om Sai Press Tools", gstin: "27AAJFO5512H1Z9",
    city: "Aurangabad", state: "Maharashtra", turnoverBand: "Up to ₹5 Cr", template: "fabrication", plan: "starter", cycle: "monthly",
    status: "past_due", stage: "live", owner: { name: "Ganesh Patil", email: "ganesh@omsaitools.in", phone: "+91 97650 12890" },
    inviteStatus: "accepted", onboardingManager: "Pooja Nair", onboardingFee: 25000, signedOn: "2026-06-01", goLiveTarget: "2026-06-20", wentLiveOn: "2026-06-25",
    region: "ap-south-1", overrides: {},
    usage: { users: 3, terminals: 2, whatsapp: 410, storageGb: 1.2, invoicesMtd: 31, productionEventsMtd: 1820 },
    checklist: checklist(9), health: "critical", lastActive: "2026-09-29T16:00:00", notes: "September invoice overdue 12 days. Usage dropping.",
    users: [{ name: "Ganesh Patil", email: "ganesh@omsaitools.in", role: "Owner / Admin", lastActive: "2026-09-29T16:00:00", twoFactor: false }],
  },
];

const seedInvoices: SubscriptionInvoice[] = [
  { id: "si1", number: "FE/SUB/26-27/0418", tenantId: "t_01", date: "2026-10-01", dueDate: "2026-10-15", period: "Oct 2026", description: "Growth plan · annual (monthly instalment)", amount: 14900 * 0.85 * 1, gst: 14900 * 0.85 * 0.18, status: "due" },
  { id: "si2", number: "FE/SUB/26-27/0419", tenantId: "t_02", date: "2026-10-01", dueDate: "2026-10-15", period: "Oct 2026", description: "Growth plan · monthly", amount: 14900, gst: 2682, status: "paid", paidOn: "2026-10-02" },
  { id: "si3", number: "FE/SUB/26-27/0420", tenantId: "t_03", date: "2026-10-01", dueDate: "2026-10-15", period: "Oct 2026", description: "Pro plan · annual (monthly instalment)", amount: 21165, gst: 3809.7, status: "due" },
  { id: "si4", number: "FE/SUB/26-27/0398", tenantId: "t_07", date: "2026-09-01", dueDate: "2026-09-20", period: "Sep 2026", description: "Starter plan · monthly", amount: 7900, gst: 1422, status: "overdue" },
  { id: "si5", number: "FE/SUB/26-27/0421", tenantId: "t_04", date: "2026-09-12", dueDate: "2026-09-26", period: "Onboarding", description: "Onboarding package (template + migration + training)", amount: 50000, gst: 9000, status: "paid", paidOn: "2026-09-20" },
  { id: "si6", number: "FE/SUB/26-27/0422", tenantId: "t_05", date: "2026-09-25", dueDate: "2026-10-09", period: "Onboarding", description: "Onboarding package (premium)", amount: 75000, gst: 13500, status: "due" },
  { id: "si7", number: "FE/SUB/26-27/0423", tenantId: "t_06", date: "2026-09-30", dueDate: "2026-10-14", period: "Onboarding", description: "Onboarding package (starter)", amount: 25000, gst: 4500, status: "draft" },
  { id: "si8", number: "FE/SUB/26-27/0391", tenantId: "t_01", date: "2026-09-01", dueDate: "2026-09-15", period: "Sep 2026", description: "Growth plan · annual (monthly instalment)", amount: 12665, gst: 2279.7, status: "paid", paidOn: "2026-09-05" },
  { id: "si9", number: "FE/SUB/26-27/0392", tenantId: "t_07", date: "2026-08-01", dueDate: "2026-08-20", period: "Aug 2026", description: "Starter plan · monthly", amount: 7900, gst: 1422, status: "paid", paidOn: "2026-08-24" },
];

const seedGrants: SupportGrant[] = [
  { id: "g5", tenantId: "t_01", grantedBy: "", scope: "read_only", reason: "Check People module data before Pro upgrade demo", from: "2026-10-02T15:00:00", until: "2026-10-03T15:00:00", status: "requested", requestedBy: "Pooja Nair" },
  { id: "g1", tenantId: "t_04", grantedBy: "K. Senthil Kumar", scope: "configure", reason: "Fix opening stock import and BOM routing", from: "2026-10-01T09:00:00", until: "2026-10-08T18:00:00", status: "active", requestedBy: "Arjun Mehta" },
  { id: "g2", tenantId: "t_03", grantedBy: "", scope: "read_only", reason: "Investigate IRN failures (GSP timeout)", from: "2026-10-02T10:00:00", until: "2026-10-03T10:00:00", status: "requested", requestedBy: "Kunal Shah" },
  { id: "g3", tenantId: "t_01", grantedBy: "Rajesh Agarwal", scope: "read_only", reason: "Tally export mismatch for August", from: "2026-09-05T11:00:00", until: "2026-09-06T11:00:00", status: "expired", requestedBy: "Kunal Shah" },
  { id: "g4", tenantId: "t_05", grantedBy: "Vikram Malhotra", scope: "configure", reason: "Apply auto-components template and approval rules", from: "2026-09-26T09:00:00", until: "2026-10-10T18:00:00", status: "active", requestedBy: "Pooja Nair" },
];

const seedSessions: ImpersonationSession[] = [
  { id: "is1", tenantId: "t_04", staff: "Arjun Mehta", grantId: "g1", startedAt: "2026-10-02T10:12:00", endedAt: "2026-10-02T10:58:00", actions: 23, reason: "Re-mapped opening stock columns" },
  { id: "is2", tenantId: "t_05", staff: "Pooja Nair", grantId: "g4", startedAt: "2026-10-01T15:00:00", endedAt: "2026-10-01T16:42:00", actions: 61, reason: "Template + approval rules" },
  { id: "is3", tenantId: "t_01", staff: "Kunal Shah", grantId: "g3", startedAt: "2026-09-05T11:20:00", endedAt: "2026-09-05T11:46:00", actions: 0, reason: "Read-only review of Tally vouchers" },
];

const seedStaff: PlatformStaff[] = [
  { id: "ps1", name: "Kartik Mahajan", email: "kartik@factoryerp.in", role: "super_admin", twoFactor: "hardware_key", lastActive: "2026-10-02T14:10:00", status: "active" },
  { id: "ps2", name: "Pooja Nair", email: "pooja@factoryerp.in", role: "onboarding", twoFactor: "hardware_key", lastActive: "2026-10-02T13:30:00", status: "active" },
  { id: "ps3", name: "Arjun Mehta", email: "arjun@factoryerp.in", role: "onboarding", twoFactor: "totp", lastActive: "2026-10-02T11:02:00", status: "active" },
  { id: "ps4", name: "Kunal Shah", email: "kunal@factoryerp.in", role: "support", twoFactor: "hardware_key", lastActive: "2026-10-02T10:15:00", status: "active" },
  { id: "ps5", name: "Divya Rao", email: "divya@factoryerp.in", role: "billing", twoFactor: "totp", lastActive: "2026-10-01T18:40:00", status: "active" },
];

const seedAudit: PlatformAudit[] = [
  { id: "pa1", at: "2026-10-02T13:30:00", staff: "Pooja Nair", action: "tenant.stage", tenantId: "t_05", detail: "Moved Bharat Forgings to Configuring" },
  { id: "pa2", at: "2026-10-02T10:12:00", staff: "Arjun Mehta", action: "support.session.start", tenantId: "t_04", detail: "Started configure session under grant g1" },
  { id: "pa3", at: "2026-10-02T10:00:00", staff: "Kunal Shah", action: "support.grant.request", tenantId: "t_03", detail: "Requested read-only access: IRN failures" },
  { id: "pa4", at: "2026-09-30T16:20:00", staff: "Kartik Mahajan", action: "tenant.create", tenantId: "t_06", detail: "Provisioned Krishna Engineering Works · Starter · CNC job shop template" },
  { id: "pa5", at: "2026-09-30T16:21:00", staff: "System", action: "tenant.invite.sent", tenantId: "t_06", detail: "Owner invite emailed to ravi@krishnaeng.in" },
  { id: "pa6", at: "2026-09-26T09:00:00", staff: "Kartik Mahajan", action: "tenant.flag", tenantId: "t_05", detail: "Enabled ai.import (beta) override" },
];

const seedHealth: ServiceHealth[] = [
  { key: "gsp", name: "GSP (e-invoice / e-way)", kind: "integration", status: "degraded", metric: "96.2% success · 24h", detail: "IRP latency high since 09:00; retries succeeding" },
  { key: "bsp", name: "WhatsApp BSP", kind: "integration", status: "operational", metric: "99.9% delivered", detail: "Template quota 41% used" },
  { key: "sms", name: "SMS (DLT) / email", kind: "integration", status: "operational", metric: "99.7% delivered", detail: "" },
  { key: "q_gsp", name: "gsp queue", kind: "queue", status: "operational", metric: "4 waiting · 0 dead", detail: "" },
  { key: "q_pdf", name: "pdf queue", kind: "queue", status: "operational", metric: "0 waiting", detail: "" },
  { key: "q_sync", name: "shop-floor sync ingest", kind: "queue", status: "operational", metric: "~0.7 events/s", detail: "3 exceptions open across tenants" },
  { key: "db", name: "PostgreSQL (Multi-AZ)", kind: "infra", status: "operational", metric: "CPU 23% · PITR on", detail: "ap-south-1" },
  { key: "backup", name: "Backups", kind: "infra", status: "operational", metric: "Last 02:00 IST", detail: "35-day retention" },
];

/* ---------------- Store ---------------- */

export interface NewTenantInput {
  name: string;
  shortName: string;
  gstin: string;
  city: string;
  state: string;
  turnoverBand: string;
  template: IndustryTemplate;
  plan: PlanKey;
  cycle: "monthly" | "annual";
  owner: { name: string; email: string; phone: string };
  onboardingManager: string;
  onboardingFee: number;
  goLiveTarget: string;
  sandbox: boolean;
}

interface PlatformState {
  tenants: Tenant[];
  invoices: SubscriptionInvoice[];
  grants: SupportGrant[];
  sessions: ImpersonationSession[];
  staff: PlatformStaff[];
  audit: PlatformAudit[];
  health: ServiceHealth[];
  /** Active impersonation (support view inside the tenant app). */
  impersonating: { tenantId: string; staff: string; scope: SupportGrant["scope"]; until: string } | null;
  createTenant: (t: NewTenantInput, by: string) => Tenant;
  updateTenant: (id: string, patch: Partial<Tenant>, by: string, action: string, detail: string) => void;
  setStage: (id: string, stage: TenantStage, by: string) => void;
  toggleChecklist: (id: string, key: string) => void;
  setOverride: (id: string, feature: string, value: boolean | null, by: string) => void;
  requestGrant: (g: Omit<SupportGrant, "id" | "status" | "grantedBy">) => void;
  decideGrant: (id: string, approve: boolean, by: string) => void;
  revokeGrant: (id: string, by: string) => void;
  startImpersonation: (grantId: string, staff: string) => void;
  endImpersonation: () => void;
  addInvoice: (inv: Omit<SubscriptionInvoice, "id" | "number">) => void;
  setInvoiceStatus: (id: string, status: SubscriptionInvoice["status"]) => void;
  log: (staff: string, action: string, detail: string, tenantId?: string) => void;
}

const now = () => new Date().toISOString().slice(0, 19);

export const usePlatform = create<PlatformState>()(
  persist(
    (set, get) => ({
      tenants: seedTenants,
      invoices: seedInvoices,
      grants: seedGrants,
      sessions: seedSessions,
      staff: seedStaff,
      audit: seedAudit,
      health: seedHealth,
      impersonating: null,

      log: (staff, action, detail, tenantId) =>
        set((s) => ({ audit: [{ id: `pa${Date.now()}${Math.random().toString(36).slice(2, 5)}`, at: now(), staff, action, detail, tenantId }, ...s.audit] })),

      createTenant: (t, by) => {
        const n = get().tenants.length + 1;
        const code = t.shortName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || `T${n}`;
        const tenant: Tenant = {
          id: `t_${String(n).padStart(2, "0")}_${Date.now().toString(36).slice(-4)}`,
          code, name: t.name, shortName: t.shortName, gstin: t.gstin, city: t.city, state: t.state, turnoverBand: t.turnoverBand,
          template: t.template, plan: t.plan, cycle: t.cycle, status: "trial", stage: "provisioning", owner: t.owner, inviteStatus: "pending",
          onboardingManager: t.onboardingManager, onboardingFee: t.onboardingFee, signedOn: now().slice(0, 10), goLiveTarget: t.goLiveTarget,
          region: "ap-south-1", overrides: {}, usage: { users: 0, terminals: 0, whatsapp: 0, storageGb: 0, invoicesMtd: 0, productionEventsMtd: 0 },
          checklist: checklist(0), users: [], health: "healthy", lastActive: "", notes: t.sandbox ? "Training sandbox provisioned alongside production tenant." : "",
        };
        set((s) => ({ tenants: [tenant, ...s.tenants] }));
        get().log(by, "tenant.create", `Provisioned ${t.name} · ${PLANS[t.plan].name} · ${TEMPLATES[t.template].label} template`, tenant.id);
        get().log("System", "tenant.invite.sent", `Owner invite emailed to ${t.owner.email}`, tenant.id);
        if (t.onboardingFee > 0) {
          get().addInvoice({
            tenantId: tenant.id, date: now().slice(0, 10), dueDate: now().slice(0, 10), period: "Onboarding",
            description: "Onboarding package", amount: t.onboardingFee, gst: t.onboardingFee * 0.18, status: "draft",
          });
        }
        return tenant;
      },

      updateTenant: (id, patch, by, action, detail) => {
        set((s) => ({ tenants: s.tenants.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
        get().log(by, action, detail, id);
      },

      setStage: (id, stage, by) => {
        const t = get().tenants.find((x) => x.id === id);
        if (!t) return;
        set((s) => ({
          tenants: s.tenants.map((x) =>
            x.id === id ? { ...x, stage, status: stage === "live" && x.status === "trial" ? "active" : x.status, wentLiveOn: stage === "live" ? x.wentLiveOn ?? now().slice(0, 10) : x.wentLiveOn } : x,
          ),
        }));
        get().log(by, "tenant.stage", `Moved ${t.shortName} to ${STAGES.find((s) => s.key === stage)?.label ?? stage}`, id);
      },

      toggleChecklist: (id, key) =>
        set((s) => ({ tenants: s.tenants.map((t) => (t.id === id ? { ...t, checklist: t.checklist.map((c) => (c.key === key ? { ...c, done: !c.done } : c)) } : t)) })),

      setOverride: (id, feature, value, by) => {
        set((s) => ({
          tenants: s.tenants.map((t) => {
            if (t.id !== id) return t;
            const o = { ...t.overrides };
            if (value === null) delete o[feature];
            else o[feature] = value;
            return { ...t, overrides: o };
          }),
        }));
        get().log(by, "tenant.flag", `${value === null ? "Reset" : value ? "Enabled" : "Disabled"} ${feature} override`, id);
      },

      requestGrant: (g) => {
        set((s) => ({ grants: [{ ...g, id: `g${Date.now()}`, status: "requested", grantedBy: "" }, ...s.grants] }));
        get().log(g.requestedBy, "support.grant.request", `Requested ${g.scope === "read_only" ? "read-only" : "configure"} access: ${g.reason}`, g.tenantId);
      },

      decideGrant: (id, approve, by) => {
        const g = get().grants.find((x) => x.id === id);
        set((s) => ({ grants: s.grants.map((x) => (x.id === id ? { ...x, status: approve ? "active" : "denied", grantedBy: by } : x)) }));
        if (g) get().log(by, approve ? "support.grant.approve" : "support.grant.deny", `${approve ? "Granted" : "Denied"} support access to ${g.requestedBy}`, g.tenantId);
      },

      revokeGrant: (id, by) => {
        const g = get().grants.find((x) => x.id === id);
        set((s) => ({
          grants: s.grants.map((x) => (x.id === id ? { ...x, status: "revoked" } : x)),
          impersonating: s.impersonating && g && s.impersonating.tenantId === g.tenantId ? null : s.impersonating,
        }));
        if (g) get().log(by, "support.grant.revoke", `Revoked support access for ${g.requestedBy}`, g.tenantId);
      },

      startImpersonation: (grantId, staff) => {
        const g = get().grants.find((x) => x.id === grantId);
        if (!g || g.status !== "active") return;
        set((s) => ({
          impersonating: { tenantId: g.tenantId, staff, scope: g.scope, until: g.until },
          sessions: [{ id: `is${Date.now()}`, tenantId: g.tenantId, staff, grantId, startedAt: now(), actions: 0, reason: g.reason }, ...s.sessions],
        }));
        get().log(staff, "support.session.start", `Started ${g.scope === "read_only" ? "read-only" : "configure"} session`, g.tenantId);
      },

      endImpersonation: () => {
        const imp = get().impersonating;
        if (!imp) return;
        set((s) => {
          const open = s.sessions.findIndex((y) => y.tenantId === imp.tenantId && !y.endedAt);
          return { impersonating: null, sessions: s.sessions.map((x, i) => (i === open ? { ...x, endedAt: now() } : x)) };
        });
        get().log(imp.staff, "support.session.end", "Ended support session", imp.tenantId);
      },

      addInvoice: (inv) =>
        set((s) => {
          const next = 424 + s.invoices.filter((i) => i.number.startsWith("FE/SUB/26-27/04") && Number(i.number.slice(-4)) >= 424).length;
          return { invoices: [{ ...inv, id: `si${Date.now()}`, number: `FE/SUB/26-27/${String(next).padStart(4, "0")}` }, ...s.invoices] };
        }),

      setInvoiceStatus: (id, status) =>
        set((s) => ({ invoices: s.invoices.map((i) => (i.id === id ? { ...i, status, paidOn: status === "paid" ? now().slice(0, 10) : i.paidOn } : i)) })),
    }),
    { name: "factory-erp-platform", version: 1 },
  ),
);

/* ---------------- Selectors / helpers ---------------- */

export const planPrice = (plan: PlanKey, cycle: "monthly" | "annual") => Math.round(PLANS[plan].monthly * (cycle === "annual" ? 0.85 : 1));

/** Plan entitlement merged with per-tenant overrides. */
export function featureOn(t: Tenant, feature: string) {
  if (feature in t.overrides) return t.overrides[feature];
  return PLANS[t.plan].features.includes(feature);
}

export const mrrOf = (t: Tenant) => (t.status === "suspended" || t.stage === "churned" ? 0 : planPrice(t.plan, t.cycle));

export const onboardingProgress = (t: Tenant) => Math.round((t.checklist.filter((c) => c.done).length / t.checklist.length) * 100);

/** The super admin signed into the platform console (demo). */
export const PLATFORM_USER = { name: "Kartik Mahajan", initials: "KM", email: "kartik@factoryerp.in", role: "Super admin" };
