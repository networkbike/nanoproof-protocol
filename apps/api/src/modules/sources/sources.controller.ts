import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SourcesService } from "./sources.service";

@ApiTags("Sources")
@Controller("v1/sources")
export class SourcesController {
  constructor(private readonly sources: SourcesService) {}

  @Post()
  async create(@Body() body: { creatorId: string; url: string; title: string; description?: string }) {
    return this.sources.create(body);
  }

  @Get()
  async list(@Query("creatorId") creatorId: string) {
    return this.sources.listByCreator(creatorId);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.sources.findById(id);
  }
}