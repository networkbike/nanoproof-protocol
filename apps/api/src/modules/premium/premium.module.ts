import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { PremiumController, createPremiumGuard } from "./premium.controller.js";
import { X402Module } from "../../x402/x402.module.js";
import { X402Service } from "../../x402/x402.service.js";

@Module({
  imports: [X402Module],
  controllers: [PremiumController],
})
export class PremiumModule implements NestModule {
  constructor(private readonly x402: X402Service) {}

  configure(consumer: MiddlewareConsumer): void {
    // Apply x402 guard as Express middleware on the premium research endpoint.
    // Demo mode (NANOPROOF_DEMO_MODE=true) bypasses payment; production
    // returns 402 with the challenge.
    consumer
      .apply(createPremiumGuard(this.x402))
      .forRoutes("v1/premium/research/answer");
  }
}