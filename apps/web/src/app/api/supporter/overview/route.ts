/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type */
import { NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "https://nanoproof-api-production.up.railway.app";

/**
 * Aggregates the supporter overview from backend APIs.
 *
 * Demo: derives from the live supporters list. Picks the top supporter
 * by totalPaid (most active) for the dashboard view. In a real multi-user
 * deployment, the session JWT resolves to the supporter address.
 */
export async function GET() {
  try {
    const [supportersRes, paymentsRes, metricsRes] = await Promise.all([
      fetch(`${API}/supporters?limit=20`, { cache: "no-store" }).catch(() => null),
      fetch(`${API}/payments/history?limit=20`, { cache: "no-store" }).catch(() => null),
      fetch(`${API}/metrics`, { cache: "no-store" }).catch(() => null),
    ]);

    const supporters = supportersRes?.ok ? await supportersRes.json() : [];
    const paymentsRaw = paymentsRes?.ok ? await paymentsRes.json() : null;
    const metrics = metricsRes?.ok ? await metricsRes.json() : null;

    // Top supporter (or first available)
    const top = supporters[0];

    // Aggregate from supporters list (the API gives us total per supporter)
    const totalPaymentsAcrossAll = supporters.reduce((s: number, x: any) => s + (x.totalPayments || 0), 0);
    const totalUsdcAcrossAll = supporters.reduce((s: number, x: any) => s + Number(x.totalPaidRaw || 0), 0);

    // Avg per payment
    const avgPayment = totalPaymentsAcrossAll > 0 ? (totalUsdcAcrossAll / totalPaymentsAcrossAll / 1_000_000).toFixed(6) : "0.000000";

    // Unique creators = distinct payTo addresses from supporters
    const uniqueCreators = new Set(supporters.map((s: any) => s.address).filter(Boolean)).size;

    return NextResponse.json({
      supporter: {
        address: top?.address || "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
      },
      spending: {
        totalUsdcDisplay: top?.totalPaidDisplay || "0.000000",
        totalUsdcRaw: top?.totalPaidRaw || "0",
        totalPayments: top?.totalPayments || 0,
        uniqueCreators,
        avgPaymentUsdc: avgPayment,
      },
      recentPayments: (paymentsRaw?.payments || []).slice(0, 10).map((p: any) => ({
        id: p.id,
        amountUsdc: p.amountUsdc,
        status: p.status,
        createdAt: p.createdAt,
        settledAt: p.settledAt,
        txHash: p.txHash,
        arcScanUrl: p.arcScanUrl,
        resource: "/v1/research/cite",
      })),
      recentCreators: supporters.slice(0, 6).map((s: any) => ({
        handle: s.handle || "creator",
        displayName: s.displayName || s.handle || "Creator",
        walletAddress: s.address,
        totalPaid: s.totalPaidDisplay || "0.000000",
        payments: s.totalPayments || 0,
      })),
      protocolStats: {
        totalSettlements: metrics?.totalSettlements || 0,
        totalVerified: metrics?.totalVerified || 0,
        uniqueSupporters: metrics?.uniqueSupporters || 0,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load overview" },
      { status: 500 },
    );
  }
}