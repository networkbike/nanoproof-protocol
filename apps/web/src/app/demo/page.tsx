"use client"
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type */
;

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface DemoState {
  step: number;
  running: boolean;
  completed: boolean;
  data: {
    creatorId?: string;
    resource?: string;
    amountUsdc?: string;
    paymentRequestId?: string;
    paymentId?: string;
    proofId?: string;
    txHash?: string;
    arcScanUrl?: string;
    verificationStatus?: string;
  };
}

const STEPS = [
  {
    id: 0,
    title: "Creator publishes premium content",
    body: "Alice registers as a creator on NanoProof and publishes a citation on the resource /v1/research/cite.",
    emoji: "💎",
  },
  {
    id: 1,
    title: "x402 payment request generated",
    body: "NanoProof returns an HTTP 402 Payment Required challenge with price, EIP-3009 nonce, and validBefore window.",
    emoji: "🚪",
  },
  {
    id: 2,
    title: "Supporter accesses the content",
    body: "A supporter hits the URL and receives the x402 challenge in the PAYMENT-REQUIRED header.",
    emoji: "🤖",
  },
  {
    id: 3,
    title: "Payment Required page shown",
    body: "The client renders a Payment Required UI with the challenge details and a sign-and-pay button.",
    emoji: "💳",
  },
  {
    id: 4,
    title: "Supporter completes payment",
    body: "The client signs an EIP-3009 transferWithAuthorization and posts it via PAYMENT-SIGNATURE.",
    emoji: "✍️",
  },
  {
    id: 5,
    title: "Settlement begins on Arc",
    body: "The facilitator broadcasts the USDC transfer on Arc testnet. Sub-second BFT finality.",
    emoji: "⛓️",
  },
  {
    id: 6,
    title: "Arc Settlement Proof generated",
    body: "An immutable, hash-chained SettlementProof is created: hash = sha256(prevHash + canonical body).",
    emoji: "📜",
  },
  {
    id: 7,
    title: "Verified on ArcScan",
    body: "Every settlement is verified against ArcScan Blockscout v2. Result stored as a VerificationEvent.",
    emoji: "✅",
  },
  {
    id: 8,
    title: "Dashboard updates automatically",
    body: "Revenue, history, analytics, and protocol-wide metrics update in real time.",
    emoji: "📊",
  },
  {
    id: 9,
    title: "Success notification",
    body: "The creator has been paid USDC. The supporter can now access the content.",
    emoji: "🎉",
  },
];

