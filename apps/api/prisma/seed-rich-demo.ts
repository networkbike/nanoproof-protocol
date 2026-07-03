/**
 * Rich demo seed — seeds many creators, supporters, and settlements to make
 * the dashboards feel populated. Designed for the Lepton demo.
 *
 *   DATABASE_URL=... tsx prisma/seed-rich-demo.ts [--payments 300]
 *
 * Defaults: 25 creators, 22 supporter addresses, 300 payments.
 *
 * Uses the same X402Service path the live API uses, so the data is
 * indistinguishable from real flow output.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { X402Service } from "../src/x402/x402.service.js";
import { ArcScanVerifierService } from "../src/x402/arcscan-verifier.service.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set for the seed script");
}

function parseArgs(): { payments: number } {
  const args: Record<string, number> = { payments: 300 };
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
  return args as { payments: number };
}

// Demo data
const CREATORS = [
  { handle: "alice", name: "Alice Carter", bio: "AI research · ML safety · Web3 protocols" },
  { handle: "bob", name: "Bob Mitchell", bio: "Cryptographer · zk circuits · protocol design" },
  { handle: "carol", name: "Carol Tanaka", bio: "DeFi research · stablecoin economics · Circle Agent Stack" },
  { handle: "dave", name: "Dave Okafor", bio: "Web dev tutorials · React · Next.js" },
  { handle: "elena", name: "Elena Vasquez", bio: "Distributed systems · consensus algorithms" },
  { handle: "frank", name: "Frank Lin", bio: "Smart contract auditor · Solidity security" },
  { handle: "grace", name: "Grace Hopper", bio: "Compiler design · programming languages" },
  { handle: "hank", name: "Hank Schmidt", bio: "Game theory · mechanism design" },
  { handle: "iris", name: "Iris Patel", bio: "Zero-knowledge proofs · private transactions" },
  { handle: "jake", name: "Jake Roberts", bio: "Layer-2 rollups · optimistic execution" },
  { handle: "kira", name: "Kira Nakamura", bio: "Formal verification · theorem proving" },
  { handle: "liam", name: "Liam Chen", bio: "Token engineering · mechanism design" },
  { handle: "maya", name: "Maya Singh", bio: "Privacy research · anonymous credentials" },
  { handle: "noah", name: "Noah Williams", bio: "Cryptographic accumulators" },
  { handle: "olive", name: "Olive Park", bio: "Stablecoin design · reserve management" },
  { handle: "pablo", name: "Pablo García", bio: "Cross-chain bridges · interoperability" },
  { handle: "quinn", name: "Quinn Foster", bio: "Account abstraction · smart wallets" },
  { handle: "rita", name: "Rita Andersson", bio: "Consensus protocols · BFT systems" },
  { handle: "sam", name: "Sam Goldberg", bio: "MEV research · PBS design" },
  { handle: "tara", name: "Tara O'Brien", bio: "On-chain governance · DAOs" },
  { handle: "uma", name: "Uma Krishnan", bio: "Restaking · shared security" },
  { handle: "vince", name: "Vince Holloway", bio: "Intent-based architectures" },
  { handle: "wren", name: "Wren Davies", bio: "ZK coprocessors · offchain compute" },
  { handle: "xenia", name: "Xenia Volkov", bio: "Optimistic proofs · fraud detection" },
  { handle: "yara", name: "Yara Hassan", bio: "Data availability · DAS" },
];

const SUPPORTER_WALLETS = [
  "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
  "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
  "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
  "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
  "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
  "0xAbCdEf0123456789AbCdEf0123456789AbCdEf01",
  "0xBeDeAd0123456789BeDeAd0123456789BeDeAd02",
  "0xCafebabe0123456789Cafebabe0123456789CafE",
  "0xDeadBeef0123456789DeadBeef0123456789Deadb",
  "0xFeedFace0123456789FeedFace0123456789Feedf",
  "0x0000000000000000000000000000000000000042",
  "0x0000000000000000000000000000000000000139",
  "0x0000000000000000000000000000000000000abc",
  "0x0000000000000000000000000000000000000def",
  "0x1234567890abcdef1234567890abcdef12345678",
  "0xfedcba0987654321fedcba0987654321fedcba09",
  "0xa1b2c3d4e5f60718291a2b3c4d5e6f708192a3b4",
  "0x0a0b0c0d0e0f102030405060708090a0b0c0d0e0f",
  "0x9999999999999999999999999999999999999999",
  "0x8888888888888888888888888888888888888888",
];

const RESOURCES = [
  { path: "/v1/research/cite", price: "1000" },
  { path: "/v1/research/answer", price: "10000" },
  { path: "/v1/premium/source", price: "5000" },
  { path: "/v1/agent/tool", price: "2500" },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

async function main() {
  const { payments: numPayments } = parseArgs();
  process.env.NANOPROOF_DEMO_MODE = "true";

  console.log(`Seeding ${CREATORS.length} creators, ${SUPPORTER_WALLETS.length} supporter addresses, ${numPayments} payments...`);

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const arcscan = new ArcScanVerifierService();
  const x402 = new X402Service(prisma, arcscan);

  // 1. Seed creators
  console.log("\n[1/4] Seeding creators...");
  const creatorIds: string[] = [];
  for (const c of CREATORS) {
    const existing = await prisma.creator.findFirst({ where: { handle: c.handle } });
    if (existing) {
      creatorIds.push(existing.id);
      continue;
    }
    const id = `cr_demo_${c.handle}`;
    const created = await prisma.creator.create({
      data: {
        id,
        handle: c.handle,
        name: c.name,
        bio: c.bio,
        walletAddress: `0x${c.handle.padEnd(40, "0").slice(0, 40)}`,
      },
    });
    creatorIds.push(created.id);
  }
  console.log(`  ✓ ${creatorIds.length} creators ready`);

  // 2. Seed payments via the x402 service (same path as live API)
  console.log(`\n[2/4] Seeding ${numPayments} payments...`);
  let settled = 0;
  let failed = 0;
  const reportEvery = Math.max(1, Math.floor(numPayments / 10));

  for (let i = 0; i < numPayments; i++) {
    const creatorId = pick(creatorIds);
    const resource = pick(RESOURCES);
    const amountUsdc = resource.price;
    const payerAddress = pick(SUPPORTER_WALLETS);

    try {
      const { request } = await x402.createPaymentRequest({
        creatorId,
        resource: resource.path,
        amountUsdc,
        payerAddress,
      });
      await x402.settlePayment({
        requestId: request.id,
        payerAddress,
      });
      settled++;
    } catch (e) {
      failed++;
      if (failed < 3) {
        console.warn(`  ! payment ${i + 1} failed:`, e instanceof Error ? e.message.slice(0, 100) : e);
      }
    }
    if ((i + 1) % reportEvery === 0) {
      console.log(`  · ${i + 1}/${numPayments} done (settled=${settled}, failed=${failed})`);
    }
  }
  console.log(`  ✓ ${settled} settled, ${failed} failed`);

  // 3. Print summary
  console.log("\n[3/4] Summary:");
  const totalSettlements = await prisma.settlementProof.count();
  const totalPayments = await prisma.payment.count();
  const totalVerified = await prisma.settlementProof.count({ where: { verificationStatus: "VERIFIED" } });
  const totalSupporters = await prisma.supporter.count();
  const totalCreators = await prisma.creator.count();

  console.log(`  Creators:        ${totalCreators}`);
  console.log(`  Supporters:      ${totalSupporters}`);
  console.log(`  Payments:        ${totalPayments}`);
  console.log(`  Settlements:     ${totalSettlements}`);
  console.log(`  Verified:        ${totalVerified}`);

  console.log("\n✅ Rich demo seed complete!");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });