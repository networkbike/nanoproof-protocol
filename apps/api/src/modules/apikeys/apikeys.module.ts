import { Module } from "@nestjs/common";
import { ApiKeysController } from "./apikeys.controller.js";
import { ApiKeysService } from "./apikeys.service.js";

@Module({
  controllers: [ApiKeysController],
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
