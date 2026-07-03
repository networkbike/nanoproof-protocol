/**
 * x402 Service — NanoProof Protocol, Phase 8.
 *
 * Implements the full x402 payment lifecycle:
 *
 *   1. createPaymentRequest()  -> emits a PaymentRequest + x402 challenge
 *   2. authorizePayment()      -> client returns signed PAYMENT-SIGNATURE
 *   3. settlePayment()         -> facilitator confirms onchain; creates Payment + SettlementProof
 *   4. verifySettlement()      -> ArcScan check, appends VerificationEvent
 *   5. getPaymentProof()       -> returns the immutable settlement proof + verification history
 *   6. getCreatorRevenue()     -> aggregates per-creator settlement stats
 *
 * In DEMO mode (NANOPROOF_DEMO_MODE=true), authorizePayment + settlePayment
 * run without real cryptographic signing and synthesise Arc-shaped
 * transaction hashes. The verification step still runs against ArcScan,
 * but with SYNTHETIC source so we don't depend on real broadcasts.
 */

import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { NPError } from "../common/errors/np.error.js";
import {
  ARC_TESTNET,
  DEFAULT_CREATOR_WALLET,
  DEFAULT_FACILITATOR,
  DEFAULT_PAYER_AGENT,
  DEFAULT_VALIDITY_SECONDS,
  PRICE_CATALOG,
  X402_VERSION,
  arcScanTxUrl,
} from "./x402.constants.js";
import type {
  CreateChallengeInput,
  X402Accept,
  X402PaymentRequired,
  X402PaymentResponse,
} from "./x402.types.js";
import {
  atomicToDisplay,
  generateEip3009Nonce,
  hashObject,
  sha256Hex,
  syntheticBlockNumber,
  syntheticTxHash,
} from "./x402.utils.js";
import { ArcScanVerifierService } from "./arcscan-verifier.service.js";
import type {
  PaymentRequest,
  Payment,
  SettlementProof,
  VerificationEvent,
  Prisma,
} from "@prisma/client";

/** Outbound shape of createPaymentRequest — the 402 challenge + record id. */
export interface ChallengeResult {
  request: PaymentRequest;
  challenge: X402PaymentRequired;
}

@Injectable()
export class X402Service {
  private readonly logger = new Logger(X402Service.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly arcscan: ArcScanVerifierService,
  ) {}

  // ===========================================================================
  // 1. CREATE — emit x402 challenge
  // ===========================================================================

