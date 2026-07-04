import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { OtpService } from "./otp.service";
import { AuthMigrate } from "./auth.migrate";
// PrismaModule is already imported globally in AppModule, so we don't
// re-import it here (avoids NestJS "potential circular dependency" error).

@Module({
  controllers: [AuthController],
  providers: [OtpService, AuthMigrate],
  exports: [OtpService, AuthMigrate],
})
export class AuthModule {}