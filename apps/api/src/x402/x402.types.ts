/**
 * x402 protocol types — NanoProof Protocol, Phase 8.
 *
 * These mirror the on-the-wire shape of an x402 challenge, the signed
 * payment payload, and the server's settlement confirmation.
 *
 * Spec: https://github.com/coinbase/x402
 *
 * Every numeric amount is expressed in atomic units (e.g. USDC has
 * 6 decimals, so $0.01 = "10000"). Strings, not numbers, to preserve
 * precision.
 */

/**
 * A single acceptable payment option inside an x402 402 response.
 * A server can declare multiple accepts (different schemes, networks,
 * facilitators) — clients pick one and sign against its terms.
 */
export interface X402Accept {
  /** Payment scheme. "exact" = client pays the exact amount. */
  scheme: "exact" | "upto";
  /** CAIP-2 network identifier. We use eip155:5042002 for Arc testnet. */
  network: string;
  /** Atomic units, as a string to preserve precision. */
  maxAmountRequired: string;
  /** Resource URI being paid for. */
  resource: string;
  /** Human-readable description (shown in client UIs / wallet prompts). */
  description: string;
  /** MIME type of the protected resource. */
  mimeType?: string;
  /** JSON schema describing the resource output (Bazaar discovery). */
  outputSchema?: Record<string, unknown> | null;
  /** Recipient wallet (the creator's settlement address). */
  payTo: string;
  /** Payment timeout in seconds (how long the challenge is valid). */
  maxTimeoutSeconds: number;
  /** ERC-20 contract address of the payment asset (USDC on Arc). */
  asset: string;
  /** EIP-712 domain info for the asset (name + version). */
  extra?: {
    name?: string;
    version?: string;
    /** EIP-3009 validAfter (unix seconds) */
    validAfter?: number;
    /** EIP-3009 validBefore (unix seconds) */
    validBefore?: number;
    /** EIP-3009 nonce as 0x-prefixed 32-byte hex */
    nonce?: string;
  } | null;
}

/**
 * The full x402 challenge. Returned in the 402 response body AND as
 * the base64-encoded JSON in the PAYMENT-REQUIRED header.
 */
export interface X402PaymentRequired {
  x402Version: number;
  /** Each acceptable payment option. Clients pick one. */
  accepts: X402Accept[];
  /** Server-defined error message (e.g. "Payment required"). */
  error?: string;
}

/**
 * The client-side signed payload, sent back in the PAYMENT-SIGNATURE
 * header (base64-encoded). For EIP-3009, the payload is the
 * transferWithAuthorization tuple + signature.
 */
export interface X402PaymentPayload {
  x402Version: number;
  scheme: "exact" | "upto";
  network: string;
  payload: {
    /** EIP-3009 transferWithAuthorization fields */
    from: string;
    to: string;
    value: string; // atomic units
    validAfter: string; // unix seconds, as string
    validBefore: string; // unix seconds, as string
    nonce: string; // 0x-prefixed 32-byte hex
    /** v, r, s — ECDSA signature components */
    v: string;
    r: string;
    s: string;
  };
}

/**
 * Server's settlement confirmation, returned in the PAYMENT-RESPONSE
 * header (base64-encoded) on a 200 OK.
 */
export interface X402PaymentResponse {
  /** True if settlement confirmed onchain. */
  success: boolean;
  /** Onchain transaction hash. */
  transactionHash?: string;
  /** Block number of settlement. */
  blockNumber?: string;
  /** ArcScan URL for the transaction. */
  arcScanUrl?: string;
  /** Network identifier (CAIP-2). */
  network: string;
  /** ISO timestamp of settlement. */
  settledAt?: string;
  /** Optional human-readable message. */
  message?: string;
}

/**
 * Internal: a request to create an x402 payment challenge.
 */
export interface CreateChallengeInput {
  creatorId: string;
  resource: string;
  /** Atomic USDC. If omitted, looked up in PRICE_CATALOG or DEFAULT. */
  amountUsdc?: string;
  /** Description shown to the client / wallet. */
  description?: string;
  /** Override validity window (seconds). */
  validitySeconds?: number;
  /** Optional resourceId (Citation.id, Source.id, etc.) */
  resourceId?: string;
  /** Payer wallet (for supporter tracking). */
  payerAddress?: string;
  /** User-Agent of the client (for supporter metadata). */
  userAgent?: string;
}

/**
 * Internal: lifecycle status of a PaymentRequest.
 */
export type PaymentLifecycle =
  | "QUOTED"
  | "AUTHORIZED"
  | "SETTLED"
  | "EXPIRED"
  | "FAILED";