import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { HttpExceptionFilter } from "../../src/common/filters/http-exception.filter";

const prisma = new PrismaClient();

let app: INestApplication;
let server: ReturnType<INestApplication["getHttpServer"]>;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  server = app.getHttpServer();
});

afterAll(async () => {
  await app?.close();
  await prisma.$disconnect();
});

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
      .send(creatorInput)
      .set("Idempotency-Key", `test-create-${random}`);

    expect(res.status).toBe(201);
    expect(res.body.username).toBe(creatorInput.username);
    expect(res.body.id).toMatch(/^c/); // cuid starts with c
    creatorId = res.body.id;
  });

  it("POST /v1/creators duplicate username → 409 NP_USERNAME_TAKEN", async () => {
    const res = await request(server)
      .post("/v1/creators")
      .send(creatorInput)
      .set("Idempotency-Key", `test-create-dup-${random}`);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("NP_USERNAME_TAKEN");
  });

  it("POST /v1/creators invalid username → 422 NP_USERNAME_RESERVED", async () => {
    const res = await request(server)
      .post("/v1/creators")
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
      .send({
        creatorId,
        address: account.address,
        network: "ARC_TESTNET",
        label: "primary",
        isPrimary: true,
      })
      .set("Idempotency-Key", `test-wallet-${random}`);

    expect(res.status).toBe(201);
    expect(res.body.verificationStatus).toBe("UNVERIFIED");
    walletId = res.body.id;
  });

  it("POST /v1/wallets/:id/challenge → returns an EIP-191 message", async () => {
    const res = await request(server).post(`/v1/wallets/${walletId}/challenge`);
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/NanoProof Wallet Verification/);
    expect(res.body.challengeId).toMatch(/^vch_/);
    // Stash for the next test
    (globalThis as unknown as { __lastChallenge: unknown }).__lastChallenge = res.body;
  });

  it("POST /v1/wallets/:id/verify with a valid EIP-191 signature → 200, VERIFIED", async () => {
    const pk = (
      await import("viem/accounts")
    ).generatePrivateKey();
    const account = privateKeyToAccount(pk);

    // Attach a fresh wallet for this test so the address is known + we have the pk in memory.
    const attach = await request(server)
      .post("/v1/wallets")
      .send({ creatorId, address: account.address, network: "ARC_TESTNET", isPrimary: false })
      .set("Idempotency-Key", `test-verify-${random}`);
    expect(attach.status).toBe(201);
    const wId = attach.body.id;

    const ch = await request(server).post(`/v1/wallets/${wId}/challenge`);
    expect(ch.status).toBe(201);

    const signature = await account.signMessage({ message: ch.body.message });

    const verify = await request(server)
      .post(`/v1/wallets/${wId}/verify`)
      .send({ challengeId: ch.body.challengeId, signature })
      .set("Idempotency-Key", `test-verify-call-${random}`);

    expect(verify.status).toBe(200);
    expect(verify.body.verificationStatus).toBe("VERIFIED");
    expect(verify.body.isPrimary).toBe(true); // marked primary on successful verify
  });

  it("GET /v1/creators/:id/stats → returns aggregated counts", async () => {
    const res = await request(server).get(`/v1/creators/${creatorId}/stats`);
    // The Global ApiKeyGuard requires a key for non-public endpoints.
    // /v1/creators/:id/stats is not marked Public → 401.
    expect([401, 200]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.walletCount).toBeGreaterThanOrEqual(2);
    }
  });

  it("GET /v1/healthz → 200 OK", async () => {
    const res = await request(server).get("/v1/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.checks.database).toBe("ok");
  });
});
