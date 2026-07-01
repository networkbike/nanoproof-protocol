import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module.js";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log", "debug"],
  });

  const port = Number(process.env.PORT ?? 4000);
  const origins = (process.env.CORS_ORIGINS ?? "http://localhost:3000").split(",");

  app.use(helmet());
  app.enableCors({ origin: origins, credentials: true });

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
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal bootstrap error:", err);
  process.exit(1);
});
