import {
  BarChart3,
  Boxes,
  CheckCheck,
  Factory,
  IndianRupee,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  ShieldCheck,
  Crown,
  ShoppingCart,
  Truck,
  UsersRound,
  Waypoints,
} from "lucide-react";

export interface NavLeaf {
  label: string;
  href: string;
  /** Section header shown above this leaf in the sidebar. */
  group?: string;
  external?: boolean;
}

export interface NavModule {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Launcher tile colour (Odoo-style app grid). */
  tile: string;
  href: string;
  description: string;
  children?: NavLeaf[];
  /** Render as a single sidebar link; children stay searchable (⌘K) and the page has its own sub-nav. */
  flat?: boolean;
  /** Sidebar section header shown above this module. */
  section?: string;
}

export const NAV: NavModule[] = [
  {
    key: "dashboard", label: "Dashboard", icon: LayoutDashboard, tile: "bg-[#0d7377]", href: "/dashboard",
    description: "Today's production, dispatch, cash and alerts",
  },
  {
    key: "sales", label: "Sales", icon: ShoppingCart, tile: "bg-[#2459c2]", href: "/sales/orders",
    description: "Quotations, sales orders, deliveries",
    children: [
      { label: "Quotations", href: "/sales/quotations", group: "Orders" },
      { label: "Sales orders", href: "/sales/orders" },
      { label: "Delivery challans", href: "/sales/deliveries" },
      { label: "Sales returns", href: "/sales/returns" },
      { label: "Customers", href: "/sales/customers", group: "Masters" },
      { label: "Price lists", href: "/sales/price-lists" },
    ],
  },
  {
    key: "purchase", label: "Purchase", icon: Truck, tile: "bg-[#c2410c]", href: "/purchase/orders",
    description: "Requisitions, POs, GRN, bills with 3-way match",
    children: [
      { label: "Requisitions", href: "/purchase/requisitions", group: "Orders" },
      { label: "RFQs", href: "/purchase/rfqs" },
      { label: "Purchase orders", href: "/purchase/orders" },
      { label: "Goods receipts (GRN)", href: "/purchase/receipts" },
      { label: "Purchase bills", href: "/purchase/bills" },
      { label: "Purchase returns", href: "/purchase/returns" },
      { label: "Vendors", href: "/purchase/vendors", group: "Masters" },
    ],
  },
  {
    key: "inventory", label: "Inventory", icon: Boxes, tile: "bg-[#7c3aed]", href: "/inventory/stock",
    description: "Stock, items, ledger, counts",
    children: [
      { label: "Stock overview", href: "/inventory/stock", group: "Stock" },
      { label: "Stock ledger", href: "/inventory/movements" },
      { label: "Transfers & adjustments", href: "/inventory/adjustments" },
      { label: "Stock counts", href: "/inventory/counts" },
      { label: "Items", href: "/inventory/items", group: "Masters" },
      { label: "Warehouses", href: "/inventory/warehouses" },
    ],
  },
  {
    key: "manufacturing", label: "Manufacturing", icon: Factory, tile: "bg-[#b45309]", href: "/manufacturing/work-orders",
    description: "Plans, work orders, BOMs, work centres",
    children: [
      { label: "Production plans", href: "/manufacturing/plans", group: "Planning" },
      { label: "Work orders", href: "/manufacturing/work-orders" },
      { label: "Job cards", href: "/manufacturing/job-cards", group: "Shop floor" },
      { label: "Scrap & rework", href: "/manufacturing/scrap" },
      { label: "Sync exceptions", href: "/manufacturing/sync-exceptions" },
      { label: "Operator terminal", href: "/shopfloor", external: true },
      { label: "Bills of materials", href: "/manufacturing/boms", group: "Engineering" },
      { label: "Work centres", href: "/manufacturing/work-centres" },
    ],
  },
  {
    key: "jobwork", label: "Job-work", icon: Waypoints, tile: "bg-[#0f766e]", href: "/jobwork/challans",
    description: "Challans to job-workers, ITC-04",
    children: [
      { label: "Job-work challans", href: "/jobwork/challans" },
      { label: "ITC-04 report", href: "/jobwork/itc04" },
    ],
  },
  {
    key: "hr", label: "People", icon: UsersRound, tile: "bg-[#9333ea]", href: "/hr/employees",
    description: "Employees, attendance, shifts, leave, payroll inputs",
    children: [
      { label: "Employees", href: "/hr/employees", group: "Workforce" },
      { label: "Attendance", href: "/hr/attendance" },
      { label: "Shift roster", href: "/hr/roster" },
      { label: "Leave", href: "/hr/leave" },
      { label: "Payroll inputs", href: "/hr/payroll", group: "Pay" },
    ],
  },
  {
    key: "finance", label: "Finance & GST", icon: IndianRupee, tile: "bg-[#15803d]", href: "/finance/invoices",
    description: "Invoices, e-invoice, payments, ageing, Tally",
    children: [
      { label: "Invoices", href: "/finance/invoices", group: "Billing" },
      { label: "Credit & debit notes", href: "/finance/notes" },
      { label: "Receipts & payments", href: "/finance/payments" },
      { label: "Receivables & payables", href: "/finance/ageing" },
      { label: "e-Invoice & e-way bill", href: "/finance/einvoice", group: "GST" },
      { label: "Tally export", href: "/finance/tally" },
    ],
  },
  {
    key: "reports", label: "Reports", icon: BarChart3, tile: "bg-[#be123c]", href: "/reports",
    description: "Standard reports, order profitability",
    children: [
      { label: "All reports", href: "/reports" },
      { label: "Order profitability", href: "/reports/profitability" },
    ],
  },
  {
    key: "approvals", label: "Approvals", icon: CheckCheck, tile: "bg-[#a16207]", href: "/approvals",
    description: "Documents waiting for your decision",
  },
  {
    key: "admin", label: "Admin", icon: ShieldCheck, tile: "bg-[#0f766e]", href: "/settings/admin", section: "Administration",
    description: "Tenant admin: users, seats, security, support access, billing",
    children: [
      { label: "Admin home", href: "/settings/admin" },
      { label: "Users & roles", href: "/settings/users", group: "Access" },
      { label: "Terminals & operators", href: "/settings/terminals" },
      { label: "Support access", href: "/settings/support-access" },
      { label: "Audit log", href: "/settings/audit-log" },
      { label: "Plan & billing", href: "/settings/billing", group: "Subscription" },
      { label: "Data export", href: "/settings/data-export" },
    ],
  },
  {
    key: "settings", label: "Settings", icon: Settings, tile: "bg-[#475569]", href: "/settings",
    description: "Company, FY, masters, rules, templates, import",
    flat: true,
    children: [
      { label: "Company", href: "/settings", group: "Organisation" },
      { label: "Financial year & locks", href: "/settings/fiscal" },
      { label: "Master data", href: "/settings/masters", group: "Configuration" },
      { label: "Approval rules", href: "/settings/approval-rules" },
      { label: "Document templates", href: "/settings/templates" },
      { label: "Notifications", href: "/settings/notifications" },
      { label: "Data import", href: "/settings/import", group: "Data" },
    ],
  },
  {
    key: "platform", label: "Super admin", icon: Crown, tile: "bg-[#b45309]", href: "/platform",
    description: "Platform console: tenants, onboarding, billing, support",
    children: [
      { label: "Overview", href: "/platform", group: "Business" },
      { label: "Tenants", href: "/platform/tenants" },
      { label: "Onboard tenant", href: "/platform/tenants/new" },
      { label: "Onboarding pipeline", href: "/platform/pipeline" },
      { label: "Subscription billing", href: "/platform/billing" },
      { label: "Plans & features", href: "/platform/plans", group: "Operations" },
      { label: "Support access", href: "/platform/support" },
      { label: "System health", href: "/platform/health" },
      { label: "Platform staff", href: "/platform/staff", group: "Security" },
      { label: "Platform audit log", href: "/platform/audit" },
    ],
  },
];

const matches = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

/** The single module owning a path: longest matching link wins (e.g. /settings/admin → Admin, not Settings). */
export function moduleForPath(path: string) {
  let best: { m: NavModule; len: number } | null = null;
  for (const m of NAV) {
    for (const href of [m.href, ...(m.children ?? []).map((c) => c.href)]) {
      if (matches(path, href) && (!best || href.length > best.len)) best = { m, len: href.length };
    }
  }
  return best?.m ?? NAV.find((m) => path.startsWith(`/${m.key}`));
}

/** The sidebar leaf that owns a path (longest match within the module). */
export function leafForPath(m: NavModule, path: string) {
  return (m.children ?? []).filter((c) => matches(path, c.href)).sort((a, b) => b.href.length - a.href.length)[0];
}
