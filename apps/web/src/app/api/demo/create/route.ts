/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "https://nanoproof-api-production.up.railway.app";

/**
 * Demo step 1: create the payment request (x402 challenge).
 * Maps to backend POST /payments/create (or /x402/demo for the all-in-one).
 *
 * For the wizard we split it into two calls so the UI can show distinct
 * "challenge created" and "settlement finalised" events.
 */
export async function POST(req: NextRequest) {
  try {
    const { creatorHandle, resource, amountUsdc } = await req.json();

    // Map handle → creatorId
    const handleMap: Record<string, string> = {
      alice: "cr_demo_alice",
      bob: "cr_demo_bob",
      carol: "cr_demo_carol",
      dave: "cr_demo_dave",
    };
    const creatorId = handleMap[creatorHandle] || "cr_demo_alice";

    // Create the payment request
    const r = await fetch(`${API}/payments/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creatorId,
        resource,
        amountUsdc,
      }),
      cache: "no-store",
    });

    if (!r.ok) {
      // Fallback: try the one-click demo endpoint
      const r2 = await fetch(`${API}/x402/demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId,
          resource,
          amountUsdc,
        }),
        cache: "no-store",
      });
      const d = await r2.json();
      return NextResponse.json({
        creatorId,
        paymentRequestId: d.paymentRequestId,
        paymentId: d.payment?.id,
        proofId: d.proof?.id,
        txHash: d.payment?.txHash,
        arcScanUrl: d.payment?.arcScanUrl,
        verificationStatus: d.verification?.status,
      });
    }

    const data = await r.json();
    return NextResponse.json({
      creatorId,
      paymentRequestId: data.paymentRequest?.id || data.id,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create" },
      { status: 500 },
    );
  }
}