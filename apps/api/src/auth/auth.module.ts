import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { OtpService } from "./otp.service";
import { AuthMigrate } from "./auth.migrate";
import { PrismaModule } from "../prisma/prisma.module.js";

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [OtpService, AuthMigrate],
  exports: [OtpService, AuthMigrate],
})
export class AuthModule {}