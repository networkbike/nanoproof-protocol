import { Injectable, Logger } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { recoverMessageAddress, type Address } from "viem";
import type { Wallet, VerificationChallenge } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service.js";
import {
  AttachWalletSchema,
  ListWalletsQuerySchema,
  VerifyChallengeSchema,
  type AttachWallet,
  type VerifyChallenge,
} from "@nanoproof/shared/schemas/wallet.js";
import { NPError } from "../../common/errors/np.error.js";

const CHALLENGE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface ChallengeBundle {
  challengeId: string;
  walletId: string;
  message: string;
  expiresAt: Date;
}

/**
 * Wallet service — P2-008 + P2-009.
 *
 * Flow:
 *   POST /v1/wallets          → attach (creates row, status=UNVERIFIED)
 *   POST /v1/wallets/:id/challenge → 10-min nonce (status=PENDING, P2-009)
 *   POST /v1/wallets/:id/verify   → recover EIP-191 signer, mark VERIFIED, isPrimary=true
 */
@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async attach(input: AttachWallet): Promise<Wallet> {
    const data = AttachWalletSchema.parse(input);

    // Address already lowercased by schema transform.
    const exists = await this.prisma.wallet.findUnique({
      where: { address_network: { address: data.address, network: data.network } },
    });
    if (exists) {
      throw new NPError("NP_VALIDATION_FAILED", {
        message: "Wallet already attached.",
        params: { address: data.address, network: data.network },
      });
    }

    // If this is the creator's first wallet, or isPrimary was requested,
    // demote any existing primary in the same network.
    if (data.isPrimary) {
      await this.prisma.wallet.updateMany({
        where: { creatorId: data.creatorId, network: data.network, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const wallet = await this.prisma.wallet.create({
      data: {
        creatorId: data.creatorId,
        address: data.address,
        network: data.network,
        label: data.label ?? null,
        isPrimary: data.isPrimary ?? false,
      },
    });

    this.logger.log(`Wallet attached: ${wallet.address} (${wallet.network}) → creator ${data.creatorId}`);
    return wallet;
  }

  async listByCreator(creatorId: string, opts: { limit: number; cursor?: string }): Promise<{ data: Wallet[]; nextCursor: string | null }> {
    const take = Math.min(Math.max(opts.limit, 1), 100);
    const rows = await this.prisma.wallet.findMany({
      where: { creatorId },
      take: take + 1,
      ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });
    const hasMore = rows.length > take;
    return { data: hasMore ? rows.slice(0, take) : rows, nextCursor: hasMore ? rows[take - 1].id : null };
  }

  async findById(id: string): Promise<Wallet> {
    const wallet = await this.prisma.wallet.findUnique({ where: { id } });
    if (!wallet) throw new NPError("NP_WALLET_NOT_FOUND");
    return wallet;
  }

  /** P2-009 — issue a challenge that the creator signs via EIP-191. */
  async issueChallenge(walletId: string, opts: { ipAddress?: string; userAgent?: string } = {}): Promise<ChallengeBundle> {
    const wallet = await this.findById(walletId);

    // Invalidate any previous PENDING challenges for this wallet.
    await this.prisma.verificationChallenge.updateMany({
      where: { walletId, status: "PENDING" },
      data: { status: "EXPIRED" },
    });

    const nonce = randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
    const message = [
      "NanoProof Wallet Verification",
      `Wallet: ${wallet.address}`,
      `Network: ${wallet.network}`,
      `Wallet ID: ${wallet.id}`,
      `Nonce: ${nonce}`,
      `Issued: ${expiresAt.toISOString()}`,
    ].join("\n");

    const created: VerificationChallenge = await this.prisma.verificationChallenge.create({
      data: {
        walletId: wallet.id,
        challenge: nonce,
        message,
        purpose: "WALLET_OWNERSHIP",
        status: "PENDING",
        ipAddress: opts.ipAddress ?? null,
        userAgent: opts.userAgent ?? null,
        expiresAt,
      },
    });

    return { challengeId: created.id, walletId: wallet.id, message, expiresAt: created.expiresAt };
  }

  /** P2-009 — verify the EIP-191 signature against the wallet address. */
  async verifyChallenge(walletId: string, input: VerifyChallenge): Promise<Wallet> {
    const data = VerifyChallengeSchema.parse(input);
    const wallet = await this.findById(walletId);

    const challenge = await this.prisma.verificationChallenge.findUnique({
      where: { id: data.challengeId },
    });
    if (!challenge || challenge.walletId !== walletId) {
      throw new NPError("NP_VALIDATION_FAILED", { message: "Challenge not found for this wallet." });
    }
    if (challenge.status !== "PENDING") {
      throw new NPError("NP_VALIDATION_FAILED", {
        message: `Challenge is ${challenge.status}.`,
        params: { status: challenge.status },
      });
    }
    if (challenge.expiresAt < new Date()) {
      await this.prisma.verificationChallenge.update({
        where: { id: challenge.id },
        data: { status: "EXPIRED" },
      });
      throw new NPError("NP_VALIDATION_FAILED", { message: "Challenge expired." });
    }
    if (challenge.consumedAt) {
      throw new NPError("NP_VALIDATION_FAILED", { message: "Challenge already consumed." });
    }

    let recovered: Address;
    try {
      recovered = await recoverMessageAddress({
        message: challenge.message,
        signature: data.signature as `0x${string}`,
      });
    } catch (err) {
      await this.prisma.verificationChallenge.update({
        where: { id: challenge.id },
        data: { status: "FAILED" },
      });
      throw new NPError("NP_VALIDATION_FAILED", {
        message: "Invalid signature.",
        cause: err,
      });
    }

    if (recovered.toLowerCase() !== wallet.address.toLowerCase()) {
      await this.prisma.verificationChallenge.update({
        where: { id: challenge.id },
        data: { status: "FAILED" },
      });
      throw new NPError("NP_VALIDATION_FAILED", {
        message: "Signature does not match wallet address.",
        params: { recovered, expected: wallet.address },
      });
    }

    // Mark challenge consumed + wallet VERIFIED + isPrimary=true.
    await this.prisma.$transaction([
      this.prisma.verificationChallenge.update({
        where: { id: challenge.id },
        data: { status: "VERIFIED", consumedAt: new Date() },
      }),
      this.prisma.wallet.updateMany({
        where: { creatorId: wallet.creatorId, network: wallet.network, NOT: { id: wallet.id } },
        data: { isPrimary: false },
      }),
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          verificationStatus: "VERIFIED",
          verifiedAt: new Date(),
          verificationMethod: "EIP-191",
          isPrimary: true,
        },
      }),
    ]);

    this.logger.log(`Wallet verified: ${wallet.address} (${wallet.network}) via EIP-191`);
    return this.findById(walletId);
  }

  async detach(walletId: string, principalCreatorId: string): Promise<void> {
    const wallet = await this.findById(walletId);
    if (wallet.creatorId !== principalCreatorId) {
      throw new NPError("NP_FORBIDDEN", { message: "Cannot detach another creator's wallet." });
    }
    await this.prisma.wallet.delete({ where: { id: walletId } });
    this.logger.log(`Wallet detached: ${wallet.address}`);
  }
}
