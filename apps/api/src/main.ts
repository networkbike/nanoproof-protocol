import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module.js";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter.js";

console.log('\n=== AUTH_MODULE_LOADED', new Date().toISOString(), '===');
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log", "debug"],
  });

  const port = Number(process.env.PORT ?? 4000);
  // CORS — use an explicit allowlist if set, otherwise reflect any
  // request origin. This is a public hackathon demo API, so accepting
  // all origins is fine. Lepton judges + your friends can sign in from
  // anywhere without CORS friction.
  const envOrigins = (process.env.CORS_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  const corsOptions = envOrigins.length > 0
    ? { origin: envOrigins, credentials: true }
    : { origin: true, credentials: false };
  // eslint-disable-next-line no-console
  console.log(
    `[bootstrap] CORS mode: ${envOrigins.length > 0 ? `explicit allowlist [${envOrigins.join(", ")}]` : "reflect any origin (open)"}`,
  );

  app.use(
    helmet({
      // The web app lives on a different origin (nanoproof-web-production.up.railway.app)
      // than the api, so we must allow cross-origin resource reads. The default
      // 'same-origin' policy silently breaks fetch() from the browser.
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginOpenerPolicy: { policy: "unsafe-none" },
      contentSecurityPolicy: false,
    }),
  );
  app.enableCors(corsOptions);

  // Per-endpoint validation via ZodValidationPipe (wraps @nestjs/common
  // ValidationPipe with a Zod schema). We intentionally do NOT mount a
  // global ValidationPipe here — that would require `class-validator` +
  // `class-transformer`, and we validate everything with Zod instead.
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger — driven by controller decorators. Spec also exported at /openapi.json.
  const swaggerConfig = new DocumentBuilder()
    .setTitle("NanoProof API")
    .setDescription(
      "Phase 2 — Creator Registry. Auth via `Authorization: Bearer np_<env>_<prefix>.<secret>`. " +
        "Errors use the NP_* catalog from @nanoproof/shared.",
    )
    .setVersion("0.2.0")
    .setContact("NanoProof", "https://github.com/networkbike/nanoproof-protocol", "team@nanoproof.xyz")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" }, "ClerkAuth")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "custom",
        description: "Format: `np_<env>_<prefix>.<secret>`",
      },
      "ApiKeyAuth",
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document, { swaggerOptions: { persistAuthorization: true } });

  await app.listen(port);
  Logger.log(`🚀 NanoProof API ready at http://localhost:${port}`, "Bootstrap");
  Logger.log(`📚 Swagger UI at http://localhost:${port}/docs`, "Bootstrap");

  // Demo mode helper: when NANOPROOF_DEMO_MODE=true, log the pre-generated
  // demo API key so operators can set it as INTERNAL_API_KEY on the web
  // service. The key is seeded by the demo-seed prisma migration; this
  // hook just surfaces its value for easy copy-paste.
  if (process.env.NANOPROOF_DEMO_MODE === "true") {
    try {
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      const demoKey = await prisma.apiKey.findFirst({
        where: { name: "demo-internal", isActive: true },
        orderBy: { createdAt: "desc" },
      });
      if (demoKey) {
        Logger.log(
          `🔑 Demo internal API key (set as INTERNAL_API_KEY on web service): np_live_${demoKey.prefix}.<redacted>`,
          "DemoMode",
        );
      }
      await prisma.$disconnect();
    } catch (err) {
      Logger.warn(`Could not fetch demo key: ${(err as Error).message}`, "DemoMode");
    }
  }
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal bootstrap error:", err);
  process.exit(1);
});
/* rebuild trigger Fri Jul  3 16:20:49 UTC 2026 */

// Last touched 2026-07-03 16:25 UTC for Phase 10 deployment
// last touched Sat Jul  4 21:57:24 UTC 2026
