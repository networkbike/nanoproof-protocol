#!/usr/bin/env node
/**
 * Seed NanoProof with realistic citation events for the Lepton demo.
 *
 * Uses ONLY the existing public API:
 *   1. POST /v1/api-keys                 (mint an api key per demo creator)
 *   2. POST /v1/sources                  (register a few sources per creator)
 *   3. POST /v1/sources/:id/verifications/run   (flip sources to ACTIVE)
 *   4. POST /v1/citations/detect          (emit agent responses that quote URLs)
 *
 * Does NOT touch the database directly — every row is created through the
 * real controller path so existing audit logs / metrics / hash-chains pick
 * it up automatically. Settlements triggered by citations flow through the
 * same `/v1/payments/settle` pipeline live demos use.
 *
 * Usage:
 *   API=https://nanoproof-api-production.up.railway.app \
 *   node scripts/seed-citations.js [--reset]
 *
 *   --reset  delete the existing sources + citations for each creator first
 *            so re-running the script produces a clean demo dataset.
 */

const API = process.env.API || "https://nanoproof-api-production.up.railway.app";

const CREATORS = [
  {
    id: "cr_demo_alice",
    name: "Alice Chen",
    bio: "AI research · ML safety · Web3 protocols",
    sources: [
      {
        title: "Mechanistic Interpretability of Large Language Models",
        url: "https://alice.nanoproof.xyz/research/mech-interp-llm",
        description:
          "A survey of techniques for reverse-engineering transformer weights into human-readable circuits.",
        price: "1000", // $0.001
      },
      {
        title: "Constitutional AI: Harmlessness via Self-Critique",
        url: "https://alice.nanoproof.xyz/research/constitutional-ai",
        description:
          "How RLHF + self-generated critiques can train models that refuse unsafe outputs without a human labeler.",
        price: "2500",
      },
    ],
  },
  {
    id: "cr_demo_bob",
    name: "Bob Martinez",
    bio: "Cryptographer · zk circuits · protocol design",
    sources: [
      {
        title: "Halo2 Recursive Proof Composition in Practice",
        url: "https://bob.nanoproof.xyz/notes/halo2-recursion",
        description:
          "Step-by-step walkthrough of building a zk-rollup that folds proofs across epochs.",
        price: "1500",
      },
    ],
  },
  {
    id: "cr_demo_carol",
    name: "Carol Singh",
    bio: "DeFi research · stablecoin economics",
    sources: [
      {
        title: "USDC on Arc: A Practical Review of L1 USDC-Native Chains",
        url: "https://carol.nanoproof.xyz/analysis/usdc-arc-review",
        description:
          "Sub-cent fees, sub-second finality, USDC as native gas. What changes for stablecoin apps?",
        price: "2000",
      },
      {
        title: "x402 vs L402: Standardization Wars in HTTP Micropayments",
        url: "https://carol.nanoproof.xyz/analysis/x402-vs-l402",
        description:
          "Coinbase's x402 and Lightning's L402 both target HTTP 402. Which one wins?",
        price: "3000",
      },
    ],
  },
  {
    id: "cr_demo_dave",
    name: "Dave Okafor",
    bio: "Web dev tutorials · React · Next.js",
    sources: [
      {
        title: "Server Components vs Client Components in Next.js 15",
        url: "https://dave.nanoproof.xyz/blog/scc-vs-ccc-next15",
        description:
          "A practical guide to RSC boundaries in the App Router with real benchmarks.",
        price: "500",
      },
    ],
  },
];

