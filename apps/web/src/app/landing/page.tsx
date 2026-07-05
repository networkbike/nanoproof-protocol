"use client"
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type */
;

import Link from "next/link";
import { useState } from "react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <LandingNav />
      <Hero />
      <HowItWorks />
      <ValueProps />
      <Protocol />
      <Architecture />
      <Benefits />
      <CTA />
      <Footer />
    </div>
  );
}

function LandingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/landing" className="flex items-center gap-2">
          <Logo />
          <span className="font-bold text-slate-900">NanoProof</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
          <Link href="#how-it-works" className="hover:text-slate-900">How it works</Link>
          <Link href="#protocol" className="hover:text-slate-900">Protocol</Link>
          <Link href="#architecture" className="hover:text-slate-900">Architecture</Link>
          <Link href="/docs" className="hover:text-slate-900">Docs</Link>
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/sign-in"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            Sign in
          </Link>
          <Link
            href="/demo"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            Launch demo →
          </Link>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden rounded p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white px-6 py-4 space-y-3">
          <Link href="#how-it-works" className="block text-sm text-slate-600">How it works</Link>
          <Link href="#protocol" className="block text-sm text-slate-600">Protocol</Link>
          <Link href="#architecture" className="block text-sm text-slate-600">Architecture</Link>
          <Link href="/docs" className="block text-sm text-slate-600">Docs</Link>
          <div className="flex gap-2 pt-2">
            <Link href="/sign-in" className="flex-1 rounded-md border border-slate-200 px-4 py-2 text-center text-sm font-medium">Sign in</Link>
            <Link href="/demo" className="flex-1 rounded-md bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white">Launch demo</Link>
          </div>
        </div>
      )}
    </header>
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

