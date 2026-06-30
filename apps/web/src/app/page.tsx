import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="space-y-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Citation-level USDC payouts for the agent economy.
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          NanoProof is the open infrastructure layer that lets AI agents automatically compensate
          creators with USDC nanopayments whenever their work is cited in an AI-generated response.
        </p>
        <div className="flex justify-center gap-3">
          <Button asChild>
            <Link href="/dashboard">Open the dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/simulate">Run a simulation</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <Card title="Creator Registry" body="Register your handle, sources, and Arc wallet. Verified in seconds via EIP-191." />
        <Card title="Citation Engine" body="Detect when AI agents cite your work and resolve each citation to a Creator + vault." />
        <Card title="Payment Engine" body="Settle USDC on Arc via Circle Gateway + x402. Receipts on ArcScan in &lt;2s." />
      </section>
    </div>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}