import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { z } from "zod";
import { ApiKeyGuard, Public, RequireScopes } from "../../common/decorators/index.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { ApiKeyScope } from "@prisma/client";
import { PaymentsService } from "./payments.service.js";

const SettleRequestSchema = z.object({
  responseId: z.string().min(1).max(200),
  creatorId: z.string().optional(),
});

const SimulateRequestSchema = z.object({
  creatorId: z.string(),
  amountUsdc: z.string().regex(/^[0-9]+$/),
  sourceId: z.string().optional(),
});

@ApiTags("payments")
@Controller({ path: "v1/payments", version: undefined })
@UseGuards(ApiKeyGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /**
   * Phase 3 thin slice — when /v1/citations/detect returns citations,
   * the agent (or a server-side orchestrator) calls /settle with the
   * same responseId. We record one SETTLED Payment row per Citation.
   */
  @Public()
  @Post("settle")
  @HttpCode(200)
  @ApiOperation({
    summary: "Settle a Payment row for every PENDING citation of a responseId.",
    operationId: "settlePaymentsForResponse",
  })
  async settle(
    @Body(new ZodValidationPipe(SettleRequestSchema)) body: z.infer<typeof SettleRequestSchema>,
  ) {
    return this.payments.settle(body);
  }

  /** Backwards-compat from the MVP — single Payment row. */
  @Public()
  @Post("simulate")
  @HttpCode(200)
  @ApiOperation({ summary: "Deprecated. Use /settle instead." })
  async simulate(
    @Body(new ZodValidationPipe(SimulateRequestSchema)) body: z.infer<typeof SimulateRequestSchema>,
  ) {
    return this.payments.simulate(body);
  }

  @Get()
  @RequireScopes(ApiKeyScope.READ_PAYMENTS)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "List Payments for a Creator." })
  async list(@Query("creatorId") creatorId: string) {
    return this.payments.listByCreator(creatorId);
  }
}
