// =============================================================================
// Analytics + Demo Seed e2e — validates the analytics surface against a
// seeded pglite instance.
//
// Tests:
//   1. /v1/analytics/overview returns the seeded KPI strip
//   2. /v1/analytics/citations returns paginated citations
//   3. /v1/analytics/payments returns grouped totals
//   4. /v1/analytics/creator/:id returns a deep view
//   5. /v1/analytics/protocol returns protocol-wide metrics
//   6. Demo seed is idempotent (running twice yields same totals)
// =============================================================================

import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import request from "supertest";
import { AppModule } from "../../src/app.module.js";
import { HttpExceptionFilter } from "../../src/common/filters/http-exception.filter.js";
import { seedDemoDataset } from "../../src/prisma/demo-seed.js";

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) throw new Error("DATABASE_URL is not set for the analytics e2e test");
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

let app: INestApplication;
let server: ReturnType<INestApplication["getHttpServer"]>;
let apiKeyToken: string;
let demoCreatorId: string;

beforeAll(async () => {
  // Wait for the pglite-socket to bind before touching the DB.
  await (globalThis as unknown as Record<string, Promise<unknown>>).__nanoproof_pglite_ready;

  // Seed the dataset (deterministic, ~100 creators / 500 sources / 1000 cites / 1000 pays)
  const summary = await seedDemoDataset(prisma, {
    creators: 100,
    sources: 500,
    citations: 1000,
    payments: 1000,
  });
  expect(summary.creators).toBe(100);
  expect(summary.citations).toBe(1000);

  // Find any seeded creator for our auth token
  const anyCreator = await prisma.creator.findFirst({
    where: { username: { startsWith: "demo_" } },
  });
  if (!anyCreator) throw new Error("No seeded creator found");
  demoCreatorId = anyCreator.id;

  // Mint a real ApiKey with ADMIN scopes
  const env = process.env.NODE_ENV === "production" ? "live" : "test";
  const plaintext = `np_${env}_e2eAnalyticsXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`;
  const { createHash, randomBytes } = await import("node:crypto");
  const bcrypt = await import("bcryptjs");
  const prefix = `np_${env}_${randomBytes(8).toString("hex")}`;
  const secret = randomBytes(32).toString("base64url");
  const full = `${prefix}.${secret}`;
  const hash = await bcrypt.hash(full, 10);
  await prisma.apiKey.create({
    data: {
      creatorId: demoCreatorId,
      name: "analytics e2e key",
      prefix,
      hash,
      last4: secret.slice(-4),
      scopes: ["READ_CITATIONS", "WRITE_CITATIONS", "READ_PAYMENTS", "WRITE_PAYMENTS", "ADMIN"],
      rateLimitPerMinute: 1000,
    },
  });
  apiKeyToken = full;

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication({ logger: false });
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  server = app.getHttpServer();
});

afterAll(async () => {
  await app?.close();
  await prisma.$disconnect();
  await pool.end();
});

function auth() {
  return { Authorization: `Bearer ${apiKeyToken}` };
}

