import { PrismaClient } from "@prisma/client";

/**
 * MVP seed — creates one demo creator, wallet, and source so the
 * dashboard has something to render. Idempotent: re-running upserts.
 */
const prisma = new PrismaClient();

async function main() {
  const creator = await prisma.creator.upsert({
    where: { username: "demo" },
    update: {},
    create: {
      username: "demo",
      email: "demo@nanoproof.local",
      name: "Demo Creator",
      bio: "Seed creator for the NanoProof MVP dashboard.",
    },
  });

  await prisma.wallet.upsert({
    where: { address_network: { address: "0xdemo000000000000000000000000000000000001", network: "ARC_TESTNET" } },
    update: {},
    create: {
      creatorId: creator.id,
      address: "0xdemo000000000000000000000000000000000001",
      network: "ARC_TESTNET",
      isPrimary: true,
    },
  });

  await prisma.source.upsert({
    where: { creatorId_url: { creatorId: creator.id, url: "https://demo.nanoproof.xyz/hello" } },
    update: {},
    create: {
      creatorId: creator.id,
      url: "https://demo.nanoproof.xyz/hello",
      domain: "demo.nanoproof.xyz",
      title: "Hello from NanoProof",
      description: "Seed source for the MVP simulator.",
      status: "ACTIVE",
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Seeded creator ${creator.username} (${creator.id})`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });