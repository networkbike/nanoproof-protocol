// =============================================================================
// NanoProof — Demo Seed CLI
//
// Usage:
//   DATABASE_URL=... tsx prisma/demo-seed.ts [--creators 100] [--sources 500] \
//                                                [--citations 1000] [--payments 1000]
//
// Idempotent. Wipes all `demo_*` rows before re-inserting.
// =============================================================================

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { seedDemoDataset } from "../src/prisma/demo-seed.js";

function parseArgs() {
  const args: Record<string, number> = {};
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
  return args;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set for the seed script");
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const args = parseArgs();
  const summary = await seedDemoDataset(prisma, {
    creators: args.creators,
    sources: args.sources,
    citations: args.citations,
    payments: args.payments,
  });

  // eslint-disable-next-line no-console
  console.log("Demo seed complete:");
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    const { PrismaClient } = await import("@prisma/client");
    await new PrismaClient().$disconnect();
  });