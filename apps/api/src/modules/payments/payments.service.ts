import { Injectable, Logger } from "@nestjs/common";
import type { Payment } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service.js";
import { NPError } from "../../common/errors/np.error.js";

/**
 * Payments service.
 *
 * Phase 4 will replace the entire simulate() flow with the real 8-stage
 * Payment Engine. For now, settle() writes a SETTLED Payment row per
 * citation — the simulator round-trips testnet USDC symbolically, while
 * the wire format (amountUsdc, status, creatorId, sourceId) is identical
 * to what the real engine will produce.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Settle one Payment per Citation for the given responseId.
   *
   * Phase 4 — replace this with the actual Arc/Circle Gateway flow:
   *   1. Aggregate citations → PaymentIntent(s)
   *   2. Allocate to creators via splits
   *   3. Quote (x402 protocol)
   *   4. Sign → Batch → Settle on Arc
   *   5. Anchor Receipt
   *   6. Mirror to creators
   */
  async settle(input: { responseId: string; creatorId?: string }): Promise<Payment[]> {
    const citations = await this.prisma.citation.findMany({
      where: { responseId: input.responseId, status: "PENDING" },
      include: { source: { select: { creatorId: true } } },
    });
    if (citations.length === 0) {
      throw new NPError("NP_VALIDATION_FAILED", {
        message: "No PENDING citations for this responseId.",
        params: { responseId: input.responseId },
      });
    }

    const settled: Payment[] = [];
    for (const c of citations) {
      const creatorId = input.creatorId ?? c.source.creatorId;
      const payment = await this.prisma.payment.create({
        data: {
          creatorId,
          sourceId: c.sourceId,
          amountUsdc: c.payoutAmountUsdc,
          currency: "USDC",
          network: "ARC_TESTNET",
          status: "SETTLED",
          settledAt: new Date(),
        },
      });
      // Phase 4 will replace this UPDATE with append-only semantics + a
      // hash-chained Receipt. For now we just mark the Citation as paid.
      // NOTE: this UPDATE is on a column that is NOT blocked by the
      // append-only trigger (status is). The trigger blocks row mutation,
      // not the row's referenced fields.
      settled.push(payment);
      this.logger.log(
        `Payment settled: ${payment.amountUsdc} USDC → creator ${creatorId} (citation ${c.id})`,
      );
    }

    // Update citation status — but the trigger blocks UPDATE on citations.
    // So in Phase 0/3 the citation.status stays PENDING. Phase 4 introduces
    // a separate Receipt row keyed to Citation.id; that gets the status.
    return settled;
  }

  /** Backwards-compat shim from the MVP — single Payment row, no citations. */
  async simulate(input: { creatorId: string; amountUsdc: string; sourceId?: string }): Promise<Payment> {
    return this.prisma.payment.create({
      data: {
        creatorId: input.creatorId,
        sourceId: input.sourceId ?? null,
        amountUsdc: input.amountUsdc,
        currency: "USDC",
        network: "ARC_TESTNET",
        status: "SETTLED",
        settledAt: new Date(),
      },
    });
  }

  async listByCreator(creatorId: string): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      where: { creatorId },
      orderBy: { settledAt: "desc" },
    });
  }
}
