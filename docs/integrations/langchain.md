# LangChain Integration

> Planned for Phase 8 (Protocol SDK). This document describes the target integration shape.

---

## Install (planned)

```bash
pnpm add @nanoproof/langchain @nanoproof/sdk
```

## Wire into your chain (planned)

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { NanoProofCallback } from "@nanoproof/langchain";

const model = new ChatOpenAI({ model: "gpt-4o" });

const response = await model.invoke(prompt, {
  callbacks: [new NanoProofCallback({
    apiKey: process.env.NANOPROOF_API_KEY!,
    network: "arc-testnet",
    payoutPolicy: {
      maxPerResponse: 0.05,
      maxPerDay: 1.00,
    },
  })],
});

// response.responseMetadata.nanoProof
//   → { citations: [...], receipts: [{ sourceId, txHash, amount }] }
```

---

## Streaming variant

For streamed chains, the callback receives incremental `onLLMNewToken` events with receipt chunks once citations resolve.

---

## See also

- [`vercel-ai-sdk.md`](./vercel-ai-sdk.md)
- [`../../packages/sdk/README.md`](../../packages/sdk/README.md)