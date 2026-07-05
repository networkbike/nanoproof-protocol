import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { TourProvider } from "../components/tour/tour-context";
import { TourOverlay } from "../components/tour/tour-overlay";
import { tourSteps } from "../components/tour/tour-steps";
import { TakeATourButton } from "../components/tour/tour-button";

export const metadata: Metadata = {
  title: "NanoProof Protocol — x402 Payments on Arc",
  description:
    "Open infrastructure for autonomous creator compensation. x402 payment protocol + Arc settlement proof + ArcScan verification. Built for the Lepton Hackathon.",
  keywords: ["x402", "Arc", "USDC", "nanopayments", "AI agents", "creators", "Coinbase", "Circle"],
  openGraph: {
    title: "NanoProof Protocol — x402 Payments on Arc",
    description: "x402 payment protocol + Arc settlement proof + ArcScan verification.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <TourProvider steps={tourSteps}>
          <header className="border-b">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <Link href="/landing" className="text-lg font-semibold">
                NanoProof
              </Link>
              <nav className="flex items-center gap-6 text-sm">
                <Link href="/creator" className="hover:underline">Creator</Link>
                <Link href="/supporter" className="hover:underline">Supporter</Link>
                <Link href="/payments" className="hover:underline">x402</Link>
                <Link href="/history" className="hover:underline">History</Link>
                <Link href="/dashboard" className="hover:underline">Analytics</Link>
                <Link href="/demo" className="hover:underline">Demo</Link>
                <Link href="/docs" className="hover:underline">Docs</Link>
              </nav>
              <div className="flex items-center gap-3">
                <TakeATourButton variant="ghost" />
                <Link
                  href="/sign-in"
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
          <TourOverlay />
        </TourProvider>
      </body>
    </html>
  );
}