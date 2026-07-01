import { Module } from "@nestjs/common";
import { CitationsController } from "./citations.controller.js";
import { CitationsService } from "./citations.service.js";
import { CitationsDetector } from "./citations.detector.js";

@Module({
  controllers: [CitationsController],
  providers: [CitationsService, CitationsDetector],
  exports: [CitationsService, CitationsDetector],
})
export class CitationsModule {}
