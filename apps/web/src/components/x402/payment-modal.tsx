"use client";

import * as React from "react";



/**
 * PaymentModal — modal overlay that displays an x402 challenge in
 * production-grade UI form: amount, network, recipient, EIP-3009 nonce,
 * etc. Mostly for inspection / debugging during the demo.
 *
 * Triggered via `window.dispatchEvent(new CustomEvent("x402:open-modal", { detail }))`
 * — keeps the modal decoupled from any one flow.
 */

import { useEffect, useState } from "react";
import type { X402PaymentRequired } from "../../lib/x402-client";

export function PaymentModal(): React.ReactElement | null {
  const [open, setOpen] = useState(false);
  const [challenge, setChallenge] = useState<X402PaymentRequired | null>(null);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as { challenge?: X402PaymentRequired };
      if (detail?.challenge) {
        setChallenge(detail.challenge);
        setOpen(true);
      }
    }
    window.addEventListener("x402:open-modal", handler);
    return () => window.removeEventListener("x402:open-modal", handler);
  }, []);

  if (!open || !challenge) return null;

  const accept = challenge.accepts[0];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 font-mono">
                x402 / HTTP 402 Payment Required
              </div>
              <h2 className="text-xl font-semibold text-slate-100 mt-1">Payment challenge</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-200 text-2xl"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {accept && (
            <div className="space-y-3 text-sm">
              <Row label="Scheme" value={accept.scheme} />
              <Row label="Network" value={accept.network} mono />
              <Row label="Amount (atomic USDC)" value={accept.maxAmountRequired} mono />
              <Row label="Resource" value={accept.resource} mono />
              <Row label="Description" value={accept.description} />
              <Row label="Recipient (payTo)" value={accept.payTo} mono />
              <Row label="Timeout (seconds)" value={String(accept.maxTimeoutSeconds)} />
              <Row label="Asset (USDC contract)" value={accept.asset} mono />
              {accept.extra && (
                <>
                  <Row label="EIP-3009 validAfter" value={String(accept.extra.validAfter ?? 0)} mono />
                  <Row label="EIP-3009 validBefore" value={String(accept.extra.validBefore ?? 0)} mono />
                  <Row label="EIP-3009 nonce" value={accept.extra.nonce ?? ""} mono />
                </>
              )}
            </div>
          )}

          <details className="text-xs">
            <summary className="text-slate-400 cursor-pointer hover:text-slate-200">
              Raw JSON (sent in 402 body + PAYMENT-REQUIRED header)
            </summary>
            <pre className="mt-2 bg-slate-950 p-3 rounded text-slate-300 overflow-x-auto">
              {JSON.stringify(challenge, null, 2)}
            </pre>
          </details>

          <div className="text-xs text-slate-500 italic pt-2 border-t border-slate-800">
            In demo mode this modal is informational only — the demo flow auto-signs and settles
            without a real wallet. In production the client would sign an EIP-712
            transferWithAuthorization here and retry with the PAYMENT-SIGNATURE header.
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }): React.ReactElement {
  return (
    <div className="flex items-start gap-2">
      <div className="text-slate-500 min-w-[180px]">{label}</div>
      <div className={`text-slate-200 break-all ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}