function Hero() {
  return (
    <section data-tour-id="landing-hero" className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(168,85,247,0.10),transparent_50%)]" />
      </div>
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-20 lg:pt-24 lg:pb-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Live on Arc testnet · Phase 8 · Lepton Hackathon
          </div>
          <h1 className="mt-6 text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
            Citation-level USDC{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              nanopayments
            </span>{" "}
            for the agent economy
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            NanoProof is the open infrastructure layer that lets AI agents automatically pay creators
            in USDC whenever their work is cited — using the x402 protocol, settled on Arc, and
            verified on ArcScan.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/demo"
              className="group inline-flex items-center gap-2 rounded-md bg-slate-900 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800"
            >
              Launch Demo
              <span className="transition group-hover:translate-x-0.5">→</span>
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
            >
              Sign in
            </Link>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("nanoproof:open-tour"));
                }
              }}
              className="inline-flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-6 py-3 text-base font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100"
            >
              <span>🎓</span>
              <span>Take a Tour</span>
            </button>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            No wallet. No subscription. No setup. Judge demo runs in 60 seconds.
          </p>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatPill label="402 challenges served" value="199+" />
          <StatPill label="Settlements" value="214" />
          <StatPill label="USDC distributed" value="$0.87" />
          <StatPill label="Unique supporters" value="5+" />
        </div>
      </div>
    </section>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Creator publishes premium content",
      body: "Publishes a research answer, source, citation, or any paywalled resource on NanoProof.",
      color: "indigo",
    },
    {
      n: "02",
      title: "x402 payment request generated",
      body: "NanoProof issues an HTTP 402 Payment Required challenge with a price in USDC and a validBefore window.",
      color: "purple",
    },
    {
      n: "03",
      title: "Supporter accesses the content",
      body: "An AI agent or human client hits the URL and receives the x402 challenge in the PAYMENT-REQUIRED header.",
      color: "pink",
    },
    {
      n: "04",
      title: "Payment signed and submitted",
      body: "The client signs an EIP-3009 transferWithAuthorization and posts it via PAYMENT-SIGNATURE.",
      color: "rose",
    },
    {
      n: "05",
      title: "Settled on Arc",
      body: "A facilitator broadcasts the USDC transfer on Arc testnet (chain id 5042002). Sub-second BFT finality.",
      color: "amber",
    },
    {
      n: "06",
      title: "Settlement Proof generated",
      body: "An immutable, hash-chained SettlementProof is created: hash = sha256(prevHash + canonical body).",
      color: "emerald",
    },
    {
      n: "07",
      title: "Verified on ArcScan",
      body: "Every settlement is verified against ArcScan Blockscout v2 API. Result stored as a VerificationEvent.",
      color: "cyan",
    },
    {
      n: "08",
      title: "Dashboard updates live",
      body: "Revenue, history, analytics, and protocol-wide metrics update in real time across the dashboard.",
      color: "blue",
    },
  ];
  return (
    <section id="how-it-works" className="bg-slate-50/50 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-base font-semibold text-indigo-600">How it works</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Eight steps from citation to settlement
          </p>
          <p className="mt-4 text-lg text-slate-600">
            Every step is open, hash-chained, and verifiable onchain.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <StepCard key={s.n} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({ n, title, body }: { n: string; title: string; body: string; color: string }) {
  return (
    <div className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="absolute -top-2 left-5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
        {n}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}

function ValueProps() {
  const props = [
    {
      title: "For Creators",
      body: "Earn USDC the moment your work is cited. No ads. No subscription gates. Every citation triggers a payment.",
      icon: "💎",
    },
    {
      title: "For Agents",
      body: "Pay for citations with a single HTTP header. No accounts, no SDKs, no tokens to manage. Just HTTP 402.",
      icon: "🤖",
    },
    {
      title: "For the Web",
      body: "Open infrastructure. MIT licensed. Apache 2.0 x402 standard. Anyone can run a node.",
      icon: "🌐",
    },
  ];
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {props.map((p) => (
            <div key={p.title} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:shadow-md">
              <div className="text-3xl">{p.icon}</div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">{p.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Protocol() {
  return (
    <section id="protocol" className="bg-slate-900 py-20 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-base font-semibold text-indigo-400">The protocol</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            x402 + EIP-3009 + Arc + ArcScan
          </p>
          <p className="mt-4 text-lg text-slate-300">
            Built on open standards. No proprietary payment rails.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <ProtocolCard
            name="x402"
            tag="HTTP 402 Payment Required"
            body="Coinbase's open standard for HTTP 402 payments. The server returns 402 with a PAYMENT-REQUIRED header containing a base64-encoded challenge. The client responds with PAYMENT-SIGNATURE. The server confirms with PAYMENT-RESPONSE."
            color="indigo"
          />
          <ProtocolCard
            name="EIP-3009"
            tag="Gasless USDC transfers"
            body="USDC's native transferWithAuthorization lets the client sign an offchain authorization. The facilitator submits it onchain and pays gas. The client never needs ETH."
            color="purple"
          />
          <ProtocolCard
            name="Arc"
            tag="Stablecoin-native L1"
            body="Circle's L1 built around USDC. Sub-second BFT finality, sub-cent fees, USDC-native gas. Chain id 5042002 on testnet."
            color="pink"
          />
          <ProtocolCard
            name="ArcScan"
            tag="Public onchain verification"
            body="Blockscout v2 explorer at testnet.arcscan.app. Every settlement is verified via its txHash. The result is stored as an append-only VerificationEvent."
            color="cyan"
          />
        </div>

        <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-950 p-6 font-mono text-xs text-slate-300">
          <div className="text-slate-500"># x402 challenge</div>
          <pre className="mt-2 overflow-x-auto">{`{
  "x402Version": 1,
  "scheme": "exact",
  "network": "eip155:5042002",
  "resource": "/v1/research/cite",
  "payTo": "0xCreator...",
  "maxAmountRequired": "1000",
  "asset": "0x3600...0000",
  "nonce": "0xa1b2c3d4...",
  "validBefore": "2026-07-03T15:00:00Z"
}`}</pre>
        </div>
      </div>
    </section>
  );
}

function ProtocolCard({ name, tag, body, color }: { name: string; tag: string; body: string; color: string }) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-950 p-6`}>
      <div className="flex items-baseline gap-3">
        <h3 className={`text-xl font-bold text-${color}-400`}>{name}</h3>
        <span className="text-xs text-slate-500">{tag}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{body}</p>
    </div>
  );
}

function Architecture() {
  return (
    <section id="architecture" className="py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-base font-semibold text-indigo-600">Architecture</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            From citation to immutable proof
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-5">
          {[
            { layer: "Client", desc: "AI agent or human", icon: "🤖" },
            { layer: "x402 gateway", desc: "402 challenge + verify", icon: "🚪" },
            { layer: "Facilitator", desc: "EIP-3009 submitter", icon: "📡" },
            { layer: "Arc L1", desc: "Settlement finality", icon: "⛓️" },
            { layer: "NanoProof", desc: "SettlementProof + verify", icon: "📜" },
          ].map((s, i) => (
            <div key={i} className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-2xl">{s.icon}</div>
              <div className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-500">{s.layer}</div>
              <div className="mt-1 text-sm text-slate-900">{s.desc}</div>
              {i < 4 && (
                <div className="absolute -right-2 top-1/2 hidden -translate-y-1/2 text-slate-300 lg:block">→</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  return (
    <section className="bg-slate-50/50 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-base font-semibold text-indigo-600">Why NanoProof</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              The first protocol to actually use HTTP 402
            </p>
            <p className="mt-4 text-lg text-slate-600">
              HTTP 402 has been reserved since 1991. NanoProof is the first production system
              that uses it the way the IETF intended — for autonomous machine-to-machine payments.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "Open standard — Apache 2.0, MIT licensed",
                "Sub-cent payments — $0.001 USDC per citation",
                "Sub-second finality — Arc BFT = 1 confirmation",
                "Gasless clients — EIP-3009 transfers",
                "Tamper-evident — hash-chained SettlementProofs",
                "Public verification — every tx on ArcScan",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <svg className="mt-1 h-5 w-5 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Use cases</div>
            <div className="mt-4 space-y-4">
              {[
                { title: "AI agent pays for research citation", amt: "$0.001 USDC" },
                { title: "AI agent pays for source verification", amt: "$0.005 USDC" },
                { title: "AI agent pays for premium answer", amt: "$0.01 USDC" },
                { title: "AI agent pays for tool invocation", amt: "$0.0025 USDC" },
              ].map((u) => (
                <div key={u.title} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                  <span className="text-sm text-slate-700">{u.title}</span>
                  <span className="font-mono text-xs font-semibold text-indigo-600">{u.amt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 px-8 py-16 text-center shadow-2xl sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            See the full demo in 60 seconds
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-indigo-100">
            No wallet. No crypto knowledge required. Click through the entire x402 → Arc → ArcScan flow.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-base font-semibold text-indigo-700 shadow-lg transition hover:bg-slate-50"
            >
              Launch Demo →
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-md border border-white/30 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <Logo />
              <span className="font-bold text-slate-900">NanoProof</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Open infrastructure for autonomous creator compensation.
            </p>
          </div>
          <FooterCol
            title="Product"
            links={[
              { href: "/demo", label: "Launch demo" },
              { href: "/sign-in", label: "Sign in" },
              { href: "/dashboard", label: "Dashboard" },
              { href: "/payments", label: "x402 Payments" },
            ]}
          />
          <FooterCol
            title="Docs"
            links={[
              { href: "/docs", label: "Documentation" },
              { href: "https://github.com/networkbike/nanoproof-protocol", label: "GitHub" },
              { href: "https://github.com/networkbike/nanoproof-protocol/blob/main/CHANGELOG.md", label: "Changelog" },
            ]}
          />
          <FooterCol
            title="Built for"
            links={[
              { href: "https://www.x402.org", label: "x402 protocol" },
              { href: "https://www.arc.network", label: "Arc L1" },
              { href: "https://testnet.arcscan.app", label: "ArcScan" },
              { href: "https://lepton.com", label: "Lepton Hackathon" },
            ]}
          />
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center">
          <div>© 2026 NanoProof Protocol. MIT licensed.</div>
          <div className="font-mono text-xs">v1.0.0-rc.1 · commit e519ba2</div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-slate-900">{title}</div>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-slate-600 hover:text-slate-900">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}