import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { Payment } from "@prisma/client";

/**
 * MVP payments service.
 *
 * Phase 4 (P4-001) replaces this with the full 8-stage pipeline
 * (Aggregate → Allocate → Quote → Sign x402 → Batch → Settle on Arc →
 * Anchor Receipt → Mirror).
 *
 * This skeleton simulates a settled Payment by writing a PENDING row
 * + a settled `Payment` row so the dashboard can render earnings.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async simulate(input: { creatorId: string; amountUsdc: string; sourceId?: string }): Promise<Payment> {
    return this.prisma.payment.create({
      data: {
        creatorId: input.creatorId,
        sourceId: input.sourceId ?? null,
        amountUsdc: input.amountUsdc,
        currency: "USDC",
        network: "ARC_TESTNET",
        status: "SETTLED",
        txHash: null, // populated in Phase 4
        arcScanUrl: null,
      },
    });
  }

  async listByCreator(creatorId: string): Promise<Payment[]> {
    return this.prisma.payment.findMany({ where: { creatorId }, orderBy: { settledAt: "desc" } });
  }
}