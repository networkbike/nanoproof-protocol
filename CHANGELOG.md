# Changelog

All notable changes to NanoProof Protocol are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial monorepo scaffold (apps + packages + contracts + docs + scripts + .github)
- Top-level documentation: README, ARCHITECTURE, ROADMAP, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT
- Per-package READMEs for `sdk`, `citation-engine`, `payment-engine`, `shared`, `web`, `api`, `contracts`, `scripts`
- `docs/` structure: README, architecture notes, protocol spec (draft), Lepton submission checklist
- 5 Architecture Decision Records under `docs/adr/`
- 6 operational runbooks under `docs/runbooks/`
- 4 integration guides (Vercel AI SDK, LangChain, LlamaIndex, custom) under `docs/integrations/`
- GitHub workflows: `ci.yml`, `release.yml`, `audit.yml`
- GitHub issue templates: bug, feature, question, security
- GitHub PR template + CODEOWNERS + Dependabot config
- Workspace tooling: pnpm workspaces, Turborepo, ESLint 9 flat config, Prettier, TypeScript strict base config
- Changesets config for SemVer + release automation

### Phase 2 — Creator Registry architecture
- Prisma schema: `apps/api/prisma/schema.prisma` (Creator, Wallet, Source, Organization, OrganizationMembership, ApiKey, VerificationChallenge)
- Canonical OpenAPI 3.1 spec: `apps/api/openapi/creator-registry.yaml`
- Architecture: `docs/phase-2-creator-registry.md`
- Sub-docs: `docs/creator-registry.md`, `docs/source-verification.md`, `docs/wallet-verification.md`
- 22 implementation tickets under `.github/issues/phase-2/`
- Updated `apps/api/README.md` with the Phase 2 endpoint map

### Phase 3 — Citation Engine architecture
- Canonical architecture: `docs/citation-engine.md` (10-stage pipeline, components, latency budget, auditability)
- Source fingerprinting: `docs/source-fingerprinting.md` (composite hash, version tracking, perceptual hashes, SSRF defense)
- Attribution model: `docs/attribution-model.md` (5 citation types, 6 weight factors, sum-to-one guarantee, worked example)
- Fraud prevention: `docs/fraud-prevention.md` (16-attack catalog, 13-layer defense, quarantine + dispute flow)
- Analytics: `docs/analytics.md` (protocol/creator/source/agent/fraud metrics, dashboards, exports)
- Future extensions: `docs/future-extensions.md` (Arc, USDC, Circle Agent Stack, x402, marketplaces, licensing)
- Append-only Prisma additions: `apps/api/prisma/schema.citation-engine.prisma` (Fingerprint, Attribution, Citation, Evidence, Contribution, CreatorMatch, FraudSignal, Dispute, AnalyticsRollup + Postgres triggers)
- OpenAPI 3.1 spec: `apps/api/openapi/citation-engine.yaml` (citations, attributions, fingerprints, analytics, dispute, fraud)
- Package subdirectory READMEs: `packages/citation-engine/{core,scoring,fingerprinting,matching,registry,analytics,types,interfaces,docs,tests}/README.md`
- 25 implementation tickets under `.github/issues/phase-3/`

### Notes
- **Pre-alpha.** No application code is shipped yet — see `ROADMAP.md` for the phased build plan.
- Implementation begins in Phase 2 of the roadmap.