/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type */
import { NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "https://nanoproof-api-production.up.railway.app";

interface PaymentRow {
  id: string;
  amountUsdc: string;
  status: string;
  createdAt: string;
  settledAt: string | null;
  txHash: string | null;
  arcScanUrl: string | null;
  resource?: string;
}

interface ProofRow {
  id: string;
  paymentHash: string;
  arcScanUrl: string;
  verificationStatus: string;
  createdAt: string;
}

/**
 * Aggregates the creator overview from backend APIs.
 *
 * For demo, we use cr_demo_alice as the canonical creator. In a real
 * multi-user deployment, the session JWT would resolve to a creatorId.
 */
export async function GET() {
  try {
    const [creatorRes, revenueRes, paymentsRes, proofsRes] = await Promise.all([
      fetch(`${API}/creators/cr_demo_alice`, { cache: "no-store" }).catch(() => null),
      fetch(`${API}/creators/cr_demo_alice/revenue`, { cache: "no-store" }).catch(() => null),
      fetch(`${API}/payments/history?limit=10`, { cache: "no-store" }).catch(() => null),
      fetch(`${API}/payments/history?limit=10`, { cache: "no-store" }).catch(() => null),
    ]);

    const creator = creatorRes?.ok ? await creatorRes.json() : null;
    const revenue = revenueRes?.ok ? await revenueRes.json() : null;
    const payments = paymentsRes?.ok ? await paymentsRes.json() : null;
    const proofs = proofsRes?.ok ? await proofsRes.json() : null;

    return NextResponse.json({
      creator: {
        id: creator?.id || "cr_demo_alice",
        handle: creator?.handle || "alice",
        displayName: creator?.displayName || "Alice",
        walletAddress: creator?.walletAddress || "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
      },
      revenue: {
        totalUsdcDisplay: revenue?.totalUsdcDisplay || "0.000000",
        totalUsdcRaw: revenue?.totalUsdcRaw || "0",
        settledPayments: revenue?.settledPayments || 0,
        uniqueSupporters: revenue?.uniqueSupporters || 0,
        pendingPayments: revenue?.pendingPayments || 0,
      },
      recentPayments: (payments?.payments || []).slice(0, 8).map((p: PaymentRow) => ({
        id: p.id,
        amountUsdc: p.amountUsdc,
        status: p.status,
        createdAt: p.createdAt,
        settledAt: p.settledAt,
        txHash: p.txHash,
        arcScanUrl: p.arcScanUrl,
        resource: "/v1/research/cite",
      })),
      recentProofs: (proofs?.proofs || []).slice(0, 8).map((pr: ProofRow) => ({
        id: pr.id,
        paymentHash: pr.paymentHash,
        arcScanUrl: pr.arcScanUrl,
        verificationStatus: pr.verificationStatus,
        createdAt: pr.createdAt,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load overview" },
      { status: 500 },
    );
  }
}