---
id: LD-006
title: "[Lepton Demo] /api/agent route — server-side proxy to NanoProof client"
labels:
  - phase:lepton-demo
  - area:web
  - priority:high
priority: high
estimate: S
status: closed
milestone: lepton-demo-mvp
---

# [Lepton Demo] /api/agent route

## Summary

Next.js API route that runs the research agent server-side. The web
client posts `{ question }` to `/api/agent`; the route handler imports
`@nanoproof/agent` directly and returns the full `AgentAnswer`.

## Acceptance

- [x] `apps/web/src/app/api/agent/route.ts` (POST handler)
- [x] `runtime = "nodejs"` so the `@nanoproof/agent` package can be used
- [x] Validates `question` length (1-2000 chars)
- [x] Reads `INTERNAL_API_URL` + `INTERNAL_API_KEY` from server env
- [x] Returns 500 with NP-style envelope on failure
- [x] Wire-format identical to the public NanoProof API
