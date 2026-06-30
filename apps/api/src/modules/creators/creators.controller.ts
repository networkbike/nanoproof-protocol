import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CreatorsService } from "./creators.service";

@ApiTags("Creators")
@Controller("v1/creators")
export class CreatorsController {
  constructor(private readonly creators: CreatorsService) {}

  @Post()
  async create(@Body() body: unknown) {
    return this.creators.create(body as Parameters<CreatorsService["create"]>[0]);
  }

  @Get()
  async list(@Query("limit") limit?: string, @Query("cursor") cursor?: string) {
    return this.creators.list({
      limit: Math.min(Number(limit ?? 25), 100),
      ...(cursor ? { cursor } : {}),
    });
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.creators.findById(id);
  }
}