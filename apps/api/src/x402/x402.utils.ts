/**
 * x402 helper utilities — NanoProof Protocol, Phase 8.
 */

import { createHash, randomBytes } from "node:crypto";

/**
 * Generate a 32-byte EIP-3009 nonce as 0x-prefixed hex.
 *
 * Each PaymentRequest gets a unique nonce to prevent replay. The nonce
 * is also the cryptographic uniqueness key for the off-chain authorization.
 */
export function generateEip3009Nonce(): string {
  return "0x" + randomBytes(32).toString("hex");
}

/**
 * sha256 of a canonicalized payload, returned as 0x-prefixed hex.
 * Used for paymentHash (proof-of-payment key) and the immutable
 * settlement-proof hash chain.
 */
export function sha256Hex(input: string): string {
  return "0x" + createHash("sha256").update(input).digest("hex");
}

/**
 * Stable JSON serialization (sorted keys) — so the same logical
 * payload always produces the same hash, regardless of insertion order.
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map((v) => canonicalize(v)).join(",") + "]";
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ":" + canonicalize((value as Record<string, unknown>)[k]));
  return "{" + parts.join(",") + "}";
}

/**
 * Canonical JSON for x402 challenges — used as the hash input.
 */
export function canonicalizeChallenge(challenge: unknown): string {
  return canonicalize(challenge);
}

/**
 * Compute a synthetic (deterministic but unique) txHash for demo mode.
 *
 * In production this comes from the onchain receipt. For demo mode we
 * generate a tx-shaped hash from the payment-id so the UI can show a
 * clickable ArcScan link without requiring a real broadcast.
 *
 * Shape: 0x + 64 hex chars (Ethereum tx-hash compatible length).
 */
export function syntheticTxHash(seed: string): string {
  const h = createHash("sha256").update(`nanoproof:tx:${seed}`).digest("hex");
  return "0x" + h;
}

/**
 * Compute a synthetic block number for demo mode. Stable per seed.
 */
export function syntheticBlockNumber(seed: string): bigint {
  const h = createHash("sha256").update(`nanoproof:block:${seed}`).digest();
  // Take first 6 bytes as big-endian unsigned int (≤ 2^48 — fits comfortably)
  const n =
    (BigInt(h[0] ?? 0) << 40n) |
    (BigInt(h[1] ?? 0) << 32n) |
    (BigInt(h[2] ?? 0) << 24n) |
    (BigInt(h[3] ?? 0) << 16n) |
    (BigInt(h[4] ?? 0) << 8n) |
    BigInt(h[5] ?? 0);
  // Bias to 9_500_000+ (current Arc testnet block ~9.6M per docs) so the
  // synthetic block numbers look realistic in the UI.
  return 9_500_000n + (n % 500_000n);
}

/**
 * Convert atomic USDC string -> display string ($0.01 = "0.01").
 * USDC has 6 decimals.
 */
export function atomicToDisplay(amountAtomic: string, decimals = 6): string {
  if (!amountAtomic || amountAtomic === "0") return "0";
  const big = BigInt(amountAtomic);
  const factor = 10n ** BigInt(decimals);
  const whole = big / factor;
  const frac = big % factor;
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fracStr.length > 0 ? `${whole}.${fracStr}` : `${whole}`;
}

/**
 * Convert display USDC ("0.01") -> atomic string ("10000").
 * Throws on invalid input.
 */
export function displayToAtomic(amountDisplay: string, decimals = 6): string {
  const trimmed = amountDisplay.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Invalid amount: "${amountDisplay}"`);
  }
  const [whole, frac = ""] = trimmed.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt((whole ?? "0") + fracPadded).toString();
}

/**
 * Compute sha256 over a deterministic JSON serialization of an object.
 */
export function hashObject(obj: unknown): string {
  return sha256Hex(canonicalize(obj));
}