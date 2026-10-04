import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set up your factory",
  description: "Guided onboarding: company, template, plant, opening balances and team",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
