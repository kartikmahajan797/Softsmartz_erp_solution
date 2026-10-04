import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accept invitation",
  description: "Set up your Factory ERP workspace",
};

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
