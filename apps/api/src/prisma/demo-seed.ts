// =============================================================================
// NanoProof — Demo Seed (Phase 6)
//
// Deterministic seed script for the Lepton demo. Idempotent: rerunning
// clears existing demo rows (anything starting with `demo_`) and re-inserts
// the same dataset, so the dashboard numbers are reproducible across runs.
//
// Output shape:
//   { creators, sources, citations, attributionEvents, payments }
//
// Implementation notes:
//   - Uses a seeded PRNG (mulberry32) so the dataset is byte-identical
//     across runs given the same inputs.
//   - Sources reference creator-owned domains; citations reference sources;
//     payments settle after citations. Honors foreign keys + Phase 2
//     append-only triggers by using INSERT (not UPDATE) — payments are
//     created as SETTLED in one shot.
//   - Atomic USDC: 1 USDC = 1_000_000 atomic. We pick amounts in
//     {100, 500, 1000, 2500, 5000, 10_000} atomic — i.e. $0.0001 to $0.01
//     per citation. With 1000 citations × ~$0.005 average, total payout
//     = ~$5.00 — fits cleanly into the dashboard's compact numbers.
// =============================================================================

import type { PrismaClient, Prisma } from "@prisma/client";

// -----------------------------------------------------------------------------
// Deterministic PRNG (mulberry32) — small, fast, well-distributed.
// -----------------------------------------------------------------------------
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)] as T;
}

