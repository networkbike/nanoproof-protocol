/**
 * x402 REST Controller — NanoProof Protocol, Phase 8.
 *
 * Public endpoints (no auth required):
 *   POST /payments/create         -> create x402 challenge
 *   POST /payments/settle         -> settle an authorized PaymentRequest
 *   POST /payments/verify         -> re-verify a settlement via ArcScan
 *   GET  /payments/:id            -> get payment + proof + events
 *   GET  /payments/history        -> list recent payments (filterable)
 *   GET  /payments/proof/:id      -> get a settlement proof
 *   GET  /creators/:id/revenue    -> aggregate revenue for a creator
 *   GET  /metrics                 -> protocol-wide counters
 *   GET  /supporters              -> recent supporters
 *   GET  /x402/demo               -> one-click demo flow (create+settle)
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { z } from "zod";
import { Public } from "../common/decorators/index.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { X402Service } from "./x402.service.js";
import { arcScanTxUrl } from "./x402.constants.js";
import type { X402PaymentRequired, X402PaymentResponse } from "./x402.types.js";

// -----------------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------------

const CreateSchema = z.object({
  creatorId: z.string().min(1).max(100),
  resource: z.string().min(1).max(500),
  amountUsdc: z.string().regex(/^[0-9]+$/).optional(),
  description: z.string().max(500).optional(),
  validitySeconds: z.number().int().min(10).max(3600).optional(),
  resourceId: z.string().min(1).max(100).optional(),
  payerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  userAgent: z.string().max(500).optional(),
});

const SettleSchema = z.object({
  requestId: z.string().min(1).max(100),
  payerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

const AuthorizeSchema = z.object({
  requestId: z.string().min(1).max(100),
  payerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/).optional(),
});

const VerifySchema = z.object({
  proofId: z.string().min(1).max(100),
});

const HistorySchema = z.object({
  creatorId: z.string().min(1).max(100).optional(),
  payerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  limit: z.number().int().min(1).max(200).optional(),
});

const DemoSchema = z.object({
  creatorId: z.string().min(1).max(100),
  resource: z.string().min(1).max(500).optional(),
  amountUsdc: z.string().regex(/^[0-9]+$/).optional(),
  payerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

// -----------------------------------------------------------------------------
// Controller
// -----------------------------------------------------------------------------

@ApiTags("x402")
@Controller()
export class X402Controller {
  constructor(private readonly x402: X402Service) {}

  /**
   * One-click demo flow for the Lepton judges:
   *   1. Create a challenge for the given creator/resource
   *   2. Implicitly authorize it (demo mode auto-signs)
   *   3. Settle (synthesizes an onchain tx)
   *   4. Trigger immediate ArcScan verification
   *   5. Return the full bundle: challenge + payment + proof + status
   */
  @Public()
  @Post("x402/demo")
  @HttpCode(200)
  @ApiOperation({
    summary: "One-click x402 demo flow (create + authorize + settle + verify)",
    operationId: "x402Demo",
  })
  async demo(
    @Body(new ZodValidationPipe(DemoSchema)) body: z.infer<typeof DemoSchema>,
  ): Promise<{
    challenge: X402PaymentRequired;
    paymentRequestId: string;
    payment: { id: string; txHash: string; arcScanUrl: string };
    proof: { id: string; paymentHash: string; verificationStatus: string };
    verification: { status: "VERIFIED" | "PENDING" | "FAILED" };
    response: X402PaymentResponse;
  }> {
    const { request, challenge } = await this.x402.createPaymentRequest({
      creatorId: body.creatorId,
      resource: body.resource ?? "/v1/research/cite",
      amountUsdc: body.amountUsdc,
      payerAddress: body.payerAddress,
    });
    const { payment, proof, response, verification } = await this.x402.settlePayment({
      requestId: request.id,
      payerAddress: body.payerAddress,
    });
    const verificationStatus = await verification;
    return {
      challenge,
      paymentRequestId: request.id,
      payment: {
        id: payment.id,
        txHash: payment.txHash ?? proof.txHash,
        arcScanUrl: payment.arcScanUrl ?? arcScanTxUrl(proof.txHash),
      },
      proof: {
        id: proof.id,
        paymentHash: proof.paymentHash,
        verificationStatus: proof.verificationStatus,
      },
      verification: verificationStatus,
      response,
    };
  }

  // -----------------------------------------------------------------------------
  // Endpoints
  // -----------------------------------------------------------------------------

  @Public()
  @Post("payments/create")
  @HttpCode(200)
  @ApiOperation({
    summary: "Create an x402 payment challenge (402 response payload)",
    operationId: "createPaymentRequest",
  })
  async create(
    @Body(new ZodValidationPipe(CreateSchema)) body: z.infer<typeof CreateSchema>,
  ): Promise<{
    paymentRequestId: string;
    challenge: X402PaymentRequired;
    challengeBase64: string;
  }> {
    const { request, challenge } = await this.x402.createPaymentRequest(body);
    return {
      paymentRequestId: request.id,
      challenge,
      challengeBase64: Buffer.from(JSON.stringify(challenge)).toString("base64"),
    };
  }

  @Public()
  @Post("payments/authorize")
  @HttpCode(200)
  @ApiOperation({
    summary: "Authorize a PaymentRequest after the client signs the challenge",
    operationId: "authorizePayment",
  })
  async authorize(
    @Body(new ZodValidationPipe(AuthorizeSchema)) body: z.infer<typeof AuthorizeSchema>,
  ) {
    const updated = await this.x402.authorizePayment(body.requestId, {
      payerAddress: body.payerAddress,
      signature: body.signature,
    });
    return {
      paymentRequestId: updated.id,
      status: updated.status,
      authorizedAt: updated.authorizedAt,
    };
  }

  @Public()
  @Post("payments/settle")
  @HttpCode(200)
  @ApiOperation({
    summary: "Settle an authorized PaymentRequest onchain (or simulated in demo mode)",
    operationId: "settlePayment",
  })
  async settle(
    @Body(new ZodValidationPipe(SettleSchema)) body: z.infer<typeof SettleSchema>,
  ) {
    const { payment, proof, response, verification } = await this.x402.settlePayment(body);
    const verificationStatus = await verification;
    return {
      paymentId: payment.id,
      txHash: payment.txHash,
      arcScanUrl: payment.arcScanUrl,
      proof: {
        id: proof.id,
        paymentHash: proof.paymentHash,
        verificationStatus: proof.verificationStatus,
      },
      verification: verificationStatus,
      response,
    };
  }

  @Public()
  @Post("payments/verify")
  @HttpCode(200)
  @ApiOperation({
    summary: "Re-verify a SettlementProof by calling ArcScan",
    operationId: "verifySettlement",
  })
  async verify(
    @Body(new ZodValidationPipe(VerifySchema)) body: z.infer<typeof VerifySchema>,
  ) {
    const status = await this.x402.verifySettlement(body.proofId);
    return { proofId: body.proofId, status };
  }

  @Public()
  @Get("payments/history")
  @ApiOperation({ summary: "List recent payments (optionally filtered)", operationId: "paymentHistory" })
  async history(@Query(new ZodValidationPipe(HistorySchema)) q: z.infer<typeof HistorySchema>) {
    return this.x402.getPaymentHistory(q);
  }


  @Public()
  @Get("payments/proof/:id")
  @ApiOperation({ summary: "Get a SettlementProof + its verification timeline", operationId: "getPaymentProof" })
  async getProof(@Param("id") id: string) {
    const result = await this.x402.getPaymentProof(id);
    if (!result) return { found: false, proofId: id };
    return {
      found: true,
      proof: result.proof,
      payment: result.payment,
      events: result.events,
    };
  }


  @Public()
  @Get("payments/:id")
  @ApiOperation({ summary: "Get a Payment + its SettlementProof + VerificationEvents", operationId: "getPayment" })
  async getPayment(@Param("id") id: string) {
    const result = await this.x402.getPayment(id);
    if (!result) return { found: false, paymentId: id };
    return {
      found: true,
      payment: result.payment,
      request: result.request,
      proof: result.proof,
      events: result.events,
    };
  }


  @Public()
  @Get("creators/:id/revenue")
  @ApiOperation({ summary: "Get aggregate revenue stats for a Creator", operationId: "creatorRevenue" })
  async creatorRevenue(@Param("id") id: string) {
    return this.x402.getCreatorRevenue(id);
  }

  @Public()
  @Get("metrics")
  @ApiOperation({ summary: "Get protocol-wide metrics", operationId: "protocolMetrics" })
  async metrics() {
    return this.x402.getProtocolMetrics();
  }

  @Public()
  @Get("supporters")
  @ApiOperation({ summary: "Get recent supporters (payer wallets)", operationId: "recentSupporters" })
  async supporters(@Query("limit") limit?: string) {
    const n = limit ? Math.min(parseInt(limit, 10) || 20, 100) : 20;
    return this.x402.getRecentSupporters(n);
  }
}