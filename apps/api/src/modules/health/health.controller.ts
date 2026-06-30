import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../../prisma/prisma.service.js";
import { Public } from "../../common/decorators/index.js";

@ApiTags("health")
@Public()
@Controller("v1/healthz")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ status: "ok" | "degraded"; checks: Record<string, string> }> {
    const checks: Record<string, string> = {};
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = "ok";
    } catch (err) {
      checks.database = `error: ${(err as Error).message}`;
    }
    const status: "ok" | "degraded" = Object.values(checks).every((v) => v === "ok")
      ? "ok"
      : "degraded";
    return { status, checks };
  }
}
