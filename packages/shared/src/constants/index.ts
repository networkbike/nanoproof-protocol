/** Atomic USDC constants. */
export const USDC_DECIMALS = 6;
export const USDC_ATOMIC_PER_USD = 1_000_000n;

/** Default pricing. */
export const DEFAULT_CITATION_PRICE_ATOMIC = "1000"; // $0.001 / citation
export const DEFAULT_MIN_PAYOUT_ATOMIC = "100";       // $0.0001 minimum
export const DEFAULT_PERIOD_CAP_ATOMIC = "100000";   // $0.10 / agent / 24h

/** Rate limits (token-bucket per ApiKey). */
export const RATE_LIMIT_PER_MIN = 600;
export const RATE_LIMIT_BURST = 100;

/** Policy versions — stamped on every persisted row. */
export const POLICY_VERSION = {
  ce: "ce.v0.1.0",
  am: "am.v0.1.0",
  fp: "fp.v0.1.0",
  pe: "pe.v0.1.0",
} as const;