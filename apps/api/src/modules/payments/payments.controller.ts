import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PaymentsService } from "./payments.service.js";
import { Public } from "../../common/decorators/index.js";

@ApiTags("payments")
@Controller("v1/payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Public()
  @Post("simulate")
  async simulate(@Body() body: { creatorId: string; amountUsdc: string; sourceId?: string }) {
    return this.payments.simulate(body);
  }

  @Get()
  async list(@Query("creatorId") creatorId: string) {
    return this.payments.listByCreator(creatorId);
  }
}
