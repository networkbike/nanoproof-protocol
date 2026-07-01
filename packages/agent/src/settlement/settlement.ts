import type { Attribution, PaymentAllocation } from "../types/agent.js";
import { type NanoProofClient, type SettleResult } from "../core/client.js";

/**
 * Translate attribution rows into PaymentAllocation rows and (optionally)
 * settle them through the live NanoProof API.
 *
 * For the Lepton demo, `settleAttribution` is the "Payment Proof" panel:
 * we hit POST /v1/payments/settle and render the per-Creator settlement
 * back into the response.
 */
export async function settleAttribution(
  attribution: Attribution[],
  input: { client: NanoProofClient; responseId: string },
): Promise<PaymentAllocation[]> {
  if (attribution.length === 0) return [];

  // One settle call covers all PENDING citations for the responseId.
  const settled = await input.client.settleCitations({ responseId: input.responseId });

  // Map each Payment row to the Attribution it satisfies. The simplest
  // mapping: settle returns one Payment per Citation, grouped by Creator
  // (because the simulator round-trips `payment.creatorId`).
  const byCreator = groupByCreator(settled);

  return attribution.map((a) => {
    const payments = byCreator.get(a.creatorId) ?? [];
    const first = payments[0];
    const status = (first?.status as PaymentAllocation["status"] | undefined) ?? "PENDING";
    return {
      attribution: a,
      status,
      paymentId: first?.id ?? null,
      txHash: null,
      arcScanUrl: null,
      settledAt: first?.settledAt ?? null,
    } satisfies PaymentAllocation;
  });
}

function groupByCreator(payments: SettleResult[]): Map<string, SettleResult[]> {
  const m = new Map<string, SettleResult[]>();
  for (const p of payments) {
    const arr = m.get(p.creatorId) ?? [];
    arr.push(p);
    m.set(p.creatorId, arr);
  }
  return m;
}

export function totalPaidAtomic(allocations: PaymentAllocation[]): string {
  let total = 0n;
  for (const a of allocations) {
    if (a.status === "SETTLED") total += BigInt(a.attribution.payoutAtomic);
  }
  return total.toString();
}
