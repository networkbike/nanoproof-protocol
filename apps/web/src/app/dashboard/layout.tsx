import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BarChart3, Coins, FileText, Layers, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { DemoButton } from "@/components/dashboard/demo-button";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: Layers },
  { href: "/dashboard/creators", label: "Creators", icon: Users },
  { href: "/dashboard/citations", label: "Citations", icon: FileText },
  { href: "/dashboard/payments", label: "Payments", icon: Coins },
  { href: "/dashboard/protocol", label: "Protocol", icon: BarChart3 },
] as const;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
              <Wallet className="h-4 w-4" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">NanoProof</span>
              <span className="text-xs text-muted-foreground">Creator Analytics</span>
            </div>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            Back to home <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:px-8">
        <aside className="lg:w-48 lg:shrink-0">
          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
            {NAV.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  i === 0 && "lg:bg-muted lg:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <DemoModeBox />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

// Demo Mode card: the "Load Demo Dataset" one-click button for live demos.
// The button is a client component so we import lazily.
function DemoModeBox() {  return (
    <div className="mt-6 hidden rounded-lg border bg-gradient-to-br from-indigo-50 to-purple-50 p-4 dark:from-indigo-950/30 dark:to-purple-950/30 lg:block">
      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
        Lepton demo
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        One click to populate the dashboard with 100 creators, 500 sources, 1000 citations, 1000 payments.
      </p>
      <div className="mt-3">
        <DemoButton />
      </div>
    </div>
  );
}