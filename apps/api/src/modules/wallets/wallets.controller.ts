import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from "@nestjs/swagger";
import { z } from "zod";
import type { Request } from "express";
import {
  AttachWalletSchema,
  VerifyChallengeSchema,
  ListWalletsQuerySchema,
} from "@nanoproof/shared/schemas/wallet.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import {
  ApiKeyGuard,
  CurrentPrincipal,
  Public,
  RequireScopes,
  type Principal,
} from "../../common/decorators/index.js";
import { IdempotencyInterceptor } from "../../common/interceptors/idempotency.interceptor.js";
import { ApiKeyScope } from "@prisma/client";
import { WalletsService } from "./wallets.service.js";

@ApiTags("wallets")
@ApiProduces("application/json")
@Controller({ path: "v1/wallets", version: undefined })

@UseInterceptors(IdempotencyInterceptor)
export class WalletsController {
  constructor(private readonly wallets: WalletsService) {}

  @Post()
  @RequireScopes(ApiKeyScope.WRITE_CITATIONS)
  @ApiBearerAuth("ApiKeyAuth")
  @HttpCode(201)
  @ApiOperation({ summary: "Attach a wallet to a Creator (status=UNVERIFIED).", operationId: "attachWallet" })
  async attach(
    @Body(new ZodValidationPipe(AttachWalletSchema))
    body: z.infer<typeof AttachWalletSchema>,
  ) {
    return this.wallets.attach(body);
  }

  @Get()
  @RequireScopes(ApiKeyScope.READ_CITATIONS)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "List wallets for a Creator.", operationId: "listWallets" })
  async list(
    @Query(new ZodValidationPipe(ListWalletsQuerySchema, "query")) q: z.infer<typeof ListWalletsQuerySchema>,
  ) {
    return this.wallets.listByCreator(q.creatorId, {
      limit: q.limit,
      ...(q.cursor ? { cursor: q.cursor } : {}),
    });
  }

  @Get(":id")
  @RequireScopes(ApiKeyScope.READ_CITATIONS)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "Get a wallet by id." })
  async findOne(@Param("id") id: string) {
    return this.wallets.findById(id);
  }

  @Post(":id/challenge")
  @Public()
  @ApiOperation({
    summary: "Issue an EIP-191 challenge (10-min TTL). Sign the message and call verify.",
    operationId: "issueWalletChallenge",
  })
  @ApiOkResponse({ description: "ChallengeBundle with the canonical message to sign." })
  async challenge(
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    return this.wallets.issueChallenge(id, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] ?? undefined,
    });
  }

  @Post(":id/verify")
  @HttpCode(200)
  @ApiOperation({ summary: "Submit the EIP-191 signature. On success → VERIFIED + isPrimary.", operationId: "verifyWallet" })
  async verify(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(VerifyChallengeSchema)) body: z.infer<typeof VerifyChallengeSchema>,
  ) {
    return this.wallets.verifyChallenge(id, body);
  }

  @Delete(":id")
  @RequireScopes(ApiKeyScope.WRITE_CITATIONS)
  @ApiBearerAuth("ApiKeyAuth")
  @HttpCode(204)
  @ApiOperation({ summary: "Detach a wallet." })
  async remove(@Param("id") id: string, @CurrentPrincipal() principal: Principal) {
    await this.wallets.detach(id, principal.kind === "creator" ? principal.id : "");
  }
}
