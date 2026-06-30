import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatUsd(atomic: string | number): string {
  const big = typeof atomic === "string" ? BigInt(atomic) : BigInt(Math.floor(atomic));
  const whole = big / 1_000_000n;
  const frac = big % 1_000_000n;
  return `${whole}.${frac.toString().padStart(6, "0")}`;
}