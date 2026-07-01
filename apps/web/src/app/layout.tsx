import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NanoProof Protocol",
  description: "The open infrastructure layer for autonomous creator compensation.",
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
              <a href="/simulate" className="hover:underline">Simulate</a>
              <a href="/research" className="rounded-full bg-primary px-3 py-1 text-primary-foreground hover:opacity-90">Research Demo</a>
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