import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { Wallet } from "@prisma/client";

/**
 * MVP wallets service.
 *
 * Phase 2 P2-008 implements EIP-191 verification, list-by-creator,
 * address uniqueness, and isPrimary enforcement.
 */
@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async attach(input: { creatorId: string; address: string; network: string }): Promise<Wallet> {
    return this.prisma.wallet.create({
      data: {
        creatorId: input.creatorId,
        address: input.address.toLowerCase(),
        network: input.network,
      },
    });
  }

  async listByCreator(creatorId: string): Promise<Wallet[]> {
    return this.prisma.wallet.findMany({ where: { creatorId }, orderBy: { createdAt: "desc" } });
  }
}