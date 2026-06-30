/**
 * Convert atomic USDC (string) → human-readable USD (string with 6 decimals).
 */
export function atomicUsdcToUsd(atomic: string): string {
  const big = BigInt(atomic);
  const whole = big / 1_000_000n;
  const frac = big % 1_000_000n;
  return `${whole}.${frac.toString().padStart(6, "0")}`;
}

/** Convert human-readable USD → atomic USDC. */
export function usdToAtomicUsd(usd: string): string {
  const parts = usd.split(".");
  const whole = parts[0] ?? "0";
  const frac = parts[1] ?? "";
  const padded = (frac + "000000").slice(0, 6);
  const big = BigInt(whole) * 1_000_000n + BigInt(padded);
  return big.toString();
}