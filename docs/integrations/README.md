# Integration Guides

> How to wire NanoProof into your AI agent, framework, or workflow.

---

## Guides

| Framework | Status | Guide |
|-----------|--------|-------|
| Vercel AI SDK | Planned | [`vercel-ai-sdk.md`](./vercel-ai-sdk.md) |
| LangChain | Planned | [`langchain.md`](./langchain.md) |
| LlamaIndex | Planned | [`llamaindex.md`](./llamaindex.md) |
| Custom agents | Planned | [`custom-agent.md`](./custom-agent.md) |
| Creator onboarding | Planned | [`creator-onboarding.md`](./creator-onboarding.md) |

---

## Common integration pattern

Regardless of framework, every integration follows the same three steps:

```
1. Wrap the LLM call    → inject NanoProof middleware / callback
2. Configure a wallet   → fund it with testnet USDC
3. Pay per citation     → the SDK handles detection + settlement
```

The NanoProof SDK abstracts the differences between frameworks so the integration shape is the same everywhere.

---

## Writing a new integration

1. Create `packages/sdk-<framework>/` (e.g. `@nanoproof/vercel-ai-sdk`).
2. Re-export the public types from `@nanoproof/sdk`.
3. Implement the framework's adapter interface (a middleware, a callback, etc.).
4. Add an integration test using a stub LLM provider.
5. Document the integration in this folder.

See [`CONTRIBUTING.md`](../../CONTRIBUTING.md) for the full PR workflow.