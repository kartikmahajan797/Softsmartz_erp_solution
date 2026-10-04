import { AppShell } from "@/components/shell/app-shell";

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
