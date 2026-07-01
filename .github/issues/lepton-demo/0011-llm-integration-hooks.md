---
id: LD-011
title: "[Lepton Demo] LLM-integration hooks in synthesizeAnswer()"
labels:
  - phase:lepton-demo
  - area:agent
  - priority:medium
priority: medium
estimate: S
status: open
milestone: lepton-demo-mvp
---

# [Lepton Demo] LLM-integration hooks

## Summary

The current `synthesizeAnswer()` uses deterministic templated responses.
Production wants an LLM call. Add the env-var-gated hook so judges can
plug in their own key, and the demo can still run with zero external deps.

## Acceptance

- [ ] `OPENAI_API_KEY` env var enables the OpenAI adapter
- [ ] `ANTHROPIC_API_KEY` env var enables the Anthropic adapter
- [ ] With neither set, falls back to the templated render (current behavior)
- [ ] The agent emits a `provider` field in the response for observability
- [ ] No breaking changes to the public `research()` signature
