# Vercel AI SDK Integration

> Planned for Phase 8 (Protocol SDK). This document describes the target integration shape.

---

## Install (planned)

```bash
pnpm add @nanoproof/vercel-ai-sdk @nanoproof/sdk
```

## Wrap your existing call (planned)

```typescript
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { nanoProof } from "@nanoproof/vercel-ai-sdk";

const result = await streamText({
  model: openai("gpt-4o"),
  prompt: userPrompt,
  experimental_middleware: [nanoProof({
    apiKey: process.env.NANOPROOF_API_KEY!,
    network: "arc-testnet",
    payoutPolicy: {
      maxPerResponse: 0.05,
      maxPerDay: 1.00,
    },
  })],
});
```

That's it. Every response automatically:
1. Extracts citations.
2. Quotes a per-citation payout.
3. Settles USDC on Arc via x402 + Circle Gateway.
4. Returns structured receipts alongside the streamed text.

---

## Inspecting receipts

```typescript
for await (const chunk of result.fullStream) {
  if (chunk.type === "nano-proof-receipt") {
    console.log("Paid:", chunk.sourceTitle, "→", chunk.txHash);
  }
}
```

---

## See also

- [`../protocol-spec.md`](../protocol-spec.md)
- [`../../packages/sdk/README.md`](../../packages/sdk/README.md)