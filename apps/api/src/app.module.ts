import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./modules/health/health.module";
import { CreatorsModule } from "./modules/creators/creators.module";
import { WalletsModule } from "./modules/wallets/wallets.module";
import { SourcesModule } from "./modules/sources/sources.module";
import { CitationsModule } from "./modules/citations/citations.module";
import { PaymentsModule } from "./modules/payments/payments.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // 1 minute
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
  ],
})
export class AppModule {}