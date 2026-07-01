import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
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
import { AnalyticsModule } from "./modules/analytics/analytics.module.js";
import { ApiKeyGuard } from "./common/decorators/index.js";
import { IdempotencyInterceptor } from "./common/interceptors/idempotency.interceptor.js";
import { PrismaService } from "./prisma/prisma.service.js";
import { Reflector } from "@nestjs/core";

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
    AnalyticsModule,
  ],
  providers: [
    // Global ApiKey guard.
    //
    // We use useFactory instead of useClass because APP_GUARD with
    // useClass is known to skip Reflector injection in some NestJS
    // 11.x versions — the guard is constructed via a non-DI fast path
    // and this.reflector ends up undefined. The factory below pulls
    // both dependencies from the module's DI container, which fixes
    // the "Cannot read properties of undefined (reading
    // 'getAllAndOverride')" error in production AND in tests.
    {
      provide: APP_GUARD,
      useFactory: (prisma: PrismaService, reflector: Reflector) =>
        new ApiKeyGuard(prisma, reflector),
      inject: [PrismaService, Reflector],
    },
    // Global idempotency interceptor (also via useFactory for the same
    // reason as the guard: Nest 11 may skip DI for class references
    // attached via @UseInterceptors in the presence of APP_GUARD).
    {
      provide: APP_INTERCEPTOR,
      useFactory: (prisma: PrismaService) => new IdempotencyInterceptor(prisma),
      inject: [PrismaService],
    },
  ],
})
export class AppModule {}