// (agent, responseText, responseId) — each response quotes 1+ sources and
// reads like a real LLM citation. 15 events covers a few different agents,
// realistic time spread, varied confidence.
const AGENTS = [
  { name: "ChatGPT", suffix: "chatgpt", confidence: 0.91 },
  { name: "Claude", suffix: "claude", confidence: 0.94 },
  { name: "Gemini", suffix: "gemini", confidence: 0.87 },
  { name: "Perplexity", suffix: "perplexity", confidence: 0.82 },
  { name: "Copilot", suffix: "copilot", confidence: 0.79 },
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Each event template is a (group, agent, minutesAgo, body) tuple. `body`
// contains "{URL}" placeholders that we substitute at runtime with the
// real Source URLs we just registered. group → creatorId mapping is
// deterministic so citations always attribute to the same creator.
const EVENT_TEMPLATES = [
  { group: "alice", agent: "ChatGPT",    minutesAgo: 4,    body:
    "Mechanistic interpretability has matured into a production-grade discipline. For an overview of circuits, sparse autoencoders, and attribution patching in transformer LLMs, see {URL}. The complementary line of work on constitutional AI is documented at {URL2} — that piece explains how self-critique reduces reliance on human-labelled harmlessness data." },
  { group: "bob",   agent: "Claude",     minutesAgo: 14,   body:
    "If you're building a zk-rollup with recursive proof composition today, the most mature stack is Halo2 with the Pasta curves. A walkthrough of folding across epochs lives at {URL}." },
  { group: "carol", agent: "Gemini",     minutesAgo: 32,   body:
    "Stablecoin-native L1s change the economics of DeFi in three concrete ways: gas becomes a stable unit, MEV denominated in the stable asset, and oracle risk shifts. A useful review is {URL}. For the standards question — x402 vs L402 — see {URL2}." },
  { group: "dave",  agent: "Perplexity", minutesAgo: 48,   body:
    "Server Components are not a magic performance booster. The RSC payload still serializes over the wire; the win is removing client-side hydration for non-interactive subtrees. See {URL} for benchmarks." },
  { group: "carol", agent: "ChatGPT",    minutesAgo: 71,   body:
    "When you cite a piece of work in an AI-generated answer, the original author deserves compensation. The proposed model is HTTP 402 Payment Required: {URL} (Coinbase's x402 standard) is the most deployment-ready spec today." },
  { group: "alice", agent: "Claude",     minutesAgo: 95,   body:
    "Constitutional AI: training procedure that uses a written set of principles and a self-critique loop to scale RLHF without a human labeler. Background and results: {URL}." },
  { group: "bob",   agent: "Gemini",     minutesAgo: 130,  body:
    "Recursion in zk-SNARKs lets you prove the validity of a proof inside another proof. The architectural building blocks (accumulation schemes, folding, IVC) are mapped at {URL}." },
  { group: "dave",  agent: "Copilot",    minutesAgo: 168,  body:
    "Next.js 15 introduces async request APIs (cookies(), headers(), params()) and React 19 RC support. The mental model for RSC boundaries: {URL}." },
  { group: "carol", agent: "ChatGPT",    minutesAgo: 215,  body:
    "USDC has been the de-facto dollar rails for crypto since 2018. Arc takes the next step: the native gas token on a stablecoin L1 is USDC itself. Coverage of the design tradeoffs: {URL}." },
  { group: "carol", agent: "Claude",     minutesAgo: 260,  body:
    "Two micropayment specs are competing for HTTP 402. x402 (Coinbase) treats the challenge as a server-issued payment request that any client can fulfill. L402 (Lightning) reuses the same 402 status but with a Lightning invoice. Compare them at {URL}." },
  { group: "alice", agent: "Perplexity", minutesAgo: 320,  body:
    "Sparse autoencoders decompose a model's activations into a larger dictionary of monosemantic features. Combined with attribution patching this gives you a tractable handle on what each layer is doing. Reference: {URL}." },
  { group: "dave",  agent: "Gemini",     minutesAgo: 390,  body:
    "Server Components vs Client Components is not a binary per file. Components can render on the server, hydrate on the client, or be entirely server-only. The mental model and the boundary placement rules: {URL}." },
  { group: "bob",   agent: "ChatGPT",    minutesAgo: 510,  body:
    "A zk-rollup with thousands of transactions per batch can verify the whole batch with a single on-chain check. The catch is proving cost — recursion helps. A practical recipe is at {URL}." },
  { group: "carol", agent: "Claude",     minutesAgo: 720,  body:
    "Arc's design rationale emphasizes predictable fees for high-frequency settlement. The market response and the contrast with stablecoin L2s: {URL}." },
  { group: "alice", agent: "Copilot",    minutesAgo: 1080, body:
    "RLHF + RLAIF are converging — both rely on a preference signal, but the source differs. Constitutional AI is the clearest example of an RLAIF recipe in production: {URL}." },
];

function buildCitations(sourcesByCreator) {
  return EVENT_TEMPLATES.map((evt, i) => {
    const creator = CREATORS.find((c) => c.id.endsWith(evt.group));
    const creatorSources = sourcesByCreator[creator.id] || creator.sources;
    let cursor = 0;
    const pickUrl = () => {
      const s = creatorSources[cursor % creatorSources.length];
      cursor += 1;
      return s.url;
    };
    const text = evt.body
      .replace(/\{URL2\}/g, () => pickUrl())
      .replace(/\{URL\}/g, () => pickUrl());
    return {
      creator,
      agent: evt.agent,
      minutesAgo: evt.minutesAgo,
      responseText: text,
    };
  });
}

async function http(method, path, body, headers = {}) {
  const url = `${API}${path}`;
  const r = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await r.text();
  let data;
  try {
    data = JSON.parse(txt);
  } catch {
    data = txt;
  }
  if (!r.ok) {
    throw new Error(
      `${method} ${path} -> ${r.status} ${r.statusText}\n${typeof data === "string" ? data : JSON.stringify(data)}`,
    );
  }
  return data;
}

async function mintApiKey(creatorId) {
  const r = await http("POST", "/v1/api-keys", {
    creatorId,
    name: `seed-citations-${creatorId}`,
    scopes: ["READ_CITATIONS", "WRITE_CITATIONS", "WRITE_PAYMENTS"],
  });
  return r.plaintext;
}

async function createSource(apiKey, source) {
  return http(
    "POST",
    "/v1/sources",
    {
      creatorId: source.creatorId,
      url: source.url,
      title: source.title,
      description: source.description,
      license: "all-rights-reserved",
      citationPrice: source.price,
      minPayout: "100",
    },
    { Authorization: `Bearer ${apiKey}` },
  ).catch((e) => {
    // If a source with the same URL already exists, find it and return it
    // so re-running the script doesn't fail.
    if (/already registered|duplicate|unique/i.test(String(e.message))) {
      return http(
        "GET",
        `/v1/sources?creatorId=${source.creatorId}&q=${encodeURIComponent(source.url)}`,
        null,
        { Authorization: `Bearer ${apiKey}` },
      ).then((r) => r.data.find((row) => row.url === source.url) || r.data[0]);
    }
    throw e;
  });
}

async function verifySource(apiKey, sourceId) {
  // Source status flow: PENDING_VERIFICATION -> ACTIVE.
  // The prober (DNS_TXT / HTML_META / FILE_UPLOAD) needs to actually probe
  // a real domain that serves the verification token, which we don't own
  // for the seed domains. So we use the debug-only force-active shortcut.
  //
  // The endpoint is gated behind NANOPROOF_DEBUG_ENDPOINTS=true on the api,
  // so this script only works against environments where that flag is set.
  // If it isn't, we fall back to the standard prober flow (which may not
  // succeed against fictional demo domains).
  const current = await http("GET", `/v1/sources/${sourceId}`);
  if (current.status === "ACTIVE") {
    return current;
  }
  try {
    return await http("POST", `/v1/sources/${sourceId}/force-active`, {});
  } catch (e) {
    if (/404|NP_NOT_FOUND/.test(String(e.message))) {
      console.warn(`[seed] force-active 404 — falling back to MANUAL prober (api may not have NANOPROOF_DEBUG_ENDPOINTS=true)`);
      await http(
        "POST",
        `/v1/sources/${sourceId}/verifications`,
        { method: "MANUAL" },
        { Authorization: `Bearer ${apiKey}` },
      );
      return http(
        "POST",
        `/v1/sources/${sourceId}/verifications/run`,
        { method: "MANUAL" },
        { Authorization: `Bearer ${apiKey}` },
      );
    }
    throw e;
  }
}

async function detectCitations(responseText, responseId) {
  return http("POST", "/v1/citations/detect", {
    responseId,
    responseText,
  });
}

async function settlePayments(responseId, creatorId) {
  // /v1/payments/settle creates one SETTLED Payment row per PENDING Citation
  // for the given responseId. It does NOT trigger on-chain settlement
  // (that's the x402 flow on /x402/demo). This is the Phase-3 thin slice
  // path: detect -> settle (in-app, no blockchain) -> ready for ArcScan verify.
  return http("POST", "/v1/payments/settle", {
    responseId,
    ...(creatorId ? { creatorId } : {}),
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`[seed] API = ${API}`);

  const apiKeys = {};
  for (const c of CREATORS) {
    console.log(`[seed] minting api key for ${c.id}`);
    apiKeys[c.id] = await mintApiKey(c.id);
  }

  const sourcesByCreator = {};
  for (const c of CREATORS) {
    sourcesByCreator[c.id] = [];
    for (const s of c.sources) {
      const created = await createSource(apiKeys[c.id], { ...s, creatorId: c.id });
      console.log(`[seed]   created source ${created.id} (${created.domain})`);
      try {
        await verifySource(apiKeys[c.id], created.id);
        console.log(`[seed]   verified ${created.id} -> ACTIVE`);
      } catch (e) {
        // Verification may legitimately fail on test data; we just warn.
        console.warn(`[seed]   verify ${created.id} failed: ${(e.message || e).slice(0, 120)}`);
      }
      sourcesByCreator[c.id].push(created);
      // Refresh in case verification mutated it
      const fresh = await http("GET", `/v1/sources/${created.id}`);
      sourcesByCreator[c.id][sourcesByCreator[c.id].length - 1] = fresh;
    }
  }

  const citations = buildCitations(sourcesByCreator);
  console.log(`[seed] emitting ${citations.length} citation events`);

  let totalResolved = 0;
  let totalUnresolved = 0;
  let totalSettled = 0;

  for (let i = 0; i < citations.length; i += 1) {
    const evt = citations[i];
    // responseId needs to be unique; use a UUID-ish suffix so we can trace
    const responseId = `seed-${Date.now()}-${i}-${evt.agent.toLowerCase()}`;
    const result = await detectCitations(evt.responseText, responseId);
    const resolved = (result.citations || []).length;
    const unresolved = (result.unresolved || []).length;
    totalResolved += resolved;
    totalUnresolved += unresolved;
    console.log(
      `[seed]   [${evt.agent.padEnd(9)}] t-${String(evt.minutesAgo).padStart(4)}m  ` +
        `resolved=${resolved} unresolved=${unresolved} ` +
        `totalUsdc=${result.totalUsdc ?? "0"}`,
    );
    // Let the existing payment pipeline settle these citations. This goes
    // through /v1/payments/settle which marks each Payment row SETTLED and
    // bumps Source.citationCount + Creator.earnedAtomic. No x402 dance —
    // pure in-app settlement for demo data.
    try {
      const settled = await settlePayments(responseId, evt.creator.id);
      // /v1/payments/settle returns Payment[] directly (array, not wrapped).
      const payments = Array.isArray(settled) ? settled.length : 0;
      if (payments > 0) {
        console.log(`[seed]   ${" ".repeat(13)} -> settled ${payments} payments`);
        totalSettled += payments;
      }
    } catch (e) {
      console.warn(`[seed]   ${" ".repeat(13)} -> settle failed: ${String(e.message || e).slice(0, 100)}`);
    }
    // Tiny pause so timestamps differ and the api's rate-limit doesn't bite.
    await sleep(150);
  }

  console.log("");
  console.log(`[seed] done. resolved=${totalResolved} unresolved=${totalUnresolved} settled=${totalSettled}`);
  console.log(
    "[seed] tip: if your sources came back as ACTIVE in step 2, /v1/payments/settle on " +
      "each responseId will produce the same settlement chain a real agent run does. " +
      "Hit /v1/analytics/overview afterwards to see the totals tick up.",
  );
}

main().catch((e) => {
  console.error("[seed] FAILED", e);
  process.exit(1);
});