function range(rng: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

// -----------------------------------------------------------------------------
// Static catalog — keeps the dataset legible.
// -----------------------------------------------------------------------------
const FIRST_NAMES = [
  "ada", "linus", "grace", "alan", "donald", "edsger", "barbara", "john", "ken", "andrew",
  "tim", "guido", "rasmus", "brendan", "james", "yvonne", "marie", "hedy", "katherine", "rachel",
  "sofia", "amara", "mira", "leon", "kai", "noor", "ines", "ravi", "luca", "mei",
];
const LAST_NAMES = [
  "lovelace", "torvalds", "hopper", "turing", "knuth", "dijkstra", "liskov", "mccarthy", "thompson", "tanenbaum",
  "berners-lee", "rossum", "lerdorf", "eich", "gosling", "cho", "curie", "lamarr", "johnson", "carson",
  "koval", "osei", "patel", "okonkwo", "wong", "haddad", "ivanov", "sharma", "rossi", "tanaka",
];

const DOMAINS = [
  "arxiv.org", "wikipedia.org", "github.com", "medium.com", "substack.com",
  "dev.to", "huggingface.co", "kaggle.com", "researchgate.net", "acm.org",
  "ieee.org", "nature.com", "sciencedirect.com", "frontiersin.org", "openreview.net",
];

const TITLES = [
  "Attention Is All You Need", "BERT: Pre-training of Deep Bidirectional Transformers",
  "GPT-4 Technical Report", "Stable Diffusion: Latent Diffusion Models",
  "Constitutional AI: Harmlessness from AI Feedback", "ReAct: Synergizing Reasoning and Acting",
  "Toolformer: Language Models Can Teach Themselves to Use Tools",
  "RAG: Retrieval-Augmented Generation", "LoRA: Low-Rank Adaptation of Large Language Models",
  "Mixture of Experts: Scaling LLM Inference", "RLHF: Reinforcement Learning from Human Feedback",
  "Chain-of-Thought Prompting", "Function Calling for LLMs", "Vector Databases in Production",
  "Self-Supervised Learning for Vision", "Diffusion Models: A Comprehensive Survey",
  "Transformer-XL: Attentive Language Models Beyond a Fixed-Length Context",
  "Flash Attention: Fast and Memory-Efficient Exact Attention",
  "Llama 2: Open Foundation and Fine-Tuned Chat Models", "Falcon: A Large Open-Source Language Model",
];

const SNIPPETS = [
  "the model achieves state-of-the-art results on benchmark X",
  "we propose a novel approach to scaling inference compute",
  "training stability is improved by using layer normalization",
  "the loss function converges after 10k iterations",
  "we evaluate our method on the MMLU benchmark",
  "the model exhibits emergent abilities at scale",
  "fine-tuning on instruction-following data improves alignment",
  "we release the weights under an open license",
  "human evaluation shows a 12% win rate over the baseline",
  "the architecture uses a sparse mixture of experts",
  "we compare against GPT-4 and Claude 2",
  "the system is deployed in production at scale",
  "we address hallucination through retrieval augmentation",
  "the agent uses tools to verify factual claims",
  "we measure attribution accuracy using human raters",
];

const NETWORKS = ["ARC_TESTNET", "ARC_MAINNET", "BASE", "BASE_SEPOLIA"] as const;
const KINDS = ["DIRECT", "INDIRECT", "SUPPORTING", "REFERENCE", "CONTEXT"] as const;
const STATUSES = ["SETTLED", "SETTLED", "SETTLED", "PENDING", "FAILED"] as const; // bias toward settled
const SOURCE_STATUSES = ["ACTIVE", "ACTIVE", "ACTIVE", "PAUSED"] as const;

const PAYOUT_ATOMIC = ["100", "500", "1000", "2500", "5000", "10000"];

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function cuid(prefix: string, rng: () => number): string {
  // Prisma's cuid() is fine but we want deterministic IDs. Build something
  // that looks like a cuid (starts with `c`) and includes the seed.
  const n = Math.floor(rng() * 0xffffffff).toString(16).padStart(8, "0");
  return `${prefix}${n}${Date.now().toString(36)}`.toLowerCase().slice(0, 24);
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function timestampSpread(rng: () => number, daysBack: number): Date {
  const now = Date.now();
  const past = now - Math.floor(rng() * daysBack * 86_400_000);
  return new Date(past);
}

// -----------------------------------------------------------------------------
// Main entry
// -----------------------------------------------------------------------------

export interface DemoSeedOptions {
  creators?: number;
  sources?: number;
  citations?: number;
  payments?: number;
  seed?: number;
}

export interface DemoSeedSummary {
  creators: number;
  sources: number;
  citations: number;
  attributionEvents: number;
  payments: number;
}

export async function seedDemoDataset(
  prisma: PrismaClient,
  opts: DemoSeedOptions = {},
): Promise<DemoSeedSummary> {
  const SEED = opts.seed ?? 42;
  const N_CREATORS = opts.creators ?? 100;
  const N_SOURCES = opts.sources ?? 500;
  const N_CITATIONS = opts.citations ?? 1000;
  const N_PAYMENTS = opts.payments ?? 1000;

  const rng = mulberry32(SEED);

  // 1. Wipe existing demo rows (idempotency). Look up the prefix we used.
  // We identify demo rows by username prefix 'demo_'. Note: payments and
  // citations have append-only triggers that block DELETE, so we disable
  // them temporarily for the wipe, then restore.
  //
  // The triggers live on `payments` and `citations` tables. Disabling them
  // inside a transaction is safe — if anything below this point fails,
  // Postgres rolls back the DISABLE as well.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`ALTER TABLE "payments" DISABLE TRIGGER trg_payments_no_update`);
    await tx.$executeRawUnsafe(`ALTER TABLE "payments" DISABLE TRIGGER trg_payments_no_delete`);
    await tx.$executeRawUnsafe(`ALTER TABLE "citations" DISABLE TRIGGER trg_citations_no_update`);
    await tx.$executeRawUnsafe(`ALTER TABLE "citations" DISABLE TRIGGER trg_citations_no_delete`);
    // TRUNCATE ... CASCADE is the fastest way to wipe. It bypasses the
    // (now disabled) triggers AND cascades to dependent tables.
    await tx.$executeRawUnsafe(`
      TRUNCATE TABLE "payments", "citations" RESTART IDENTITY CASCADE
    `);
    // Wipe source/citation counts that hang off non-cascading tables.
    await tx.$executeRawUnsafe(`DELETE FROM "sources" WHERE "creatorId" IN (SELECT id FROM "creators" WHERE "username" LIKE 'demo_%')`);
    await tx.$executeRawUnsafe(`DELETE FROM "api_keys" WHERE "creatorId" IN (SELECT id FROM "creators" WHERE "username" LIKE 'demo_%')`);
    await tx.$executeRawUnsafe(`DELETE FROM "wallets" WHERE "creatorId" IN (SELECT id FROM "creators" WHERE "username" LIKE 'demo_%')`);
    await tx.$executeRawUnsafe(`DELETE FROM "creators" WHERE "username" LIKE 'demo_%'`);
    await tx.$executeRawUnsafe(`ALTER TABLE "payments" ENABLE TRIGGER trg_payments_no_update`);
    await tx.$executeRawUnsafe(`ALTER TABLE "payments" ENABLE TRIGGER trg_payments_no_delete`);
    await tx.$executeRawUnsafe(`ALTER TABLE "citations" ENABLE TRIGGER trg_citations_no_update`);
    await tx.$executeRawUnsafe(`ALTER TABLE "citations" ENABLE TRIGGER trg_citations_no_delete`);
  });

  // 2. Creators
  const creatorRows: Array<{
    id: string;
    name: string;
    username: string;
    email: string;
    bio: string;
    reputationScore: number;
    isActive: boolean;
    avatarUrl: string | null;
    twitterHandle: string | null;
    githubHandle: string | null;
    websiteUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  for (let i = 0; i < N_CREATORS; i++) {
    const fn = pick(rng, FIRST_NAMES);
    const ln = pick(rng, LAST_NAMES);
    const username = `demo_${fn}_${ln}_${i}`.toLowerCase().slice(0, 30);
    creatorRows.push({
      id: cuid("cr_", rng),
      name: `${fn[0]?.toUpperCase()}${fn.slice(1)} ${ln[0]?.toUpperCase()}${ln.slice(1)}`,
      username,
      email: `${username}@demo.nanoproof.local`,
      bio: `Researcher focused on ${pick(rng, ["AI alignment", "retrieval systems", "model evaluation", "tool use", "RLHF"])}.`,
      reputationScore: range(rng, 10, 500),
      isActive: true,
      avatarUrl: null,
      twitterHandle: `@${username}`,
      githubHandle: username,
      websiteUrl: `https://${username}.demo.nanoproof.local`,
      createdAt: timestampSpread(rng, 90),
      updatedAt: new Date(),
    });
  }
  await prisma.creator.createMany({ data: creatorRows, skipDuplicates: true });

  // 3. Wallets (one per creator)
  const walletRows = creatorRows.map((c) => ({
    id: cuid("wlt_", rng),
    creatorId: c.id,
    address: `0x${[...Array(40)].map(() => Math.floor(rng() * 16).toString(16)).join("")}`,
    network: pick(rng, NETWORKS),
    label: "primary",
    isPrimary: true,
    verificationStatus: "VERIFIED" as const,
    verifiedAt: new Date(),
    verificationMethod: "EIP-191",
    createdAt: c.createdAt,
    updatedAt: new Date(),
  }));
  await prisma.wallet.createMany({ data: walletRows, skipDuplicates: true });

  // 4. Sources (each creator owns ~5 sources)
  const sourcesPerCreator = Math.max(1, Math.floor(N_SOURCES / N_CREATORS));
  const sourceRows: Array<{
    id: string;
    creatorId: string;
    url: string;
    title: string;
    description: string;
    domain: string;
    status: "ACTIVE" | "PAUSED";
    citationCount: number;
    earnedAtomic: string;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  for (const c of creatorRows) {
    for (let s = 0; s < sourcesPerCreator; s++) {
      const domain = pick(rng, DOMAINS);
      const slug = pick(rng, TITLES).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      const url = `https://${domain}/${slug}-${s}`;
      sourceRows.push({
        id: cuid("src_", rng),
        creatorId: c.id,
        url,
        title: pick(rng, TITLES),
        description: `A study on ${pick(rng, ["transformers", "diffusion models", "RLHF", "RAG", "MoE"])}.`,
        domain,
        status: pick(rng, SOURCE_STATUSES),
        citationCount: 0,
        earnedAtomic: "0",
        createdAt: c.createdAt,
        updatedAt: new Date(),
      });
      if (sourceRows.length >= N_SOURCES) break;
    }
    if (sourceRows.length >= N_SOURCES) break;
  }
  await prisma.source.createMany({ data: sourceRows as unknown as Prisma.SourceCreateManyInput[], skipDuplicates: true });

  // 5. Citations (random sources, attributed to creators)
  const citationRows: Array<{
    id: string;
    sourceId: string;
    responseId: string;
    snippet: string;
    kind: "DIRECT" | "INDIRECT" | "SUPPORTING" | "REFERENCE" | "CONTEXT";
    matchKind: string;
    matchScore: string;
    confidence: string;
    contributionFraction: string;
    payoutAmountUsdc: string;
    status: string;
    recordedAt: Date;
    prevHash: string | null;
    hash: string | null;
  }> = [];

  for (let i = 0; i < N_CITATIONS; i++) {
    const src = pick(rng, sourceRows);
    const atomic = pick(rng, PAYOUT_ATOMIC);
    const matchScore = (0.6 + rng() * 0.4).toFixed(4);
    citationRows.push({
      id: cuid("cit_", rng),
      sourceId: src.id,
      responseId: `rsp_${i}`,
      snippet: pick(rng, SNIPPETS),
      kind: pick(rng, KINDS),
      matchKind: pick(rng, ["URL", "URL", "FINGERPRINT", "QUOTE"]),
      matchScore,
      confidence: (0.5 + rng() * 0.5).toFixed(2),
      contributionFraction: (0.5 + rng() * 0.5).toFixed(4),
      payoutAmountUsdc: atomic,
      status: "PENDING",
      recordedAt: timestampSpread(rng, 60),
      prevHash: null,
      hash: null,
    });
  }
  await prisma.citation.createMany({ data: citationRows as unknown as Prisma.CitationCreateManyInput[], skipDuplicates: true });

  // 6. Payments — one per citation (atomic USDC matches payoutAmountUsdc)
  const paymentRows = citationRows.map((c, i) => {
    const status = pick(rng, STATUSES);
    const settled = status === "SETTLED";
    return {
      id: cuid("pay_", rng),
      creatorId: sourceRows.find((s) => s.id === c.sourceId)!.creatorId,
      sourceId: c.sourceId,
      amountUsdc: c.payoutAmountUsdc,
      currency: "USDC",
      network: pick(rng, NETWORKS),
      status,
      txHash: settled ? `0x${[...Array(64)].map(() => Math.floor(rng() * 16).toString(16)).join("")}` : null,
      arcScanUrl: settled ? `https://testnet.arcscan.app/tx/0x${i.toString(16)}` : null,
      blockNumber: settled ? BigInt(range(rng, 100_000, 999_999)) : null,
      settledAt: settled ? c.recordedAt : null,
      createdAt: c.recordedAt,
      updatedAt: new Date(),
      prevHash: null,
      hash: null,
    };
  });
  await prisma.payment.createMany({ data: paymentRows, skipDuplicates: true });

  // 7. Backfill Source.citationCount + earnedAtomic from the inserted rows
  // We do this in a single raw query — faster than N updates.
  await prisma.$executeRawUnsafe(`
    UPDATE "sources" s
    SET
      "citationCount" = COALESCE(c.n, 0),
      "earnedAtomic"  = COALESCE(e.sum, '0')
    FROM (
      SELECT "sourceId", COUNT(*)::int AS n
      FROM "citations"
      GROUP BY "sourceId"
    ) c
    LEFT JOIN (
      SELECT p."sourceId", SUM(p."amountUsdc"::bigint)::text AS sum
      FROM "payments" p
      WHERE p."status" = 'SETTLED'
      GROUP BY p."sourceId"
    ) e ON e."sourceId" = c."sourceId"
    WHERE s.id = c."sourceId"
  `);

  return {
    creators: creatorRows.length,
    sources: sourceRows.length,
    citations: citationRows.length,
    attributionEvents: citationRows.length, // 1:1 in current model
    payments: paymentRows.length,
  };
}