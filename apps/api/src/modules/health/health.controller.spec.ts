import { describe, it, expect, beforeEach } from "vitest";
import { HealthController } from "./health.controller.js";
import type { PrismaService } from "../../prisma/prisma.service.js";

function createMockPrisma(ok: boolean): PrismaService {
  return {
    $queryRaw: ok
      ? (() => Promise.resolve([{ "?column?": 1 }]))
      : (() => Promise.reject(new Error("connection refused"))),
  } as unknown as PrismaService;
}

describe("HealthController", () => {
  let ctrl: HealthController;

  beforeEach(() => {
    ctrl = new HealthController(createMockPrisma(true));
  });

  it("liveness returns ok without touching the DB", async () => {
    const r = ctrl.liveness();
    expect(r.status).toBe("ok");
    expect(typeof r.uptime).toBe("number");
    expect(r.uptime).toBeGreaterThanOrEqual(0);
    expect(r.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("detailed() reports ok when DB responds", async () => {
    const r = await ctrl.detailed();
    expect(r.status).toBe("ok");
    expect(r.checks.database).toBe("ok");
    expect(r.checks.process).toBe("ok");
  });

  it("health() mirrors detailed() shape", async () => {
    const r = await ctrl.health();
    expect(r.status).toBe("ok");
  });

  it("readiness() returns ok + httpStatus 200 when DB is up", async () => {
    const r = await ctrl.readiness();
    expect(r.status).toBe("ok");
    expect(r.httpStatus).toBe(200);
  });

  it("degrades when DB ping fails", async () => {
    const failingCtrl = new HealthController(createMockPrisma(false));
    const r = await failingCtrl.detailed();
    expect(r.status).toBe("degraded");
    expect(r.checks.database).toContain("connection refused");
    const ready = await failingCtrl.readiness();
    expect(ready.httpStatus).toBe(503);
  });
});