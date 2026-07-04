import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { OtpService } from "./otp.service";
import { PrismaModule } from "../prisma/prisma.module.js";

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [OtpService],
  exports: [OtpService],
})
export class AuthModule {}