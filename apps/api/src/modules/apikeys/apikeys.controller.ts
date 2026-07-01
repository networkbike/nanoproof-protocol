import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
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
import {
  CreateApiKeySchema,
  ListApiKeysQuerySchema,
  RevokeApiKeySchema,
} from "@nanoproof/shared/schemas/apikey.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import {
  ApiKeyGuard,
  CurrentPrincipal,
  RequireScopes,
  type Principal,
} from "../../common/decorators/index.js";
import { ApiKeyScope } from "@prisma/client";
import { ApiKeysService } from "./apikeys.service.js";

@ApiTags("api-keys")
@ApiProduces("application/json")
@Controller({ path: "v1/api-keys", version: undefined })

export class ApiKeysController {
  constructor(private readonly keys: ApiKeysService) {}

  @Post()
  @RequireScopes(ApiKeyScope.ADMIN)
  @ApiBearerAuth("ApiKeyAuth")
  @HttpCode(201)
  @ApiOperation({
    summary: "Mint a new API key. The plaintext is shown ONCE — store it then.",
    operationId: "mintApiKey",
  })
  @ApiOkResponse({ description: "MintResult with both the row and the plaintext token." })
  async mint(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(CreateApiKeySchema)) body: z.infer<typeof CreateApiKeySchema>,
  ) {
    // Force scoping — non-ADMIN keys cannot mint.
    if (!principal.scopes.includes(ApiKeyScope.ADMIN)) {
      throw new (await import("../../common/errors/np.error.js")).NPError("NP_FORBIDDEN");
    }
    return this.keys.mint(body);
  }

  @Get()
  @RequireScopes(ApiKeyScope.ADMIN)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "List API keys for a Creator or Organization." })
  async list(
    @Query(new ZodValidationPipe(ListApiKeysQuerySchema, "query")) q: z.infer<typeof ListApiKeysQuerySchema>,
  ) {
    return this.keys.list({
      ...(q.creatorId ? { creatorId: q.creatorId } : {}),
      ...(q.organizationId ? { organizationId: q.organizationId } : {}),
    });
  }

  @Delete(":id")
  @RequireScopes(ApiKeyScope.ADMIN)
  @ApiBearerAuth("ApiKeyAuth")
  @HttpCode(200)
  @ApiOperation({ summary: "Revoke an API key." })
  async revoke(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(RevokeApiKeySchema)) body: z.infer<typeof RevokeApiKeySchema>,
    @CurrentPrincipal() principal: Principal,
  ) {
    if (principal.kind !== "creator" && principal.kind !== "organization") {
      throw new (await import("../../common/errors/np.error.js")).NPError("NP_FORBIDDEN");
    }
    return this.keys.revoke({
      id,
      ownerId: principal.id,
      ownerKind: principal.kind,
      ...(body.reason ? { reason: body.reason } : {}),
    });
  }
}
