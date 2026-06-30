# Custom Agent Integration

> For AI agents built without a major framework. Direct use of the NanoProof SDK.

---

## Install (planned)

```bash
pnpm add @nanoproof/sdk
```

## Plain usage (planned)

```typescript
import { NanoProof } from "@nanoproof/sdk";

const proof = new NanoProof({
  apiKey: process.env.NANOPROOF_API_KEY!,
  network: "arc-testnet",
  payoutPolicy: {
    maxPerResponse: 0.05,
    maxPerDay: 1.00,
  },
});

// 1. Generate a response from your LLM of choice
const raw = await yourLLM.complete({ prompt });

// 2. Pass the response through NanoProof
const enriched = await proof.processResponse({
  responseId: "resp_01H...",
  responseText: raw.text,
  modelId: raw.modelId,
});

// enriched.text         → the AI's reply (unchanged)
// enriched.citations    → CitationEvents paid out
// enriched.receipts     → Arc tx hashes per payout
return enriched;
```

---

## Direct citation + payment (advanced)

If you want to inspect citations before paying:

```typescript
const events = await proof.citation.extract({ responseText });
const priced = await proof.payment.quote(events);

if (priced.totalUsdc <= policy.maxPerResponse) {
  const receipt = await proof.payment.execute(priced.intent);
}
```

---

## See also

- [`../../packages/sdk/README.md`](../../packages/sdk/README.md)