import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CitationsService } from "./citations.service.js";
import { Public } from "../../common/decorators/index.js";

@ApiTags("citations")
@Controller("v1/citations")
export class CitationsController {
  constructor(private readonly citations: CitationsService) {}

  @Public()
  @Post("simulate")
  async simulate(@Body() body: { sourceId: string; snippet: string; responseId: string }) {
    return this.citations.simulate(body);
  }

  @Get()
  async list(@Query("creatorId") creatorId: string) {
    return this.citations.listByCreator(creatorId);
  }
}
