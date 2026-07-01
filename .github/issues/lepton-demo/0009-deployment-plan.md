---
id: LD-009
title: "[Lepton Demo] Deployment plan — Vercel + Railway + Neon"
labels:
  - phase:lepton-demo
  - area:devops
  - priority:high
priority: high
estimate: M
status: closed
milestone: lepton-demo-mvp
---

# [Lepton Demo] Deployment plan

## Summary

`docs/deployment.md` covers the full hosting plan: Vercel for the web,
Railway for the api, Neon for Postgres, Arc testnet + Circle testnet
for settlement. Total monthly cost: $0 on free tiers.

## Acceptance

- [x] Architecture diagram
- [x] Neon setup steps (with the pooled-connection-string caveat)
- [x] Railway setup steps (Dockerfile, healthcheck, env vars)
- [x] Vercel setup steps (root dir, build command, env vars)
- [x] Smoke test (curl healthz, /research round-trip, Payment rows in DB)
- [x] Custom domain mapping (Cloudflare → Vercel + Railway)
- [x] Complete env var matrix (api + web)
- [x] Post-deploy checklist
- [x] Cost summary
- [x] `apps/api/Dockerfile` template included
