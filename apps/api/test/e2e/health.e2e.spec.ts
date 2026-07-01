import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../src/app.module.js";
import { HttpExceptionFilter } from "../../src/common/filters/http-exception.filter.js";

let app: INestApplication;
let server: ReturnType<INestApplication["getHttpServer"]>;

beforeAll(async () => {
  await (globalThis as unknown as Record<string, Promise<unknown>>).__nanoproof_pglite_ready;
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication({ logger: false });
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  server = app.getHttpServer();
});

afterAll(async () => {
  await app?.close();
});

describe("Phase 7 — Health endpoints (no auth required)", () => {
  it("GET /v1/healthz returns ok + DB ping", async () => {
    const res = await request(server).get("/v1/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.checks.database).toBe("ok");
    expect(res.body.checks.process).toBe("ok");
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
    expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("GET /health (root) returns the same shape", async () => {
    const res = await request(server).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("GET /liveness returns ok without DB check", async () => {
    const res = await request(server).get("/liveness");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.uptime).toBe("number");
    // Note: no `checks` field on liveness
    expect(res.body.checks).toBeUndefined();
  });

  it("GET /readiness returns 200 when DB is reachable", async () => {
    const res = await request(server).get("/readiness");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.httpStatus).toBe(200);
  });

  it("All health endpoints are public (no API key required)", async () => {
    // Same call without an Authorization header still succeeds
    const endpoints = ["/v1/healthz", "/health", "/liveness", "/readiness"];
    for (const url of endpoints) {
      const res = await request(server).get(url);
      expect(res.status, `${url} should be public, got ${res.status}`).not.toBe(401);
    }
  });
});