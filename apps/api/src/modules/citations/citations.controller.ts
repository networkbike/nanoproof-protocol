import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Query,
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
import { ApiKeyGuard, Public, RequireScopes } from "../../common/decorators/index.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { ApiKeyScope } from "@prisma/client";
import { CitationsService } from "./citations.service.js";

const DetectRequestSchema = z.object({
  responseId: z.string().min(1).max(200),
  responseText: z.string().min(1).max(50_000),
});

const SimulateRequestSchema = z.object({
  sourceId: z.string().min(1),
  snippet: z.string().min(1).max(2000),
  responseId: z.string().min(1).max(200),
});

@ApiTags("citations")
@ApiProduces("application/json")
@Controller({ path: "v1/citations", version: undefined })
@UseGuards(ApiKeyGuard)
export class CitationsController {
  constructor(private readonly citations: CitationsService) {}

  /**
   * Real detection — Phase 3 thin slice. Accepts an agent's response
   * text, extracts URLs, matches them against registered Sources, and
   * writes Citation rows for every match.
   */
  @Public()
  @Post("detect")
  @HttpCode(200)
  @Header("X-Citation-Receipt", "true")
  @ApiOperation({
    summary: "Detect citations in an agent response and resolve them to Sources.",
    operationId: "detectCitations",
  })
  @ApiOkResponse({
    description:
      "Citations + unresolved links + total USDC + resolved Creator IDs.",
  })
  async detect(
    @Body(new ZodValidationPipe(DetectRequestSchema)) body: z.infer<typeof DetectRequestSchema>,
  ) {
    const result = await this.citations.detect(body);
    return {
      responseId: result.responseId,
      citations: result.citations,
      unresolved: result.unresolved,
      totalUsdc: result.totalUsdc,
      resolvedCreatorIds: result.resolvedCreatorIds,
    };
  }

  /**
   * Backward-compat shim — accepts the old MVP body shape and forwards
   * into detect with the Source URL spliced into the response text.
   */
  @Public()
  @Post("simulate")
  @HttpCode(200)
  @ApiOperation({
    summary: "Deprecated. Forwarded to /detect with the Source URL spliced in.",
  })
  async simulate(
    @Body(new ZodValidationPipe(SimulateRequestSchema)) body: z.infer<typeof SimulateRequestSchema>,
  ) {
    const url = (await this.citations.findSourceUrl(body.sourceId)) ?? "";
    return this.citations.detect({
      responseId: body.responseId,
      responseText: url ? `${body.snippet} ${url}` : body.snippet,
    });
  }

  @Get()
  @RequireScopes(ApiKeyScope.READ_CITATIONS)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "List Citations for a Creator or by responseId." })
  async list(
    @Query("creatorId") creatorId?: string,
    @Query("responseId") responseId?: string,
  ) {
    if (responseId) return this.citations.listByResponseId(responseId);
    if (creatorId) return this.citations.listByCreator(creatorId);
    return [];
  }
}
