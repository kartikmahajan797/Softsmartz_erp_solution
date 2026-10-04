import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Operator terminal",
  description: "Shop-floor operator terminal — works offline",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0b2530",
};

export default function ShopfloorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
