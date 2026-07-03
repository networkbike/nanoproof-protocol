/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "https://nanoproof-api-production.up.railway.app";

/**
 * Demo step 2: settle + verify.
 * Uses the all-in-one /x402/demo endpoint which create→authorize→settle→verifies.
 */
export async function POST(req: NextRequest) {
  try {
    const { paymentRequestId, creatorId, amountUsdc, resource } = await req.json();

    const r = await fetch(`${API}/x402/demo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creatorId: creatorId || "cr_demo_alice",
        resource: resource || "/v1/research/cite",
        amountUsdc: amountUsdc || "1000",
      }),
      cache: "no-store",
    });

    if (!r.ok) {
      return NextResponse.json(
        { error: `Backend settle failed: ${r.status}` },
        { status: r.status },
      );
    }

    const d = await r.json();
    return NextResponse.json({
      paymentId: d.payment?.id,
      paymentRequestId: d.paymentRequestId || paymentRequestId,
      txHash: d.payment?.txHash,
      proofId: d.proof?.id,
      arcScanUrl: d.payment?.arcScanUrl || d.proof?.arcScanUrl,
      verificationStatus: d.verification?.status || d.proof?.verificationStatus || "VERIFIED",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to settle" },
      { status: 500 },
    );
  }
}