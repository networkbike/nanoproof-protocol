/**
 * Premium endpoints — protected by the x402 payment middleware.
 *
 * When called without a valid X-PAYMENT header, the middleware returns
 * HTTP 402 + PAYMENT-REQUIRED header with the x402 challenge JSON.
 * When called with a valid X-PAYMENT (or in demo mode, any header), the
 * handler runs and returns the protected resource.
 */

import { Controller, Get, Query, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { X402Service } from "../../x402/x402.service.js";
import { createX402Guard } from "../../x402/x402.middleware.js";
import { Public } from "../../common/decorators/index.js";
import { NPError } from "../../common/errors/np.error.js";

@ApiTags("premium")
@Controller("v1/premium")
export class PremiumController {
  constructor(private readonly x402: X402Service) {}

  /**
   * GET /v1/premium/research/answer?q=...
   *
   * Premium research query — gated by x402 payment of $0.01 USDC.
   * In demo mode (NANOPROOF_DEMO_MODE=true), the guard accepts any request.
   * In production, the client must sign the 402 challenge and retry.
   */
  @Public()
  @Get("research/answer")
  @ApiOperation({
    summary: "Premium research answer (gated by x402 payment of $0.01)",
    operationId: "premiumResearchAnswer",
  })
  async researchAnswer(
    @Query("q") q: string | undefined,
    @Req() req: Request & { headers: Record<string, string | string[] | undefined> } & { headers: Record<string, string | string[] | undefined> },
  ): Promise<{
    answer: string;
    paidBy: string | null;
    paymentRequestId: string | null;
  }> {
    if (!q) {
      throw new NPError("NP_VALIDATION_FAILED", {
        message: "Query parameter 'q' is required",
      });
    }

    // If we have a payment-request-id header (set by the middleware after
    // settling), return that context. Otherwise return a stub answer for
    // demo mode (where the middleware bypasses the challenge).
    const paymentRequestId =
      (req.headers["x-payment-request-id"] as string | undefined) ?? null;

    return {
      answer: `Premium research result for query "${q}": [DEMO] In production this would call the research pipeline and return a citation-rich answer.`,
      paidBy: paymentRequestId ? "0x90F79bf6EB2c4f870365E785982E1f101E93b906" : null,
      paymentRequestId,
    };
  }
}

/**
 * Factory that wires the x402 guard onto the premium controller.
 * Imported from premium.module.ts so the guard is applied at module-level.
 */
export function createPremiumGuard(x402: X402Service) {
  return createX402Guard(x402, {
    creatorId: "cr_demo_alice", // TODO: derive from request path
    resource: "/v1/premium/research/answer",
    amountUsdc: "10000", // $0.01
    description: "Premium research answer — citation-rich AI output",
    paymentRequestIdFromRequest: (req) => req.query.requestId as string | undefined,
  });
}