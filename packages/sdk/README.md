# @nanoproof/sdk

> Drop-in TypeScript SDK for AI agents that want to compensate creators automatically.

[![Status: Pre-Alpha](https://img.shields.io/badge/status-pre--alpha-orange.svg)]()

The `@nanoproof/sdk` is the public client surface of the NanoProof Protocol. One import, a handful of lines of code, and any AI agent framework can detect citations in its responses and route USDC nanopayments to the cited creators on Arc.

---

## Status

**Phase 1 — Repository Foundation.** The SDK interface is sketched here as a contract. Implementation lands in **Phase 8 (Protocol SDK)** of the [Roadmap](../../ROADMAP.md). Track the [GitHub Project](https://github.com/networkbike/nanoproof-protocol/projects) for progress.

---

## Planned API surface

```typescript
import { NanoProof } from "@nanoproof/sdk";

const proof = new NanoProof({
  apiKey: process.env.NANOPROOF_API_KEY!,
  network: "arc-testnet",
  payoutPolicy: {
    maxPerResponse: 0.05,     // USDC cap per agent response
    maxPerDay: 1.00,          // USDC cap per agent per 24h
  },
});

// Wrap any LLM call → automatic citation detection + payment
const response = await proof.complete({
  model: "gpt-4o",
  prompt: userPrompt,
  tools: [...],
});

// response.text          → the AI's reply
// response.citations     → CitationEvents paid out
// response.receipts      → Arc tx hashes per payout
```

### Framework adapters (planned)

- **`@nanoproof/vercel-ai-sdk`** — drop-in middleware for the [Vercel AI SDK](https://sdk.vercel.ai).
- **`@nanoproof/langchain`** — `CallbackHandler` for LangChain agents.
- **`@nanoproof/llamaindex`** — `ToolCallback` for LlamaIndex.

Each adapter exposes a single function that wraps the framework's existing call site.

---

## Design principles

1. **Zero-config default.** A developer with an `apiKey` and a wallet should be paying creators in five lines.
2. **Pay only what the agent intends.** Caps and policies are first-class. No surprise spend.
3. **Never lose a payment.** Every payment is idempotent + onchain-anchored before the SDK returns.
4. **Observable by default.** Every call returns structured receipts and an audit trail.

---

## Planned package shape

```
@nanoproof/sdk
├── src/
│   ├── client.ts            # NanoProof top-level client
│   ├── citation/            # CitationEngine re-exports
│   ├── payment/             # PaymentEngine re-exports
│   ├── providers/           # LLM provider abstractions
│   ├── policy/              # Spend caps, allowlists, denylists
│   ├── receipts/            # ArcScan URL builders
│   └── types/               # Public types
├── tests/
└── README.md
```

---

## What ships in v1.0.0

- Stable TypeScript API.
- Vercel AI SDK + LangChain adapters.
- OpenAI, Anthropic (via adapter), OpenRouter, Together providers.
- Arc testnet + Arc mainnet.
- USDC payouts via Circle Gateway + x402.
- SemVer guarantee.
- npm-published.

See [`ROADMAP.md`](../../ROADMAP.md#phase-8--protocol-sdk) for the full Phase 8 plan.

---

## Contributing

The SDK is the public contract for the entire protocol. Changes here are reviewed by both the engineering and protocol-design teams. See [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

---

## License

MIT — see [`LICENSE`](../../LICENSE).