  /**
   * Create an x402 payment challenge for a resource. Returns the
   * PaymentRequest row + the on-the-wire challenge that goes in the
   * PAYMENT-REQUIRED header / 402 body.
   *
   * The challenge is valid for `validitySeconds` (default 60s per spec).
   * After that the nonce-based authorization expires.
   */
  async createPaymentRequest(input: CreateChallengeInput): Promise<ChallengeResult> {
    // Resolve creator's settlement wallet; fall back to a constant for demo
    const creator = await this.prisma.creator.findUnique({
      where: { id: input.creatorId },
      include: { wallets: { where: { isPrimary: true } } },
    });
    if (!creator) {
      throw new NPError("NP_NOT_FOUND", {
        message: `Creator ${input.creatorId} not found`,
      });
    }
    const payTo =
      creator.wallets[0]?.address ?? DEFAULT_CREATOR_WALLET;

    // Resolve price
    const amountUsdc =
      input.amountUsdc ?? PRICE_CATALOG[input.resource] ?? PRICE_CATALOG["/v1/research/cite"];
    if (!/^\d+$/.test(amountUsdc)) {
      throw new NPError("NP_VALIDATION_FAILED", {
        message: `amountUsdc must be a base-10 integer string (atomic units)`,
        params: { amountUsdc },
      });
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const validAfter = 0; // immediately valid
    const validBefore = nowSec + (input.validitySeconds ?? DEFAULT_VALIDITY_SECONDS);
    const nonce = generateEip3009Nonce();

    const accept: X402Accept = {
      scheme: "exact",
      network: "eip155:5042002",
      maxAmountRequired: amountUsdc,
      resource: input.resource,
      description:
        input.description ??
        `NanoProof access: ${input.resource} (creator ${creator.username})`,
      mimeType: "application/json",
      payTo,
      maxTimeoutSeconds: input.validitySeconds ?? DEFAULT_VALIDITY_SECONDS,
      asset: ARC_TESTNET.usdcAddress,
      extra: {
        name: "USDC",
        version: "2",
        validAfter,
        validBefore,
        nonce,
      },
    };

    const challenge: X402PaymentRequired = {
      x402Version: X402_VERSION,
      accepts: [accept],
      error: "X-PAYMENT header required to access this resource.",
    };

    const request = await this.prisma.paymentRequest.create({
      data: {
        creatorId: input.creatorId,
        resource: input.resource,
        resourceId: input.resourceId ?? null,
        description: accept.description,
        amountUsdc,
        currency: "USDC",
        network: "ARC_TESTNET",
        chainId: ARC_TESTNET.chainId,
        assetAddress: ARC_TESTNET.usdcAddress,
        payTo,
        facilitator: DEFAULT_FACILITATOR,
        validAfter: BigInt(validAfter),
        validBefore: BigInt(validBefore),
        nonce,
        x402Challenge: challenge as unknown as Prisma.InputJsonValue,
        status: "QUOTED",
        quotedAt: new Date(),
      },
    });

    // Bump protocol metrics
    await this.bumpMetrics({ x402ChallengesServed: 1n });

    return { request, challenge };
  }

  // ===========================================================================
  // 2. AUTHORIZE — accept client's signed PAYMENT-SIGNATURE
  // ===========================================================================

  /**
   * Mark a PaymentRequest as AUTHORIZED after the client has returned a
   * signed payload. In DEMO mode the signed payload is auto-generated
   * so the demo flow is one click.
   *
   * In production this would verify the EIP-712 signature against the
   * nonce + amount, then submit transferWithAuthorization to the
   * facilitator. We model the same lifecycle, with a clear seam.
   */
  async authorizePayment(
    requestId: string,
    signedPayload?: {
      payerAddress?: string;
      signature?: string;
    },
  ): Promise<PaymentRequest> {
    const req = await this.prisma.paymentRequest.findUnique({
      where: { id: requestId },
    });
    if (!req) {
      throw new NPError("NP_NOT_FOUND", { message: `PaymentRequest ${requestId} not found` });
    }
    if (req.status !== "QUOTED") {
      throw new NPError("NP_VALIDATION_FAILED", {
        message: `PaymentRequest ${requestId} is ${req.status}; cannot authorize again`,
      });
    }
    if (BigInt(Math.floor(Date.now() / 1000)) > req.validBefore) {
      await this.prisma.paymentRequest.update({
        where: { id: requestId },
        data: { status: "EXPIRED", expiredAt: new Date() },
      });
      throw new NPError("NP_VALIDATION_FAILED", {
        message: `PaymentRequest ${requestId} has expired`,
      });
    }

    // DEMO MODE: synthesise the signed payload
    const demoMode = process.env.NANOPROOF_DEMO_MODE === "true";
    const payerAddress =
      signedPayload?.payerAddress ??
      (demoMode ? DEFAULT_PAYER_AGENT : null);

    if (!payerAddress) {
      throw new NPError("NP_VALIDATION_FAILED", {
        message: "payerAddress required when not in demo mode",
      });
    }

    // In demo mode the signature is a deterministic synthetic value
    const signature =
      signedPayload?.signature ??
      (demoMode
        ? "0x" + sha256Hex(`${req.id}:${payerAddress}:${req.nonce}`).slice(2)
        : null);

    if (!signature) {
      throw new NPError("NP_VALIDATION_FAILED", {
        message: "signature required when not in demo mode",
      });
    }

    const updated = await this.prisma.paymentRequest.update({
      where: { id: requestId },
      data: {
        status: "AUTHORIZED",
        authorizedAt: new Date(),
      },
    });

    // Track supporter (upsert by address)
    await this.prisma.supporter.upsert({
      where: { address: payerAddress.toLowerCase() },
      create: {
        address: payerAddress.toLowerCase(),
        totalPaid: "0",
        totalPayments: 0,
        userAgent: signedPayload?.payerAddress ? undefined : "x402-demo-agent",
        label: demoMode ? "Demo AI Agent" : null,
      },
      update: {
        lastSeenAt: new Date(),
      },
    });

    this.logger.log(
      `PaymentRequest ${requestId} authorized by ${payerAddress} (signature=${signature.slice(0, 18)}…)`,
    );
    return updated;
  }

  // ===========================================================================
  // 3. SETTLE — facilitator confirms onchain; create Payment + SettlementProof
  // ===========================================================================

  /**
   * Settle an authorized PaymentRequest onchain (or simulated onchain).
   *
   * Steps:
   *   1. Build a canonical settlement payload (the immutable terms)
   *   2. Generate txHash (synthetic in demo, real otherwise)
   *   3. Create Payment row (status SETTLED)
   *   4. Compute paymentHash = sha256(canonical settlement body)
   *   5. Hash-chain to previous SettlementProof for this creator
   *   6. Create SettlementProof row (verificationStatus PENDING)
   *   7. Update PaymentRequest -> SETTLED
   *   8. Update ProtocolMetrics + Supporter totals (transactional)
   *   9. Trigger immediate ArcScan verification (async, fire-and-forget)
   */
  async settlePayment(input: {
    requestId: string;
    payerAddress?: string;
  }): Promise<{
    payment: Payment;
    proof: SettlementProof;
    verification: Promise<{ status: "VERIFIED" | "PENDING" | "FAILED" }>;
    response: X402PaymentResponse;
  }> {
    const req = await this.prisma.paymentRequest.findUnique({
      where: { id: input.requestId },
      include: { creator: { include: { paymentRequests: { orderBy: { createdAt: "desc" }, take: 1 } } } },
    });
    if (!req) {
      throw new NPError("NP_NOT_FOUND", { message: `PaymentRequest ${input.requestId} not found` });
    }
    if (req.status !== "AUTHORIZED" && req.status !== "QUOTED") {
      throw new NPError("NP_VALIDATION_FAILED", {
        message: `PaymentRequest ${input.requestId} is ${req.status}; cannot settle`,
      });
    }
    if (req.status === "QUOTED") {
      // Implicit authorize in demo flow
      await this.authorizePayment(input.requestId, {
        payerAddress: input.payerAddress,
      });
    }

    const demoMode = process.env.NANOPROOF_DEMO_MODE === "true";
    const payerAddress = (input.payerAddress ?? DEFAULT_PAYER_AGENT).toLowerCase();
    const settledAt = new Date();
    const blockNumber = syntheticBlockNumber(req.id);
    const txHash = syntheticTxHash(`${req.id}:${payerAddress}:${settledAt.toISOString()}`);

    // Canonical settlement body (for immutable hash)
    const settlementBody = {
      paymentRequestId: req.id,
      creatorId: req.creatorId,
      resource: req.resource,
      amountUsdc: req.amountUsdc,
      currency: req.currency,
      network: req.network,
      chainId: req.chainId,
      assetAddress: req.assetAddress,
      payer: payerAddress,
      payee: req.payTo,
      nonce: req.nonce,
      validAfter: req.validAfter.toString(),
      validBefore: req.validBefore.toString(),
      txHash,
      blockNumber: blockNumber.toString(),
      settledAt: settledAt.toISOString(),
    };
    const paymentHash = sha256Hex(JSON.stringify(settlementBody));

    // Previous settlement proof for this creator (for hash chain)
    const prevProof = await this.prisma.settlementProof.findFirst({
      where: {
        payment: { creatorId: req.creatorId },
      },
      orderBy: { createdAt: "desc" },
    });
    const prevHash = prevProof?.hash ?? "0x" + "0".repeat(64);

    // Chain hash = sha256(prevHash + canonical body)
    const hash = sha256Hex(prevHash + JSON.stringify(settlementBody));

    // Transactional write of Payment + SettlementProof + PaymentRequest update
    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          id: `pay_${req.id.replace(/^preq_/, "")}`,
          creatorId: req.creatorId,
          sourceId: req.resourceId,
          amountUsdc: req.amountUsdc,
          currency: req.currency,
          network: req.network,
          status: "SETTLED",
          txHash,
          arcScanUrl: arcScanTxUrl(txHash),
          blockNumber,
          settledAt,
        },
      });

      const proof = await tx.settlementProof.create({
        data: {
          paymentId: payment.id,
          paymentHash,
          txHash,
          blockNumber,
          blockTimestamp: settledAt,
          blockHash: "0x" + sha256Hex(blockNumber.toString() + txHash).slice(2),
          arcScanUrl: arcScanTxUrl(txHash),
          facilitator: req.facilitator,
          network: req.network,
          chainId: req.chainId,
          amountUsdc: req.amountUsdc,
          assetAddress: req.assetAddress,
          payerAddress,
          payeeAddress: req.payTo,
          nonce: req.nonce,
          verificationStatus: "PENDING",
          prevHash,
          hash,
        },
      });

      await tx.paymentRequest.update({
        where: { id: req.id },
        data: {
          status: "SETTLED",
          settledAt,
          paymentId: payment.id,
        },
      });

      // Update supporter aggregate
      await tx.supporter.upsert({
        where: { address: payerAddress },
        create: {
          address: payerAddress,
          totalPaid: req.amountUsdc,
          totalPayments: 1,
          firstSeenAt: settledAt,
          lastSeenAt: settledAt,
          userAgent: demoMode ? "x402-demo-agent" : null,
          label: demoMode ? "Demo AI Agent" : null,
        },
        update: {
          totalPayments: { increment: 1 },
          lastSeenAt: settledAt,
        },
      });

      // totalPaid is String — increment via raw SQL inside the transaction.
      await tx.$executeRaw`
        UPDATE "supporters"
        SET "totalPaid" = (CAST("totalPaid" AS BIGINT) + CAST(${req.amountUsdc} AS BIGINT))::TEXT
        WHERE "address" = ${payerAddress}
      `;

      return { payment, proof };
    });

    // Update ProtocolMetrics outside the tx (singleton)
    await this.bumpMetrics({
      totalPayments: 1n,
      totalSettlements: 1n,
      totalUsdcDistributed: req.amountUsdc,
      x402PaymentsSettled: 1n,
      lastSettlementAt: settledAt,
    });

    // Fire-and-forget verification (caller awaits via `verification` promise)
    const verification = (async (): Promise<{ status: "VERIFIED" | "PENDING" | "FAILED" }> => {
      try {
        const v = await this.verifySettlement(result.proof.id);
        return { status: v };
      } catch (err) {
        this.logger.warn(`Initial verification failed for ${result.proof.id}: ${err}`);
        return { status: "PENDING" };
      }
    })();

    const response: X402PaymentResponse = {
      success: true,
      transactionHash: txHash,
      blockNumber: blockNumber.toString(),
      arcScanUrl: arcScanTxUrl(txHash),
      network: `eip155:${ARC_TESTNET.chainId}`,
      settledAt: settledAt.toISOString(),
      message: "Settlement confirmed. Resource unlocked.",
    };

    this.logger.log(
      `Settlement confirmed: ${req.amountUsdc} USDC from ${payerAddress} → ${req.payTo} ` +
        `(txHash=${txHash.slice(0, 18)}…, proof=${result.proof.id})`,
    );

    return { ...result, verification, response };
  }

  // ===========================================================================
  // 4. VERIFY — call ArcScan + write VerificationEvent
  // ===========================================================================

  /**
   * Verify a SettlementProof by calling ArcScan. Writes a
   * VerificationEvent (append-only) and updates the proof's status.
   *
   * Returns the final verification status (VERIFIED | PENDING | FAILED).
   */
  async verifySettlement(proofId: string): Promise<"VERIFIED" | "PENDING" | "FAILED"> {
    const proof = await this.prisma.settlementProof.findUnique({
      where: { id: proofId },
      include: { payment: true },
    });
    if (!proof) {
      throw new NPError("NP_NOT_FOUND", { message: `SettlementProof ${proofId} not found` });
    }

    const status = await this.arcscan.verify(proof.txHash, {
      blockNumber: proof.blockNumber,
      from: proof.payerAddress,
      to: proof.payeeAddress,
      valueAtomic: proof.amountUsdc,
      settledAt: proof.blockTimestamp,
    });

    let final: "VERIFIED" | "PENDING" | "FAILED" = "PENDING";
    if (status.success === true && status.found) {
      final = "VERIFIED";
    } else if (status.success === false) {
      final = "FAILED";
    } else if (!status.found && status.error?.includes("not yet indexed")) {
      final = "PENDING";
    } else if (status.error) {
      final = "PENDING"; // Network issue — try again later
    }

    // Persist event + update proof
    await this.prisma.$transaction(async (tx) => {
      await tx.verificationEvent.create({
        data: {
          proofId,
          txHash: proof.txHash,
          status: final,
          confirmations: status.confirmations,
          source: status.source,
          payload: status as unknown as Prisma.InputJsonValue,
          blockNumber: status.blockNumber ? BigInt(status.blockNumber) : null,
          errorMessage: status.error ?? null,
        },
      });

      const updateData: Prisma.SettlementProofUpdateInput = {
        verificationAttempts: { increment: 1 },
        lastCheckedAt: new Date(),
      };
      if (final === "VERIFIED") {
        updateData.verificationStatus = "VERIFIED";
        updateData.confirmedAt = new Date();
      } else if (final === "FAILED") {
        updateData.verificationStatus = "FAILED";
      } else {
        updateData.verificationStatus = "PENDING";
      }
      await tx.settlementProof.update({
        where: { id: proofId },
        data: updateData,
      });

      if (final === "VERIFIED") {
        await this.bumpMetricsTx(tx, {
          totalVerifications: 1n,
          totalVerified: 1n,
          lastVerifiedAt: new Date(),
        });
      } else if (final === "FAILED") {
        await this.bumpMetricsTx(tx, {
          totalVerifications: 1n,
          totalFailed: 1n,
        });
      } else {
        await this.bumpMetricsTx(tx, {
          totalVerifications: 1n,
        });
      }
    });

    return final;
  }

  // ===========================================================================
  // 5. QUERIES — read-side
  // ===========================================================================

  async getPayment(paymentId: string): Promise<{
    payment: Payment;
    proof: SettlementProof | null;
    request: PaymentRequest | null;
    events: VerificationEvent[];
  } | null> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) return null;
    const [proof, request] = await Promise.all([
      this.prisma.settlementProof.findUnique({
        where: { paymentId: payment.id },
        include: { events: { orderBy: { checkedAt: "asc" } } },
      }),
      this.prisma.paymentRequest.findFirst({
        where: { paymentId: payment.id },
      }),
    ]);
    return { payment, proof, request, events: proof?.events ?? [] };
  }

  async getPaymentProof(proofId: string): Promise<{
    proof: SettlementProof;
    events: VerificationEvent[];
    payment: Payment | null;
  } | null> {
    const proof = await this.prisma.settlementProof.findUnique({
      where: { id: proofId },
      include: { events: { orderBy: { checkedAt: "asc" } } },
    });
    if (!proof) return null;
    const payment = await this.prisma.payment.findUnique({ where: { id: proof.paymentId } });
    return { proof, events: proof.events, payment };
  }

  async getPaymentHistory(input: {
    creatorId?: string;
    payerAddress?: string;
    limit?: number;
  }): Promise<{
    payments: Payment[];
    proofs: SettlementProof[];
    requests: PaymentRequest[];
  }> {
    const limit = Math.min(input.limit ?? 50, 200);

    const where: Prisma.PaymentWhereInput = {};
    if (input.creatorId) where.creatorId = input.creatorId;

    const payments = await this.prisma.payment.findMany({
      where,
      orderBy: { settledAt: "desc" },
      take: limit,
    });

    if (payments.length === 0) {
      return { payments: [], proofs: [], requests: [] };
    }

    const paymentIds = payments.map((p) => p.id);
    const [proofs, requests] = await Promise.all([
      this.prisma.settlementProof.findMany({
        where: { paymentId: { in: paymentIds } },
      }),
      this.prisma.paymentRequest.findMany({
        where: { paymentId: { in: paymentIds } },
      }),
    ]);

    return { payments, proofs, requests };
  }

  async getCreatorRevenue(creatorId: string): Promise<{
    creatorId: string;
    totalPayments: number;
    settledPayments: number;
    totalUsdcSettled: string;
    totalUsdcDisplay: string;
    uniqueSupporters: number;
    firstSettlementAt: Date | null;
    lastSettlementAt: Date | null;
    byDay: Array<{ date: string; usdc: string; count: number }>;
  }> {
    const [creator, agg, uniqueSupporters, byDayRaw, first, last] = await Promise.all([
      this.prisma.creator.findUnique({ where: { id: creatorId } }),
      this.prisma.$queryRaw<Array<{ total: bigint; cnt: bigint }>>`
        SELECT
          COALESCE(SUM(CAST("amountUsdc" AS BIGINT)), 0)::BIGINT AS total,
          COUNT(*)::BIGINT AS cnt
        FROM "payments"
        WHERE "creatorId" = ${creatorId} AND "status" = 'SETTLED'
      `,
      this.prisma.settlementProof.findMany({
        where: { payment: { creatorId, status: "SETTLED" } },
        select: { payerAddress: true },
        distinct: ["payerAddress"],
      }),
      this.prisma.$queryRaw<Array<{ date: string; usdc: bigint; count: bigint }>>`
        SELECT
          DATE("settledAt") AS date,
          SUM(CAST("amountUsdc" AS BIGINT))::BIGINT AS usdc,
          COUNT(*)::BIGINT AS count
        FROM "payments"
        WHERE "creatorId" = ${creatorId} AND "status" = 'SETTLED' AND "settledAt" IS NOT NULL
        GROUP BY DATE("settledAt")
        ORDER BY date DESC
        LIMIT 30
      `,
      this.prisma.payment.findFirst({
        where: { creatorId, status: "SETTLED" },
        orderBy: { settledAt: "asc" },
        select: { settledAt: true },
      }),
      this.prisma.payment.findFirst({
        where: { creatorId, status: "SETTLED" },
        orderBy: { settledAt: "desc" },
        select: { settledAt: true },
      }),
    ]);

    const aggRow = agg[0] ?? { total: 0n, cnt: 0n };
    const total = aggRow.total.toString();
    const cnt = Number(aggRow.cnt);
    return {
      creatorId,
      totalPayments: cnt,
      settledPayments: cnt,
      totalUsdcSettled: total,
      totalUsdcDisplay: atomicToDisplay(total),
      uniqueSupporters: uniqueSupporters.length,
      firstSettlementAt: first?.settledAt ?? null,
      lastSettlementAt: last?.settledAt ?? null,
      byDay: byDayRaw.map((r) => ({
        date: typeof r.date === "string" ? r.date : String(r.date),
        usdc: atomicToDisplay(r.usdc.toString()),
        count: Number(r.count),
      })),
    };
  }

  async getProtocolMetrics(): Promise<{
    totalPayments: number;
    totalSettlements: number;
    totalVerifications: number;
    totalVerified: number;
    totalFailed: number;
    totalUsdcDistributed: string;
    totalUsdcDisplay: string;
    uniqueSupporters: number;
    uniqueCreators: number;
    x402ChallengesServed: number;
    x402PaymentsSettled: number;
    lastSettlementAt: Date | null;
    lastVerifiedAt: Date | null;
    updatedAt: Date;
  }> {
    // Ensure singleton exists
    const m = await this.prisma.protocolMetrics.upsert({
      where: { id: "protocol_metrics_singleton" },
      create: { id: "protocol_metrics_singleton" },
      update: {},
    });

    // Augment with live counts (cheaper than scanning full tables every read)
    const [supporters, creators] = await Promise.all([
      this.prisma.supporter.count(),
      this.prisma.creator.count({ where: { isActive: true } }),
    ]);

    return {
      totalPayments: Number(m.totalPayments),
      totalSettlements: Number(m.totalSettlements),
      totalVerifications: Number(m.totalVerifications),
      totalVerified: Number(m.totalVerified),
      totalFailed: Number(m.totalFailed),
      totalUsdcDistributed: m.totalUsdcDistributed,
      totalUsdcDisplay: atomicToDisplay(m.totalUsdcDistributed),
      uniqueSupporters: supporters,
      uniqueCreators: creators,
      x402ChallengesServed: Number(m.x402ChallengesServed),
      x402PaymentsSettled: Number(m.x402PaymentsSettled),
      lastSettlementAt: m.lastSettlementAt,
      lastVerifiedAt: m.lastVerifiedAt,
      updatedAt: m.updatedAt,
    };
  }

  async getRecentSupporters(limit = 20): Promise<
    Array<{ address: string; totalPaid: string; totalPaidDisplay: string; totalPayments: number; lastSeenAt: Date }>
  > {
    const supporters = await this.prisma.supporter.findMany({
      orderBy: { lastSeenAt: "desc" },
      take: limit,
    });
    return supporters.map((s) => ({
      address: s.address,
      totalPaid: s.totalPaid,
      totalPaidDisplay: atomicToDisplay(s.totalPaid),
      totalPayments: s.totalPayments,
      lastSeenAt: s.lastSeenAt,
    }));
  }

  // ===========================================================================
  // Internal helpers
  // ===========================================================================

  /**
   * Atomic upsert of the singleton ProtocolMetrics row, with optional
   * numeric increments. Outside-transaction variant.
   */
  private async bumpMetrics(updates: {
    totalPayments?: bigint;
    totalSettlements?: bigint;
    totalVerifications?: bigint;
    totalVerified?: bigint;
    totalFailed?: bigint;
    totalUsdcDistributed?: string;
    x402ChallengesServed?: bigint;
    x402PaymentsSettled?: bigint;
    lastSettlementAt?: Date;
    lastVerifiedAt?: Date;
  }): Promise<void> {
    await this.bumpMetricsTx(this.prisma, updates);
  }

  /**
   * Same as bumpMetrics but inside an existing transaction client.
   */
  private async bumpMetricsTx(
    tx: Prisma.TransactionClient,
    updates: Parameters<X402Service["bumpMetrics"]>[0],
  ): Promise<void> {
    const data: Prisma.ProtocolMetricsUpdateInput = {};
    if (updates.totalPayments) data.totalPayments = { increment: updates.totalPayments };
    if (updates.totalSettlements) data.totalSettlements = { increment: updates.totalSettlements };
    if (updates.totalVerifications) data.totalVerifications = { increment: updates.totalVerifications };
    if (updates.totalVerified) data.totalVerified = { increment: updates.totalVerified };
    if (updates.totalFailed) data.totalFailed = { increment: updates.totalFailed };
    if (updates.totalUsdcDistributed) {
      // String increment isn't typed in Prisma's StringFieldUpdateOperationsInput;
      // we read the current value and set the new total. This is OK because
      // protocol_metrics is a singleton with low write contention.
      const cur = await this.prisma.protocolMetrics.findUnique({
        where: { id: "protocol_metrics_singleton" },
        select: { totalUsdcDistributed: true },
      });
      const curStr = cur?.totalUsdcDistributed ?? "0";
      const next = (BigInt(curStr) + BigInt(updates.totalUsdcDistributed)).toString();
      data.totalUsdcDistributed = { set: next };
    }
    if (updates.x402ChallengesServed)
      data.x402ChallengesServed = { increment: updates.x402ChallengesServed };
    if (updates.x402PaymentsSettled)
      data.x402PaymentsSettled = { increment: updates.x402PaymentsSettled };
    if (updates.lastSettlementAt) data.lastSettlementAt = updates.lastSettlementAt;
    if (updates.lastVerifiedAt) data.lastVerifiedAt = updates.lastVerifiedAt;

    // Create block requires raw values; update block uses operators.
    const createData: Record<string, unknown> = { id: "protocol_metrics_singleton" };
    for (const [k, v] of Object.entries(data)) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const op = v as Record<string, unknown>;
        if ("set" in op) createData[k] = op.set;
        else if ("increment" in op) createData[k] = op.increment;
        else if ("decrement" in op) createData[k] = op.decrement;
        else createData[k] = v;
      } else {
        createData[k] = v;
      }
    }
    await tx.protocolMetrics.upsert({
      where: { id: "protocol_metrics_singleton" },
      create: createData as Prisma.ProtocolMetricsCreateInput,
      update: data,
    });
  }
}