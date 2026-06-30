import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { CreatorsModule } from "./modules/creators/creators.module.js";
import { WalletsModule } from "./modules/wallets/wallets.module.js";
import { SourcesModule } from "./modules/sources/sources.module.js";
import { CitationsModule } from "./modules/citations/citations.module.js";
import { PaymentsModule } from "./modules/payments/payments.module.js";
import { ApiKeysModule } from "./modules/apikeys/apikeys.module.js";
import { ApiKeyGuard } from "./common/decorators/index.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: Number(process.env.RATE_LIMIT_PER_MINUTE ?? 600),
      },
    ]),
    PrismaModule,
    HealthModule,
    CreatorsModule,
    WalletsModule,
    SourcesModule,
    CitationsModule,
    PaymentsModule,
    ApiKeysModule,
  ],
  providers: [
    // Global ApiKey guard. Mark endpoints with @Public() to bypass.
    { provide: APP_GUARD, useClass: ApiKeyGuard },
  ],
})
export class AppModule {}
