import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Devanagari } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexDeva = IBM_Plex_Sans_Devanagari({
  variable: "--font-plex-deva",
  subsets: ["devanagari"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: { default: "Factory ERP", template: "%s · Factory ERP" },
  description: "Factory-first cloud ERP for Indian SMEs",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plex.variable} ${plexDeva.variable} ${plexMono.variable} h-full`}>
      <body className="h-full">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: "!font-sans !text-sm !rounded-lg !border-line !shadow-pop",
          }}
        />
      </body>
    </html>
  );
}
