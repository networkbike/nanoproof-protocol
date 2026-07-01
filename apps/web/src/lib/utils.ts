import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Atomic USDC = USDC * 1_000_000 (6 decimals). The API returns bigint-precision
// amounts as decimal strings; we convert here to a human-readable USDC string.
export function formatUsd(atomic: string | number | bigint): string {
  let big: bigint;
  if (typeof atomic === "bigint") big = atomic;
  else if (typeof atomic === "string") big = BigInt(atomic);
  else big = BigInt(Math.floor(atomic));
  const whole = big / 1_000_000n;
  const frac = big % 1_000_000n;
  return `${whole}.${frac.toString().padStart(6, "0")}`;
}

// Compact USDC for KPI cards: "$5.00", "$0.001", "$1.23k".
export function formatUsdCompact(atomic: string | number | bigint): string {
  const n = Number(formatUsd(atomic));
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}k`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(6)}`;
}

// Format a big count with thousands separators.
export function formatCount(n: number | bigint): string {
  return Number(n).toLocaleString("en-US");
}

// Format a percentage [0, 1] -> "12.3%".
export function formatPct(p: number, digits = 1): string {
  return `${(p * 100).toFixed(digits)}%`;
}

// Relative time: "2h ago", "3d ago", "just now".
export function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 2592000) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

// Truncate an address: 0x1234…abcd
export function truncateAddress(addr: string, head = 6, tail = 4): string {
  if (addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}