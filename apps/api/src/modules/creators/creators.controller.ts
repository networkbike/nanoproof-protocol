import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
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
import { CreateCreatorSchema, UpdateCreatorSchema } from "@nanoproof/shared/schemas/creator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { ApiKeyGuard, Public, RequireScopes, CurrentPrincipal, type Principal } from "../../common/decorators/index.js";
import { ApiKeyScope } from "@prisma/client";
import { IdempotencyInterceptor } from "../../common/interceptors/idempotency.interceptor.js";
import { CreatorsService } from "./creators.service.js";

const ListCreatorsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
  q: z.string().min(1).max(100).optional(),
  isActive: z.coerce.boolean().optional(),
});

@ApiTags("creators")
@ApiProduces("application/json")
@Controller({ path: "v1/creators", version: undefined })
@UseInterceptors(IdempotencyInterceptor)
export class CreatorsController {
  constructor(private readonly creators: CreatorsService) {}

  @Public()
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "Create a Creator", operationId: "createCreator" })
  @ApiOkResponse({ description: "Creator created (idempotent on username collision)." })
  async create(
    @Body(new ZodValidationPipe(CreateCreatorSchema)) body: Parameters<CreatorsService["create"]>[0],
  ) {
    return this.creators.create(body);
  }

  @Get()
  @RequireScopes(ApiKeyScope.READ_CITATIONS, ApiKeyScope.READ_PAYMENTS)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "List creators", operationId: "listCreators" })
  async list(
    @Query(new ZodValidationPipe(ListCreatorsQuerySchema, "query")) opts: z.infer<typeof ListCreatorsQuerySchema>,
  ) {
    return this.creators.list({
      limit: opts.limit,
      ...(opts.cursor ? { cursor: opts.cursor } : {}),
      ...(opts.q ? { q: opts.q } : {}),
      ...(opts.isActive !== undefined ? { isActive: opts.isActive } : {}),
    });
  }

  @Get("me")
  @RequireScopes(ApiKeyScope.READ_CITATIONS)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "Returns the Creator authenticated by the current API key." })
  async me(@CurrentPrincipal() principal: Principal) {
    if (principal.kind !== "creator") {
      return null;
    }
    return this.creators.findById(principal.id);
  }

  @Get(":idOrUsername")
  @Public()
  @ApiOperation({ summary: "Get a Creator by id or username", operationId: "getCreator" })
  async findOne(@Param("idOrUsername") idOrUsername: string) {
    // Try id first (cr_…), fall back to username.
    if (idOrUsername.startsWith("cr_")) {
      return this.creators.findById(idOrUsername);
    }
    const creator = await this.creators.findByUsername(idOrUsername);
    if (!creator) {
      // 404 → NP_CREATOR_NOT_FOUND via service if we resolve via findById
      return this.creators.findById(idOrUsername);
    }
    return creator;
  }

  @Get(":id/stats")
  @RequireScopes(ApiKeyScope.READ_CITATIONS, ApiKeyScope.READ_PAYMENTS)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "Aggregated stats (wallets, sources, citations, earnings)." })
  async stats(@Param("id") id: string) {
    return this.creators.stats(id);
  }

  @Patch(":id")
  @RequireScopes(ApiKeyScope.WRITE_CITATIONS)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "Update a Creator." })
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateCreatorSchema)) body: Parameters<CreatorsService["update"]>[1],
  ) {
    return this.creators.update(id, body);
  }

  @Delete(":id")
  @HttpCode(204)
  @RequireScopes(ApiKeyScope.ADMIN)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "Soft-delete a Creator (purged after 30 days)." })
  async remove(@Param("id") id: string) {
    await this.creators.softDelete(id);
  }
}
