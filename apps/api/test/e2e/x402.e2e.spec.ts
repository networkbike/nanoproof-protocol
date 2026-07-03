/**
 * Phase 8 — x402 payment protocol + Arc settlement proof + ArcScan verification
 *
 * End-to-end tests covering the full x402 payment lifecycle:
 *   create -> authorize -> settle -> verify
 *
 * Demo mode is forced on for the synthetic txHash flow (no live Arc RPC needed).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../src/app.module.js";
import { HttpExceptionFilter } from "../../src/common/filters/http-exception.filter.js";
import { PrismaService } from "../../src/prisma/prisma.service.js";

let app: INestApplication;
let server: ReturnType<INestApplication["getHttpServer"]>;
let prisma: PrismaService;
let creatorId: string;

beforeAll(async () => {
  process.env.NANOPROOF_DEMO_MODE = "true";
  await (globalThis as unknown as Record<string, Promise<unknown>>).__nanoproof_pglite_ready;
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication({ logger: false });
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  server = app.getHttpServer();
  prisma = app.get(PrismaService);

  // Ensure a creator exists for the tests
  const creator = await prisma.creator.upsert({
    where: { id: "cr_test_alice" },
    update: {},
    create: {
      id: "cr_test_alice",
      username: "alice_test",
      email: "alice_test@nanoproof.local",
      name: "Alice (test)",
      bio: "test creator",
      isActive: true,
    },
  });
  await prisma.wallet.upsert({
    where: { address_network: { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", network: "ARC_TESTNET" } },
    update: { creatorId: creator.id, isPrimary: true },
    create: {
      creatorId: creator.id,
      address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      network: "ARC_TESTNET",
      isPrimary: true,
      verificationStatus: "VERIFIED",
    },
  });
  creatorId = creator.id;
});

afterAll(async () => {
  await app?.close();
});

describe("Phase 8 — x402 payment protocol", () => {
  it("GET /metrics returns protocol-wide counters", async () => {
    const res = await request(server).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      totalPayments: expect.any(Number),
      totalSettlements: expect.any(Number),
      totalVerifications: expect.any(Number),
      totalVerified: expect.any(Number),
      x402ChallengesServed: expect.any(Number),
      x402PaymentsSettled: expect.any(Number),
    });
  });

  it("POST /payments/create returns a valid x402 challenge", async () => {
    const res = await request(server)
      .post("/payments/create")
      .send({
        creatorId,
        resource: "/v1/research/cite",
        amountUsdc: "1000",
        payerAddress: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
      });
    expect(res.status).toBe(200);
    expect(res.body.paymentRequestId).toMatch(/^c[a-z0-9]{20,}$/);
    expect(res.body.challenge).toMatchObject({
      x402Version: 1,
      accepts: expect.any(Array),
    });
    expect(res.body.challenge.accepts).toHaveLength(1);
    const accept = res.body.challenge.accepts[0];
    expect(accept).toMatchObject({
      scheme: "exact",
      network: "eip155:5042002",
      maxAmountRequired: "1000",
      payTo: expect.any(String),
      asset: "0x3600000000000000000000000000000000000000",
    });
    expect(accept.extra?.nonce).toMatch(/^0x[a-f0-9]{64}$/);
    expect(res.body.challengeBase64).toBeTruthy();
  });

  it("POST /payments/settle produces a Payment + SettlementProof", async () => {
    // Step 1: create
    const create = await request(server)
      .post("/payments/create")
      .send({
        creatorId,
        resource: "/v1/research/cite",
        amountUsdc: "2500",
        payerAddress: "0x976ea74026e726554db657fa54763abd0c3a0aa9",
      });
    expect(create.status).toBe(200);
    const requestId = create.body.paymentRequestId;

    // Step 2: settle
    const settle = await request(server)
      .post("/payments/settle")
      .send({ requestId, payerAddress: "0x976ea74026e726554db657fa54763abd0c3a0aa9" });
    expect(settle.status).toBe(200);
    expect(settle.body.paymentId).toMatch(/^pay_/);
    expect(settle.body.txHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(settle.body.arcScanUrl).toMatch(/^https:\/\/testnet\.arcscan\.app\/tx\/0x/);
    expect(settle.body.proof.id).toMatch(/^c[a-z0-9]{20,}$/);
    expect(settle.body.proof.paymentHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(settle.body.response.success).toBe(true);

    // Verify the PaymentRequest is now SETTLED
    const reqAfter = await prisma.paymentRequest.findUnique({ where: { id: requestId } });
    expect(reqAfter?.status).toBe("SETTLED");
    expect(reqAfter?.settledAt).toBeTruthy();
    expect(reqAfter?.paymentId).toBe(settle.body.paymentId);

    // Verify the Payment row
    const payment = await prisma.payment.findUnique({ where: { id: settle.body.paymentId } });
    expect(payment?.status).toBe("SETTLED");
    expect(payment?.amountUsdc).toBe("2500");
    expect(payment?.network).toBe("ARC_TESTNET");

    // Verify the SettlementProof
    const proof = await prisma.settlementProof.findUnique({
      where: { id: settle.body.proof.id },
      include: { events: true },
    });
    expect(proof?.txHash).toBe(settle.body.txHash);
    expect(proof?.payerAddress).toBe("0x976ea74026e726554db657fa54763abd0c3a0aa9");
    expect(proof?.payeeAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(proof?.verificationStatus).toMatch(/VERIFIED|PENDING/);
    expect(proof?.verificationAttempts).toBeGreaterThan(0);
    expect(proof?.events.length).toBeGreaterThan(0);

    // Verify Supporter was created/updated
    const supporter = await prisma.supporter.findUnique({ where: { address: "0x976ea74026e726554db657fa54763abd0c3a0aa9" } });
    expect(supporter).toBeTruthy();
    expect(Number(supporter!.totalPayments)).toBeGreaterThanOrEqual(1);

    // Verify ProtocolMetrics was bumped
    const metrics = await prisma.protocolMetrics.findUnique({
      where: { id: "protocol_metrics_singleton" },
    });
    expect(Number(metrics?.totalPayments)).toBeGreaterThan(0);
    expect(Number(metrics?.totalSettlements)).toBeGreaterThan(0);
  });

  it("POST /payments/verify re-verifies via ArcScan (synthetic in demo)", async () => {
    // Create + settle a fresh payment
    const create = await request(server)
      .post("/payments/create")
      .send({
        creatorId,
        resource: "/v1/research/cite",
        amountUsdc: "100",
        payerAddress: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
      });
    const settle = await request(server)
      .post("/payments/settle")
      .send({ requestId: create.body.paymentRequestId, payerAddress: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955" });
    const proofId = settle.body.proof.id;

    // Re-verify
    const verify = await request(server).post("/payments/verify").send({ proofId });
    expect(verify.status).toBe(200);
    expect(verify.body.proofId).toBe(proofId);
    expect(verify.body.status).toMatch(/VERIFIED|PENDING|FAILED/);

    // Should have at least 1 verification event now
    const proof = await prisma.settlementProof.findUnique({
      where: { id: proofId },
      include: { events: { orderBy: { checkedAt: "asc" } } },
    });
    expect(proof?.events.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /payments/history returns payments + proofs", async () => {
    const res = await request(server).get("/payments/history?limit=10");
    if (res.status !== 200) console.log("DEBUG history:", res.status, JSON.stringify(res.body));
    expect(res.status).toBe(200);
    expect(res.body.payments).toBeInstanceOf(Array);
    expect(res.body.proofs).toBeInstanceOf(Array);
    expect(res.body.requests).toBeInstanceOf(Array);
    expect(res.body.payments.length).toBeGreaterThan(0);
  });

  it("GET /payments/:id returns the payment + proof + events", async () => {
    // Find a payment we created
    const history = await request(server).get("/payments/history?limit=1");
    const paymentId = history.body.payments[0].id;

    const res = await request(server).get(`/payments/${paymentId}`);
    expect(res.status).toBe(200);
    expect(res.body.found).toBe(true);
    expect(res.body.payment.id).toBe(paymentId);
    expect(res.body.proof).toBeTruthy();
    expect(res.body.events).toBeInstanceOf(Array);
  });

  it("GET /payments/proof/:id returns the proof + timeline", async () => {
    const history = await request(server).get("/payments/history?limit=1");
    const proofId = history.body.proofs[0].id;

    const res = await request(server).get(`/payments/proof/${proofId}`);
    expect(res.status).toBe(200);
    expect(res.body.found).toBe(true);
    expect(res.body.proof.id).toBe(proofId);
    expect(res.body.events).toBeInstanceOf(Array);
  });

  it("GET /creators/:id/revenue returns aggregate stats", async () => {
    const res = await request(server).get(`/creators/${creatorId}/revenue`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      creatorId,
      totalPayments: expect.any(Number),
      settledPayments: expect.any(Number),
      totalUsdcSettled: expect.any(String),
      totalUsdcDisplay: expect.any(String),
      uniqueSupporters: expect.any(Number),
      byDay: expect.any(Array),
    });
    expect(res.body.totalPayments).toBeGreaterThan(0);
  });

  it("GET /supporters returns the recent supporters list", async () => {
    const res = await request(server).get("/supporters?limit=5");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const supporter = res.body[0];
    expect(supporter).toMatchObject({
      address: expect.any(String),
      totalPaid: expect.any(String),
      totalPayments: expect.any(Number),
      lastSeenAt: expect.any(String),
    });
  });

  it("POST /x402/demo runs the full one-click flow", async () => {
    const res = await request(server)
      .post("/x402/demo")
      .send({
        creatorId,
        resource: "/v1/research/cite",
        amountUsdc: "500",
        payerAddress: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
      });
    expect(res.status).toBe(200);
    expect(res.body.paymentRequestId).toMatch(/^c[a-z0-9]{20,}$/);
    expect(res.body.payment.id).toMatch(/^pay_/);
    expect(res.body.proof.id).toMatch(/^c[a-z0-9]{20,}$/);
    expect(res.body.verification.status).toMatch(/VERIFIED|PENDING/);
    expect(res.body.response.success).toBe(true);
    expect(res.body.challenge.accepts).toHaveLength(1);
  });

  it("Hash chain: each SettlementProof points to the previous one", async () => {
    // Get all proofs for the test creator, sorted by createdAt
    const proofs = await prisma.settlementProof.findMany({
      where: { payment: { creatorId } },
      orderBy: { createdAt: "asc" },
    });
    expect(proofs.length).toBeGreaterThan(1);

    // The first proof's prevHash is "0x" + "0"*64 (genesis)
    expect(proofs[0]?.prevHash).toMatch(/^0x0+$/);

    // Each subsequent proof's prevHash matches the previous proof's hash
    for (let i = 1; i < proofs.length; i++) {
      expect(proofs[i]?.prevHash).toBe(proofs[i - 1]?.hash);
    }
  });

  it("POST /payments/create fails for unknown creator", async () => {
    const res = await request(server)
      .post("/payments/create")
      .send({
        creatorId: "cr_does_not_exist",
        resource: "/v1/research/cite",
        amountUsdc: "1000",
      });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.code).toBe("NP_NOT_FOUND");
  });
});