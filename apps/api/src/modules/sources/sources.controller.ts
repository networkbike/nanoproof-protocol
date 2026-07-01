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
  ApiOperation,
  ApiProduces,
  ApiTags,
} from "@nestjs/swagger";
import { z } from "zod";
import {
  CreateSourceSchema,
  ListSourcesQuerySchema,
  StartSourceVerificationSchema,
} from "@nanoproof/shared/schemas/source.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import {
  ApiKeyGuard,
  CurrentPrincipal,
  Public,
  RequireScopes,
  type Principal,
} from "../../common/decorators/index.js";
import { ApiKeyScope } from "@prisma/client";
import { SourcesService } from "./sources.service.js";

@ApiTags("sources")
@ApiProduces("application/json")
@Controller({ path: "v1/sources", version: undefined })

export class SourcesController {
  constructor(private readonly sources: SourcesService) {}

  @Post()
  @RequireScopes(ApiKeyScope.WRITE_CITATIONS)
  @ApiBearerAuth("ApiKeyAuth")
  @HttpCode(201)
  @ApiOperation({ summary: "Register a Source (status=PENDING_VERIFICATION).", operationId: "createSource" })
  async create(
    @Body(new ZodValidationPipe(CreateSourceSchema)) body: z.infer<typeof CreateSourceSchema>,
  ) {
    return this.sources.create(body);
  }

  @Get()
  @RequireScopes(ApiKeyScope.READ_CITATIONS)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "List Sources for a Creator.", operationId: "listSources" })
  async list(
    @Query(new ZodValidationPipe(ListSourcesQuerySchema, "query")) q: z.infer<typeof ListSourcesQuerySchema>,
  ) {
    return this.sources.list({
      creatorId: q.creatorId,
      limit: q.limit,
      ...(q.cursor ? { cursor: q.cursor } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.q ? { q: q.q } : {}),
    });
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get a Source by id." })
  async findOne(@Param("id") id: string) {
    return this.sources.findById(id);
  }

  @Post(":id/verifications")
  @RequireScopes(ApiKeyScope.WRITE_CITATIONS)
  @ApiBearerAuth("ApiKeyAuth")
  @HttpCode(201)
  @ApiOperation({ summary: "Start a verification challenge (DNS_TXT / HTML_META / FILE_UPLOAD / MANUAL).", operationId: "startSourceVerification" })
  async startVerification(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(StartSourceVerificationSchema)) body: z.infer<typeof StartSourceVerificationSchema>,
  ) {
    return this.sources.startVerification(id, body.method);
  }

  @Post(":id/verifications/run")
  @RequireScopes(ApiKeyScope.WRITE_CITATIONS)
  @ApiBearerAuth("ApiKeyAuth")
  @HttpCode(200)
  @ApiOperation({ summary: "Run the probers — flips Source.status to ACTIVE on first SUCCESS." })
  async runVerification(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(StartSourceVerificationSchema)) body: z.infer<typeof StartSourceVerificationSchema>,
  ) {
    return this.sources.runVerification(id, body.method);
  }

  @Get(":id/verifications")
  @RequireScopes(ApiKeyScope.READ_CITATIONS)
  @ApiBearerAuth("ApiKeyAuth")
  @ApiOperation({ summary: "List the verification attempts on a Source." })
  async verifications(@Param("id") id: string) {
    return this.sources.listVerifications(id);
  }

  @Delete(":id")
  @RequireScopes(ApiKeyScope.WRITE_CITATIONS)
  @ApiBearerAuth("ApiKeyAuth")
  @HttpCode(204)
  @ApiOperation({ summary: "Archive a Source." })
  async archive(@Param("id") id: string, @CurrentPrincipal() principal: Principal) {
    await this.sources.archive(id, principal.kind === "creator" ? principal.id : "");
  }
}
