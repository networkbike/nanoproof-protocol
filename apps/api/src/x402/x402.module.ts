/**
 * x402 Module — NanoProof Protocol, Phase 8.
 *
 * Wires together the x402 service, ArcScan verifier, and REST controller.
 * Exported so other modules (creators, payments, analytics) can pull in
 * X402Service if needed.
 */

import { Module } from "@nestjs/common";
import { X402Controller } from "./x402.controller.js";
import { X402Service } from "./x402.service.js";
import { ArcScanVerifierService } from "./arcscan-verifier.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";

@Module({
  imports: [PrismaModule],
  controllers: [X402Controller],
  providers: [X402Service, ArcScanVerifierService],
  exports: [X402Service, ArcScanVerifierService],
})
export class X402Module {}