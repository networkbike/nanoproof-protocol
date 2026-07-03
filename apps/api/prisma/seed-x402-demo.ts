/**
 * Phase 8 demo seed — seeds creators + a realistic set of x402 settlements
 * so the Lepton judges see a non-empty dashboard on first load.
 *
 * Idempotent: re-running the script upserts everything.
 *
 *   DATABASE_URL=... tsx prisma/seed-x402-demo.ts [--settlements 30]
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { X402Service } from "../src/x402/x402.service.js";
import { ArcScanVerifierService } from "../src/x402/arcscan-verifier.service.js";
import { arcScanTxUrl } from "../src/x402/x402.constants.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set for the seed script");
}

function parseArgs(): { settlements: number } {
  const args: Record<string, number> = { settlements: 25 };
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg?.startsWith("--")) {
      const key = arg.slice(2);
      const value = Number(process.argv[i + 1]);
      if (!Number.isNaN(value)) {
        args[key] = value;
        i++;
      }
    }
  }
  return args as { settlements: number };
}

async function main(): Promise<void> {
  const { settlements: numSettlements } = parseArgs();
  // Force demo mode for synthetic txHashes
  process.env.NANOPROOF_DEMO_MODE = "true";

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const arcscan = new ArcScanVerifierService();
  const x402 = new X402Service(prisma, arcscan);

  // -------------------------------------------------------------------------
  // 1. Seed creators
  // -------------------------------------------------------------------------
  const creators = await Promise.all([
    upsertCreator(prisma, {
      id: "cr_demo_alice",
      username: "alice",
      email: "alice@nanoproof.local",
      name: "Alice Chen",
      bio: "AI research · ML safety · Web3 protocols",
      wallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    }),
    upsertCreator(prisma, {
      id: "cr_demo_bob",
      username: "bob",
      email: "bob@nanoproof.local",
      name: "Bob Martinez",
      bio: "Cryptographer · zk circuits · protocol design",
      wallet: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    }),
    upsertCreator(prisma, {
      id: "cr_demo_carol",
      username: "carol",
      email: "carol@nanoproof.local",
      name: "Carol Singh",
      bio: "DeFi research · stablecoin economics · Circle Agent Stack",
      wallet: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    }),
    upsertCreator(prisma, {
      id: "cr_demo_dave",
      username: "dave",
      email: "dave@nanoproof.local",
      name: "Dave Okafor",
      bio: "Web dev tutorials · React · Next.js",
      wallet: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    }),
  ]);

  // -------------------------------------------------------------------------
  // 2. Seed settlements (x402 demo flow per creator)
  // -------------------------------------------------------------------------
  const resources = [
    "/v1/research/cite",
    "/v1/research/answer",
    "/v1/premium/source",
    "/v1/agent/tool",
  ];
  const amounts = ["1000", "2500", "5000", "10000"]; // atomic USDC
  const payers = [
    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
    "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
    "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
  ];

  let created = 0;
  for (let i = 0; i < numSettlements; i++) {
    const creator = creators[i % creators.length]!;
    const resource = resources[i % resources.length]!;
    const amount = amounts[i % amounts.length]!;
    const payer = payers[i % payers.length]!;

    try {
      const { request } = await x402.createPaymentRequest({
        creatorId: creator.id,
        resource,
        amountUsdc: amount,
        payerAddress: payer,
      });
      const { proof } = await x402.settlePayment({
        requestId: request.id,
        payerAddress: payer,
      });
      // Force re-verify (since settle already triggered it async, this is the second attempt)
      await x402.verifySettlement(proof.id);
      created++;
    } catch (err) {
      console.error(`Settlement ${i + 1} failed:`, (err as Error).message);
    }
  }

  // -------------------------------------------------------------------------
  // 3. Print summary
  // -------------------------------------------------------------------------
  const metrics = await x402.getProtocolMetrics();
  console.log("\n✅ Phase 8 demo seed complete");
  console.log(`   Creators:        ${creators.length}`);
  console.log(`   Settlements:     ${created}`);
  console.log(`   Total paid:      $${metrics.totalUsdcDisplay} USDC`);
  console.log(`   Total verified:  ${metrics.totalVerified}`);
  console.log(`   Total failed:    ${metrics.totalFailed}`);
  console.log(`   x402 challenges: ${metrics.x402ChallengesServed}`);
  console.log(`\nSample ArcScan URL:`);
  console.log(`   ${arcScanTxUrl("0x" + "0".repeat(64))}\n`);

  await prisma.$disconnect();
  await pool.end();
}

async function upsertCreator(
  prisma: PrismaClient,
  input: {
    id: string;
    username: string;
    email: string;
    name: string;
    bio: string;
    wallet: string;
  },
): Promise<{ id: string; username: string }> {
  const creator = await prisma.creator.upsert({
    where: { id: input.id },
    update: {
      name: input.name,
      bio: input.bio,
      isActive: true,
    },
    create: {
      id: input.id,
      username: input.username,
      email: input.email,
      name: input.name,
      bio: input.bio,
      isActive: true,
      reputationScore: 85 + Math.floor(Math.random() * 15),
    },
  });

  // Ensure wallet
  await prisma.wallet.upsert({
    where: { address_network: { address: input.wallet, network: "ARC_TESTNET" } },
    update: { creatorId: creator.id, isPrimary: true, verificationStatus: "VERIFIED" },
    create: {
      creatorId: creator.id,
      address: input.wallet,
      network: "ARC_TESTNET",
      isPrimary: true,
      verificationStatus: "VERIFIED",
      verificationMethod: "EIP-191",
    },
  });

  return { id: creator.id, username: creator.username };
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    // pool ended inside main
  });