import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 2 });
const inr0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** ₹12,34,567.00 — Indian digit grouping. */
export const formatINR = (v: number) => inr.format(v);
/** ₹12,34,568 — whole rupees for dashboards. */
export const formatINR0 = (v: number) => inr0.format(v);
/** 12,34,567.5 */
export const formatNum = (v: number) => num.format(v);

/** Compact Indian units: ₹4.2 L, ₹1.3 Cr. */
export function formatLakh(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `₹${(v / 1e3).toFixed(1)} K`;
  return formatINR0(v);
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 02-Oct-2026 (DD-Mon-YYYY, unambiguous for Indian users). */
export function formatDate(iso: string | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}-${months[Number(m) - 1]}-${y}`;
}

export function formatDateTime(iso: string) {
  const t = iso.slice(11, 16);
  return `${formatDate(iso)} ${t}`;
}

/** Days from `from` to `to` (ISO dates). */
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(to.slice(0, 10)) - Date.parse(from.slice(0, 10))) / 864e5);
}

/** The app's fixed "today" so mock data reads consistently. */
export const TODAY = "2026-10-02";

/** Indian financial year label for a date: FY 2026-27. */
export function fiscalYear(iso: string) {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const start = m >= 4 ? y : y - 1;
  return `FY ${start}-${String(start + 1).slice(2)}`;
}

/** Amount in words, Indian system (for invoices). */
export function amountInWords(n: number): string {
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (x: number) => (x < 20 ? a[x] : `${b[Math.floor(x / 10)]}${x % 10 ? " " + a[x % 10] : ""}`);
  const three = (x: number) => (x >= 100 ? `${a[Math.floor(x / 100)]} Hundred${x % 100 ? " " + two(x % 100) : ""}` : two(x));
  const rupees = Math.floor(n);
  const paise = Math.round((n - rupees) * 100);
  const parts: string[] = [];
  const crore = Math.floor(rupees / 1e7);
  const lakh = Math.floor((rupees % 1e7) / 1e5);
  const thousand = Math.floor((rupees % 1e5) / 1e3);
  const rest = rupees % 1e3;
  if (crore) parts.push(`${three(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (rest) parts.push(three(rest));
  const words = parts.join(" ") || "Zero";
  return `Rupees ${words}${paise ? ` and ${two(paise)} Paise` : ""} Only`;
}
