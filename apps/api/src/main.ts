import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log", "debug"],
  });

  const port = Number(process.env.PORT ?? 4000);
  const origins = (process.env.CORS_ORIGINS ?? "http://localhost:3000").split(",");

  app.use(helmet());
  app.enableCors({ origin: origins, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger — driven by controller decorators. Spec also exported at /openapi.json.
  const swaggerConfig = new DocumentBuilder()
    .setTitle("NanoProof API")
    .setDescription("Phase 2 MVP surface. See apps/api/openapi/creator-registry.yaml.")
    .setVersion("0.2.0")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" }, "ClerkAuth")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "custom" }, "ApiKeyAuth")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  await app.listen(port);
  Logger.log(`🚀 NanoProof API ready at http://localhost:${port}`, "Bootstrap");
  Logger.log(`📚 Swagger UI at http://localhost:${port}/docs`, "Bootstrap");
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal bootstrap error:", err);
  process.exit(1);
});