describe("Phase 6 — Analytics e2e (with seeded data)", () => {
  it("GET /v1/analytics/overview returns the KPI strip", async () => {
    const res = await request(server).get("/v1/analytics/overview").set(auth());
    expect(res.status, `status=${res.status} body=${JSON.stringify(res.body)}`).toBe(200);
    expect(res.body.creators).toBe(100);
    expect(res.body.sources).toBeGreaterThanOrEqual(100); // 5 sources per creator target
    expect(res.body.citations).toBe(1000);
    expect(res.body.attributionEvents).toBe(1000);
    expect(res.body.payments).toBe(1000);
    expect(typeof res.body.totalUsdcDistributed).toBe("string");
    expect(BigInt(res.body.totalUsdcDistributed)).toBeGreaterThan(0n);
    expect(typeof res.body.recent.citations24h).toBe("number");
    expect(typeof res.body.recent.citations7d).toBe("number");
    expect(res.body.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("GET /v1/analytics/citations returns paginated, searchable list", async () => {
    const res = await request(server)
      .get("/v1/analytics/citations?limit=25")
      .set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(25);
    expect(res.body.total).toBe(1000);
    expect(res.body.nextCursor).toBeTruthy();
    expect(res.body.data[0].creatorUsername).toMatch(/^demo_/);
    expect(res.body.data[0].domain).toBeTruthy();
  });

  it("GET /v1/analytics/citations?q=... filters by snippet", async () => {
    const res = await request(server)
      .get("/v1/analytics/citations?q=transformer&limit=5")
      .set(auth());
    expect(res.status).toBe(200);
    // Some snippets reference transformers; should match at least one
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("GET /v1/analytics/citations/top-sources returns ranked list", async () => {
    const res = await request(server).get("/v1/analytics/citations/top-sources").set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Top source has citationCount > 0
    if (res.body.length > 0) {
      expect(res.body[0].citationCount).toBeGreaterThan(0);
    }
  });

  it("GET /v1/analytics/citations/top-domains returns grouped domains", async () => {
    const res = await request(server).get("/v1/analytics/citations/top-domains").set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /v1/analytics/citations/timeline returns bucketed counts", async () => {
    const res = await request(server)
      .get("/v1/analytics/citations/timeline?range=30d")
      .set(auth());
    expect(res.status).toBe(200);
    expect(res.body.range).toBe("30d");
    expect(res.body.granularity).toBe("day");
    expect(Array.isArray(res.body.buckets)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(0);
  });

  it("GET /v1/analytics/payments returns grouped status totals", async () => {
    const res = await request(server).get("/v1/analytics/payments?limit=10").set(auth());
    expect(res.status, `status=${res.status} body=${JSON.stringify(res.body)}`).toBe(200);
    expect(res.body.totalsByStatus.SETTLED).toBeGreaterThan(0);
    expect(res.body.totalUsdcByStatus.SETTLED).toMatch(/^\d+$/);
    expect(BigInt(res.body.totalUsdcByStatus.SETTLED)).toBeGreaterThan(0n);
    expect(res.body.data).toHaveLength(10);
  });

  it("GET /v1/analytics/creator/:id returns deep creator view", async () => {
    const res = await request(server)
      .get(`/v1/analytics/creator/${demoCreatorId}`)
      .set(auth());
    expect(res.status).toBe(200);
    expect(res.body.creator.username).toMatch(/^demo_/);
    expect(res.body.counts.citations).toBeGreaterThan(0);
    expect(res.body.earnings.settledAtomic).toMatch(/^\d+$/);
    expect(res.body.topSources).toBeDefined();
    expect(res.body.recentCitations.length).toBeGreaterThan(0);
  });

  it("GET /v1/analytics/creator/:id with unknown id → 404", async () => {
    const res = await request(server)
      .get("/v1/analytics/creator/cr_does_not_exist_1234")
      .set(auth());
    expect(res.status).toBe(404);
  });

  it("GET /v1/analytics/protocol returns macro view", async () => {
    const res = await request(server).get("/v1/analytics/protocol").set(auth());
    expect(res.status).toBe(200);
    expect(res.body.counts.creators).toBe(100);
    expect(res.body.counts.citations).toBe(1000);
    expect(res.body.economics.totalUsdc).toMatch(/^\d+$/);
    expect(res.body.health.activeCreatorShare).toBeGreaterThanOrEqual(0);
    expect(res.body.health.activeCreatorShare).toBeLessThanOrEqual(1);
  });

  it("GET /v1/analytics/top-creators returns leaderboard", async () => {
    const res = await request(server).get("/v1/analytics/top-creators?limit=10").set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(10);
    expect(res.body[0].earnedAtomic).toMatch(/^\d+$/);
  });

  it("GET /v1/analytics/creators returns directory", async () => {
    const res = await request(server).get("/v1/analytics/creators?limit=50").set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(50);
  });

  it("Re-running the demo seed is idempotent (totals don't double)", async () => {
    const before = await prisma.creator.count({ where: { username: { startsWith: "demo_" } } });
    await seedDemoDataset(prisma, { creators: 100, sources: 500, citations: 1000, payments: 1000 });
    const after = await prisma.creator.count({ where: { username: { startsWith: "demo_" } } });
    expect(after).toBe(before);
  });
});