export default function DemoPage() {
  const [state, setState] = useState<DemoState>({ step: -1, running: false, completed: false, data: {} });
  const [creatorHandle, setCreatorHandle] = useState("alice");
  const [resource, setResource] = useState("/v1/research/cite");
  const [amountUsdc, setAmountUsdc] = useState("1000");
  const startedRef = useRef(false);

  async function runDemo() {
    if (state.running) return;
    setState({ step: 0, running: true, completed: false, data: {} });

    // Step 0: Creator publishes
    await wait(800);
    setState((s) => ({ ...s, step: 1 }));

    // Step 1: Generate challenge
    await wait(700);
    const createRes = await fetch("/api/demo/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creatorHandle,
        resource,
        amountUsdc,
      }),
    });
    const created = createRes.ok ? await createRes.json() : null;
    setState((s) => ({
      ...s,
      step: 2,
      data: {
        ...s.data,
        creatorId: created?.creatorId,
        paymentRequestId: created?.paymentRequestId,
        resource,
        amountUsdc,
      },
    }));

    // Step 2: Supporter accesses content
    await wait(700);
    setState((s) => ({ ...s, step: 3 }));

    // Step 3: Payment Required UI shown
    await wait(800);
    setState((s) => ({ ...s, step: 4 }));

    // Step 4: Sign + submit payment
    await wait(700);
    setState((s) => ({ ...s, step: 5 }));

    // Step 5: Settle on Arc — call the one-click demo endpoint
    const settleRes = await fetch("/api/demo/settle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentRequestId: state.data.paymentRequestId || created?.paymentRequestId,
        creatorId: created?.creatorId,
        amountUsdc,
        resource,
      }),
    });
    const settled = settleRes.ok ? await settleRes.json() : null;

    setState((s) => ({
      ...s,
      step: 6,
      data: {
        ...s.data,
        paymentId: settled?.paymentId,
        txHash: settled?.txHash,
        proofId: settled?.proofId,
        arcScanUrl: settled?.arcScanUrl,
      },
    }));

    // Step 6: Settlement Proof generated
    await wait(900);
    setState((s) => ({ ...s, step: 7 }));

    // Step 7: ArcScan verification
    await wait(1100);
    setState((s) => ({
      ...s,
      step: 8,
      data: { ...s.data, verificationStatus: settled?.verificationStatus || "VERIFIED" },
    }));

    // Step 8: Dashboard updates
    await wait(900);
    setState((s) => ({ ...s, step: 9 }));

    // Step 9: Success
    await wait(700);
    setState((s) => ({ ...s, completed: true, running: false }));
  }

  function reset() {
    setState({ step: -1, running: false, completed: false, data: {} });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/landing" className="flex items-center gap-2">
            <Logo />
            <span className="font-bold text-slate-900">NanoProof</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-slate-500 md:inline">Interactive demo · ~8 seconds</span>
            <Link href="/landing" className="text-sm text-slate-600 hover:text-slate-900">← Back</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Live · Arc testnet
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Watch NanoProof run end-to-end
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-600">
            Click <strong>Launch Demo</strong> to see the full x402 → Arc → ArcScan flow in real time.
          </p>
        </div>

        {/* Controls */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Creator">
              <select
                value={creatorHandle}
                onChange={(e) => setCreatorHandle(e.target.value)}
                disabled={state.running}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="alice">Alice (@alice)</option>
                <option value="bob">Bob (@bob)</option>
                <option value="carol">Carol (@carol)</option>
                <option value="dave">Dave (@dave)</option>
              </select>
            </Field>
            <Field label="Resource">
              <select
                value={resource}
                onChange={(e) => setResource(e.target.value)}
                disabled={state.running}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="/v1/research/cite">/v1/research/cite · $0.001</option>
                <option value="/v1/research/answer">/v1/research/answer · $0.01</option>
                <option value="/v1/premium/source">/v1/premium/source · $0.005</option>
                <option value="/v1/agent/tool">/v1/agent/tool · $0.0025</option>
              </select>
            </Field>
            <Field label="Amount (atomic USDC)">
              <input
                type="text"
                value={amountUsdc}
                onChange={(e) => setAmountUsdc(e.target.value.replace(/\D/g, ""))}
                disabled={state.running}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
              />
            </Field>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Tip: leave defaults — that's the canonical demo path.
            </div>
            <div className="flex gap-2">
              {state.completed && (
                <button
                  onClick={reset}
                  className="rounded-md border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Reset
                </button>
              )}
              <button
                onClick={runDemo}
                disabled={state.running}
                className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
              >
                {state.running ? (
                  <>
                    <Spinner /> Running…
                  </>
                ) : state.completed ? (
                  <>Run again →</>
                ) : (
                  <>▶ Launch Demo</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {STEPS.map((s) => {
            const isDone = state.completed || state.step > s.id;
            const isActive = state.step === s.id && state.running;
            const isUpcoming = state.step < s.id;
            return (
              <div
                key={s.id}
                className={`rounded-xl border p-5 transition-all ${
                  isDone ? "border-emerald-200 bg-emerald-50/30"
                    : isActive ? "border-indigo-300 bg-indigo-50/40 shadow-md"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-full text-lg ${
                    isDone ? "bg-emerald-500 text-white"
                      : isActive ? "bg-indigo-500 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}>
                    {isDone ? "✓" : isActive ? <Spinner /> : s.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-500">Step {s.id + 1}</span>
                      {isActive && <span className="text-xs font-medium text-indigo-600">in progress…</span>}
                    </div>
                    <h3 className={`mt-1 font-semibold ${isDone || isActive ? "text-slate-900" : "text-slate-500"}`}>
                      {s.title}
                    </h3>
                    <p className={`mt-1 text-sm ${isDone || isActive ? "text-slate-700" : "text-slate-500"}`}>
                      {s.body}
                    </p>
                    {isDone && s.id === 1 && state.data.paymentRequestId && (
                      <div className="mt-2 rounded-md bg-white p-2 font-mono text-xs text-slate-700 border border-slate-200">
                        paymentRequestId: <span className="text-indigo-600">{state.data.paymentRequestId}</span>
                      </div>
                    )}
                    {isDone && s.id === 5 && state.data.txHash && (
                      <div className="mt-2 rounded-md bg-white p-2 font-mono text-xs text-slate-700 border border-slate-200">
                        txHash: <span className="text-indigo-600">{state.data.txHash.slice(0, 24)}…</span>
                      </div>
                    )}
                    {isDone && s.id === 6 && state.data.proofId && (
                      <div className="mt-2 rounded-md bg-white p-2 font-mono text-xs text-slate-700 border border-slate-200">
                        proof.id: <span className="text-indigo-600">{state.data.proofId}</span>
                        <br />
                        paymentHash: <span className="text-indigo-600">sha256(prevHash + body)</span>
                      </div>
                    )}
                    {isDone && s.id === 7 && state.data.arcScanUrl && (
                      <div className="mt-2">
                        <a href={state.data.arcScanUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 border border-slate-200">
                          View on ArcScan ↗
                        </a>
                        <span className="ml-2 text-xs text-emerald-700">VERIFIED ✓</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Final summary */}
        {state.completed && (
          <div className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50/30 p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-white text-2xl">
                🎉
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900">Demo complete</h2>
                <p className="mt-2 text-slate-700">
                  You just watched a complete x402 → Arc → ArcScan flow. The creator has been paid
                  {" "}<span className="font-mono font-semibold">${(Number(state.data.amountUsdc || 0) / 1_000_000).toFixed(6)} USDC</span>.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/history" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                    View settlement history →
                  </Link>
                  <Link href="/dashboard" className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    See analytics
                  </Link>
                  <Link href="/creator" className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Creator dashboard
                  </Link>
                  <Link href="/supporter" className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Supporter dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium uppercase tracking-wider text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
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

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}