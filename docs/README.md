# NanoProof Protocol — Documentation

> All protocol documentation lives here. Architecture overviews, ADRs, integration guides, and operational runbooks.

---

## Contents

| File / Folder | Purpose |
|---------------|---------|
| [`architecture.md`](./architecture.md) | Cross-cutting design notes |
| [`protocol-spec.md`](./protocol-spec.md) | The NanoProof wire protocol (WIP) |
| [`lepton-submission.md`](./lepton-submission.md) | Submission checklist for the Lepton Hackathon |
| [`adr/`](./adr/) | Architecture Decision Records |
| [`integrations/`](./integrations/) | Per-integration guides (Vercel AI SDK, LangChain, etc.) |
| [`runbooks/`](./runbooks/) | Operational procedures |
| [`migrations/`](./migrations/) | Schema + API migration notes |

---

## Where to start

| You are a... | Read this first |
|--------------|-----------------|
| Creator | [`../README.md`](../README.md) → [`integrations/creator-onboarding.md`](./integrations/creator-onboarding.md) |
| Agent developer | [`integrations/vercel-ai-sdk.md`](./integrations/vercel-ai-sdk.md) |
| Protocol designer | [`protocol-spec.md`](./protocol-spec.md) + [`adr/`](./adr/) |
| Operator | [`runbooks/`](./runbooks/) |
| Reviewer / auditor | [`SECURITY.md`](../SECURITY.md) + [`adr/`](./adr/) |

---

## Conventions

- Use Markdown. One H1 per file. Use H2/H3 liberally.
- ADRs follow the [MADR](https://adr.github.io/madr/) format.
- Diagrams use ASCII or Mermaid.
- Code samples must be runnable against a fresh dev environment.

---

## Contributing

See [`CONTRIBUTING.md`](../CONTRIBUTING.md#documentation-requirements). Documentation is part of the protocol contract — keep it current.