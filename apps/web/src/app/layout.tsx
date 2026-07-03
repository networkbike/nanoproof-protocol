import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NanoProof Protocol — x402 Payments on Arc",
  description:
    "Open infrastructure for autonomous creator compensation. x402 payment protocol + Arc settlement proof + ArcScan verification. Built for the Lepton Hackathon.",
  keywords: ["x402", "Arc", "USDC", "nanopayments", "AI agents", "creators", "Coinbase", "Circle"],
  openGraph: {
    title: "NanoProof Protocol — x402 Payments on Arc",
    description:
      "x402 payment protocol + Arc settlement proof + ArcScan verification.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <a href="/" className="text-lg font-semibold">
              NanoProof
            </a>
            <nav className="flex items-center gap-6 text-sm">
              <a href="/dashboard" className="hover:underline">Dashboard</a>
              <a href="/payments" className="hover:underline">x402 Payments</a>
              <a href="/history" className="hover:underline">History</a>
              <a href="/simulate" className="hover:underline">Simulate</a>
              <a href="/research" className="hover:underline">Research</a>
              <a href="/api-keys" className="hover:underline">API Keys</a>
              <a href="/docs" className="hover:underline">Docs</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}