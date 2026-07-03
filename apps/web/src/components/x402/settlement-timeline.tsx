"use client";

import * as React from "react";



/**
 * SettlementTimeline — visual timeline of the x402 payment lifecycle:
 * challenge → authorize → settle → verify. Each step shows its state
 * (running, done, failed) plus the relevant identifiers.
 *
 * Also embeds the ArcScan link and a "copy txHash" button.
 */

import type { DemoResult } from "../../lib/x402-client";
import { formatUsd } from "../../lib/utils";
import { VerificationBadge } from "./verification-badge";

interface Creator {
  id: string;
  username: string;
  name: string;
}

const ICONS = {
  receipt: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  key: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  ),
  lightning: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  shield: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  spinner: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </svg>
  ),
  arrow: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
};

export function SettlementTimeline({
  demo,
  creator,
}: {
  demo: DemoResult;
  creator?: Creator;
}): React.ReactElement {
  const accept = demo.challenge.accepts[0];

  const steps = [
    {
      icon: ICONS.receipt,
      title: "402 Payment Required",
      detail: `Server emitted challenge for ${accept?.resource ?? "resource"}`,
      state: "done" as const,
      id: demo.paymentRequestId,
    },
    {
      icon: ICONS.key,
      title: "Client authorized",
      detail: `Signed EIP-3009 nonce ${accept?.extra?.nonce?.slice(0, 14)}…`,
      state: "done" as const,
      id: demo.paymentRequestId,
    },
    {
      icon: ICONS.lightning,
      title: "Settled on Arc",
      detail: `Tx ${demo.payment.txHash.slice(0, 18)}…`,
      state: "done" as const,
      id: demo.payment.txHash,
    },
    {
      icon: ICONS.shield,
      title: "ArcScan verification",
      detail: `Block ${demo.response.blockNumber} · ${demo.verification.status}`,
      state: demo.verification.status === "VERIFIED" ? ("done" as const) : ("running" as const),
      id: demo.proof.id,
    },
  ];

  return (
    <div className="space-y-1">
      {steps.map((s, idx) => {
        const isLast = idx === steps.length - 1;
        return (
          <div key={s.title} className="flex gap-3">
            <div className="flex flex-col items-center pt-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center ${
                  s.state === "done"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                }`}
              >
                {s.state === "done" ? ICONS.check : ICONS.spinner}
              </div>
              {!isLast && <div className="w-px flex-1 bg-slate-700 my-1" />}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400">{s.icon}</span>
                <div className="text-sm font-medium text-slate-200">{s.title}</div>
                {idx === steps.length - 1 && (
                  <VerificationBadge status={demo.verification.status} />
                )}
              </div>
              <div className="text-xs text-slate-400 mt-0.5 break-all">{s.detail}</div>
              {idx === steps.length - 1 && (
                <div className="mt-2 space-y-1 text-xs">
                  <KV k="Payment ID" v={demo.payment.id} />
                  <KV k="Proof ID" v={demo.proof.id} />
                  <KV k="Payer" v="0x90F7…b906 (Demo AI Agent)" mono />
                  <KV k="Creator" v={creator ? `${creator.name} (${creator.username})` : demo.payment.id} />
                  <KV k="Amount" v={`$${formatUsd(accept?.maxAmountRequired ?? "0")} USDC`} />
                  <KV k="Block" v={demo.response.blockNumber ?? "—"} />
                </div>
              )}
              {idx === 2 && (
                <a
                  href={demo.payment.arcScanUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200"
                >
                  {ICONS.arrow}
                  Verify on ArcScan
                </a>
              )}
            </div>
          </div>
        );
      })}

      <div className="text-xs text-slate-500 italic pt-2 border-t border-slate-800">
        Demo mode synthesises Arc-shaped txHashes so the full flow runs without a real onchain
        broadcast. Switch off{" "}
        <code className="text-slate-300 bg-slate-800 px-1 rounded">NANOPROOF_DEMO_MODE</code> for
        production settlement.
      </div>
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }): React.ReactElement {
  return (
    <div className="flex items-start gap-2">
      <div className="text-slate-500 min-w-[80px]">{k}</div>
      <div className={`text-slate-300 break-all ${mono ? "font-mono" : ""}`}>{v}</div>
    </div>
  );
}