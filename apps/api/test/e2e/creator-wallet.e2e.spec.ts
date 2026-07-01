import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { HttpExceptionFilter } from "../../src/common/filters/http-exception.filter";

// Use the same pg adapter as the api so the engine binary isn't required.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set for the e2e test");
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

let app: INestApplication;
let server: ReturnType<INestApplication["getHttpServer"]>;
/** Plaintext "np_<env>_<prefix>.<secret>" minted in beforeAll. */
let apiKeyToken: string;

beforeAll(async () => {
  // Wait for the pglite-socket to bind before touching the DB. The setup
  // file returns a shared promise on globalThis so we don't have to ship
  // a top-level await (which trips up tsconfig's commonjs).
  await (globalThis as unknown as Record<string, Promise<unknown>>).__nanoproof_pglite_ready;
  // APP_GUARD overrides in Test.createTestingModule are unreliable:
  // APP_GUARD is a framework-internal token (not a registered provider),
  // so .overrideGuard(APP_GUARD) and .overrideProvider(APP_GUARD) silently
  // no-op. The first request still hits the real ApiKeyGuard, whose
  // constructor-time Reflector injection races against APP_GUARD
  // resolution and ends up with reflector = undefined.
  //
  // The reliable fix: mint a real ApiKey row in the DB, then send it as
  // a Bearer token in every request. The real auth code path runs.
  const testCreator = await prisma.creator.upsert({
    where: { username: "e2e_test_creator" },
    update: { isActive: true },
    create: {
      username: "e2e_test_creator",
      email: "e2e_test@nanoproof.local",
      name: "E2E Test Creator",
      isActive: true,
    },
  });

  const environment = process.env.NODE_ENV === "production" ? "live" : "test";
  const prefix = `np_${environment}_${randomBytes(8).toString("hex")}`;
  const secret = randomBytes(32).toString("base64url");
  const plaintext = `${prefix}.${secret}`;
  const last4 = secret.slice(-4);
  const hash = await bcrypt.hash(plaintext, 10);
  await prisma.apiKey.create({
    data: {
      creatorId: testCreator.id,
      name: "e2e test key",
      prefix,
      hash,
      last4,
      scopes: ["READ_CITATIONS", "WRITE_CITATIONS", "READ_PAYMENTS", "WRITE_PAYMENTS", "ADMIN"],
      rateLimitPerMinute: 1000,
      rateLimitBurst: 200,
    },
  });
  apiKeyToken = plaintext;
  // eslint-disable-next-line no-console
  console.log(`[e2e] minted ApiKey ${prefix}...${last4} for creator ${testCreator.username}`);

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication({ logger: false });
  // No global ValidationPipe — we use per-endpoint ZodValidationPipe.
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  server = app.getHttpServer();
});

afterAll(async () => {
  await app?.close();
  await prisma.$disconnect();
  await pool.end();
});

/** Standard auth header for the e2e suite. */
function auth() {
  return { Authorization: `Bearer ${apiKeyToken}` };
}

describe("Phase 2 e2e — Creator + Wallet + Verification", () => {
  const random = Math.random().toString(36).slice(2, 8);
  const creatorInput = {
    name: `Test Creator ${random}`,
    username: `test_${random}`,
    email: `test_${random}@nanoproof.local`,
    bio: "Created by vitest e2e.",
  };

  let creatorId: string;
  let walletId: string;

  it("POST /v1/creators → 201 with username", async () => {
    const res = await request(server)
      .post("/v1/creators")
      .set(auth())
      .send(creatorInput)
      .set("Idempotency-Key", `test-create-${random}`);

    expect(res.status).toBe(201);
    expect(res.body.username).toBe(creatorInput.username);
    expect(res.body.id).toMatch(/^c/);
    creatorId = res.body.id;
  });

  it("POST /v1/creators duplicate username → 409 NP_USERNAME_TAKEN", async () => {
    const res = await request(server)
      .post("/v1/creators")
      .set(auth())
      .send(creatorInput)
      .set("Idempotency-Key", `test-create-dup-${random}`);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("NP_USERNAME_TAKEN");
  });

  it("POST /v1/creators invalid username → 422 NP_USERNAME_RESERVED", async () => {
    const res = await request(server)
      .post("/v1/creators")
      .set(auth())
      .send({ ...creatorInput, username: "admin", email: `x_${random}@nanoproof.local` })
      .set("Idempotency-Key", `test-create-bad-${random}`);

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("NP_USERNAME_RESERVED");
  });

  it("POST /v1/wallets → attach an Arc testnet wallet", async () => {
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    const res = await request(server)
      .post("/v1/wallets")
      .set(auth())
      .send({
        creatorId,
        address: account.address,
        network: "ARC_TESTNET",
        label: "primary",
        isPrimary: true,
      })
      .set("Idempotency-Key", `test-wallet-${random}`);

    expect(res.status, `status=${res.status} body=${JSON.stringify(res.body)}`).toBe(201);
    expect(res.body.verificationStatus).toBe("UNVERIFIED");
    walletId = res.body.id;
  });

  it("POST /v1/wallets/:id/challenge → returns an EIP-191 message", async () => {
    const res = await request(server)
      .post(`/v1/wallets/${walletId}/challenge`)
      .set(auth());
    expect(res.status, `status=${res.status} body=${JSON.stringify(res.body)}`).toBe(201);
    expect(res.body.message).toMatch(/NanoProof Wallet Verification/);
    expect(res.body.challengeId).toMatch(/^[a-z0-9]{20,}$/); // cuid format
  });

  it("POST /v1/wallets/:id/verify with a valid EIP-191 signature → 200, VERIFIED", async () => {
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);

    const attach = await request(server)
      .post("/v1/wallets")
      .set(auth())
      .send({ creatorId, address: account.address, network: "ARC_TESTNET", isPrimary: false })
      .set("Idempotency-Key", `test-verify-${random}`);
    expect(attach.status).toBe(201);
    const wId = attach.body.id;

    const ch = await request(server)
      .post(`/v1/wallets/${wId}/challenge`)
      .set(auth());
    expect(ch.status).toBe(201);

    const signature = await account.signMessage({ message: ch.body.message });

    const verify = await request(server)
      .post(`/v1/wallets/${wId}/verify`)
      .set(auth())
      .send({ challengeId: ch.body.challengeId, signature })
      .set("Idempotency-Key", `test-verify-call-${random}`);

    expect(verify.status).toBe(200);
    expect(verify.body.verificationStatus).toBe("VERIFIED");
    expect(verify.body.isPrimary).toBe(true);
  });

  it("GET /v1/creators/:id/stats → returns aggregated counts", async () => {
    const res = await request(server)
      .get(`/v1/creators/${creatorId}/stats`)
      .set(auth());
    expect(res.status, `status=${res.status} body=${JSON.stringify(res.body)}`).toBe(200);
    expect(res.body.walletCount).toBeGreaterThanOrEqual(2);
  });

  it("GET /v1/healthz → 200 OK", async () => {
    const res = await request(server).get("/v1/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.checks.database).toBe("ok");
  });
});
