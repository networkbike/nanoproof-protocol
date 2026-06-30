import { z } from "zod";
import { AtomicUsdcSchema } from "./source.js";

export const PaymentStatusSchema = z.enum(["PENDING", "QUOTED", "SETTLED", "CAPPED", "FAILED"]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const SimulatePaymentSchema = z.object({
  creatorId: z.string(),
  sourceId: z.string().optional(),
  amountUsdc: AtomicUsdcSchema,
  network: z.enum(["ARC_TESTNET", "ARC_MAINNET"]).default("ARC_TESTNET"),
});
export type SimulatePayment = z.infer<typeof SimulatePaymentSchema>;

export const PaymentSchema = z.object({
  id: z.string(),
  creatorId: z.string(),
  sourceId: z.string().nullable().optional(),
  amountUsdc: z.string(),
  currency: z.string(),
  network: z.string(),
  status: PaymentStatusSchema,
  txHash: z.string().nullable().optional(),
  arcScanUrl: z.string().nullable().optional(),
  settledAt: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type Payment = z.infer<typeof PaymentSchema>;