# Future Extensions — Arc, USDC, Circle, AI Agents, x402, Marketplaces, Licensing

> How NanoProof composes with the broader agentic economy. This document is forward-looking and tracks planned integrations beyond the current Phase 1–9 scope.

---

## Table of contents

- [Arc L1 settlement](#arc-l1-settlement)
- [USDC](#usdc)
- [Circle Agent Stack](#circle-agent-stack)
- [AI agent frameworks](#ai-agent-frameworks)
- [x402 protocol](#x402-protocol)
- [Creator marketplaces](#creator-marketplaces)
- [Knowledge licensing](#knowledge-licensing)
- [Cross-chain portability](#cross-chain-portability)
- [Multi-modal citations](#multi-modal-citations)
- [Citation futures](#citation-futures)
- [Recursive royalty splits](#recursive-royalty-splits)

---

## Arc L1 settlement

Arc is the settlement chain for NanoProof. Integration points:

| Layer | Arc primitive | NanoProof usage |
|-------|---------------|-----------------|
| **L1 gas** | Native USDC gas | Every Citation payout pays USDC gas |
| **Finality** | <500ms | Citation → settled receipt in <2s end-to-end |
| **Explorer** | ArcScan | Every Citation has a public ArcScan URL on its receipt |
| **Faucet** | testnet faucet | New agents and Creators receive starter USDC for testnet usage |

Future directions:
- **Arc sub-accounts** for per-Creator wallets, isolating funds.
- **Arc-side rate-limiting** at the protocol level — Arc nodes reject transactions that exceed a Creator's `periodCap`.
- **Arc-native reputation** — read on-chain signals (tx history, token holdings) into the matching algorithm.

---

## USDC

USDC is the **only** settlement currency on NanoProof. Design commitments:

1. **No wrapped assets.** USDC is native to Arc; we never accept bridged variants.
2. **6 decimals, atomic units.** All amounts in the API are strings of atomic USDC (e.g. `"1000"` = $0.001).
3. **No token swaps.** The protocol does not offer currency conversion. Creators and agents transact in USDC.
4. **Multi-currency expansion is gated on ADR-0001** — Arc-only at v1.0.

Future directions:
- **USDC streaming** for live-coverage use cases (per-second payouts during a live event).
- **Cross-chain USDC** via CCTP once chain-portability lands (v2.0).

---

## Circle Agent Stack

We integrate with Circle's full agent stack:

| Component | NanoProof usage |
|-----------|-----------------|
| **CCTP** | Cross-chain USDC transfer (future v2.0) |
| **Gateway** | Batch up to 1000 nanopayments per onchain transaction |
| **x402** | HTTP 402 payment-required flow for pay-per-request APIs |
| **App Kit** | Drop-in SDKs for agent developer onboarding |
| **Wallet** (programmable) | Agent hot wallet for signing payouts |

Future directions:
- **Agent-as-Creator**: agents that earn USDC for their output get first-class identities in the registry.
- **Circle Wallet integration**: Creators can hold payouts in Circle Wallet directly.

---

## AI agent frameworks

First-class integrations with:

| Framework | Adapter package | Status |
|-----------|----------------|--------|
| **Vercel AI SDK** | `@nanoproof/vercel-ai-sdk` | Phase 8 |
| **LangChain** | `@nanoproof/langchain` | Phase 8 |
| **LlamaIndex** | `@nanoproof/llamaindex` | Phase 8 |
| **Mastra** | `@nanoproof/mastra` | post-beta |
| **AutoGen** | `@nanoproof/autogen` | post-beta |
| **CrewAI** | `@nanoproof/crewai` | post-beta |
| **Custom agents** | `@nanoproof/sdk` | Phase 8 |

The integration surface is identical across all frameworks: wrap the LLM call, get Citations + receipts back.

Future directions:
- **Agent-to-agent payments**: agents that cite each other (collaborative research) pay each other.
- **Tool-call citations**: agents that emit citations as tool calls get the cleanest Attribution.
- **Streaming receipts**: receipts stream back token-by-token, enabling real-time dashboard updates.

---

## x402 protocol

x402 is the HTTP 402 Payment Required flow. NanoProof uses x402 in two directions:

### Inbound (agent → NanoProof)

When an agent wants to analyze a citation, NanoProof returns `402 Payment Required` with a quote (in USDC). The agent signs the x402 envelope and retries; the request is fulfilled.

### Outbound (NanoProof → creator)

When NanoProof pays a Creator, the onchain settlement may be wrapped in an x402 envelope that the Creator's own wallet understands. This enables:

- **Smart contract wallets** to react to citations programmatically.
- **x402-aware relays** to forward payments to downstream services.
- **Composable agent economy**: agents that pay other agents use the same primitive.

Future directions:
- **x402 payment channels** for high-frequency, low-value citations.
- **x402 receipts as ZK proofs** for trust-minimized attestation.

---

## Creator marketplaces

NanoProof is the **payment layer**, not the marketplace. But we expect marketplaces to compose with us:

| Marketplace pattern | NanoProof integration |
|---------------------|----------------------|
| **Content licensing platform** | Lists Sources; routes license fees through the Payment Engine |
| **Agent economy directories** | Lists agents; shows per-agent spend |
| **Citation analytics dashboards** | Reads from public `/v1/analytics/*` endpoints |
| **Creator-owned storefronts** | Use the SDK to monetize directly without a marketplace |

Future directions:
- **NanoProof Marketplace** (open-source) — a reference storefront showcasing how to compose with the protocol.
- **Source discovery surface** — public Sources can be browsed by anyone, including marketplace aggregators.
- **Citation back-link graph** — every Citation creates a public, queryable edge between agent and Source. Marketplaces can use this for SEO, discovery, and pricing.

---

## Knowledge licensing

NanoProof does not replace existing licensing frameworks (Creative Commons, SPDX, etc.). We **compose** with them:

| License | NanoProof behavior |
|---------|--------------------|
| **CC-0** | Source is open; pay-what-you-want with default $0.001 / citation |
| **CC-BY** | Source is open; attribution enforced in Citation metadata |
| **CC-BY-SA** | Source is open + share-alike; downstream Sources must remain open |
| **CC-BY-NC** | Source forbids commercial use; non-commercial citations pay reduced rate |
| **CC-BY-ND** | Source forbids derivatives; downstream Sources cannot register paraphrases |
| **All rights reserved** | Source is paid-only; Citation requires explicit license grant per Creator |

The `license` field on Source is enforced at Citation time. A `CC-BY-NC` Source cited by an agent in a commercial product triggers a warning + reduced payout.

Future directions:
- **License-aware Attribution**: weight citations to permissively-licensed Sources higher in open research use cases.
- **Programmable licenses**: smart-contract-enforced license terms that evolve with usage.
- **Cross-Source licensing**: when a Citation combines 5 Sources, the output's license is auto-negotiated from the inputs.

---

## Cross-chain portability

ADR-0001 commits NanoProof to Arc-only at v1.0. v2.0 introduces portability:

| Chain | Status (v2.0) | Migration path |
|-------|---------------|----------------|
| **Arc** | ✅ v1.0+ | Native |
| **Tempo** | 🟡 v2.0 | Once Tempo has production testnet |
| **Base** | 🟡 v2.0 | L2 with cheap USDC; candidate partner |
| **Ethereum** | 🟢 v2.1+ | Only if cost bar is met (L2 rollup) |
| **Solana** | 🟢 v2.1+ | USDC native; performance is right |

Portability requires:
- A canonical onchain contract set per chain.
- A common event schema for receipt indexing.
- Chain-aware deployment of the Payment Engine.
- A unified wallet abstraction that resolves addresses across chains.

---

## Multi-modal citations

Phase 1–3 covers **text** citations. Future phases expand to:

| Modality | Fingerprint | Citation type |
|----------|-------------|----------------|
| **Image** | pHash + perceptual features | `IMAGE_VISUAL`, `IMAGE_STYLE`, `IMAGE_COMPOSITION` |
| **Audio** | Chromaprint + BPM detection | `AUDIO_SAMPLE`, `AUDIO_MELODY`, `AUDIO_VOICE` |
| **Video** | Sampled keyframes + audio hash | `VIDEO_FRAME`, `VIDEO_CLIP`, `VIDEO_AUDIO` |
| **Code** | AST hash + symbol table | `CODE_FUNCTION`, `CODE_PATTERN`, `CODE_STRUCTURE` |
| **Dataset** | Row-level hash + schema hash | `DATASET_ROW`, `DATASET_SCHEMA`, `DATASET_STATISTIC` |
| **3D model** | Mesh hash + texture hash | `MODEL_GEOMETRY`, `MODEL_TEXTURE` |

Each modality gets:
- A perceptual hash strategy (`fingerprinting/perceptual.ts`).
- A matching strategy (`matching/<modality>-matcher.ts`).
- A scoring weight in the attribution model.
- A Source type in the registry.

---

## Citation futures

A transferable claim on a Creator's future tip + subscription flow. Inspired by YC's "future-equity" instruments but applied to creator revenue.

```
Today: Agent cites Creator's article → pays $0.001.
Future: A "citation future" lets a backer buy a transferable position
        on the future revenue stream of a Creator's Source.
```

The future is:
- Issued as an NFT (or native Arc token, TBD).
- Tradeable on a DEX.
- Pays out proportional share of the Source's lifetime citation revenue.

This is **Phase 10+** — it's a financial primitive that requires regulatory clarity and may need jurisdictional scoping.

---

## Recursive royalty splits

When a Source is composed of sub-Sources, every Citation to the parent pays out to:
1. The parent Source's Creator(s).
2. The sub-Source Creators, weighted by their attribution fractions.

Example: an article quotes from 3 papers. A citation to the article splits the payout 3 ways: 50% to the article's Creator (composition fee), 50% split across the 3 paper Creators by their respective citation contributions.

```
attribution.article = 0.5 * basePrice
attribution.paper_1 = 0.5 * 0.6 * basePrice
attribution.paper_2 = 0.5 * 0.3 * basePrice
attribution.paper_3 = 0.5 * 0.1 * basePrice
```

Sum-to-one guaranteed at every level. Implementation lands post-beta.

---

## See also

- [`citation-engine.md`](./citation-engine.md)
- [`protocol-spec.md`](./protocol-spec.md)
- [`../docs/adr/0001-chain-portability.md`](../docs/adr/0001-chain-portability.md)
- [`../docs/adr/0004-per-agent-pricing.md`](../docs/adr/0004-per-agent-pricing.md)