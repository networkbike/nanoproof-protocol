import Link from "next/link";

export const metadata = {
  title: "NanoProof Documentation",
  description: "Complete documentation for NanoProof Protocol — x402 + Arc + ArcScan.",
};

const SECTIONS = [
  {
    title: "Quick start",
    docs: [
      { slug: "/landing", title: "Landing page", desc: "What NanoProof does" },
      { slug: "/demo", title: "Interactive demo", desc: "Full x402 flow in 60 seconds" },
      { slug: "/sign-in", title: "Sign in", desc: "Email OTP auth" },
    ],
  },
  {
    title: "Demos",
    docs: [
      { slug: "/payments", title: "x402 payment flow", desc: "One-click settlement" },
      { slug: "/history", title: "Settlement history", desc: "All payments + proofs" },
      { slug: "/dashboard", title: "Analytics dashboard", desc: "Protocol-wide metrics" },
      { slug: "/research", title: "Research demo", desc: "Citation → payment" },
      { slug: "/simulate", title: "Simulator", desc: "Direct API access" },
    ],
  },
  {
    title: "Phase 8 — x402 + Arc",
    docs: [
      { slug: "https://github.com/networkbike/nanoproof-protocol/blob/main/docs/PHASE8.md", title: "PHASE8.md", desc: "Phase 8 overview" },
      { slug: "https://github.com/networkbike/nanoproof-protocol/blob/main/docs/X402_IMPLEMENTATION.md", title: "X402_IMPLEMENTATION.md", desc: "x402 protocol deep dive" },
      { slug: "https://github.com/networkbike/nanoproof-protocol/blob/main/docs/PAYMENT_FLOW.md", title: "PAYMENT_FLOW.md", desc: "Payment lifecycle" },
      { slug: "https://github.com/networkbike/nanoproof-protocol/blob/main/docs/ARC_SETTLEMENT.md", title: "ARC_SETTLEMENT.md", desc: "Arc + ArcScan details" },
      { slug: "https://github.com/networkbike/nanoproof-protocol/blob/main/docs/API_REFERENCE.md", title: "API_REFERENCE.md", desc: "Complete API reference" },
      { slug: "https://github.com/networkbike/nanoproof-protocol/blob/main/docs/PHASE8_AUDIT.md", title: "PHASE8_AUDIT.md", desc: "Production audit (10 dims)" },
    ],
  },
  {
    title: "Submission",
    docs: [
      { slug: "https://github.com/networkbike/nanoproof-protocol/blob/main/docs/JUDGE_GUIDE.md", title: "JUDGE_GUIDE.md", desc: "60-second judge walkthrough" },
      { slug: "https://github.com/networkbike/nanoproof-protocol/blob/main/docs/SUBMISSION.md", title: "SUBMISSION.md", desc: "Lepton submission answers" },
      { slug: "https://github.com/networkbike/nanoproof-protocol/blob/main/CHANGELOG.md", title: "CHANGELOG.md", desc: "Release notes" },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/landing" className="flex items-center gap-2">
            <Logo />
            <span className="font-bold text-slate-900">NanoProof</span>
          </Link>
          <Link href="/landing" className="text-sm text-slate-600 hover:text-slate-900">← Back</Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Documentation</h1>
        <p className="mt-2 text-lg text-slate-600">Everything you need to understand and run NanoProof.</p>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {SECTIONS.map((s) => (
            <div key={s.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">{s.title}</h2>
              <div className="mt-4 divide-y divide-slate-100">
                {s.docs.map((d) => (
                  <Link
                    key={d.slug}
                    href={d.slug}
                    target={d.slug.startsWith("http") ? "_blank" : undefined}
                    rel={d.slug.startsWith("http") ? "noreferrer" : undefined}
                    className="block py-3 hover:bg-slate-50 -mx-2 px-2 rounded transition"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="font-mono text-sm font-medium text-slate-900">{d.title}</div>
                      <div className="text-xs text-slate-500">{d.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-slate-900 p-8 text-white">
          <h2 className="text-2xl font-bold">Quick command-line test</h2>
          <p className="mt-2 text-slate-300">Run the entire x402 flow from your terminal:</p>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-300"><code>{`# One-click demo flow
curl -X POST https://nanoproof-api-production.up.railway.app/x402/demo \\
  -H "Content-Type: application/json" \\
  -d '{"creatorId":"cr_demo_alice","resource":"/v1/research/cite","amountUsdc":"1000"}'

# Check protocol-wide metrics
curl https://nanoproof-api-production.up.railway.app/metrics

# See recent settlements
curl "https://nanoproof-api-production.up.railway.app/payments/history?limit=5"

# Browse the API
open https://nanoproof-api-production.up.railway.app/api`}</code></pre>
        </div>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M3 12l4-7 4 7-4 7-4-7zm10 0l4-7 4 7-4 7-4-7z" fill="currentColor" />
      </svg>
    </span>
  );
}