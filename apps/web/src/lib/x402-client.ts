/**
 * x402 client — calls the api's x402 endpoints.
 */

import { api } from "./api.js";

export interface X402Accept {
  scheme: "exact" | "upto";
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: {
    name?: string;
    version?: string;
    validAfter?: number;
    validBefore?: number;
    nonce?: string;
  } | null;
}

export interface X402PaymentRequired {
  x402Version: number;
  accepts: X402Accept[];
  error?: string;
}

export interface PaymentRequestSummary {
  paymentRequestId: string;
  challenge: X402PaymentRequired;
  challengeBase64: string;
}

export interface SettlementProofSummary {
  id: string;
  paymentHash: string;
  txHash: string;
  blockNumber: string;
  blockTimestamp: string;
  arcScanUrl: string;
  network: string;
  amountUsdc: string;
  payerAddress: string;
  payeeAddress: string;
  verificationStatus: "PENDING" | "VERIFIED" | "FAILED" | "INCONCLUSIVE";
  verificationAttempts: number;
  lastCheckedAt: string | null;
  confirmedAt: string | null;
  prevHash: string;
  hash: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  creatorId: string;
  amountUsdc: string;
  currency: string;
  network: string;
  status: "PENDING" | "QUOTED" | "SETTLED" | "CAPPED" | "FAILED";
  txHash: string | null;
  arcScanUrl: string | null;
  blockNumber: string | null;
  settledAt: string | null;
  createdAt: string;
}

export interface VerificationEventRecord {
  id: string;
  proofId: string;
  txHash: string;
  status: string;
  confirmations: number;
  source: string;
  payload: Record<string, unknown>;
  blockNumber: string | null;
  errorMessage: string | null;
  checkedAt: string;
}

export interface PaymentDetail {
  found: boolean;
  payment?: PaymentRecord;
  proof?: SettlementProofSummary | null;
  request?: Record<string, unknown> | null;
  events?: VerificationEventRecord[];
}

export interface ProtocolMetrics {
  totalPayments: number;
  totalSettlements: number;
  totalVerifications: number;
  totalVerified: number;
  totalFailed: number;
  totalUsdcDistributed: string;
  totalUsdcDisplay: string;
  uniqueSupporters: number;
  uniqueCreators: number;
  x402ChallengesServed: number;
  x402PaymentsSettled: number;
  lastSettlementAt: string | null;
  lastVerifiedAt: string | null;
  updatedAt: string;
}

export interface CreatorRevenue {
  creatorId: string;
  totalPayments: number;
  settledPayments: number;
  totalUsdcSettled: string;
  totalUsdcDisplay: string;
  uniqueSupporters: number;
  firstSettlementAt: string | null;
  lastSettlementAt: string | null;
  byDay: Array<{ date: string; usdc: string; count: number }>;
}

export interface DemoResult {
  challenge: X402PaymentRequired;
  paymentRequestId: string;
  payment: { id: string; txHash: string; arcScanUrl: string };
  proof: { id: string; paymentHash: string; verificationStatus: string };
  verification: { status: "VERIFIED" | "PENDING" | "FAILED" };
  response: {
    success: boolean;
    transactionHash?: string;
    blockNumber?: string;
    arcScanUrl?: string;
    network?: string;
    settledAt?: string;
    message?: string;
  };
}

// -----------------------------------------------------------------------------
// Client
// -----------------------------------------------------------------------------

export const x402Client = {
  /** Create a payment challenge (the 402 response payload) */
  create: (input: {
    creatorId: string;
    resource: string;
    amountUsdc?: string;
    description?: string;
    payerAddress?: string;
  }) => api<PaymentRequestSummary>("/payments/create", { method: "POST", body: JSON.stringify(input) }),

  /** Authorize a challenge after the client signs */
  authorize: (input: { requestId: string; payerAddress?: string; signature?: string }) =>
    api<{ paymentRequestId: string; status: string; authorizedAt: string }>(
      "/payments/authorize",
      { method: "POST", body: JSON.stringify(input) },
    ),

  /** Settle an authorized payment (creates Payment + SettlementProof) */
  settle: (input: { requestId: string; payerAddress?: string }) =>
    api<{
      paymentId: string;
      txHash: string;
      arcScanUrl: string;
      proof: { id: string; paymentHash: string; verificationStatus: string };
      verification: { status: "VERIFIED" | "PENDING" | "FAILED" };
      response: Record<string, unknown>;
    }>("/payments/settle", { method: "POST", body: JSON.stringify(input) }),

  /** Re-verify a settlement via ArcScan */
  verify: (proofId: string) =>
    api<{ proofId: string; status: "VERIFIED" | "PENDING" | "FAILED" }>(
      "/payments/verify",
      { method: "POST", body: JSON.stringify({ proofId }) },
    ),

  /** Get a payment + proof + events */
  getPayment: (id: string) => api<PaymentDetail>(`/payments/${id}`),

  /** Get a proof + timeline */
  getProof: (id: string) =>
    api<{ found: boolean; proof?: SettlementProofSummary; payment?: PaymentRecord; events?: VerificationEventRecord[] }>(
      `/payments/proof/${id}`,
    ),

  /** List recent payments */
  history: (params: { creatorId?: string; payerAddress?: string; limit?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.creatorId) search.set("creatorId", params.creatorId);
    if (params.payerAddress) search.set("payerAddress", params.payerAddress);
    if (params.limit) search.set("limit", String(params.limit));
    return api<{
      payments: PaymentRecord[];
      proofs: SettlementProofSummary[];
      requests: Record<string, unknown>[];
    }>(`/payments/history?${search.toString()}`);
  },

  /** Aggregate revenue for a creator */
  revenue: (creatorId: string) => api<CreatorRevenue>(`/creators/${creatorId}/revenue`),

  /** Protocol-wide metrics */
  metrics: () => api<ProtocolMetrics>("/metrics"),

  /** Recent supporters */
  supporters: (limit = 20) => api<Array<{ address: string; totalPaid: string; totalPaidDisplay: string; totalPayments: number; lastSeenAt: string }>>(
    `/supporters?limit=${limit}`,
  ),

  /** One-click demo flow */
  demo: (input: { creatorId: string; resource?: string; amountUsdc?: string; payerAddress?: string }) =>
    api<DemoResult>("/x402/demo", { method: "POST", body: JSON.stringify(input) }),
};