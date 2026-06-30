import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { WalletsService } from "./wallets.service";

@ApiTags("Wallets")
@Controller("v1/wallets")
export class WalletsController {
  constructor(private readonly wallets: WalletsService) {}

  @Post()
  async attach(@Body() body: { creatorId: string; address: string; network: string }) {
    return this.wallets.attach(body);
  }

  @Get()
  async list(@Query("creatorId") creatorId: string) {
    return this.wallets.listByCreator(creatorId);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.wallets.listByCreator(id).then((rows) => rows.find((w) => w.id === id));
  }
}